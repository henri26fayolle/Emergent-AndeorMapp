"""
Vacoas Information Center — auxiliary data modules
==================================================

Powers the non-weather tabs of the centre-map Information Center:
  • events       → Mauritian public holidays (Hindu/Tamil/Christian/Muslim/secular)
                   + cultural events near major venues
  • transport    → ride-share & taxi contacts, road advisories, public transport tips,
                   plus a "book a transfer" stub (mocked until the partner app integrates)
  • safety       → surf reports, current cyclone alert level (auto-from weather),
                   rip current advisories at the most popular beaches

All routes are read-only and unauthenticated — the same model as `/meteo/trails`.
Data is curated in code today; promoting any one of these to a DB-backed module
later is trivial because each route shapes its own JSON.
"""
from __future__ import annotations

from datetime import date, datetime, timedelta
from typing import List, Optional

from fastapi import APIRouter


# ---------------------------------------------------------------------------
# Events & Holidays
# ---------------------------------------------------------------------------

# Known public holidays for the next ~2 calendar windows.
# `tradition` labels are colour-coded in the UI so players can see at a glance
# which culture's calendar a day belongs to.
HOLIDAYS = [
    # 2026
    {"date": "2026-01-01", "name": "New Year's Day",                "tradition": "secular",   "note": "Banks, shops & most attractions closed."},
    {"date": "2026-01-02", "name": "New Year's Day (Day 2)",        "tradition": "secular",   "note": "Many businesses still closed."},
    {"date": "2026-02-01", "name": "Abolition of Slavery",          "tradition": "secular",   "note": "National commemoration — Le Morne ceremonies."},
    {"date": "2026-02-15", "name": "Thaipoosam Cavadee",            "tradition": "tamil",     "note": "Devotees walk barefoot bearing milk pots — public processions across the island."},
    {"date": "2026-02-17", "name": "Chinese Spring Festival",       "tradition": "chinese",   "note": "Chinatown Port Louis erupts in fireworks & lion dances."},
    {"date": "2026-03-12", "name": "Independence Day",              "tradition": "secular",   "note": "Parades, fireworks at Champ de Mars."},
    {"date": "2026-03-21", "name": "Ougadi (Telugu New Year)",      "tradition": "hindu",     "note": "Telugu New Year — temple offerings & sweet pachadi."},
    {"date": "2026-03-31", "name": "Eid al-Fitr",                   "tradition": "muslim",    "note": "End of Ramadan — mosques across the island, restaurants close until evening."},
    {"date": "2026-05-01", "name": "Labour Day",                    "tradition": "secular",   "note": "Public holiday — most beaches packed."},
    {"date": "2026-08-15", "name": "Assumption of Mary",            "tradition": "christian", "note": "Catholic feast — churches packed, esp. Cap Malheureux."},
    {"date": "2026-09-09", "name": "Père Laval Pilgrimage",         "tradition": "christian", "note": "Pilgrimage to Sainte-Croix shrine — Mauritius' most attended Catholic day."},
    {"date": "2026-11-01", "name": "All Saints' Day",               "tradition": "christian", "note": "Cemeteries lit with candles in the evening."},
    {"date": "2026-11-02", "name": "Arrival of Indentured Labourers", "tradition": "secular", "note": "Aapravasi Ghat ceremony in Port Louis."},
    {"date": "2026-11-08", "name": "Diwali",                        "tradition": "hindu",     "note": "Festival of Lights — every home aglow with oil lamps."},
    {"date": "2026-12-25", "name": "Christmas Day",                 "tradition": "christian", "note": "Family lunches, beaches packed in the afternoon."},
    # 2027 (so the calendar still reads as 'upcoming' through Dec 2026)
    {"date": "2027-01-01", "name": "New Year's Day",                "tradition": "secular",   "note": "Banks, shops & most attractions closed."},
    {"date": "2027-02-04", "name": "Thaipoosam Cavadee",            "tradition": "tamil",     "note": "Annual Tamil pilgrimage & milk-pot procession."},
    {"date": "2027-02-06", "name": "Chinese Spring Festival",       "tradition": "chinese",   "note": "Chinatown Port Louis comes alive."},
    {"date": "2027-03-12", "name": "Independence Day",              "tradition": "secular",   "note": "Champ de Mars parades & fireworks."},
    {"date": "2027-03-20", "name": "Ougadi",                        "tradition": "hindu",     "note": "Telugu New Year."},
    {"date": "2027-03-20", "name": "Eid al-Fitr",                   "tradition": "muslim",    "note": "End of Ramadan."},
    {"date": "2027-05-01", "name": "Labour Day",                    "tradition": "secular",   "note": "Public holiday."},
]

# Cultural events at major venues — single static seed for now.
VENUE_EVENTS = [
    {"event_id": "evt-sega-night",   "venue": "Le Morne Beach",         "title": "Sega Tipik Night",       "when_pattern": "Every Saturday · 19h00",       "tradition": "sega",       "tagline": "Live ravanne drums + traditional dancers."},
    {"event_id": "evt-port-louis-fri", "venue": "Caudan Waterfront",   "title": "Friday Night Market",     "when_pattern": "Every Friday · 18h00–22h00",   "tradition": "creole",     "tagline": "Street food, kreol fusion, local craft."},
    {"event_id": "evt-pere-laval-pilgrimage", "venue": "Sainte-Croix Shrine", "title": "Père Laval Mass",   "when_pattern": "Daily · 06h00 (peaks 9 Sep)",  "tradition": "christian",  "tagline": "Pilgrimage shrine — Mauritius' most visited Catholic site."},
    {"event_id": "evt-chinatown",    "venue": "Port Louis Chinatown",  "title": "Chinese Food Festival",   "when_pattern": "First weekend of every month", "tradition": "chinese",    "tagline": "Lantern-lit alley, dim sum, lion dance opener."},
]


def _upcoming_holidays(today: date, limit: int = 6) -> List[dict]:
    rows = []
    for h in HOLIDAYS:
        try:
            d = datetime.strptime(h["date"], "%Y-%m-%d").date()
        except Exception:
            continue
        if d < today:
            continue
        delta = (d - today).days
        rows.append({**h, "days_until": delta, "weekday": d.strftime("%A")})
    rows.sort(key=lambda r: r["date"])
    return rows[:limit]


# ---------------------------------------------------------------------------
# Transport
# ---------------------------------------------------------------------------

RIDESHARE = [
    {"name": "Yego Ride",  "kind": "Ride-share app", "phone": "+230 5947 7777", "note": "Most widespread island-wide ride-share."},
    {"name": "Cab Online", "kind": "Booking app",    "phone": "+230 460 2200",  "note": "Pre-book airport & inter-city transfers."},
    {"name": "HeyCab",     "kind": "Ride-share app", "phone": "+230 5942 4322", "note": "Newer entrant — fewer cars at night."},
]

TAXIS = [
    {"name": "Marie Reine de la Paix Stand", "where": "Port Louis – Marie Reine de la Paix", "phone": "+230 211 5500", "note": "Reliable for north-bound trips."},
    {"name": "Grand Baie Taxi Stand",        "where": "Grand Baie – Sunset Boulevard",        "phone": "+230 263 5152", "note": "Tour-friendly drivers, English-speaking."},
    {"name": "Curepipe Central",             "where": "Curepipe – Town Centre",               "phone": "+230 670 1010", "note": "Best for Black River & south-bound trips."},
]

PUBLIC_TRANSIT_TIPS = [
    "Bus passes are paid in cash — keep small Rs50/Rs100 notes on you.",
    "Metro Express runs Port Louis ↔ Curepipe daily, 05h30–22h30 — fastest way to cross the central plateau.",
    "Last buses on most lines stop running by 19h30; plan a taxi if you'll be out past then.",
    "Major routes: 198 (Airport ↔ Port Louis), 6 (Port Louis ↔ Grand Baie), 158 (Curepipe ↔ Mahebourg).",
]

# Static seed; later you can hydrate this from a partner road-conditions feed.
ROAD_ADVISORIES = [
    # {"road": "M1 Motorway", "status": "caution", "note": "Roadworks near Phoenix flyover — expect 15-min delays.", "updated_at": "2026-02-08"},
]


# ---------------------------------------------------------------------------
# Safety advisories — surf, cyclone level, rip currents
# ---------------------------------------------------------------------------

# Famous beaches + their typical rip-current risk profile.
BEACH_PROFILES = [
    {"beach_id": "le-morne",       "name": "Le Morne",        "region": "south-wild",     "lat": -20.4555, "lon": 57.3210, "rip_profile": "high",     "note": "Strong rip channels behind the reef — stay inside the lagoon line."},
    {"beach_id": "tamarin",        "name": "Tamarin Bay",     "region": "black-river",    "lat": -20.3260, "lon": 57.3700, "rip_profile": "moderate", "note": "Surf break — swim south of the surfers, never alone at dawn."},
    {"beach_id": "flic-en-flac",   "name": "Flic-en-Flac",    "region": "black-river",    "lat": -20.2900, "lon": 57.3700, "rip_profile": "low",      "note": "Long protected lagoon — safest family beach on the west."},
    {"beach_id": "grand-baie",     "name": "Grand Baie",      "region": "north-coast",    "lat": -20.0150, "lon": 57.5800, "rip_profile": "low",      "note": "Sheltered bay — boat traffic is the bigger risk than currents."},
    {"beach_id": "blue-bay",       "name": "Blue Bay",        "region": "east-lagoons",   "lat": -20.4470, "lon": 57.7160, "rip_profile": "low",      "note": "Marine park — current picks up around the channel."},
    {"beach_id": "belle-mare",     "name": "Belle Mare",      "region": "east-lagoons",   "lat": -20.1900, "lon": 57.7820, "rip_profile": "moderate", "note": "Watch the channel where the reef opens — strong outflow at falling tide."},
]


def _cyclone_level_from_bucket(bucket: Optional[str], wind_kmh: Optional[float]) -> dict:
    """Coarse mapping from current weather to the Mauritius cyclone warning ladder."""
    w = float(wind_kmh or 0.0)
    if bucket in ("thunder_hail",):
        return {"level": 3, "label": "Class III — Take shelter", "color": "#B33C1B", "note": "Severe storm overhead. Stay indoors, away from windows."}
    if bucket in ("thunder",) or w >= 90:
        return {"level": 2, "label": "Class II — Restrict outdoor activities", "color": "#D45A2D", "note": "Strong storm conditions. Beach activities suspended."}
    if bucket in ("heavy_rain",) or w >= 55:
        return {"level": 1, "label": "Class I — Be vigilant", "color": "#E8B241", "note": "Atmospheric disturbance — keep an eye on bulletins."}
    return {"level": 0, "label": "All clear", "color": "#3FAC73", "note": "No active warning. Routine sea conditions."}


def _surf_from_weather(wind_kmh: Optional[float], bucket: Optional[str]) -> dict:
    """Map central-plateau wind into a coarse west-coast surf report."""
    w = float(wind_kmh or 0.0)
    if w >= 55:
        size = "Big swell · 2–3 m"
        note = "Expert surfers only. Lagoon reefs break heavy — Tamarin firing."
    elif w >= 35:
        size = "Solid waves · 1.5–2 m"
        note = "Tamarin & Le Morne reef working — intermediates okay with a guide."
    elif w >= 20:
        size = "Playful · 1–1.5 m"
        note = "Good for longboarders & beginners on outer Tamarin."
    else:
        size = "Glassy · < 1 m"
        note = "Better for stand-up paddle today. Bring snorkel gear instead."
    if bucket in ("thunder", "thunder_hail"):
        return {"size": "Unsafe — storm offshore", "note": "Get out of the water. Wait for the bulletin."}
    return {"size": size, "note": note}


# ---------------------------------------------------------------------------
# Router
# ---------------------------------------------------------------------------

def build_router() -> APIRouter:
    """Adds /info/events, /info/transport, /info/safety routes.

    The /info/safety route accepts an in-memory snapshot of the current weather
    via the same upstream call as /meteo/trails — but it's cheap because of the
    10-min cache there. We import meteo lazily to avoid a circular import."""
    router = APIRouter(prefix="/info")

    @router.get("/events")
    async def events():
        today = date.today()
        return {
            "today":     today.isoformat(),
            "holidays":  _upcoming_holidays(today, limit=8),
            "events":    VENUE_EVENTS,
        }

    @router.get("/transport")
    async def transport():
        return {
            "rideshare":            RIDESHARE,
            "taxis":                TAXIS,
            "public_transit_tips":  PUBLIC_TRANSIT_TIPS,
            "road_advisories":      ROAD_ADVISORIES,
            "partner_transfer_app": {
                "name":     "An Deor Transfers",
                "status":   "coming_soon",
                "note":     "Direct booking from inside the game — pairs with your partner transfer app. Tap 'Book a transfer' to register interest.",
            },
        }

    @router.post("/transport/book")
    async def book_transfer():
        """Mocked booking endpoint — returns a stub reference until the partner app is wired in."""
        ref = f"AND-T-{int(datetime.utcnow().timestamp())}"
        return {
            "ok":        True,
            "reference": ref,
            "note":      "Interest registered — a transfer concierge will reach out once the partner integration goes live.",
        }

    @router.get("/safety")
    async def safety():
        # Pull the current weather snapshot from the meteo cache (cheap; same TTL)
        from meteo import _cache, _fetch_open_meteo, _bucket  # local import — keeps modules decoupled
        import time as _t

        weather_snap = None
        try:
            payload = _cache.get("payload")
            if not payload or (_t.time() - _cache.get("ts", 0)) > 600:
                raw = await _fetch_open_meteo()
                cur = (raw.get("current") or {})
                weather_snap = {
                    "wind_kmh": cur.get("wind_speed_10m"),
                    "bucket":   _bucket(cur.get("weather_code")),
                }
            else:
                weather_snap = {
                    "wind_kmh": payload["weather"].get("wind_kmh"),
                    "bucket":   payload["weather"].get("bucket"),
                }
        except Exception:
            weather_snap = {"wind_kmh": None, "bucket": "clear"}

        cyclone = _cyclone_level_from_bucket(weather_snap["bucket"], weather_snap["wind_kmh"])
        surf    = _surf_from_weather(weather_snap["wind_kmh"], weather_snap["bucket"])

        return {
            "cyclone":  cyclone,
            "surf":     surf,
            "beaches":  BEACH_PROFILES,
            "updated_at": int(_t.time()),
        }

    return router


# Backwards-compat name (for parity with meteo.py's `build_router`).
__all__ = ["build_router"]
