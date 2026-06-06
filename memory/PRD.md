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
