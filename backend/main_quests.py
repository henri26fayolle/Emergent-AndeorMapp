"""Main Quests — curated thematic tour bundles with multi-tier rewards."""
from __future__ import annotations

import logging
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException

logger = logging.getLogger("andeor.mainquests")

# Hardcoded seed catalog. Admin can later edit via Mongo if needed.
# theme_color is a Tailwind-friendly token; the frontend maps it to actual hex.
MAIN_QUESTS = [
    {
        "main_quest_id": "mq-wayfarer",
        "title": "The Wayfarer's Trail",
        "subtitle": "Walk the ridges. Read the wind.",
        "icon": "Mountain",
        "theme_color": "jungle",
        "theme_hex": "#1B6F4B",
        "tour_ids": ["t-hike-le-pouce", "t-hike-tamarind-falls", "t-kite-le-morne"],
        "lore_intro": (
            "From the thumb of Le Pouce to the cliffs of Le Morne, the Wayfarer walks the spine of Mauritius. "
            "They greet sunrise from the ridges and dance with the trade winds."
        ),
        "epilogue": (
            "Three peaks, three winds. You've walked the spine of an ocean island and lived to tell it. "
            "Ti Dodo bows. The trails of Mauritius will now answer when you call."
        ),
        "seal_badge_id": "badge-wayfarer-of-andeor",
        "title_earned": "Wayfarer of An Deor",
        "discount_pct": 50,
    },
    {
        "main_quest_id": "mq-cascade",
        "title": "The Cascade Chaser",
        "subtitle": "Find every falling river.",
        "icon": "Droplet",
        "theme_color": "ocean",
        "theme_hex": "#0F8FA8",
        "tour_ids": ["t-hike-tamarind-falls", "t-chamarel-falls", "t-snorkel-blue-bay"],
        "lore_intro": (
            "Mauritius is laced with hidden cascades. The Cascade Chaser follows their roar through gorges, "
            "ravines and rainbows, then dives into the sea where every river ends."
        ),
        "epilogue": (
            "From Tamarind's seven sisters to the rust-red plunge of Chamarel, you've followed water to where it joins the sea. "
            "Ti Dodo whispers: 'Drink slow. The island gave you its songs.'"
        ),
        "seal_badge_id": "badge-cascade-chaser",
        "title_earned": "Cascade Chaser",
        "discount_pct": 50,
    },
    {
        "main_quest_id": "mq-heritage",
        "title": "The Heritage Keeper",
        "subtitle": "Hold the island's memory.",
        "icon": "Landmark",
        "theme_color": "sunset",
        "theme_hex": "#E27447",
        "tour_ids": [
            "t-sega-night",
            "t-creole-table",
            "t-pl-aapravasi-ghat",
            "t-pl-blue-penny",
            "t-pl-central-market",
        ],
        "lore_intro": (
            "From the ravanne drum at midnight to the dholl-puri queues of Port Louis, the Heritage Keeper "
            "carries five centuries of mixed blood, language and food in their pocket."
        ),
        "epilogue": (
            "The Sega beat in your chest, the dholl puri on your tongue, the Aapravasi salt in your shoes. "
            "You have not just visited Mauritius — you have been welcomed into it."
        ),
        "seal_badge_id": "badge-heritage-keeper",
        "title_earned": "Heritage Keeper",
        "discount_pct": 50,
    },
    {
        "main_quest_id": "mq-compleat",
        "title": "The Compleat Explorer",
        "subtitle": "Taste every flavour of the island.",
        "icon": "Compass",
        "theme_color": "sun",
        "theme_hex": "#E8B241",
        "tour_ids": [
            "t-hike-le-pouce",
            "t-snorkel-blue-bay",
            "t-sega-night",
            "t-creole-table",
            "t-kite-le-morne",
            "t-pl-citadelle",
        ],
        "lore_intro": (
            "Why pick a path when you can take them all? The Compleat Explorer climbs by sunrise, swims by noon, "
            "cooks by dusk, dances at midnight — and still wakes hungry for more."
        ),
        "epilogue": (
            "Hike, snorkel, dance, cook, fly. You did not pick a side of Mauritius — you ate the whole island. "
            "Ti Dodo grins: 'Mo nepli, you are now half-Mauritian. The other half is rum.'"
        ),
        "seal_badge_id": "badge-compleat-explorer",
        "title_earned": "Compleat Explorer of An Deor",
        "discount_pct": 50,
    },
]


# New tours to add to the catalog (waterfalls + Port Louis venues + North Coast venues).
EXTRA_TOURS = [
    # ---- North Coast venues (rendered on the North Coast sub-map artwork) ----
    {
        "tour_id": "t-pereybere-snorkel",
        "name": "Pereybère Snorkel Half-Day",
        "region": "north-coast",
        "subregion": "north-coast",
        "city_x": 38,
        "city_y": 60,
        "category": "outdoor",
        "description": "Slip into the shallow corals of Pereybère bay — sergeant majors, parrotfish and the odd sea turtle.",
        "price": 35,
        "duration": "3h",
        "xp_reward": 85,
        "card_id": "card-pereybere",
        "badge_id": "badge-coral-friend",
        "guide_pin": "PEREB1",
        "image": "https://images.pexels.com/photos/15018959/pexels-photo-15018959.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
    },
    {
        "tour_id": "t-cap-malheureux",
        "name": "Cap Malheureux Red-Roof Chapel",
        "region": "north-coast",
        "subregion": "north-coast",
        "city_x": 62,
        "city_y": 12,
        "category": "culture",
        "description": "Mauritius' most photographed chapel — Notre-Dame Auxiliatrice — perched on the northern tip, framed by Coin de Mire.",
        "price": 20,
        "duration": "1.5h",
        "xp_reward": 55,
        "card_id": "card-cap-malheureux",
        "badge_id": "badge-northern-pilgrim",
        "guide_pin": "CAPM01",
        "image": "https://images.pexels.com/photos/8387277/pexels-photo-8387277.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
    },
    {
        "tour_id": "t-grand-baie-cruise",
        "name": "Grand Baie Catamaran Day",
        "region": "north-coast",
        "subregion": "north-coast",
        "city_x": 60,
        "city_y": 48,
        "category": "outdoor",
        "description": "Day on the water from Grand Baie — northern islets, snorkel stops, rougaille lunch on deck.",
        "price": 110,
        "duration": "8h",
        "xp_reward": 170,
        "card_id": "card-grand-baie",
        "badge_id": "badge-catamaran",
        "guide_pin": "BAIE12",
        "image": "https://images.pexels.com/photos/7415730/pexels-photo-7415730.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
    },
    {
        "tour_id": "t-trou-aux-biches",
        "name": "Trou-aux-Biches Sunset Walk",
        "region": "north-coast",
        "subregion": "north-coast",
        "city_x": 35,
        "city_y": 90,
        "category": "outdoor",
        "description": "Long beach stroll on Mauritius' most famous filao-lined sands as the sun drops into the lagoon.",
        "price": 18,
        "duration": "2h",
        "xp_reward": 50,
        "card_id": "card-trou-aux-biches",
        "badge_id": "badge-filao-walker",
        "guide_pin": "BICHES",
        "image": "https://images.pexels.com/photos/36731927/pexels-photo-36731927.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
    },
    # Waterfalls
    {
        "tour_id": "t-hike-tamarind-falls",
        "name": "Tamarind 7-Cascades",
        "region": "black-river",
        "category": "outdoor",
        "description": "Canyon down 7 emerald pools, jumps included, with a certified An Deor guide.",
        "price": 95,
        "duration": "6h",
        "xp_reward": 160,
        "card_id": "card-tamarind-falls",
        "badge_id": "badge-falls-jumper",
        "guide_pin": "FALL77",
        "image": "https://images.pexels.com/photos/15018959/pexels-photo-15018959.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
    },
    {
        "tour_id": "t-chamarel-falls",
        "name": "Chamarel Falls & Seven-Coloured Earth",
        "region": "south-wild",
        "category": "outdoor",
        "description": "Mauritius' tallest waterfall (100m) + the geological marvel of the Seven-Coloured Earth in one half-day loop.",
        "price": 60,
        "duration": "4h",
        "xp_reward": 120,
        "card_id": "card-chamarel",
        "badge_id": "badge-seven-earths",
        "guide_pin": "EARTH7",
        "image": "https://images.pexels.com/photos/8387277/pexels-photo-8387277.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
    },
    # Port Louis venues — all share region central-culture; city_x/city_y are % of the city sub-map artwork
    {
        "tour_id": "t-pl-aapravasi-ghat",
        "name": "Aapravasi Ghat (UNESCO)",
        "region": "central-culture",
        "subregion": "port-louis",
        "city_x": 49,
        "city_y": 35,
        "category": "culture",
        "description": "The pier where 460,000 indentured workers landed — UNESCO World Heritage, with our resident historian.",
        "price": 25,
        "duration": "1.5h",
        "xp_reward": 70,
        "card_id": "card-aapravasi",
        "badge_id": "badge-aapravasi-witness",
        "guide_pin": "AAPRA1",
        "image": "https://images.pexels.com/photos/32793278/pexels-photo-32793278.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
    },
    {
        "tour_id": "t-pl-blue-penny",
        "name": "Blue Penny Museum",
        "region": "central-culture",
        "subregion": "port-louis",
        "city_x": 54,
        "city_y": 36,
        "category": "culture",
        "description": "Home of the world-famous Blue & Red Penny stamps — Mauritian numismatic legend in one hour.",
        "price": 18,
        "duration": "1h",
        "xp_reward": 50,
        "card_id": "card-blue-penny",
        "badge_id": "badge-philatelist",
        "guide_pin": "PENNY1",
        "image": "https://images.pexels.com/photos/15018959/pexels-photo-15018959.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
    },
    {
        "tour_id": "t-pl-central-market",
        "name": "Port Louis Central Market Food Tour",
        "region": "central-culture",
        "subregion": "port-louis",
        "city_x": 53,
        "city_y": 50,
        "category": "culture",
        "description": "Dholl puri, gato piment, alouda, ti-baz snacks, four languages, one auntie — the real Port Louis.",
        "price": 45,
        "duration": "3h",
        "xp_reward": 110,
        "card_id": "card-pl-market",
        "badge_id": "badge-market-soul",
        "guide_pin": "MARKET",
        "image": "https://images.pexels.com/photos/36731927/pexels-photo-36731927.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
    },
    {
        "tour_id": "t-pl-cathedral",
        "name": "Cathedral of Port Louis",
        "region": "central-culture",
        "subregion": "port-louis",
        "city_x": 58,
        "city_y": 53,
        "category": "culture",
        "description": "Saint Louis Cathedral, its quiet courtyard and the sound of bells over a Hindu-Muslim-Catholic city.",
        "price": 15,
        "duration": "1h",
        "xp_reward": 40,
        "card_id": "card-pl-cathedral",
        "badge_id": "badge-cathedral-pilgrim",
        "guide_pin": "CATHE1",
        "image": "https://images.pexels.com/photos/8387277/pexels-photo-8387277.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
    },
    {
        "tour_id": "t-pl-citadelle",
        "name": "The Citadelle (Fort Adelaide)",
        "region": "central-culture",
        "subregion": "port-louis",
        "city_x": 67,
        "city_y": 72,
        "category": "culture",
        "description": "Climb the British fort that watches the city — 360° views of Port Louis, Champ de Mars and the lagoon.",
        "price": 22,
        "duration": "1.5h",
        "xp_reward": 65,
        "card_id": "card-citadelle",
        "badge_id": "badge-fort-watcher",
        "guide_pin": "FORT01",
        "image": "https://images.pexels.com/photos/7415730/pexels-photo-7415730.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
    },
    {
        "tour_id": "t-pl-champ-de-mars",
        "name": "Champ de Mars Racecourse",
        "region": "central-culture",
        "subregion": "port-louis",
        "city_x": 80,
        "city_y": 80,
        "category": "culture",
        "description": "The oldest racecourse in the Southern Hemisphere (1812). Behind-the-scenes paddock tour on race day.",
        "price": 35,
        "duration": "2h",
        "xp_reward": 80,
        "card_id": "card-champ-de-mars",
        "badge_id": "badge-turfman",
        "guide_pin": "TURF12",
        "image": "https://images.pexels.com/photos/32793278/pexels-photo-32793278.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
    },
]


async def seed_main_quests(db):
    """Idempotent: insert main quests, add the new tours, ensure new fields on existing tours."""
    # Insert/update the new tours (idempotent — match on tour_id)
    for t in EXTRA_TOURS:
        await db.tours.update_one(
            {"tour_id": t["tour_id"]},
            {"$set": t},
            upsert=True,
        )

    # Patch existing Sega Night with North Coast sub-map coords (positioned over the south sandy bay)
    await db.tours.update_one(
        {"tour_id": "t-sega-night"},
        {"$set": {"subregion": "north-coast", "city_x": 50, "city_y": 78}},
    )

    # Insert/update the main quests
    for q in MAIN_QUESTS:
        await db.main_quests.update_one(
            {"main_quest_id": q["main_quest_id"]},
            {"$set": q},
            upsert=True,
        )


# ---------- Helpers ----------
def _serialize(doc: dict) -> dict:
    """Strip Mongo _id."""
    doc.pop("_id", None)
    return doc


async def _user_progress(db, user_id: str, quest: dict) -> dict:
    """Compute how many of the quest's tours the user has COMPLETED."""
    tour_ids = quest.get("tour_ids", [])
    if not tour_ids:
        return {"completed_tours": [], "completed": 0, "total": 0, "percent": 0}
    # A "completed" tour for the user = at least one booking with status=completed
    cursor = db.bookings.find(
        {"user_id": user_id, "tour_id": {"$in": tour_ids}, "status": "completed"},
        {"_id": 0, "tour_id": 1},
    )
    done = {b["tour_id"] async for b in cursor}
    total = len(tour_ids)
    return {
        "completed_tours": sorted(list(done)),
        "completed": len(done),
        "total": total,
        "percent": int(round(100 * len(done) / total)) if total else 0,
    }


def build_router(db, get_current_user) -> APIRouter:
    router = APIRouter(prefix="/main-quests")

    @router.get("")
    async def list_quests(user: dict = Depends(get_current_user)):
        """List all main quests with the current user's enrolment + progress."""
        rows = await db.main_quests.find({}, {"_id": 0}).to_list(50)

        u = await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0})
        enrolled = set(u.get("enrolled_main_quests", []))
        focused = u.get("focused_main_quest")
        completed_quests = set(u.get("completed_main_quests", []))

        out = []
        for q in rows:
            p = await _user_progress(db, user["user_id"], q)
            out.append({
                **q,
                "enrolled": q["main_quest_id"] in enrolled,
                "focused": q["main_quest_id"] == focused,
                "completed": q["main_quest_id"] in completed_quests,
                "progress": p,
            })
        return out

    @router.post("/{main_quest_id}/enroll")
    async def enroll(main_quest_id: str, user: dict = Depends(get_current_user)):
        q = await db.main_quests.find_one({"main_quest_id": main_quest_id})
        if not q:
            raise HTTPException(404, "Main quest not found")
        u = await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0})
        enrolled = set(u.get("enrolled_main_quests", []))
        was_empty = len(enrolled) == 0
        enrolled.add(main_quest_id)
        update = {"enrolled_main_quests": sorted(list(enrolled))}
        # If this is the user's first enrolment, auto-focus it
        if was_empty or not u.get("focused_main_quest"):
            update["focused_main_quest"] = main_quest_id
        await db.users.update_one({"user_id": user["user_id"]}, {"$set": update})
        return {"ok": True, **update}

    @router.post("/{main_quest_id}/unenroll")
    async def unenroll(main_quest_id: str, user: dict = Depends(get_current_user)):
        u = await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0})
        enrolled = set(u.get("enrolled_main_quests", []))
        enrolled.discard(main_quest_id)
        update = {"enrolled_main_quests": sorted(list(enrolled))}
        if u.get("focused_main_quest") == main_quest_id:
            # Auto-focus the next one (deterministic)
            update["focused_main_quest"] = (sorted(list(enrolled))[0] if enrolled else None)
        await db.users.update_one({"user_id": user["user_id"]}, {"$set": update})
        return {"ok": True, **update}

    @router.post("/{main_quest_id}/focus")
    async def focus(main_quest_id: str, user: dict = Depends(get_current_user)):
        u = await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0})
        enrolled = set(u.get("enrolled_main_quests", []))
        if main_quest_id not in enrolled:
            enrolled.add(main_quest_id)
        await db.users.update_one(
            {"user_id": user["user_id"]},
            {"$set": {
                "focused_main_quest": main_quest_id,
                "enrolled_main_quests": sorted(list(enrolled)),
            }},
        )
        return {"ok": True, "focused_main_quest": main_quest_id}

    @router.get("/check-completion")
    async def check_completion(user: dict = Depends(get_current_user)):
        """Idempotent: if any enrolled quest is fully completed and not yet awarded,
        award the title + 50% bundle discount + epilogue marker. Returns newly_completed list
        (each with title + reward + epilogue) so the frontend can display the cutscene."""
        u = await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0})
        completed = set(u.get("completed_main_quests", []))
        titles = set(u.get("titles_earned", []))
        already_codes = {r.get("source_main_quest_id") for r in (u.get("rewards", []) or []) if r.get("source_main_quest_id")}

        all_quests = await db.main_quests.find({}, {"_id": 0}).to_list(50)
        newly = []

        for q in all_quests:
            if q["main_quest_id"] in completed:
                continue
            p = await _user_progress(db, user["user_id"], q)
            if p["total"] == 0 or p["completed"] < p["total"]:
                continue
            # Award!
            completed.add(q["main_quest_id"])
            titles.add(q.get("title_earned", q["title"]))

            # Generate a 50% bundle discount code
            import secrets as _s
            code = f"{q['main_quest_id'].upper().replace('-', '')}-{_s.token_hex(3).upper()}"
            reward = {
                "user_reward_id": code,
                "code": code,
                "type": "discount",
                "title": f"{q.get('title_earned', q['title'])} — 50% bundle voucher",
                "description": "Stack-and-save: 50% off any An Deor tour for 60 days.",
                "partner": "An Deor",
                "discount_pct": q.get("discount_pct", 50),
                "source_main_quest_id": q["main_quest_id"],
                "issued_at": datetime.now(timezone.utc).isoformat(),
                "redeemed": False,
            }
            await db.users.update_one(
                {"user_id": user["user_id"]},
                {"$push": {"rewards": reward}},
            )

            # Compute AOV (sum price of all tours in this quest)
            tours = await db.tours.find({"tour_id": {"$in": q["tour_ids"]}}, {"_id": 0, "price": 1}).to_list(50)
            aov_eur = sum((t.get("price") or 0) for t in tours)
            # 1 EUR ~ 50 MUR (rough rate for tier matching)
            aov_mur = aov_eur * 50
            tiers = []
            if aov_mur >= 15000:
                tiers.append("tshirt")
            if aov_mur >= 25000:
                tiers.append("partner-goodie")

            newly.append({
                "main_quest_id": q["main_quest_id"],
                "title": q["title"],
                "title_earned": q.get("title_earned", q["title"]),
                "epilogue": q.get("epilogue", ""),
                "theme_color": q.get("theme_color", "jungle"),
                "theme_hex": q.get("theme_hex", "#1B6F4B"),
                "reward_code": code,
                "discount_pct": q.get("discount_pct", 50),
                "aov_mur": aov_mur,
                "physical_tiers": tiers,
            })

        if newly:
            await db.users.update_one(
                {"user_id": user["user_id"]},
                {"$set": {
                    "completed_main_quests": sorted(list(completed)),
                    "titles_earned": sorted(list(titles)),
                }},
            )

        return {"newly_completed": newly, "completed_main_quests": sorted(list(completed))}

    return router
