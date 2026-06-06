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
