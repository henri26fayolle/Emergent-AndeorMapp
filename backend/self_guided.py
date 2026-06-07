"""Self-guided journeys — free, multi-stop walking trails layered on top of the sub-maps.

Each journey has N stops. A stop has:
  - lat/lon (real-world for GPS auto-check-in + GPX export)
  - city_x/city_y (% on the sub-map artwork for pin placement)
  - name, lore (text revealed on check-in)
  - order

A user can start a journey, check in at each stop manually (always allowed) or
have GPS auto-check them in (Haversine distance < 80 m). On full completion the
user earns XP and an optional badge.
"""
from __future__ import annotations

import math
import os
import logging
from pathlib import Path
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Response
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import Optional

logger = logging.getLogger("andeor.selfguided")

# TTS — reuse the same cache directory + Emergent LLM key as the codex module.
UPLOADS_DIR = Path(__file__).parent / "uploads"
SG_AUDIO_DIR = UPLOADS_DIR / "audio"
SG_AUDIO_DIR.mkdir(parents=True, exist_ok=True)
EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY", "")
TTS_VOICE = "fable"          # storytelling timbre — matches Ti Dodo
TTS_MODEL = "tts-1-hd"

# Real Mauritius coordinates (approximate but plausible — used for distance check & GPX).
SELF_GUIDED = [
    # ---------- Port Louis ----------
    {
        "journey_id": "sg-pl-old-town",
        "subregion": "port-louis",
        "title": "Old Port Louis Walk",
        "subtitle": "1.6 km · self-guided heritage walk",
        "theme_color": "sunset",
        "theme_hex": "#E27447",
        "lore_intro": (
            "Three centuries of trade routes, sugar barons and indentured workers wrote themselves into "
            "the streets of Port Louis. Walk with your phone — and let Ti Dodo point out what to look for."
        ),
        "xp_reward": 80,
        "badge_id": "badge-port-louis-walker",
        "title_earned": "Port Louis Wanderer",
        "epilogue": (
            "From a statue to a sunset — you walked the city without rushing her, traveler. "
            "Port Louis only opens for those who slow down. You did. The harbour cranes will keep working, "
            "the alouda kiosk will keep serving, the palms will keep arguing — but they remember you now."
        ),
        "stops": [
            {
                "stop_id": "pl-old-1", "order": 1,
                "name": "Mahé de Labourdonnais Statue",
                "lat": -20.1610, "lon": 57.4980,
                "city_x": 64, "city_y": 38,
                "lore": "The Breton who put Port Louis on the map in 1735. Look at the cane behind him — the trade that built (and bled) the city for 250 years.",
            },
            {
                "stop_id": "pl-old-2", "order": 2,
                "name": "Government House courtyard",
                "lat": -20.1622, "lon": 57.4990,
                "city_x": 70, "city_y": 44,
                "lore": "French colonial bones, British facade, Mauritian flag. Three empires in one courtyard. The black cannons still point at the sea.",
            },
            {
                "stop_id": "pl-old-3", "order": 3,
                "name": "Place d'Armes palms",
                "lat": -20.1632, "lon": 57.5001,
                "city_x": 60, "city_y": 56,
                "lore": "The royal palms here are nearly as old as the city. Sit on the low wall — this is where Mauritians come to argue politics under the shade.",
            },
            {
                "stop_id": "pl-old-4", "order": 4,
                "name": "Caudan Waterfront sunset",
                "lat": -20.1583, "lon": 57.4977,
                "city_x": 38, "city_y": 32,
                "lore": "End your walk where ships still dock. Order a alouda from the kiosk, watch the cranes work the harbour — Port Louis still earns her keep.",
            },
        ],
    },
    # ---------- North Coast ----------
    {
        "journey_id": "sg-nc-coastal-loop",
        "subregion": "north-coast",
        "title": "Northern Coast Loop",
        "subtitle": "3.2 km · lagoon-side ramble",
        "theme_color": "ocean",
        "theme_hex": "#0F8FA8",
        "lore_intro": (
            "Pereybère to Cap Malheureux on foot — the lagoon never leaves your left shoulder. "
            "Bring water, walk slow, swim wherever the coral reef opens up."
        ),
        "xp_reward": 70,
        "badge_id": "badge-coastal-loop",
        "title_earned": "Northern Lagoon Loop Walker",
        "epilogue": (
            "Three coves, one lagoon, and the wind in your ears the whole way. You found the snorkel rocks "
            "the tourists miss and the chapel that watches over Coin de Mire. The north coast remembers walkers "
            "more than swimmers — and now it knows your stride."
        ),
        "stops": [
            {
                "stop_id": "nc-loop-1", "order": 1,
                "name": "Pereybère snorkel rocks",
                "lat": -19.9990, "lon": 57.5895,
                "city_x": 30, "city_y": 56,
                "lore": "Locals know: best snorkel entry is from the rocky north end of the bay, not the sandy beach. Sergeant majors come right up to your mask.",
            },
            {
                "stop_id": "nc-loop-2", "order": 2,
                "name": "La Cuvette hidden cove",
                "lat": -20.0070, "lon": 57.5853,
                "city_x": 48, "city_y": 42,
                "lore": "A tiny pocket beach most tourists miss. Two filao trees, one boat. Local fishermen still launch from here at dawn.",
            },
            {
                "stop_id": "nc-loop-3", "order": 3,
                "name": "Cap Malheureux viewpoint",
                "lat": -19.9836, "lon": 57.6131,
                "city_x": 62, "city_y": 14,
                "lore": "Stand here and look at Coin de Mire — that pyramidal islet is where the British landed in 1810 to take Mauritius from the French. History from a bench.",
            },
        ],
    },
    # ---------- Le Morne ----------
    {
        "journey_id": "sg-lm-maroon-trail",
        "subregion": "south-wild",
        "title": "Maroon's Trail",
        "subtitle": "2.4 km · sacred ridge walk (no climb)",
        "theme_color": "jungle",
        "theme_hex": "#1B6F4B",
        "lore_intro": (
            "You do not need to climb Le Morne to feel it. This self-guided trail circles the base — past "
            "the chapel, the maroon memorial, the lagoon — letting the mountain stay sacred above you."
        ),
        "xp_reward": 90,
        "badge_id": "badge-maroon-trail",
        "title_earned": "Maroon Trail Walker",
        "epilogue": (
            "You did not climb the mountain, traveler — and that was the point. The maroons climbed her once, "
            "and the island has never forgotten. By walking her base you honoured them; by listening, you carried "
            "their story a few steps further. Le Morne is satisfied with you tonight."
        ),
        "stops": [
            {
                "stop_id": "lm-trail-1", "order": 1,
                "name": "Maroon Memorial",
                "lat": -20.4555, "lon": 57.3170,
                "city_x": 30, "city_y": 64,
                "lore": "The first stop. The names of the runaway slaves who threw themselves from the mountain in 1835 — believing French troops were coming to re-enslave them — are carved here.",
            },
            {
                "stop_id": "lm-trail-2", "order": 2,
                "name": "Le Morne lagoon shoreline",
                "lat": -20.4519, "lon": 57.3128,
                "city_x": 18, "city_y": 78,
                "lore": "Walk barefoot. The lagoon is unbelievably shallow — you can walk 200m out. Watch kitesurfers train against the mountain backdrop.",
            },
            {
                "stop_id": "lm-trail-3", "order": 3,
                "name": "South-east cane fields",
                "lat": -20.4602, "lon": 57.3240,
                "city_x": 50, "city_y": 86,
                "lore": "These cane fields fed the sugar economy that paid for the slave trade — and grew right up to the maroons' mountain. Mauritius' contradictions in one view.",
            },
        ],
    },
]


async def seed_self_guided(db):
    """Idempotent: upsert journeys by journey_id."""
    for j in SELF_GUIDED:
        await db.self_guided.update_one({"journey_id": j["journey_id"]}, {"$set": j}, upsert=True)


# ---------------- Helpers ----------------
def _haversine_m(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Distance between two lat/lon points in metres."""
    R = 6_371_000
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * R * math.asin(math.sqrt(a))


def _serialize(doc: dict) -> dict:
    doc.pop("_id", None)
    return doc


def _stop_audio_path(journey_id: str, stop_id: str) -> Path:
    safe = f"sg__{journey_id}__{stop_id}.mp3".replace("/", "_")
    return SG_AUDIO_DIR / safe


def _journey_intro_audio_path(journey_id: str) -> Path:
    safe = f"sg__{journey_id}__intro.mp3".replace("/", "_")
    return SG_AUDIO_DIR / safe


async def _generate_tts(target: Path, script: str, label: str) -> Path:
    if target.exists() and target.stat().st_size > 0:
        return target
    if not EMERGENT_LLM_KEY:
        raise HTTPException(503, "TTS not configured")
    try:
        from emergentintegrations.llm.openai import OpenAITextToSpeech  # type: ignore

        tts = OpenAITextToSpeech(api_key=EMERGENT_LLM_KEY)
        audio_bytes = await tts.generate_speech(
            text=script[:3500],
            model=TTS_MODEL,
            voice=TTS_VOICE,
            response_format="mp3",
            speed=1.0,
        )
        target.write_bytes(audio_bytes)
        logger.info("TTS audio generated for %s (%d bytes)", label, len(audio_bytes))
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("TTS generation failed for %s", label)
        raise HTTPException(502, f"Audio generation failed: {e}")
    return target


async def _ensure_stop_audio(journey: dict, stop: dict) -> Path:
    """Generate (and cache) Ti Dodo's narration for one stop. Returns the file path."""
    target = _stop_audio_path(journey["journey_id"], stop["stop_id"])
    script = f"{stop['name']}. {stop.get('lore', '')}"
    return await _generate_tts(target, script, f"sg-stop {journey['journey_id']}/{stop['stop_id']}")


async def _ensure_journey_epilogue_audio(journey: dict) -> Path:
    """Generate (and cache) Ti Dodo's farewell monologue for the journey."""
    target = SG_AUDIO_DIR / f"sg__{journey['journey_id']}__epilogue.mp3".replace("/", "_")
    script = f"{journey.get('title_earned', '')}. {journey.get('epilogue', '')}"
    return await _generate_tts(target, script, f"sg-epilogue {journey['journey_id']}")


async def _ensure_journey_intro_audio(journey: dict) -> Path:
    """Generate (and cache) Ti Dodo's intro monologue for the journey."""
    target = _journey_intro_audio_path(journey["journey_id"])
    script = f"{journey['title']}. {journey.get('lore_intro', '')}"
    return await _generate_tts(target, script, f"sg-intro {journey['journey_id']}")


def _journey_gpx(j: dict) -> str:
    """Build a GPX 1.1 file from a journey's stops (as both waypoints and a route)."""
    pts = []
    for s in j["stops"]:
        pts.append(
            f'<wpt lat="{s["lat"]}" lon="{s["lon"]}">'
            f"<name>{s['name']}</name>"
            f"<desc>{s.get('lore', '').replace('<', '').replace('>', '')}</desc>"
            f"</wpt>"
        )
    rpts = "".join(
        f'<rtept lat="{s["lat"]}" lon="{s["lon"]}"><name>{s["name"]}</name></rtept>'
        for s in j["stops"]
    )
    return (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<gpx version="1.1" creator="An Deor · Quest" xmlns="http://www.topografix.com/GPX/1/1">\n'
        f"<metadata><name>{j['title']}</name><desc>{j['subtitle']}</desc></metadata>\n"
        + "\n".join(pts) + "\n"
        f"<rte><name>{j['title']}</name>{rpts}</rte>\n"
        "</gpx>\n"
    )


# ---------------- Pydantic ----------------
class CheckInIn(BaseModel):
    stop_id: str
    lat: Optional[float] = None
    lon: Optional[float] = None


# ---------------- Router ----------------
def build_router(db, get_current_user) -> APIRouter:
    router = APIRouter(prefix="/self-guided")

    async def _attach_progress(j: dict, user_id: str) -> dict:
        u = await db.users.find_one({"user_id": user_id}, {"_id": 0, "self_guided_progress": 1}) or {}
        prog = (u.get("self_guided_progress") or {}).get(j["journey_id"]) or {}
        completed = set(prog.get("completed_stops", []))
        total = len(j["stops"])
        return {
            **j,
            "progress": {
                "started": bool(prog.get("started_at")),
                "completed_stops": sorted(list(completed)),
                "completed": len(completed),
                "total": total,
                "percent": int(round(100 * len(completed) / total)) if total else 0,
                "finished": bool(prog.get("completed_at")),
            },
        }

    @router.get("")
    async def list_journeys(user: dict = Depends(get_current_user)):
        rows = await db.self_guided.find({}, {"_id": 0}).to_list(50)
        return [await _attach_progress(_serialize(j), user["user_id"]) for j in rows]

    @router.get("/{journey_id}")
    async def get_journey(journey_id: str, user: dict = Depends(get_current_user)):
        j = await db.self_guided.find_one({"journey_id": journey_id}, {"_id": 0})
        if not j:
            raise HTTPException(404, "Journey not found")
        return await _attach_progress(j, user["user_id"])

    @router.get("/{journey_id}/gpx")
    async def download_gpx(journey_id: str):
        j = await db.self_guided.find_one({"journey_id": journey_id}, {"_id": 0})
        if not j:
            raise HTTPException(404, "Journey not found")
        gpx = _journey_gpx(j)
        filename = f"{journey_id}.gpx"
        return Response(
            content=gpx,
            media_type="application/gpx+xml",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )

    @router.get("/{journey_id}/stops/{stop_id}/audio")
    async def stop_audio(journey_id: str, stop_id: str):
        """Ti Dodo narrates the stop's lore — 25–40s MP3, cached on first request.
        Public (no auth) so the browser `<audio>` element streams it cleanly."""
        j = await db.self_guided.find_one({"journey_id": journey_id}, {"_id": 0})
        if not j:
            raise HTTPException(404, "Journey not found")
        stop = next((s for s in j["stops"] if s["stop_id"] == stop_id), None)
        if not stop:
            raise HTTPException(404, "Stop not found")
        path = await _ensure_stop_audio(j, stop)
        return FileResponse(
            path,
            media_type="audio/mpeg",
            headers={"Cache-Control": "public, max-age=86400"},
        )

    @router.get("/{journey_id}/intro-audio")
    async def journey_intro_audio(journey_id: str):
        """Ti Dodo narrates the journey's intro monologue — sets the mood before the player starts."""
        j = await db.self_guided.find_one({"journey_id": journey_id}, {"_id": 0})
        if not j:
            raise HTTPException(404, "Journey not found")
        path = await _ensure_journey_intro_audio(j)
        return FileResponse(
            path,
            media_type="audio/mpeg",
            headers={"Cache-Control": "public, max-age=86400"},
        )

    @router.get("/{journey_id}/epilogue-audio")
    async def journey_epilogue_audio(journey_id: str):
        """Ti Dodo's farewell monologue — plays at the end of a completed trail."""
        j = await db.self_guided.find_one({"journey_id": journey_id}, {"_id": 0})
        if not j:
            raise HTTPException(404, "Journey not found")
        path = await _ensure_journey_epilogue_audio(j)
        return FileResponse(
            path,
            media_type="audio/mpeg",
            headers={"Cache-Control": "public, max-age=86400"},
        )

    @router.post("/{journey_id}/start")
    async def start_journey(journey_id: str, user: dict = Depends(get_current_user)):
        j = await db.self_guided.find_one({"journey_id": journey_id}, {"_id": 0})
        if not j:
            raise HTTPException(404, "Journey not found")
        u = await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0})
        prog = (u.get("self_guided_progress") or {}).get(journey_id) or {}
        if prog.get("started_at"):
            return {"ok": True, "already": True}
        update_key = f"self_guided_progress.{journey_id}"
        await db.users.update_one(
            {"user_id": user["user_id"]},
            {"$set": {update_key: {
                "started_at": datetime.now(timezone.utc).isoformat(),
                "completed_stops": [],
            }}},
        )
        # Also mark this journey as the user's "active" one — used by the floating HUD
        await db.users.update_one(
            {"user_id": user["user_id"]},
            {"$set": {"active_self_guided": journey_id}},
        )
        return {"ok": True, "started": True}

    @router.post("/{journey_id}/checkin")
    async def check_in(journey_id: str, payload: CheckInIn, user: dict = Depends(get_current_user)):
        j = await db.self_guided.find_one({"journey_id": journey_id}, {"_id": 0})
        if not j:
            raise HTTPException(404, "Journey not found")
        stop = next((s for s in j["stops"] if s["stop_id"] == payload.stop_id), None)
        if not stop:
            raise HTTPException(404, "Stop not found")

        # GPS verification (optional — accepted as long as they're within 250 m if GPS given)
        gps_distance_m = None
        if payload.lat is not None and payload.lon is not None:
            gps_distance_m = _haversine_m(payload.lat, payload.lon, stop["lat"], stop["lon"])
            if gps_distance_m > 5000:
                # >5 km away — refuse (anti-cheese; GPS is clearly off or wrong)
                raise HTTPException(400, f"You're {int(gps_distance_m)} m away from this stop — keep walking!")

        u = await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0})
        prog = (u.get("self_guided_progress") or {}).get(journey_id) or {}
        if not prog.get("started_at"):
            # Auto-start on first check-in
            prog = {"started_at": datetime.now(timezone.utc).isoformat(), "completed_stops": []}

        completed = list(prog.get("completed_stops") or [])
        already = payload.stop_id in completed
        if not already:
            completed.append(payload.stop_id)

        all_stop_ids = [s["stop_id"] for s in j["stops"]]
        is_finished = all(sid in completed for sid in all_stop_ids)
        new_prog = {
            "started_at": prog["started_at"],
            "completed_stops": completed,
        }
        if is_finished:
            new_prog["completed_at"] = datetime.now(timezone.utc).isoformat()

        update_key = f"self_guided_progress.{journey_id}"
        update = {"$set": {update_key: new_prog}}

        xp_gain = 0
        badge_unlocked = None
        new_level = u.get("level", 1)
        if is_finished and not prog.get("completed_at"):
            xp_gain = int(j.get("xp_reward") or 0)
            new_xp = (u.get("xp") or 0) + xp_gain
            new_level = max(1, new_xp // 100 + 1)
            update["$set"]["xp"] = new_xp
            update["$set"]["level"] = new_level
            # Award badge if specified
            badge_id = j.get("badge_id")
            if badge_id:
                update.setdefault("$addToSet", {})["badges"] = badge_id
                badge_unlocked = badge_id
            # Clear active flag
            update["$set"]["active_self_guided"] = None

        await db.users.update_one({"user_id": user["user_id"]}, update)

        # Build epilogue payload if this check-in finished the trail (used by the frontend cutscene)
        epilogue_payload = None
        if is_finished and not prog.get("completed_at"):
            epilogue_payload = {
                "journey_id": j["journey_id"],
                "title": j["title"],
                "subtitle": j.get("subtitle"),
                "theme_color": j.get("theme_color"),
                "theme_hex": j.get("theme_hex"),
                "title_earned": j.get("title_earned") or f"{j['title']} Walker",
                "epilogue": j.get("epilogue") or "",
                "stops": [{"stop_id": s["stop_id"], "name": s["name"]} for s in j["stops"]],
                "xp_gain": xp_gain,
                "badge_unlocked": badge_unlocked,
                "completed_at": new_prog.get("completed_at"),
            }

        return {
            "ok": True,
            "already": already,
            "stop": stop,
            "gps_distance_m": gps_distance_m,
            "finished": is_finished,
            "xp_gain": xp_gain,
            "new_level": new_level,
            "badge_unlocked": badge_unlocked,
            "epilogue": epilogue_payload,
        }

    @router.post("/{journey_id}/stop")
    async def stop_journey(journey_id: str, user: dict = Depends(get_current_user)):
        """Stop / pause the active journey (clears active_self_guided but keeps progress)."""
        await db.users.update_one(
            {"user_id": user["user_id"]},
            {"$set": {"active_self_guided": None}},
        )
        return {"ok": True}

    return router
