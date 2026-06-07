# An Deor Quest — PRD

## Original Problem Statement
> Create a game app for An Deor (Mauritius outdoor & cultural travel marketplace).
> Players unlock new content in the game as they book tours and interact with guides
> on land, and earn discounts / extras for their next tours or partner-provided goodies.

## Architecture
- **Backend**: FastAPI + Motor (MongoDB), all routes under `/api`
- **Auth**: Dual — JWT email/password (httpOnly cookie) + Emergent-managed Google OAuth
- **AI**: Claude Sonnet 4.5 (`claude-sonnet-4-5-20250929`) via `emergentintegrations` + `EMERGENT_LLM_KEY`
- **Frontend**: React 19 + React Router 7 + Shadcn UI + Tailwind, custom Mauritius palette (jungle / sand / sunset / sun / ocean)
- **Design**: Cabinet Grotesk headings + Manrope body, organic earthy theme (no Inter, no purple gradients)

## User Personas
1. **Explorer (player)** — books tours, completes quests, collects cards/badges, redeems rewards.
2. **Admin (An Deor staff)** — marks tour bookings as completed to award XP & rewards to players.
3. **Guides (future)** — currently represented in flow but check-in is mocked / admin-driven.

## Core requirements (static)
- Gamification: XP, levels, quests, badges, collectible cards, regions to unlock.
- Mauritius-themed map: 5 regions, each progressively unlockable.
- Marketplace of tours (outdoor + cultural).
- Booking flow (mocked).
- Rewards: discount codes + partner goodies (unlocked by XP thresholds).
- Leaderboard top-20.
- AI travel companion "Ti Dodo".
- Admin panel for tour-complete awarding.

## What's been implemented (2026-02 / iteration 16 — CINEMATIC AUDIO + UPDATED PROLOGUE & HOW-TO-PLAY)
- ✅ **Cinematic music now plays** — `MapCinematic.jsx` no longer hardcodes `muted`. Since the user has just clicked "Enter Mauritius" (a user gesture), we autoplay the `prologue_to_map.mp4` with sound (volume 0.7) and fall back to muted-autoplay if the browser refuses. Added a top-left **♪ Sound on / Mute** toggle so users can recover audio if the unmuted autoplay was blocked.
- ✅ **Prologue dialogue expanded (5 → 6 beats)** — Ti Dodo now mentions both the booking path *and* the free trail path with him as the live narrator, and explicitly calls out cards / titles / real-world rewards / shareable postcards.
- ✅ **How-to-play tutorial expanded (4 → 5 cards)** to reflect the evolved game:
  1. **Travel the island** — book real outdoor & cultural tours from An Deor's marketplace
  2. **Or walk a free trail** — GPS-guided self-guided journeys with Ti Dodo narrating live + shareable postcard at the end
  3. **Quest & earn** — XP, region cards, badges, titles
  4. **Chase the Sagas** — Main Quests for 50% bundle vouchers + partner goodies
  5. **Climb the leaderboard** — Top Explorer of Mauritius
- ✅ Refactored Prologue step numbers into named constants (`NAME_STEP`, `AVATAR_STEP`, `REGISTER_STEP`, `TUTORIAL_START`, `TUTORIAL_END`) so future tutorial/dialog growth no longer needs spelunking for literals.

## What's been implemented (2026-02 / iteration 15 — PER-PIN PREVIEW POPOVERS FOR SELF-GUIDED TRAILS)
- ✅ **`SelfGuidedPinPreview.jsx`** — new compact, anchored popover (≤17rem wide) that appears when a player taps any free self-guided trail pin. Replaces the previous heavy `SelfGuidedModal`-on-every-click flow. Shows: stop name, "Free trail · stop N/M", journey title, **live distance** from the player (via a single `navigator.geolocation.getCurrentPosition()` fix with silent fallback), and two CTAs:
  - **Primary** "Start from here" / "Resume here" / "Walked" — POSTs `/api/self-guided/{id}/start` (idempotent), shows toast, dispatches `andeor:self-guided-changed` → floating HUD activates.
  - **Secondary** "Full" — opens the original full SelfGuidedModal for users who want the journey overview.
- ✅ **Toggle / swap UX** — tapping the same pin twice closes the popover; tapping another pin instantly swaps to that pin's preview. Escape key + X button also close.
- ✅ **Polish** — `<8m` distance displays "You are here ⨀" instead of "0 m"; close-X contrast bumped for sand background.
- ✅ Verified end-to-end across all 3 sub-maps (Port Louis, North Coast, Le Morne) by testing agent v3 — 11/11 frontend cases pass on the public preview URL.

## What's been implemented (2026-02 / iteration 14 — TRAIL EPILOGUE CUTSCENE + CONTEXT-AWARE LORE AUDIO)
- ✅ **Trail Epilogue Cutscene + Shareable Postcard** — when a player completes every stop of a self-guided journey, the backend's check-in returns a full `epilogue` payload (`title_earned`, `epilogue`, `stops[]`, theme colors). The frontend `SelfGuidedHud` dispatches `andeor:trail-completed`; the globally-mounted `TrailEpilogueWatcher` plays a 3-beat cinematic in `TrailEpilogue.jsx`:
  - Beat 1 — Ti Dodo farewell monologue (typewriter + auto-TTS, also playable via Listen button)
  - Beat 2 — Animated "Title Earned" medallion reveal (e.g. *"Maroon Trail Walker"*)
  - Beat 3 — Trail Postcard (html2canvas → PNG download or native share). Postcard shows player name, avatar initial, title earned, journey title/subtitle, walked-on date, and all conquered stops.
- ✅ **Time-of-day & weather-aware lore audio (Ti Dodo)** — intro / per-stop / epilogue narration now varies based on the player's clock (dawn/morning/midday/golden_hour/dusk/night) and live weather (clear/cloudy/fog/rain/thunder, via free Open-Meteo with silent fallback). The backend prepends a 1-line context phrase to the TTS script and caches each variant separately on disk (`sg__{journey}__{kind}__{tod}__{weather}.mp3`). Backwards compatible — no params = old behaviour.
- ✅ **Verified end-to-end** by testing agent v3 — 16/16 pytest backend cases pass, all frontend flows confirmed (Trail Epilogue beats, postcard PNG download, weather/tod params present in audio network calls).

## What's been implemented (2026-02 / iteration 13 — HUD MODALS + MAIN QUEST STORY + EPILOGUE CUTSCENE)
- ✅ **All right-rail HUD actions open as in-game modals** (Main Quests, Side Quests, Bag, Vault, Rank, Ti Dodo) instead of full-page routes — the map stays visible behind. Map and Admin buttons still navigate.
- ✅ **`HudPanels` modal host** renders each page embedded (`embedded` prop on Badges/Rewards/MainQuests/Quests/Leaderboard/Companion). Standalone routes still work for deep links.
- ✅ **Main Quests redesigned** as compact teaser cards (icon + title + 1-line subtitle + tiny progress). Tapping a saga opens an animated 3-chapter story:
  - Chapter 1 — Ti Dodo lore monologue (typewriter)
  - Chapter 2 — Tours in this saga (stagger reveal)
  - Chapter 3 — Rewards on completion + Enrol/Focus/Leave CTA
  - Keyboard: Space/Enter/→ advance · Esc returns to list
- ✅ **Main Quest Epilogue cutscene** — fires automatically when a saga is fully completed. 3 cinematic beats: Ti Dodo epilogue monologue → animated "Title Earned" crown reveal (e.g. *"Wayfarer of An Deor"*) → "Your spoils" panel with the generated 50% bundle voucher code (copy button), unique title, T-shirt/Partner Goodie tiers if AOV qualifies. Triggered globally via `andeor:checkin-completed` event → `EpilogueWatcher` polls `/main-quests/check-completion`.
- ✅ **Cinematic Prologue→Map transition** — a 5s video bridge plays after "Enter Mauritius" and cross-fades into the live map. Fixed a redirect race that wiped the cinematic state.
- ✅ **Removed +/- and reset zoom controls** + cursor parallax tilt on both maps (wheel/pinch/double-click zoom still work).


- ✅ **Avatar HUD inside Port Louis sub-map** — same UX as world map but scoped to city venues (tour-level codex picker instead of region-level)
- ✅ **Rich venue modal** replaces the simple "Accept this quest?" dialog: hero image, price/time/XP meta, italic teaser, audio sneak-peek player, "Read the full lore" expand button, "Accept the Quest" CTA
- ✅ **Expand-into-wider modal** — clicking "Read the full lore" smoothly transitions the modal from 1-column to 2-column with a parchment-styled codex panel showing the drop-cap full written lore alongside the booking card
- ✅ **Per-tour lore seeded** for all 7 Port Louis venues (Aapravasi, Blue Penny, Central Market, Cathedral, Citadelle, Champ de Mars, Creole Table) with rich 600-900 char stories
- ✅ **Tour-level TTS endpoints** — `GET /api/codex/tour/{tour_id}` and `GET /api/codex/tour-audio/{tour_id}` (generate-on-demand, cached as MP3 on disk)
- ✅ **TourCodex component** (used inside the Avatar HUD drawer when in city scope)

## What's been implemented (2026-02 / iteration 11 — CHARACTER AVATARS + HUD POLISH)
- ✅ **5 character guide portraits** (Naïma · Akil · Léa · Sanjay · Marie) self-hosted at `/public/avatars/*.jpg`
- ✅ Avatars now usable as **playable characters** (AvatarPickerDialog uses the JPGs with name + role + bio)
- ✅ Same images render in the NPC dialog inside RegionScene (replaces the old SVG chibi portraits)
- ✅ Legacy avatar IDs (diver/hiker/foodie/dancer/surfer/scholar) automatically remap to the new named guides
- ✅ Floating Avatar HUD now shows the player's chosen JPG inside the circular bubble
- ✅ Bottom-center info bar **removed** — XP bar lives under the avatar bubble instead, with more breathing room from viewport edges
- ✅ Radial action ring fans cleanly along the avatar's circle (5 icons spanning a quarter-arc)

## What's been implemented (2026-02 / iteration 10 — UX OVERHAUL: open world, direct city entry, zoom, avatar HUD)
- ✅ **All regions unlocked by default** — no more "sealed" gates anywhere. Backend backfills every existing user on startup
- ✅ **Direct Port Louis entry** — tapping the Port Louis pin on the world map opens the city sub-map immediately (RegionScene bypassed for central-culture)
- ✅ **Creole Table relocated** to the Port Louis sub-map with a chef-hat icon (now appears as a venue pin alongside Aapravasi/Blue Penny/Market/Cathedral/Citadelle/Champ de Mars)
- ✅ **Pan & zoom on both maps** — react-zoom-pan-pinch, wheel + drag + double-click + dedicated +/- /reset controls bottom-right, max zoom 3× world / 4× city
- ✅ **Floating Avatar HUD bottom-left** — hover the avatar bubble → radial fan of action icons (🎧 Listen · 📖 Read · 🗺 Tracks · 📜 Lore) → click opens a left-side drawer with region picker + the codex tabs (replaces the in-RegionScene codex panel)
- ✅ **Codex removed from RegionScene** — lives entirely in the Avatar HUD drawer now (cleaner separation: scenes for booking, HUD for lore)

## What's been implemented (2026-02 / iteration 9 — MAIN QUESTS + PORT LOUIS SUB-MAP)
- ✅ **Main Quests system** — 4 curated tour-bundle sagas (Wayfarer's Trail / Cascade Chaser / Heritage Keeper / Compleat Explorer) with theme colors, lore intros, epilogues, AOV-based reward tiers
- ✅ **Multi-enrol, single-focus** — players can join many Main Quests at once; one "Focused" quest drives the map highlight
- ✅ **Focused-pin aura on world map** — themed coloured halo + ring + drifting sparkles + remaining-count badge for any region containing a tour from the focused quest
- ✅ **Auto reward generation** — `/main-quests/check-completion` is idempotent; on full completion it emits a unique 50% bundle voucher code + adds a unique title + marks AOV tier (T-shirt at Rs 15k, Partner Goodie at Rs 25k)
- ✅ **Port Louis sub-map** — full-screen city overlay (custom artwork) with 6 venue pins (Aapravasi Ghat, Blue Penny, Central Market, Cathedral, Citadelle, Champ de Mars); booking dialog inline; focused-quest highlight applied to pins
- ✅ **/quests page renamed** to "Side Quests"; new `/main-quests` route added to RpgHud (Crown icon)
- ✅ **New tours seeded** — Tamarind 7-Cascades, Chamarel Falls + 6 Port Louis venues, all with city_x/city_y coords for sub-map rendering
- ✅ All backend covered by 14/14 pytest cases in `/app/backend/tests/test_iter7_main_quests.py`

## What's been implemented (2026-02 / iteration 8 — CODEX, AUDIO LORE, GPX, VIRALITY)
- ✅ **Region Codex panel** in RegionScene — 3 tabs (Listen / Read / Tracks), available even on LOCKED regions as a marketing/SEO surface
- ✅ **AI-narrated audio lore** via OpenAI TTS `tts-1-hd` voice `fable` (storytelling tone), cached as MP3 on disk under `/app/backend/uploads/audio/{region_id}.mp3`, ~60-70s per region
- ✅ **Written lore** seeded for all 5 regions (Le Morne UNESCO legend, Black River endemic forests, Sega birth on North Coast, etc.) — drop-cap typography, parchment styling
- ✅ **GPX hike tracks** — admin upload with auto-parsed distance_km + elevation_m (handles GPX 1.0 + 1.1 namespaces), public download (free for visitors, marketing win)
- ✅ **Admin lore editor** + audio regenerate buttons (PATCH invalidates the cached MP3 → next listener hears the new version)
- ✅ **Admin GPX uploader** per tour with delete + automatic .gpx validation (extension, 5MB cap, content sniff)
- ✅ **Shareable Badge PNG** — tap an owned badge in /badges to open a beautifully styled card (gradient + seal + lore title + player name + andeor.mu watermark). Save PNG via html2canvas or Web Share API to Instagram/WhatsApp
- ✅ **Fullscreen video map** — replaced static PNG with looping H.264/VP9 MP4 + WebM fallback, self-hosted from `/public` (782KB MP4 / 339KB WebM), cover-fit via CSS container queries
- ✅ All backend covered by 20/20 pytest cases in `/app/backend/tests/test_codex.py`

## What's been implemented (2026-02 / iteration 7 — MAP POLISH)
- ✅ **Pin coordinates re-calibrated** per geography: North Coast at top, Port Louis above the central mountains, Black River on the red-roof house (west coast), East Lagoons on the eastern green strip, Le Morne on the south-west mountain
- ✅ **Hover tooltip** per pin — speech-bubble showing region name + 1-line teaser (e.g. "Sega night · Naïma", "Blue Bay snorkel · Sanjay")
- ✅ **Cursor parallax**: map tilts up to ±3° on X/Y based on cursor position with smooth easing — amplifies the isometric feel
- ✅ **Animated waterfall**: cascading white streaks (2 layered gradients with different speeds) + pulsing splash rings at the base — positioned over the artwork's blue pool
- ✅ **Compass removed** from the map container (was getting visually lost on the ocean)
- ✅ Full-screen tropical ocean backdrop with drifting sun-glints (already in place from iter6, kept)
- ✅ All test IDs preserved + new `map-tooltip-{region_id}`

## What's been implemented (2026-02 / iteration 6 — ISOMETRIC ISLAND ART V1)
- ✅ Replaced the flat SVG island with the **user-supplied isometric Mauritius illustration** as the World Map V1
- ✅ Calibrated 5 region pin coordinates against the artwork (North Coast on the upper green hill, Black River near the waterfall pool, Port Louis on the central path, East Lagoons on the eastern shore, Le Morne on the southwestern peninsula)
- ✅ Redesigned pins as teardrop-style markers with stem + label, sun-glow halo for unlocked pins, fog-of-war over locked ones
- ✅ Replaced photo backdrop with a clean tropical-cyan ocean radial gradient + drifting sun-glint pattern + rotating dashed reef rings — the artwork now reads as the focal point
- ✅ All previous map test IDs (`map-region-*`), region scene flow, sound effects, and HUD preserved (no regressions)

## What's been implemented (2026-02 / iteration 5 — GAME-FEEL POLISH)
- ✅ **Soundscape (procedural Web Audio, no hosted files)**: ambient ocean (brown-noise → lowpass → slow LFO surf swell) on the world map starting on first gesture; click sfx on region pins / nav buttons; XP chime on successful guide check-in; fanfare on a new region unlock; mute toggle in HUD (persists via `localStorage`)
- ✅ **Animated map**: 5 swaying palm trees on the island (CSS `palmSway`), 3 rotating dashed ocean rings (`mapSpin`/`mapSpinR`), pulsing inner white ring, and a fog-of-war radial glow (`fogPulse` + 1.5px blur) over every locked region pin
- ✅ **NPC chibi portraits** (inline SVG, no external assets): Naïma (snorkel + braid), Akil (hiking hat + backpack), Léa (sunglasses + flowing hair), Sanjay (dive mask + curls), Marie (turban + earrings). Render next to the region dialog box
- ✅ **Pokedex discovery feed** on `/badges`: lists each unowned card with the tour that unlocks it (region + tour name) and a sun-tinted "Find quest" CTA → `/tours?focus={tour_id}` auto-scrolls and ring-highlights the target scroll
- ✅ Frontend e2e **100% ✅** of iter5 features. Backend unchanged.

## What's been implemented (2026-02 / iteration 4 — RPG WORLD REDESIGN)
- ✅ **Dashboard → immersive full-screen World Map**: Mauritius landscape backdrop, stylized SVG island with reef rings + compass, animated region pins (Waves/Mountain/Anchor/Wind/Landmark icons), Ti Dodo welcome ribbon
- ✅ **Region Scene overlay**: clicking a pin opens a Pokemon-style scene with the region's NPC guide (Naïma · Sea Guide, Akil · Trail Master, Léa · Wind Whisperer, Sanjay · Reef Keeper, Marie · Heritage Keeper), Creole dialogue, quest scrolls, and a "Return to map" button. Locked regions show a sealed state with XP threshold
- ✅ **RPG HUD** (replaces SaaS top-nav on all gameplay routes): bottom bar with avatar portrait (click → swap explorer), name, level chip, animated gradient XP bar with shimmer; right-side floating action menu (Map / Journal / Bag / Vault / Rank / Ti Dodo / Admin / Sign-out)
- ✅ **QuestScroll cards**: parchment-textured tour cards with torn-paper edges, sepia hero image, wax-seal XP badge — replaces product-style grid
- ✅ Re-themed every player page: Tours → "Adventurer's board", Quests → "Adventurer's journal", Badges → "Adventurer's bag", Rewards → "Treasure vault", Leaderboard → "Hall of explorers"
- ✅ Admin page intentionally keeps the previous admin-style Header (it should look like admin)
- ✅ `seed_admin` is now strictly idempotent for `avatar` & `tutorial_completed`
- ✅ Frontend e2e **100% ✅** of new RPG flows. Backend **54/54 ✅** after data-drift fix.

## What's been implemented (2026-02 / iteration 3)
- ✅ **Framer-motion Prologue polish**: Ken Burns background crossfade, `AnimatePresence mode="wait"` between scenes, staggered avatar grid entrance, slide-in tutorial cards, animated progress bar
- ✅ **One-click avatar swap from Header**: "Change explorer" dropdown item → `AvatarPickerDialog` (motion stagger) → `PATCH /api/me`, header icon updates live
- ✅ **Guide PIN check-in flow**: new `POST /api/bookings/checkin` (case-insensitive PIN, 400/403/404 paths, idempotent), `POST /api/bookings/complete` locked to admin (re-labelled "Force-award"), new `GET /api/admin/tours` exposes PINs to admins only, public `/api/tours` strips `guide_pin`
- ✅ Admin "Guide PINs" tab listing tour PINs with copy-to-clipboard (seeded: REEF42, RIDGE07, PIMENT9, WIND88, SEGA21)
- ✅ Backend pytest **54/54 ✅** (16 new + 38 regression), full frontend e2e ✅

## What's been implemented (2026-02 / iteration 2)
- ✅ Pokemon-style **Prologue** entry: 5 cinematic dialog beats with typewriter ("Ti Dodo" NPC), name input, 6 avatar starter explorers (Reef Diver, Ridge Hiker, Spice Hunter, Sega Dancer, Wind Rider, Heritage Scholar), inline register, and 4-beat "How to play" tutorial → enters the world map
- ✅ Marketing Landing page **removed**; `/` now boots straight into the Prologue
- ✅ Header avatar renders the chosen RPG avatar (Lucide icon over color gradient)
- ✅ ProtectedRoute gates non-admin users without `tutorial_completed` → redirected to `/onboarding`
- ✅ New backend: `PATCH /api/me` (update avatar / name / tutorial_completed) and `public_user` now exposes `avatar` + `tutorial_completed`; admin auto-seeded with `avatar='scholar'`, `tutorial_completed=true`
- ✅ Backend pytest **38/38 ✅** (11 new + 27 regression) and full frontend Prologue e2e flow ✅

## What's been implemented (2026-02 / iteration 1)
- ✅ JWT register/login + Emergent Google OAuth (button on login/register, AuthCallback page)
- ✅ Mauritius map dashboard with profile/XP/Level + region unlock state
- ✅ Tours marketplace (5 seed tours, filterable by outdoor/culture), booking dialog
- ✅ Quests page with progress bars + booking-complete flow (awards XP, region, card, badge, rewards)
- ✅ Collection page (5 cards + 5 badges) with locked/unlocked states
- ✅ Rewards page (copyable codes + redeem)
- ✅ Leaderboard (top 20, admin excluded)
- ✅ AI Companion "Ti Dodo" (multi-turn, history persisted in MongoDB)
- ✅ Admin panel: bookings table with Award action + players table
- ✅ Seeded admin (admin@andeor.mu / AnDeor2026!) and seed catalog data on startup
- ✅ 100% backend tests (27/27) and 100% frontend e2e tests pass

## P0/P1/P2 backlog
### P0 (must-have soon)
- Real booking flow (date selection, time slots, capacity)
- Guide-side check-in (replace self-complete with QR or guide code)
- Stripe / local payments for real bookings

### P1
- Email notifications (reward unlocked, quest completed) via Resend / SendGrid
- Partner marketplace catalog (partner onboarding, voucher inventory)
- Mobile-first PWA polish + share cards (referral)
- Brute-force lockout on /api/auth/login per playbook
- Optimize /api/chat to avoid replaying full history each call

### P2
- Push notifications (level up, weekly quest digest)
- Localization (English / French / Kreol)
- Photo-upload per completed tour to unlock special cards
- Social: friends, gift rewards
- Animated map (Lottie / Framer Motion intros, region zoom)

## Next tasks
- Gather user feedback on iteration 1 visuals & flow.
- Plan P0 items prioritized for next sprint (real bookings + guide check-in + payments).
