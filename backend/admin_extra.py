"""
Admin polish — CRUD endpoints for Tours, Partner Goodies, Road Advisories
=========================================================================

All routes require admin auth. Mounted at /api/admin/* alongside the existing
read-only admin endpoints in server.py.

  • POST   /admin/tours                  create new tour
  • PATCH  /admin/tours/{tour_id}        update tour fields
  • DELETE /admin/tours/{tour_id}        delete a tour
  • GET    /admin/bookings/export.csv    stream all bookings as CSV
  • GET    /admin/rewards                list reward templates
  • POST   /admin/rewards                create reward template
  • PATCH  /admin/rewards/{reward_id}    update reward template
  • DELETE /admin/rewards/{reward_id}    delete reward template
  • GET    /admin/road-advisories        list advisories
  • POST   /admin/road-advisories        create advisory
  • PATCH  /admin/road-advisories/{id}   update advisory
  • DELETE /admin/road-advisories/{id}   delete advisory
"""
from __future__ import annotations

import csv
import io
import secrets
from datetime import datetime, timezone
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field


# ---------------- Pydantic input schemas ----------------------------------

class TourIn(BaseModel):
    tour_id:     str  = Field(..., min_length=2, max_length=80)
    name:        str  = Field(..., min_length=2)
    region:      str
    subregion:   Optional[str] = None
    category:    str  = Field(..., pattern="^(outdoor|culture|food|water|other)$")
    description: str  = ""
    price:       float = 0
    duration:    str  = ""
    xp_reward:   int  = 0
    card_id:     Optional[str] = None
    badge_id:    Optional[str] = None
    image:       Optional[str] = None
    guide_pin:   Optional[str] = None
    city_x:      Optional[float] = None
    city_y:      Optional[float] = None


class TourPatch(BaseModel):
    name:        Optional[str]   = None
    region:      Optional[str]   = None
    subregion:   Optional[str]   = None
    category:    Optional[str]   = None
    description: Optional[str]   = None
    price:       Optional[float] = None
    duration:    Optional[str]   = None
    xp_reward:   Optional[int]   = None
    card_id:     Optional[str]   = None
    badge_id:    Optional[str]   = None
    image:       Optional[str]   = None
    guide_pin:   Optional[str]   = None
    city_x:      Optional[float] = None
    city_y:      Optional[float] = None


class RewardIn(BaseModel):
    reward_id:   str  = Field(..., min_length=2, max_length=80)
    type:        str  = Field(..., pattern="^(discount|goodie)$")
    title:       str
    description: str  = ""
    code_prefix: str
    min_xp:      int  = 0
    partner:     str


class RewardPatch(BaseModel):
    type:        Optional[str]  = None
    title:       Optional[str]  = None
    description: Optional[str]  = None
    code_prefix: Optional[str]  = None
    min_xp:      Optional[int]  = None
    partner:     Optional[str]  = None


class AdvisoryIn(BaseModel):
    road:    str  = Field(..., min_length=2)
    status:  str  = Field(..., pattern="^(caution|closed|info)$")
    note:    str


class AdvisoryPatch(BaseModel):
    road:    Optional[str] = None
    status:  Optional[str] = None
    note:    Optional[str] = None


# ---------------- Router builder ------------------------------------------

def build_router(db, require_admin) -> APIRouter:
    router = APIRouter(prefix="/admin")

    # -------- Tours -------------------------------------------------------
    @router.post("/tours")
    async def create_tour(payload: TourIn, _: dict = Depends(require_admin)):
        existing = await db.tours.find_one({"tour_id": payload.tour_id}, {"_id": 0, "tour_id": 1})
        if existing:
            raise HTTPException(409, f"A tour with id '{payload.tour_id}' already exists")
        doc = payload.model_dump(exclude_none=True)
        await db.tours.insert_one(doc)
        return await db.tours.find_one({"tour_id": payload.tour_id}, {"_id": 0})

    @router.patch("/tours/{tour_id}")
    async def update_tour(tour_id: str, patch: TourPatch, _: dict = Depends(require_admin)):
        changes = {k: v for k, v in patch.model_dump(exclude_none=True).items()}
        if not changes:
            raise HTTPException(400, "No fields to update")
        res = await db.tours.update_one({"tour_id": tour_id}, {"$set": changes})
        if res.matched_count == 0:
            raise HTTPException(404, "Tour not found")
        return await db.tours.find_one({"tour_id": tour_id}, {"_id": 0})

    @router.delete("/tours/{tour_id}")
    async def delete_tour(tour_id: str, _: dict = Depends(require_admin)):
        # Guard: don't delete a tour that has active (non-cancelled) bookings
        active_bookings = await db.bookings.count_documents(
            {"tour_id": tour_id, "status": {"$nin": ["cancelled"]}}
        )
        if active_bookings > 0:
            raise HTTPException(409, f"Cannot delete — {active_bookings} active booking(s) reference this tour")
        res = await db.tours.delete_one({"tour_id": tour_id})
        if res.deleted_count == 0:
            raise HTTPException(404, "Tour not found")
        return {"ok": True}

    # -------- Bookings CSV export ----------------------------------------
    @router.get("/bookings/export.csv")
    async def export_bookings_csv(_: dict = Depends(require_admin)):
        """Stream all bookings as CSV — opens in Excel/Sheets directly."""
        rows = await db.bookings.find({}, {"_id": 0}).sort("created_at", -1).to_list(5000)
        buf = io.StringIO()
        writer = csv.writer(buf, lineterminator="\n")
        writer.writerow([
            "booking_id", "user_id", "user_email", "user_name",
            "tour_id", "tour_name", "tour_category", "tour_region",
            "date", "status", "created_at", "completed_at", "xp_awarded",
        ])
        # Cache lookups
        users_cache = {}
        tours_cache = {}
        for b in rows:
            uid = b.get("user_id", "")
            tid = b.get("tour_id", "")
            if uid and uid not in users_cache:
                u = await db.users.find_one({"user_id": uid}, {"_id": 0, "email": 1, "name": 1}) or {}
                users_cache[uid] = u
            if tid and tid not in tours_cache:
                t = await db.tours.find_one({"tour_id": tid}, {"_id": 0, "category": 1, "region": 1}) or {}
                tours_cache[tid] = t
            u = users_cache.get(uid, {})
            t = tours_cache.get(tid, {})
            writer.writerow([
                b.get("booking_id", ""),
                uid, u.get("email", ""), u.get("name", ""),
                tid, b.get("tour_name", ""), t.get("category", ""), t.get("region", ""),
                b.get("date", ""), b.get("status", ""),
                b.get("created_at", ""), b.get("completed_at", ""),
                b.get("xp_awarded", ""),
            ])
        filename = f"andeor-bookings-{datetime.now(timezone.utc).strftime('%Y%m%d-%H%M')}.csv"
        return StreamingResponse(
            iter([buf.getvalue()]),
            media_type="text/csv",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )

    # -------- Reward templates / partner goodies -------------------------
    @router.get("/rewards")
    async def list_rewards(_: dict = Depends(require_admin)) -> List[dict]:
        rows = await db.reward_templates.find({}, {"_id": 0}).to_list(200)
        return rows

    @router.post("/rewards")
    async def create_reward(payload: RewardIn, _: dict = Depends(require_admin)):
        existing = await db.reward_templates.find_one({"reward_id": payload.reward_id}, {"_id": 0, "reward_id": 1})
        if existing:
            raise HTTPException(409, f"A reward with id '{payload.reward_id}' already exists")
        doc = payload.model_dump()
        await db.reward_templates.insert_one(doc)
        return await db.reward_templates.find_one({"reward_id": payload.reward_id}, {"_id": 0})

    @router.patch("/rewards/{reward_id}")
    async def update_reward(reward_id: str, patch: RewardPatch, _: dict = Depends(require_admin)):
        changes = {k: v for k, v in patch.model_dump(exclude_none=True).items()}
        if not changes:
            raise HTTPException(400, "No fields to update")
        res = await db.reward_templates.update_one({"reward_id": reward_id}, {"$set": changes})
        if res.matched_count == 0:
            raise HTTPException(404, "Reward not found")
        return await db.reward_templates.find_one({"reward_id": reward_id}, {"_id": 0})

    @router.delete("/rewards/{reward_id}")
    async def delete_reward(reward_id: str, _: dict = Depends(require_admin)):
        res = await db.reward_templates.delete_one({"reward_id": reward_id})
        if res.deleted_count == 0:
            raise HTTPException(404, "Reward not found")
        return {"ok": True}

    # -------- Road advisories --------------------------------------------
    @router.get("/road-advisories")
    async def list_road_advisories(_: dict = Depends(require_admin)) -> List[dict]:
        rows = await db.road_advisories.find({}, {"_id": 0}).sort("created_at", -1).to_list(200)
        return rows

    @router.post("/road-advisories")
    async def create_road_advisory(payload: AdvisoryIn, _: dict = Depends(require_admin)):
        doc = payload.model_dump()
        doc["advisory_id"] = f"adv-{secrets.token_hex(4)}"
        doc["created_at"]  = datetime.now(timezone.utc).isoformat()
        doc["updated_at"]  = doc["created_at"]
        await db.road_advisories.insert_one(doc)
        return await db.road_advisories.find_one({"advisory_id": doc["advisory_id"]}, {"_id": 0})

    @router.patch("/road-advisories/{advisory_id}")
    async def update_road_advisory(advisory_id: str, patch: AdvisoryPatch, _: dict = Depends(require_admin)):
        changes = {k: v for k, v in patch.model_dump(exclude_none=True).items()}
        if not changes:
            raise HTTPException(400, "No fields to update")
        changes["updated_at"] = datetime.now(timezone.utc).isoformat()
        res = await db.road_advisories.update_one({"advisory_id": advisory_id}, {"$set": changes})
        if res.matched_count == 0:
            raise HTTPException(404, "Advisory not found")
        return await db.road_advisories.find_one({"advisory_id": advisory_id}, {"_id": 0})

    @router.delete("/road-advisories/{advisory_id}")
    async def delete_road_advisory(advisory_id: str, _: dict = Depends(require_admin)):
        res = await db.road_advisories.delete_one({"advisory_id": advisory_id})
        if res.deleted_count == 0:
            raise HTTPException(404, "Advisory not found")
        return {"ok": True}

    return router
