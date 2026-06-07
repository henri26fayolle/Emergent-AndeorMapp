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


# ---------- Per-tour lore (richer venue stories, e.g. each Port Louis museum) ----------
TOUR_LORE = {
    "t-pl-aapravasi-ghat": {
        "lore_title": "Aapravasi Ghat — the Immigration Depot",
        "lore_summary": "The pier where 460,000 lives began their second chapter.",
        "lore_text": (
            "Aapravasi Ghat — 'the place of arrival' in Hindi — is the stone pier where, between 1834 and 1920, "
            "460,000 indentured labourers from India, China, Madagascar and East Africa stepped off ships onto a "
            "new world. Sixteen steps lead from the water to the depot — climb them and you walk the exact path a "
            "great-great-grandparent of two-thirds of Mauritians took with their entire life in a wooden trunk. "
            "Declared UNESCO World Heritage in 2006, the site preserves the dormitories, the hospital block and "
            "the registration desk where each new arrival was photographed, numbered and given a date with the cane "
            "fields. A quiet, powerful place — bring your slow self."
        ),
    },
    "t-pl-blue-penny": {
        "lore_title": "Blue Penny Museum — the World's Rarest Stamp",
        "lore_summary": "A 1847 typo became one of the most valuable objects on Earth.",
        "lore_text": (
            "In 1847, a Mauritian engraver named Joseph Barnard pressed the wrong words onto a copper plate: "
            "'POST OFFICE' instead of 'POST PAID'. The mistake produced 500 stamps — half red 'One Penny', half blue 'Two Pence' — "
            "and within weeks, the corrected plate replaced them. Today, only 27 of those stamps survive. The Blue Penny Museum "
            "owns two of them, displayed in a dark vault that opens for just ten minutes every hour to protect the pigment "
            "from light damage. Around them: 200 years of Mauritian numismatics, La Bourdonnais' maps, the original sculpture "
            "of Paul & Virginie, and the most expensive postcard ever sent — a Blue Penny on cover that sold for $4 million. "
            "An hour here is a thousand small love letters to detail."
        ),
    },
    "t-pl-central-market": {
        "lore_title": "Central Market — Four Religions at One Counter",
        "lore_summary": "Dholl puri, alouda, gateau piment and a Bhojpuri-Creole-Tamil-French choir.",
        "lore_text": (
            "Port Louis Central Market has been alive since 1839 — a steel-and-tile cathedral where four religions, "
            "seven languages and every spice known to humans share a counter. Arrive at dawn. The fish stalls open first; "
            "by 7am the dholl puri queue snakes onto the pavement, and by 9 the alouda women (a basilic-seed, milk-and-rose "
            "drink that tastes like Mauritius in a glass) are pouring as fast as they can stir. Our guide knows which "
            "auntie has the best biryani, which oncle still makes gateau piment by hand and which spice corner is run by "
            "the only fourth-generation Tamil family in the market. Come hungry. Leave converted."
        ),
    },
    "t-pl-cathedral": {
        "lore_title": "Saint Louis Cathedral — Bells over a Many-faithed City",
        "lore_summary": "The seat of the diocese, rebuilt three times by storms and rebuilt again by faith.",
        "lore_text": (
            "Saint Louis Cathedral first opened in 1756 — and was promptly destroyed by a cyclone. Rebuilt. Destroyed again "
            "in 1816. Rebuilt. Rebuilt one more time in 1932, in the lemon-yellow neo-classical façade you see today. From "
            "its forecourt you can hear, at noon, the muezzin from the Jummah Mosque two blocks away, the temple drums of "
            "the Mariamen Tamil temple six blocks east, and the cathedral's own bells ringing one of the oldest carillons in "
            "the Indian Ocean. Step inside for ten minutes of cool shade and stained glass — and notice how the saints in "
            "the windows have, after 90 years of Mauritian sun, faded into our own colour."
        ),
    },
    "t-pl-citadelle": {
        "lore_title": "The Citadelle (Fort Adelaide)",
        "lore_summary": "The British fort that watches every ship that ever called on Port Louis.",
        "lore_text": (
            "Perched on the volcanic neck above Port Louis, Fort Adelaide was built between 1834 and 1840 — partly to defend "
            "the harbour, partly to keep an eye on the just-freed slaves of the recently abolished plantations. It never fired "
            "a shot in anger. Today its black-stone walls hold a 360° panorama unlike any other in Mauritius: the Champ de Mars "
            "racetrack below, the cathedral spire, the harbour cranes, the cane-green Pieter Both peak inland, and on a clear "
            "day, the very tip of Réunion 200km to the south-west. Come at sunset. Bring something to sip. The wind here has "
            "been waiting to introduce itself."
        ),
    },
    "t-pl-champ-de-mars": {
        "lore_title": "Champ de Mars — Where the Empire Bets",
        "lore_summary": "The oldest racecourse in the Southern Hemisphere (1812). Yes, older than Royal Ascot's modern stands.",
        "lore_text": (
            "On the 25th of June 1812, in front of governor Robert Farquhar and most of his garrison, a horse named Adelaïde "
            "won the very first race ever run at Champ de Mars. Two centuries later, this oval is still the most beloved venue "
            "in Mauritius — Saturday afternoons in winter (May to November), 20,000 people in panama hats, blazers and the "
            "Mauritian national costume of barely-concealed excitement, betting in five languages on horses named after every "
            "Mauritian dish ever invented. Our paddock tour walks you behind the scenes — meet a jockey, touch a thoroughbred, "
            "and place a 100-rupee bet that may, just may, change your trip."
        ),
    },
    "t-creole-table": {
        "lore_title": "The Creole Table — A Family Recipe",
        "lore_summary": "Cook rougaille saucisse, vindaye poisson and gateau piment with a Mauritian aunt.",
        "lore_text": (
            "Mauritian Creole cooking is, at heart, a peace treaty between five continents written in cumin, ginger and lime. "
            "In a small kitchen in upper Port Louis, our cousin Marie will show you how to start a rougaille (the national stew) "
            "by toasting masala seeds until they smell of dust and lemons; how to vindaye a king-fish by drowning it in mustard, "
            "oil and turmeric until it tastes like the sea bargained with the sun. You'll fry your own gateau piment, learn the "
            "rule about coriander (always at the end), and eat what you cook on a hand-painted tiled patio with a glass of "
            "Phoenix beer. Two hours and three lifetimes of family secrets."
        ),
    },
}


async def seed_tour_lore(db):
    """Idempotent: set lore on each tour if missing or empty."""
    for tour_id, lore in TOUR_LORE.items():
        existing = await db.tours.find_one({"tour_id": tour_id})
        if not existing:
            continue
        needs_seed = (
            not existing.get("lore_text")
            or not existing.get("lore_title")
            or not existing.get("lore_summary")
        )
        if needs_seed:
            await db.tours.update_one({"tour_id": tour_id}, {"$set": lore})


async def seed_lore(db):
    """Idempotent: seed region lore + tour lore."""
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
    await seed_tour_lore(db)


# ---------- Utilities ----------
def _safe(filename: str) -> str:
    return re.sub(r"[^A-Za-z0-9._-]", "_", filename)


def _audio_path(region_id: str) -> Path:
    return AUDIO_DIR / f"{_safe(region_id)}.mp3"


def _tour_audio_path(tour_id: str) -> Path:
    return AUDIO_DIR / f"tour__{_safe(tour_id)}.mp3"


# One-line Ti Dodo voice clips played when a Saga (Main Quest) is claimed.
# Cached as MP3 on disk — generated once per key.
SAGA_VOICE_LINES = {
    "mq-wayfarer": "Mo finn fyer ou — the ridges remember your steps now.",
    "mq-cascade":  "Mo finn fyer ou — every river has whispered your name.",
    "mq-heritage": "Mo finn fyer ou — you carry the island's memory now.",
    "mq-compleat": "Mo finn fyer ou — Mauritius lives in your bones now.",
    # Default / generic key when the frontend doesn't know which saga
    "default":     "Mo finn fyer ou. Mauritius is in your bones now.",
}


def _saga_voice_path(key: str) -> Path:
    return AUDIO_DIR / f"saga_voice__{_safe(key)}.mp3"


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


async def _ensure_tour_audio(tour: dict) -> str:
    """Generate (and cache) per-tour narration. Returns the relative URL."""
    tour_id = tour["tour_id"]
    target = _tour_audio_path(tour_id)
    rel_url = f"/api/codex/tour-audio/{tour_id}"

    if target.exists() and target.stat().st_size > 0:
        return rel_url

    if not EMERGENT_LLM_KEY:
        raise HTTPException(503, "TTS not configured")

    title = tour.get("lore_title", tour.get("name", "An Deor tour"))
    summary = tour.get("lore_summary", "")
    body = tour.get("lore_text", tour.get("description", ""))
    script = f"{title}. {summary}  …  {body}"[:4000]

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
        logger.info("TTS audio generated for tour %s (%d bytes)", tour_id, len(audio_bytes))
    except Exception as e:
        logger.exception("TTS tour generation failed")
        raise HTTPException(502, f"Audio generation failed: {e}")

    return rel_url


async def _ensure_saga_voice(key: str) -> Path:
    """Generate (and cache) the Ti Dodo voice-line for a Saga claim. Returns the disk path."""
    text = SAGA_VOICE_LINES.get(key) or SAGA_VOICE_LINES["default"]
    target = _saga_voice_path(key)

    if target.exists() and target.stat().st_size > 0:
        return target

    if not EMERGENT_LLM_KEY:
        raise HTTPException(503, "TTS not configured")

    try:
        tts = OpenAITextToSpeech(api_key=EMERGENT_LLM_KEY)
        audio_bytes = await tts.generate_speech(
            text=text,
            model=TTS_MODEL,
            voice=TTS_VOICE,
            response_format="mp3",
            speed=0.95,
        )
        target.write_bytes(audio_bytes)
        logger.info("Saga voice generated for %s (%d bytes)", key, len(audio_bytes))
    except Exception as e:
        logger.exception("Saga voice generation failed")
        raise HTTPException(502, f"Audio generation failed: {e}")

    return target


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

    @router.get("/tour/{tour_id}")
    async def get_tour_codex(tour_id: str):
        """Public: per-tour lore + audio URL + image — for venue modals in city sub-maps."""
        tour = await db.tours.find_one({"tour_id": tour_id}, {"_id": 0, "guide_pin": 0})
        if not tour:
            raise HTTPException(404, "Tour not found")
        has_lore = bool((tour.get("lore_text") or "").strip())
        return {
            "tour_id": tour_id,
            "name": tour.get("name"),
            "region": tour.get("region"),
            "subregion": tour.get("subregion"),
            "image": tour.get("image"),
            "description": tour.get("description"),
            "price": tour.get("price"),
            "duration": tour.get("duration"),
            "xp_reward": tour.get("xp_reward"),
            "lore_title": tour.get("lore_title"),
            "lore_summary": tour.get("lore_summary"),
            "lore_text": tour.get("lore_text"),
            "audio_url": f"/api/codex/tour-audio/{tour_id}" if has_lore else None,
            "audio_ready": _tour_audio_path(tour_id).exists(),
            "gpx_files": tour.get("gpx_files") or [],
        }

    @router.get("/tour-audio/{tour_id}")
    async def stream_tour_audio(tour_id: str):
        tour = await db.tours.find_one({"tour_id": tour_id}, {"_id": 0})
        if not tour:
            raise HTTPException(404, "Tour not found")
        if not (tour.get("lore_text") or "").strip():
            raise HTTPException(404, "No lore for this tour yet")
        await _ensure_tour_audio(tour)
        return FileResponse(
            _tour_audio_path(tour_id),
            media_type="audio/mpeg",
            headers={"Cache-Control": "public, max-age=3600"},
        )

    @router.get("/saga-voice")
    async def stream_saga_voice(saga_id: str | None = None):
        """Public: stream a 3s Ti Dodo voice-line played during the SagaConfetti
        burst when the player claims a Main Quest. Cached on disk, generated on
        first call. `saga_id` (optional) picks the saga-specific phrase; omitting
        it returns the generic "Mauritius is in your bones now." line."""
        key = (saga_id or "").strip() if saga_id else "default"
        if key not in SAGA_VOICE_LINES:
            key = "default"
        path = await _ensure_saga_voice(key)
        return FileResponse(
            path,
            media_type="audio/mpeg",
            headers={"Cache-Control": "public, max-age=86400"},
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
