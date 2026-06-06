"""Codex (lore + audio + GPX) module for An Deor Quest."""
from __future__ import annotations

import os
import re
import logging
from pathlib import Path
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import FileResponse

from emergentintegrations.llm.openai import OpenAITextToSpeech

logger = logging.getLogger("andeor.codex")

# Where audio + gpx live on disk
UPLOADS_DIR = Path(__file__).parent / "uploads"
AUDIO_DIR = UPLOADS_DIR / "audio"
GPX_DIR = UPLOADS_DIR / "gpx"
AUDIO_DIR.mkdir(parents=True, exist_ok=True)
GPX_DIR.mkdir(parents=True, exist_ok=True)

EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY", "")
TTS_VOICE = "fable"          # expressive, storytelling
TTS_MODEL = "tts-1-hd"       # high quality (cached, so cost is one-off)


# ---------- Seed lore (rich written content for each region) ----------
REGION_LORE = {
    "north-coast": {
        "lore_title": "Where the Sega Was Born",
        "lore_summary": "Lagoons of Grand Baie, fire-lit beaches, and the heartbeat of Mauritian Sega.",
        "lore_text": (
            "Long before the resorts arrived, the North Coast was a string of fishing villages — Pereybère, Cap Malheureux, "
            "Grand Baie — where pirogues were hand-carved from filao trees and nets were mended at sunrise. "
            "It is here, on these very beaches, that the Sega was born. Brought to life by enslaved Africans who carried "
            "the ravanne drum across the ocean, Sega became a coded language of resistance — danced at night, around fires, "
            "while the masters slept. Today, the Sega is UNESCO heritage, but in the North you can still hear it raw: "
            "barefoot on the sand, the ravanne warmed over flame to tighten its skin, hips swaying in patterns older than "
            "the island itself. Snorkel the calm lagoons by day — turtles drift over coral in water clear as glass — and "
            "return at dusk for a plate of vindaye poisson, a glass of rhum arrangé, and a Sega circle that may not end "
            "until the stars fade."
        ),
    },
    "black-river": {
        "lore_title": "Kingdom of the Black Rivers",
        "lore_summary": "Endemic forests, the silhouette of Le Pouce, and the last sanctuary of the pink pigeon.",
        "lore_text": (
            "The Black River Gorges are Mauritius' green lung — a 6,500-hectare cathedral of endemic ebony, tambalacoque "
            "and ferns that once covered the entire island. When Dutch sailors first landed in 1598, this is the forest "
            "they walked into; what remains today is a precious last fragment. Hike the trails of Le Pouce or Pieter Both "
            "at dawn and you'll share the air with the Mauritius kestrel — saved from extinction at just four birds in 1974 "
            "— and the pink pigeon, our improbable phoenix. Rivers cut through ravines so steep that French planters once "
            "lost slaves to the forest's cover; Maroon communities lived hidden in these gorges for decades. The endemic "
            "flycatcher whistles. Black volcanic basalt glistens after rain. And when the cloud lifts off Le Pouce's "
            "thumb-shaped peak, you'll understand why the island's first settlers thought it was the home of the gods."
        ),
    },
    "south-wild": {
        "lore_title": "Le Morne, the Mountain that Wept",
        "lore_summary": "A UNESCO landmark, the freedom legend behind it, and the trade-wind capital of the world.",
        "lore_text": (
            "Le Morne Brabant is not just a mountain — it is a memorial. In the early 1800s, escaped slaves (Maroons) took "
            "refuge on its near-vertical cliffs, building a hidden community in the clouds. When, on the 1st of February 1835, "
            "a small group of soldiers climbed the peak — bringing, in fact, the news of abolition — the Maroons, fearing "
            "recapture, leapt from the cliffs to their deaths. The mountain still mourns them. Today, Le Morne is a UNESCO "
            "World Heritage Site, and the 1st of February is Mauritius' national day of remembrance. Below the cliffs, the "
            "trade winds funnel between mountain and reef, creating one of the most consistent kitesurf spots on Earth — "
            "where pros from every continent come to chase the famous 'One Eye' wave. Stand on the beach at sunset, watch "
            "the sky turn lava-orange behind that great brooding rock, and you'll feel both the freedom and the weight of "
            "this place at once."
        ),
    },
    "east-lagoons": {
        "lore_title": "The Turquoise Mirror",
        "lore_summary": "Ile aux Cerfs, the world's clearest lagoons, and a sailor's dream coastline.",
        "lore_text": (
            "The East Coast is what postcards lie about. Belle Mare, Trou d'Eau Douce, Blue Bay — a chain of lagoons so "
            "shallow and so still that the Indian Ocean becomes a mirror you can wade through. The reef sits a kilometre "
            "offshore, leaving a vast aquarium of pale-jade water rarely deeper than two metres. Sailors have used these "
            "lagoons for centuries: French Compagnie ships once anchored in Mahébourg before the great storm of 1744; "
            "today catamarans glide out at sunrise toward Ile aux Cerfs, an island of soft white sand and casuarina "
            "shade where dolphins still trail the bows. Below the surface, parrotfish crunch coral, eagle rays cruise the "
            "edges, and the Blue Bay Marine Park — a protected sanctuary since 1997 — keeps 38 species of coral alive in "
            "water you can read a book through. Snorkel slow, breathe slower, and the East Coast will rewrite your "
            "definition of the colour blue."
        ),
    },
    "central-culture": {
        "lore_title": "The Crossroads of Five Worlds",
        "lore_summary": "Port Louis, its markets, and the Creole language born from the sea winds.",
        "lore_text": (
            "Port Louis is what happens when five continents share an island. Founded in 1735 by the French governor "
            "Mahé de La Bourdonnais, the capital was, within a century, home to French planters, Indian indentured "
            "labourers, Chinese merchants, African slaves and freed Creoles — and from that improbable kitchen rose "
            "the Mauritian Creole language, a tongue that still surprises linguists with its joyful theft from every "
            "language that ever docked here. Walk the Central Market at dawn and you'll see it: an auntie hawking "
            "dholl puri in Creole next to a Tamil priest bartering for jasmine in Bhojpuri, while a fish stall plays "
            "Chinese opera and a French baker pulls baguettes from a wood oven older than the Eiffel Tower. The "
            "Aapravasi Ghat — a UNESCO site — marks the spot where 460,000 indentured workers stepped off ships onto a "
            "new world. Eat where the locals queue. Try the Sino-Mauritian boulettes. Sip an espresso in Champ de Mars, "
            "where horses have raced since 1812. This is where Mauritius becomes itself."
        ),
    },
}


async def seed_lore(db):
    """Idempotent: set lore fields on each region if missing or empty."""
    for region_id, lore in REGION_LORE.items():
        existing = await db.regions.find_one({"region_id": region_id})
        if not existing:
            continue
        needs_seed = (
            not existing.get("lore_text")
            or not existing.get("lore_title")
            or not existing.get("lore_summary")
        )
        if needs_seed:
            await db.regions.update_one(
                {"region_id": region_id},
                {"$set": lore},
            )


# ---------- Utilities ----------
def _safe(filename: str) -> str:
    return re.sub(r"[^A-Za-z0-9._-]", "_", filename)


def _audio_path(region_id: str) -> Path:
    return AUDIO_DIR / f"{_safe(region_id)}.mp3"


def _gpx_path(tour_id: str, filename: str) -> Path:
    return GPX_DIR / f"{_safe(tour_id)}__{_safe(filename)}"


async def _ensure_audio(region: dict) -> str:
    """Generate (and cache) the TTS audio for a region. Returns the relative URL."""
    region_id = region["region_id"]
    target = _audio_path(region_id)
    rel_url = f"/api/codex/audio/{region_id}"

    if target.exists() and target.stat().st_size > 0:
        return rel_url

    if not EMERGENT_LLM_KEY:
        raise HTTPException(503, "TTS not configured")

    title = region.get("lore_title", region.get("name", "Mauritius"))
    summary = region.get("lore_summary", "")
    body = region.get("lore_text", region.get("description", ""))
    script = f"{title}. {summary}  …  {body}"
    # 4096 char limit — trim safely
    script = script[:4000]

    try:
        tts = OpenAITextToSpeech(api_key=EMERGENT_LLM_KEY)
        audio_bytes = await tts.generate_speech(
            text=script,
            model=TTS_MODEL,
            voice=TTS_VOICE,
            response_format="mp3",
            speed=0.95,
        )
        target.write_bytes(audio_bytes)
        logger.info("TTS audio generated for %s (%d bytes)", region_id, len(audio_bytes))
    except Exception as e:
        logger.exception("TTS generation failed")
        raise HTTPException(502, f"Audio generation failed: {e}")

    return rel_url


# ---------- Router factory ----------
def build_router(db, require_admin, get_current_user) -> APIRouter:
    router = APIRouter(prefix="/codex")

    @router.get("/region/{region_id}")
    async def get_codex(region_id: str):
        """Public: returns lore + audio URL + gpx files for a region (no auth required so it's
        also a marketing/SEO surface for non-logged-in visitors)."""
        region = await db.regions.find_one({"region_id": region_id}, {"_id": 0})
        if not region:
            raise HTTPException(404, "Region not found")

        # Find GPX files attached to any tour of this region
        tours = await db.tours.find({"region": region_id}, {"_id": 0, "guide_pin": 0}).to_list(50)
        gpx_files = []
        for t in tours:
            for g in (t.get("gpx_files") or []):
                gpx_files.append({
                    "tour_id": t["tour_id"],
                    "tour_name": t["name"],
                    "filename": g["filename"],
                    "url": f"/api/codex/gpx/{t['tour_id']}/{g['filename']}",
                    "distance_km": g.get("distance_km"),
                    "elevation_m": g.get("elevation_m"),
                    "uploaded_at": g.get("uploaded_at"),
                })

        audio_ready = _audio_path(region_id).exists()
        return {
            "region_id": region_id,
            "name": region.get("name"),
            "lore_title": region.get("lore_title"),
            "lore_summary": region.get("lore_summary"),
            "lore_text": region.get("lore_text"),
            "audio_url": f"/api/codex/audio/{region_id}" if (region.get("lore_text") or "").strip() else None,
            "audio_ready": audio_ready,
            "gpx_files": gpx_files,
        }

    @router.get("/audio/{region_id}")
    async def stream_audio(region_id: str):
        """Stream the cached MP3, generating it on first request."""
        region = await db.regions.find_one({"region_id": region_id}, {"_id": 0})
        if not region:
            raise HTTPException(404, "Region not found")
        if not (region.get("lore_text") or "").strip():
            raise HTTPException(404, "No lore for this region yet")
        await _ensure_audio(region)
        target = _audio_path(region_id)
        return FileResponse(
            target,
            media_type="audio/mpeg",
            headers={"Cache-Control": "public, max-age=3600"},
        )

    @router.get("/gpx/{tour_id}/{filename}")
    async def download_gpx(tour_id: str, filename: str):
        tour = await db.tours.find_one({"tour_id": tour_id}, {"_id": 0})
        if not tour:
            raise HTTPException(404, "Tour not found")
        gpx = next((g for g in (tour.get("gpx_files") or []) if g["filename"] == filename), None)
        if not gpx:
            raise HTTPException(404, "GPX not found")
        path = _gpx_path(tour_id, filename)
        if not path.exists():
            raise HTTPException(404, "GPX file missing on disk")
        return FileResponse(
            path,
            media_type="application/gpx+xml",
            filename=filename,
        )

    # ---------- Admin endpoints ----------
    @router.patch("/admin/region/{region_id}")
    async def update_lore(region_id: str, payload: dict, _: dict = Depends(require_admin)):
        region = await db.regions.find_one({"region_id": region_id})
        if not region:
            raise HTTPException(404, "Region not found")
        update = {}
        for k in ("lore_title", "lore_summary", "lore_text"):
            if k in payload and isinstance(payload[k], str):
                update[k] = payload[k].strip()
        if not update:
            raise HTTPException(400, "Nothing to update")
        update["lore_updated_at"] = datetime.now(timezone.utc).isoformat()
        await db.regions.update_one({"region_id": region_id}, {"$set": update})
        # Invalidate cached audio so it's regenerated on next request
        audio_file = _audio_path(region_id)
        if audio_file.exists():
            try:
                audio_file.unlink()
            except Exception:
                pass
        return {"ok": True}

    @router.post("/admin/region/{region_id}/audio/regenerate")
    async def regenerate_audio(region_id: str, _: dict = Depends(require_admin)):
        region = await db.regions.find_one({"region_id": region_id}, {"_id": 0})
        if not region:
            raise HTTPException(404, "Region not found")
        audio_file = _audio_path(region_id)
        if audio_file.exists():
            try:
                audio_file.unlink()
            except Exception:
                pass
        await _ensure_audio(region)
        return {"ok": True, "audio_url": f"/api/codex/audio/{region_id}"}

    @router.post("/admin/tour/{tour_id}/gpx")
    async def upload_gpx(
        tour_id: str,
        file: UploadFile = File(...),
        _: dict = Depends(require_admin),
    ):
        tour = await db.tours.find_one({"tour_id": tour_id})
        if not tour:
            raise HTTPException(404, "Tour not found")
        if not (file.filename or "").lower().endswith(".gpx"):
            raise HTTPException(400, "Only .gpx files are allowed")

        safe_name = _safe(file.filename)
        path = _gpx_path(tour_id, safe_name)
        try:
            contents = await file.read()
            if len(contents) > 5 * 1024 * 1024:
                raise HTTPException(400, "GPX file too large (max 5MB)")
            if b"<gpx" not in contents[:2048].lower():
                raise HTTPException(400, "File does not look like a valid GPX")
            path.write_bytes(contents)
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(500, f"Upload failed: {e}")

        # Parse light metadata
        distance_km = None
        elevation_m = None
        try:
            import xml.etree.ElementTree as ET
            import math
            root = ET.fromstring(contents)
            ns = {"g": "http://www.topografix.com/GPX/1/1"}
            # GPX 1.0 vs 1.1 namespace difference — handle both
            pts = root.findall(".//g:trkpt", ns) or root.findall(".//{http://www.topografix.com/GPX/1/0}trkpt")
            coords = []
            for p in pts:
                lat = float(p.attrib["lat"])
                lon = float(p.attrib["lon"])
                ele = p.find("g:ele", ns)
                if ele is None:
                    ele = p.find("{http://www.topografix.com/GPX/1/0}ele")
                e = float(ele.text) if ele is not None and ele.text else None
                coords.append((lat, lon, e))
            if len(coords) >= 2:
                R = 6371.0
                d = 0.0
                gain = 0.0
                prev = coords[0]
                for cur in coords[1:]:
                    lat1, lon1, e1 = prev
                    lat2, lon2, e2 = cur
                    rl1, rl2 = math.radians(lat1), math.radians(lat2)
                    dlat = math.radians(lat2 - lat1)
                    dlon = math.radians(lon2 - lon1)
                    a = math.sin(dlat / 2) ** 2 + math.cos(rl1) * math.cos(rl2) * math.sin(dlon / 2) ** 2
                    d += R * (2 * math.atan2(math.sqrt(a), math.sqrt(1 - a)))
                    if e1 is not None and e2 is not None and e2 > e1:
                        gain += e2 - e1
                    prev = cur
                distance_km = round(d, 2)
                elevation_m = int(round(gain))
        except Exception:
            logger.exception("GPX parse warning")

        entry = {
            "filename": safe_name,
            "size_bytes": len(contents),
            "distance_km": distance_km,
            "elevation_m": elevation_m,
            "uploaded_at": datetime.now(timezone.utc).isoformat(),
        }
        # De-dupe by filename: replace any prior entry with the same name
        await db.tours.update_one(
            {"tour_id": tour_id},
            {"$pull": {"gpx_files": {"filename": safe_name}}},
        )
        await db.tours.update_one(
            {"tour_id": tour_id},
            {"$push": {"gpx_files": entry}},
        )
        return {"ok": True, "gpx": entry}

    @router.delete("/admin/tour/{tour_id}/gpx/{filename}")
    async def delete_gpx(tour_id: str, filename: str, _: dict = Depends(require_admin)):
        path = _gpx_path(tour_id, filename)
        if path.exists():
            try:
                path.unlink()
            except Exception:
                pass
        await db.tours.update_one(
            {"tour_id": tour_id},
            {"$pull": {"gpx_files": {"filename": filename}}},
        )
        return {"ok": True}

    return router
