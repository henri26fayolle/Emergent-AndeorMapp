# Supabase migration plan for An Deor Quest

This is the safest path to make the cloned Emergent game app ours without ripping up the working UI.
It can live in the same Supabase project as the main Andeor/Yanature webapp because every game table is prefixed with `game_` and every game storage bucket is prefixed with `game-`.

## Recommendation

Keep the current FastAPI backend as the API boundary and replace MongoDB with Supabase/Postgres behind it first.

That means the React frontend can keep calling `REACT_APP_BACKEND_URL/api/...`, while the backend changes from `motor`/Mongo calls to Supabase database calls. This is lower risk than moving the frontend directly to Supabase Auth/API in the same pass.

Use the same Supabase project as the marketplace app, but keep the game isolated:
- Do not write into the marketplace `users`, `bookings`, `tours`, or CMS tables.
- Do write into `game_users`, `game_bookings`, `game_tours`, and the other `game_` tables.
- Do use `game-media`, `game-audio`, and `game-gpx` storage buckets.

## Current app inventory

Frontend:
- React CRA/CRACO app in `frontend`.
- API base is `REACT_APP_BACKEND_URL`, then `/api`.
- Uses cookies with `withCredentials: true`.
- Routes include onboarding/prologue, dashboard/map, tours, quests, rewards, leaderboard, companion, admin, main quests, and self-guided journeys.

Backend:
- FastAPI app in `backend/server.py`.
- Mongo client is created from `MONGO_URL` and `DB_NAME`.
- Auth uses bcrypt password hashes plus JWT cookies.
- Google login currently exchanges Emergent OAuth `session_id` for a session token.
- AI companion and TTS use `EMERGENT_LLM_KEY`.

Mongo collections currently used:
- `users`
- `user_sessions`
- `regions`
- `tours`
- `quests`
- `reward_templates`
- `bookings`
- `user_rewards`
- `chat_messages`
- `main_quests`
- `self_guided`

Local assets currently used:
- `frontend/public/mauritius_map_loop.mp4`
- `frontend/public/mauritius_map_loop.webm`
- `frontend/public/prologue_to_map.mp4`
- `frontend/public/port_louis_map.png`
- `frontend/public/north_coast_map.png`
- `frontend/public/le_morne_map.png`
- `frontend/public/avatars/*.jpg`
- `backend/uploads/audio/*.mp3`
- `backend/uploads/gpx/*` if any GPX files have been uploaded in production.

## Supabase shape

Use `supabase/schema.sql` as the first draft schema.

Main tables:
- `game_users`
- `game_user_sessions`
- `game_regions`
- `game_tours`
- `game_quests`
- `game_main_quests`
- `game_self_guided_journeys`
- `game_reward_templates`
- `game_bookings`
- `game_user_rewards`
- `game_chat_messages`
- `game_storage_assets`

Storage buckets:
- `game-media` for map videos, map images, avatars, and future art.
- `game-audio` for generated region/tour MP3 narration.
- `game-gpx` for uploaded GPX tracks.

The schema intentionally keeps some fields as JSONB or arrays:
- `game_users.self_guided_progress`
- `game_users.rewards`
- `game_tours.gpx_files`
- `game_self_guided_journeys.stops`
- user cards, badges, regions, and main quest enrolment arrays.

That keeps the first migration close to the current Mongo document model. We can normalize these later once the app is stable on Supabase.

## Environment variables

Remove from the game backend once migrated:
- `MONGO_URL`
- `DB_NAME`

Add to the game backend:
- `SUPABASE_DB_URL`
- `SUPABASE_BUCKET_MEDIA=game-media`
- `SUPABASE_BUCKET_AUDIO=game-audio`
- `SUPABASE_BUCKET_GPX=game-gpx`

Keep:
- `JWT_SECRET`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `EMERGENT_LLM_KEY` until we decide whether to keep that provider.
- `REACT_APP_BACKEND_URL` on the frontend.

Important: `SUPABASE_SERVICE_ROLE_KEY` must only live on the backend. Never put it in the React/Vercel frontend environment.
For the current backend adapter, `SUPABASE_DB_URL` is the required value. The main webapp's `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SECRET_KEY` prove we are using the same project, but they are not enough for FastAPI to open a Postgres connection.

## Migration status

Completed locally:
- `supabase/schema.sql` defines the isolated `game_` tables and `game-*` buckets.
- The FastAPI backend can use `SUPABASE_DB_URL` through `backend/db_postgres.py`.
- Mongo is still available as a fallback when `SUPABASE_DB_URL` is absent.
- `GAME_SEED_MODE=auto` seeds empty game tables, then skips catalog re-seeding on later boots.
- Password/JWT auth, bookings, quests, rewards, main quests, self-guided journeys, admin routes, and codex routes run through the Supabase-backed adapter.
- The Emergent LLM/TTS imports are optional, so the app still runs without that private package/key.
- Local frontend and backend env examples are in place.
- Backend test suite passes against the Supabase-backed local API: 84 passed, 4 skipped for optional LLM/TTS.
- Frontend production build passes.

Still to do for production:
- Upload/serve long-lived media, audio, and GPX assets from storage instead of relying on local disk.
- Deploy the backend to a service that can run FastAPI persistently.
- Deploy the frontend with the production backend URL.
- Replace or remove the old Emergent OAuth flow if Google login is required.

## Original migration sequence

1. Open the existing Andeor/Yanature Supabase project.
2. Run `supabase/schema.sql` in that project's Supabase SQL editor.
3. Upload current local assets into Supabase Storage:
   - `frontend/public/*` media and avatars to `game-media`.
   - `backend/uploads/audio/*.mp3` to `game-audio`.
   - `backend/uploads/gpx/*` to `game-gpx`.
4. Add a backend database adapter. Done as `backend/db_postgres.py`.
5. Port seed logic. Done.
6. Port auth/session logic. Done for password/JWT; Google login still depends on the old Emergent exchange.
7. Port booking/progress/reward writes. Done.
8. Port codex media:
   - Generated MP3 should write to `game-audio`, not local disk.
   - GPX upload/delete should write to `game-gpx`, not local disk.
9. Run existing backend tests against the Supabase-backed API. Done locally.
10. Deploy as `game.andeor.app` first, using the same Supabase project but the game backend's separate env vars.
11. Only after testing, decide whether `andeor.app` should redirect to the game or keep the marketplace as the main app.

## Risks to handle cleanly

- Cookie/domain setup: game frontend and backend must agree on HTTPS, domain, and `SameSite=None`.
- Local disk uploads: Vercel/serverless-style deploys will not keep generated audio or uploaded GPX files, so storage migration matters.
- Emergent OAuth dependency: Google login currently depends on Emergent session exchange. We can keep password/JWT auth first and replace OAuth later.
- AI provider dependency: companion and TTS currently depend on `EMERGENT_LLM_KEY`; app should degrade gracefully when it is absent.
- Existing production data: if users already played on Emergent, we need a Mongo export before switching.

## Practical next build step

Deploy the game backend as a separate service first, with `COOKIE_SECURE=true` and the production frontend URL allowed by CORS. Then deploy the frontend with `REACT_APP_BACKEND_URL` pointing to that backend.
