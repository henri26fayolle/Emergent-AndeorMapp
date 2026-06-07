from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import os
import uuid
import logging
import secrets
import bcrypt
import jwt
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Literal

from fastapi import FastAPI, APIRouter, Depends, HTTPException, Request, Response, Cookie
from fastapi.responses import JSONResponse
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr, ConfigDict
import httpx

from emergentintegrations.llm.chat import LlmChat, UserMessage

from codex import build_router as build_codex_router, seed_lore
from main_quests import build_router as build_main_quests_router, seed_main_quests
from self_guided import build_router as build_self_guided_router, seed_self_guided

# ---------- MongoDB ----------
mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

# ---------- App ----------
app = FastAPI(title="An Deor Quest API")
api = APIRouter(prefix="/api")

JWT_SECRET = os.environ["JWT_SECRET"]
JWT_ALG = "HS256"
EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY", "")
EMERGENT_OAUTH_URL = "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data"

logger = logging.getLogger("andeor")
logging.basicConfig(level=logging.INFO)


# ---------- Helpers ----------
def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()


def verify_password(pw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode(), hashed.encode())
    except Exception:
        return False


def create_access_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "type": "access",
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)


def set_auth_cookie(response: Response, token: str):
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        secure=True,
        samesite="none",
        max_age=7 * 24 * 3600,
        path="/",
    )


def public_user(u: dict) -> dict:
    return {
        "user_id": u["user_id"],
        "email": u["email"],
        "name": u.get("name", ""),
        "picture": u.get("picture"),
        "role": u.get("role", "player"),
        "xp": u.get("xp", 0),
        "level": u.get("level", 1),
        "avatar": u.get("avatar"),
        "tutorial_completed": u.get("tutorial_completed", False),
        "auth_provider": u.get("auth_provider", "password"),
        "created_at": u.get("created_at"),
    }


def level_from_xp(xp: int) -> int:
    # 100 XP per level, capped
    return max(1, 1 + xp // 100)


# ---------- Auth dependency ----------
async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token") or request.cookies.get("session_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
    if not token:
        raise HTTPException(401, "Not authenticated")

    # Try JWT first
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
        user = await db.users.find_one({"user_id": payload["sub"]}, {"_id": 0, "password_hash": 0})
        if user:
            return user
    except jwt.PyJWTError:
        pass

    # Try Emergent session token
    session = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if session:
        expires = session["expires_at"]
        if isinstance(expires, str):
            expires = datetime.fromisoformat(expires)
        if expires.tzinfo is None:
            expires = expires.replace(tzinfo=timezone.utc)
        if expires > datetime.now(timezone.utc):
            user = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0, "password_hash": 0})
            if user:
                return user
    raise HTTPException(401, "Invalid or expired session")


async def require_admin(user: dict = Depends(get_current_user)) -> dict:
    if user.get("role") != "admin":
        raise HTTPException(403, "Admin only")
    return user


# ---------- Models ----------
class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    name: str = Field(min_length=1)
    avatar: Optional[str] = None
    tutorial_completed: Optional[bool] = False


class UpdateMeIn(BaseModel):
    name: Optional[str] = None
    avatar: Optional[str] = None
    tutorial_completed: Optional[bool] = None


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class SessionIn(BaseModel):
    session_id: str


class BookingIn(BaseModel):
    tour_id: str
    date: Optional[str] = None


class ChatIn(BaseModel):
    message: str
    session_id: Optional[str] = None


class CompleteBookingIn(BaseModel):
    booking_id: str


class CheckInIn(BaseModel):
    booking_id: str
    pin: str = Field(min_length=2)


# ---------- Seed data ----------
REGIONS = [
    {"region_id": "north-coast",     "name": "North Coast",            "description": "Grand Baie's vibrant lagoons & beaches.",          "unlock_xp": 0, "icon": "Waves"},
    {"region_id": "black-river",     "name": "Black River Gorges",     "description": "Rainforests, peaks & endemic wildlife.",            "unlock_xp": 0, "icon": "Mountain"},
    {"region_id": "south-wild",      "name": "Wild South",             "description": "Le Morne, cliffs and surf breaks.",                 "unlock_xp": 0, "icon": "Wind"},
    {"region_id": "east-lagoons",    "name": "East Lagoons",           "description": "Ile aux Cerfs and turquoise reefs.",                "unlock_xp": 0, "icon": "Anchor"},
    {"region_id": "central-culture", "name": "Central Cultural Belt",  "description": "Port Louis markets, Sega & Creole heritage.",       "unlock_xp": 0, "icon": "Landmark"},
]

TOURS = [
    {"tour_id": "t-snorkel-blue-bay", "name": "Blue Bay Snorkel Safari", "region": "east-lagoons", "category": "outdoor", "description": "Half-day snorkel inside Blue Bay marine park with a certified An Deor guide.", "price": 65, "duration": "4h", "xp_reward": 120, "card_id": "card-blue-bay", "badge_id": "badge-reef-friend", "guide_pin": "REEF42", "image": "https://images.pexels.com/photos/15018959/pexels-photo-15018959.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940"},
    {"tour_id": "t-hike-le-pouce", "name": "Le Pouce Sunrise Hike", "region": "black-river", "category": "outdoor", "description": "Beat the sun to one of Mauritius' most iconic ridge tops.", "price": 45, "duration": "5h", "xp_reward": 150, "card_id": "card-le-pouce", "badge_id": "badge-ridge-runner", "guide_pin": "RIDGE07", "image": "https://images.pexels.com/photos/8387277/pexels-photo-8387277.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940"},
    {"tour_id": "t-creole-table", "name": "Creole Table Cooking Class", "region": "central-culture", "subregion": "port-louis", "city_x": 45, "city_y": 64, "category": "culture", "description": "Cook rougaille, vindaye & gateau piment with a local family.", "price": 80, "duration": "3h", "xp_reward": 100, "card_id": "card-creole-table", "badge_id": "badge-piment-master", "guide_pin": "PIMENT9", "image": "https://images.pexels.com/photos/32793278/pexels-photo-32793278.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940"},
    {"tour_id": "t-kite-le-morne", "name": "Le Morne Kite Session", "region": "south-wild", "category": "outdoor", "description": "Beginner-friendly kitesurf coaching at one of the world's top spots.", "price": 130, "duration": "3h", "xp_reward": 180, "card_id": "card-le-morne", "badge_id": "badge-wind-rider", "guide_pin": "WIND88", "image": "https://images.pexels.com/photos/7415730/pexels-photo-7415730.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940"},
    {"tour_id": "t-sega-night", "name": "Sega Night by the Sea", "region": "north-coast", "category": "culture", "description": "Sunset Sega lesson, fire dance & rhum arrangé tasting.", "price": 55, "duration": "3h", "xp_reward": 110, "card_id": "card-sega", "badge_id": "badge-sega-soul", "guide_pin": "SEGA21", "image": "https://images.pexels.com/photos/36731927/pexels-photo-36731927.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940"},
]

QUESTS = [
    {"quest_id": "q-first-tour", "name": "First Steps", "description": "Book your very first An Deor tour.", "type": "book_tour", "xp_reward": 30, "icon": "Compass"},
    {"quest_id": "q-meet-guide", "name": "Meet a Guide", "description": "Complete a tour and rate your guide.", "type": "interact_guide", "xp_reward": 40, "icon": "UserCheck"},
    {"quest_id": "q-three-regions", "name": "Triple Threat", "description": "Unlock 3 regions of Mauritius.", "type": "unlock_regions", "target": 3, "xp_reward": 80, "icon": "Map"},
    {"quest_id": "q-culture-vulture", "name": "Culture Vulture", "description": "Complete 2 cultural experiences.", "type": "category_culture", "target": 2, "xp_reward": 60, "icon": "Drama"},
    {"quest_id": "q-collector", "name": "Collector", "description": "Earn 4 collectible cards.", "type": "collect_cards", "target": 4, "xp_reward": 100, "icon": "Layers"},
]

REWARD_TEMPLATES = [
    {"reward_id": "r-disc-10", "type": "discount", "title": "10% off next tour", "description": "Apply at checkout on andeor.mu", "code_prefix": "ANDEOR10", "min_xp": 100, "partner": "An Deor"},
    {"reward_id": "r-disc-20", "type": "discount", "title": "20% off any cultural tour", "description": "Limited cultural categories.", "code_prefix": "CULTURE20", "min_xp": 300, "partner": "An Deor"},
    {"reward_id": "r-rhum", "type": "goodie", "title": "Free Rhum Arrangé Tasting", "description": "At Chamarel Distillery, on us.", "code_prefix": "CHAMAREL", "min_xp": 500, "partner": "Chamarel Distillery"},
    {"reward_id": "r-spa", "type": "goodie", "title": "Spa Voucher 30 min", "description": "Tropical Spa - Grand Baie.", "code_prefix": "SPA30", "min_xp": 800, "partner": "Tropical Spa"},
]


async def seed_data():
    # Regions
    if await db.regions.count_documents({}) == 0:
        await db.regions.insert_many([dict(r) for r in REGIONS])
    # Tours
    if await db.tours.count_documents({}) == 0:
        await db.tours.insert_many([dict(t) for t in TOURS])
    else:
        # Idempotent migration: add guide_pin to existing tours
        for t in TOURS:
            await db.tours.update_one(
                {"tour_id": t["tour_id"]},
                {"$set": {"guide_pin": t["guide_pin"]}},
            )
    # Quests
    if await db.quests.count_documents({}) == 0:
        await db.quests.insert_many([dict(q) for q in QUESTS])
    # Reward templates
    if await db.reward_templates.count_documents({}) == 0:
        await db.reward_templates.insert_many([dict(r) for r in REWARD_TEMPLATES])


async def seed_admin():
    email = os.environ["ADMIN_EMAIL"].lower()
    password = os.environ["ADMIN_PASSWORD"]
    existing = await db.users.find_one({"email": email})
    if existing is None:
        await db.users.insert_one({
            "user_id": f"user_{uuid.uuid4().hex[:12]}",
            "email": email,
            "name": "An Deor Admin",
            "password_hash": hash_password(password),
            "role": "admin",
            "auth_provider": "password",
            "xp": 0,
            "level": 1,
            "regions_unlocked": ["north-coast", "black-river", "south-wild", "east-lagoons", "central-culture"],
            "cards": [],
            "badges": [],
            "avatar": "scholar",
            "tutorial_completed": True,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
    elif not verify_password(password, existing.get("password_hash", "")):
        await db.users.update_one({"email": email}, {"$set": {"password_hash": hash_password(password), "role": "admin", "tutorial_completed": True, "avatar": "scholar"}})
    else:
        # Always ensure admin keeps canonical RPG state across restarts
        await db.users.update_one({"email": email}, {"$set": {"tutorial_completed": True, "avatar": "scholar"}})


@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.user_sessions.create_index("session_token", unique=True)
    await db.bookings.create_index("user_id")
    await seed_data()
    await seed_admin()
    await seed_lore(db)
    await seed_main_quests(db)
    await seed_self_guided(db)
    # Open all regions for every player (no sealed regions in the An Deor world)
    all_region_ids = [r["region_id"] for r in REGIONS]
    await db.users.update_many({}, {"$set": {"regions_unlocked": all_region_ids}})
    logger.info("An Deor backend ready.")


@app.on_event("shutdown")
async def shutdown():
    client.close()


# ---------- Auth endpoints ----------
@api.post("/auth/register")
async def register(payload: RegisterIn, response: Response):
    email = payload.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(400, "Email already registered")
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    doc = {
        "user_id": user_id,
        "email": email,
        "name": payload.name,
        "password_hash": hash_password(payload.password),
        "role": "player",
        "auth_provider": "password",
        "xp": 0,
        "level": 1,
        "regions_unlocked": ["north-coast", "black-river", "south-wild", "east-lagoons", "central-culture"],
        "cards": [],
        "badges": [],
        "picture": None,
        "avatar": payload.avatar,
        "tutorial_completed": bool(payload.tutorial_completed),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.users.insert_one(doc)
    token = create_access_token(user_id, email)
    set_auth_cookie(response, token)
    return {"user": public_user(doc), "token": token}


@api.post("/auth/login")
async def login(payload: LoginIn, response: Response):
    email = payload.email.lower()
    user = await db.users.find_one({"email": email})
    if not user or not user.get("password_hash") or not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(401, "Invalid email or password")
    token = create_access_token(user["user_id"], email)
    set_auth_cookie(response, token)
    return {"user": public_user(user), "token": token}


@api.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("session_token", path="/")
    return {"ok": True}


@api.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return public_user(user)


@api.patch("/me")
async def update_me(payload: UpdateMeIn, user: dict = Depends(get_current_user)):
    update = {k: v for k, v in payload.model_dump(exclude_unset=True).items() if v is not None}
    if update:
        await db.users.update_one({"user_id": user["user_id"]}, {"$set": update})
    doc = await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0, "password_hash": 0})
    return public_user(doc)


@api.post("/auth/google/session")
async def google_session(payload: SessionIn, response: Response):
    # Exchange Emergent session_id -> session_token, create/update user
    async with httpx.AsyncClient(timeout=15) as http:
        r = await http.get(EMERGENT_OAUTH_URL, headers={"X-Session-ID": payload.session_id})
    if r.status_code != 200:
        raise HTTPException(401, "Invalid OAuth session")
    data = r.json()
    email = data["email"].lower()
    existing = await db.users.find_one({"email": email})
    if existing:
        user_id = existing["user_id"]
        await db.users.update_one({"user_id": user_id}, {"$set": {"name": data.get("name", existing.get("name")), "picture": data.get("picture"), "auth_provider": existing.get("auth_provider", "google")}})
    else:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        await db.users.insert_one({
            "user_id": user_id,
            "email": email,
            "name": data.get("name", ""),
            "picture": data.get("picture"),
            "role": "player",
            "auth_provider": "google",
            "xp": 0,
            "level": 1,
            "regions_unlocked": ["north-coast", "black-river", "south-wild", "east-lagoons", "central-culture"],
            "cards": [],
            "badges": [],
            "avatar": None,
            "tutorial_completed": False,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })

    session_token = data["session_token"]
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    await db.user_sessions.update_one(
        {"session_token": session_token},
        {"$set": {"user_id": user_id, "session_token": session_token, "expires_at": expires_at.isoformat(), "created_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True,
    )
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        max_age=7 * 24 * 3600,
        path="/",
    )
    user_doc = await db.users.find_one({"user_id": user_id}, {"_id": 0, "password_hash": 0})
    return {"user": public_user(user_doc)}


# ---------- Catalog ----------
@api.get("/regions")
async def list_regions():
    rows = await db.regions.find({}, {"_id": 0}).to_list(50)
    return rows


@api.get("/tours")
async def list_tours():
    rows = await db.tours.find({}, {"_id": 0, "guide_pin": 0}).to_list(100)
    return rows


@api.get("/tours/{tour_id}")
async def get_tour(tour_id: str):
    t = await db.tours.find_one({"tour_id": tour_id}, {"_id": 0, "guide_pin": 0})
    if not t:
        raise HTTPException(404, "Tour not found")
    return t


@api.get("/quests")
async def list_quests(user: dict = Depends(get_current_user)):
    quests = await db.quests.find({}, {"_id": 0}).to_list(50)
    # Compute progress per quest
    bookings = await db.bookings.find({"user_id": user["user_id"]}, {"_id": 0}).to_list(500)
    completed_bookings = [b for b in bookings if b.get("status") == "completed"]
    completed_tour_ids = {b["tour_id"] for b in completed_bookings}
    completed_tours = await db.tours.find({"tour_id": {"$in": list(completed_tour_ids)}}, {"_id": 0}).to_list(100)
    culture_count = sum(1 for t in completed_tours if t.get("category") == "culture")
    regions_unlocked = len(user.get("regions_unlocked", []))
    cards_count = len(user.get("cards", []))
    for q in quests:
        if q["type"] == "book_tour":
            q["progress"] = min(1, len(bookings))
            q["target"] = 1
        elif q["type"] == "interact_guide":
            q["progress"] = min(1, len(completed_bookings))
            q["target"] = 1
        elif q["type"] == "unlock_regions":
            q["progress"] = regions_unlocked
        elif q["type"] == "category_culture":
            q["progress"] = culture_count
        elif q["type"] == "collect_cards":
            q["progress"] = cards_count
        else:
            q["progress"] = 0
            q["target"] = q.get("target", 1)
        q["completed"] = q["progress"] >= q.get("target", 1)
    return quests


# ---------- Bookings ----------
@api.post("/bookings")
async def create_booking(payload: BookingIn, user: dict = Depends(get_current_user)):
    tour = await db.tours.find_one({"tour_id": payload.tour_id}, {"_id": 0})
    if not tour:
        raise HTTPException(404, "Tour not found")
    booking = {
        "booking_id": f"bk_{uuid.uuid4().hex[:10]}",
        "user_id": user["user_id"],
        "tour_id": payload.tour_id,
        "tour_name": tour["name"],
        "status": "confirmed",
        "date": payload.date or (datetime.now(timezone.utc) + timedelta(days=7)).date().isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.bookings.insert_one(booking)
    booking.pop("_id", None)
    return booking


@api.get("/bookings")
async def list_bookings(user: dict = Depends(get_current_user)):
    rows = await db.bookings.find({"user_id": user["user_id"]}, {"_id": 0}).sort("created_at", -1).to_list(200)
    return rows


async def _apply_completion(booking: dict) -> dict:
    """Mark booking completed and award XP / regions / cards / badges / rewards. Idempotent."""
    if booking.get("status") == "completed":
        return {"ok": True, "already": True}
    tour = await db.tours.find_one({"tour_id": booking["tour_id"]}, {"_id": 0})
    if not tour:
        raise HTTPException(404, "Tour not found")

    target_user = await db.users.find_one({"user_id": booking["user_id"]}, {"_id": 0})
    new_xp = target_user.get("xp", 0) + tour.get("xp_reward", 50)
    regions = set(target_user.get("regions_unlocked", []))
    regions.add(tour["region"])
    all_regions = await db.regions.find({}, {"_id": 0}).to_list(50)
    for r in all_regions:
        if new_xp >= r.get("unlock_xp", 0):
            regions.add(r["region_id"])
    cards = set(target_user.get("cards", []))
    if tour.get("card_id"):
        cards.add(tour["card_id"])
    badges = set(target_user.get("badges", []))
    if tour.get("badge_id"):
        badges.add(tour["badge_id"])

    await db.users.update_one(
        {"user_id": booking["user_id"]},
        {"$set": {
            "xp": new_xp,
            "level": level_from_xp(new_xp),
            "regions_unlocked": list(regions),
            "cards": list(cards),
            "badges": list(badges),
        }},
    )
    await db.bookings.update_one(
        {"booking_id": booking["booking_id"]},
        {"$set": {"status": "completed", "completed_at": datetime.now(timezone.utc).isoformat()}},
    )

    templates = await db.reward_templates.find({}, {"_id": 0}).to_list(50)
    granted = []
    existing_rewards = await db.user_rewards.find({"user_id": booking["user_id"]}, {"_id": 0}).to_list(100)
    existing_template_ids = {r["template_id"] for r in existing_rewards}
    for tpl in templates:
        if new_xp >= tpl["min_xp"] and tpl["reward_id"] not in existing_template_ids:
            code = f"{tpl['code_prefix']}-{uuid.uuid4().hex[:6].upper()}"
            r_doc = {
                "user_reward_id": f"ur_{uuid.uuid4().hex[:10]}",
                "user_id": booking["user_id"],
                "template_id": tpl["reward_id"],
                "type": tpl["type"],
                "title": tpl["title"],
                "description": tpl["description"],
                "partner": tpl["partner"],
                "code": code,
                "redeemed": False,
                "created_at": datetime.now(timezone.utc).isoformat(),
            }
            await db.user_rewards.insert_one(r_doc)
            r_doc.pop("_id", None)
            granted.append(r_doc)

    return {
        "ok": True,
        "xp_gained": tour.get("xp_reward", 50),
        "new_xp": new_xp,
        "new_level": level_from_xp(new_xp),
        "card_unlocked": tour.get("card_id"),
        "badge_unlocked": tour.get("badge_id"),
        "rewards_granted": granted,
    }


@api.post("/bookings/complete")
async def complete_booking(payload: CompleteBookingIn, _: dict = Depends(require_admin)):
    booking = await db.bookings.find_one({"booking_id": payload.booking_id}, {"_id": 0})
    if not booking:
        raise HTTPException(404, "Booking not found")
    return await _apply_completion(booking)


@api.post("/bookings/checkin")
async def checkin_booking(payload: CheckInIn, user: dict = Depends(get_current_user)):
    booking = await db.bookings.find_one({"booking_id": payload.booking_id}, {"_id": 0})
    if not booking:
        raise HTTPException(404, "Booking not found")
    if booking["user_id"] != user["user_id"]:
        raise HTTPException(403, "This is not your booking")
    tour = await db.tours.find_one({"tour_id": booking["tour_id"]}, {"_id": 0})
    if not tour:
        raise HTTPException(404, "Tour not found")
    expected = (tour.get("guide_pin") or "").strip().upper()
    submitted = payload.pin.strip().upper()
    if not expected or submitted != expected:
        raise HTTPException(400, "Invalid guide PIN. Ask your An Deor guide for the code.")
    return await _apply_completion(booking)


# ---------- Player content ----------
@api.get("/me/profile")
async def my_profile(user: dict = Depends(get_current_user)):
    doc = await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0, "password_hash": 0})
    bookings_count = await db.bookings.count_documents({"user_id": user["user_id"]})
    return {**public_user(doc), "regions_unlocked": doc.get("regions_unlocked", []), "cards": doc.get("cards", []), "badges": doc.get("badges", []), "bookings_count": bookings_count, "active_self_guided": doc.get("active_self_guided"), "self_guided_progress": doc.get("self_guided_progress", {})}


@api.get("/me/rewards")
async def my_rewards(user: dict = Depends(get_current_user)):
    rows = await db.user_rewards.find({"user_id": user["user_id"]}, {"_id": 0}).sort("created_at", -1).to_list(200)
    return rows


@api.post("/me/rewards/{user_reward_id}/redeem")
async def redeem_reward(user_reward_id: str, user: dict = Depends(get_current_user)):
    r = await db.user_rewards.find_one({"user_reward_id": user_reward_id, "user_id": user["user_id"]}, {"_id": 0})
    if not r:
        raise HTTPException(404, "Reward not found")
    await db.user_rewards.update_one({"user_reward_id": user_reward_id}, {"$set": {"redeemed": True, "redeemed_at": datetime.now(timezone.utc).isoformat()}})
    return {"ok": True}


@api.get("/leaderboard")
async def leaderboard():
    rows = await db.users.find({"role": {"$ne": "admin"}}, {"_id": 0, "password_hash": 0}).sort("xp", -1).limit(20).to_list(20)
    return [{"user_id": u["user_id"], "name": u.get("name", "Explorer"), "xp": u.get("xp", 0), "level": u.get("level", 1), "picture": u.get("picture")} for u in rows]


# ---------- AI Companion ----------
@api.post("/chat")
async def chat(payload: ChatIn, user: dict = Depends(get_current_user)):
    if not EMERGENT_LLM_KEY:
        raise HTTPException(500, "AI is not configured")
    session_id = payload.session_id or f"chat_{user['user_id']}"
    system = (
        "You are 'Ti Dodo', the friendly AI travel companion for An Deor — a Mauritius-based "
        "outdoor & cultural travel marketplace. Speak warmly, sprinkle the occasional Creole "
        "word (e.g. 'mo nepli', 'bizin') with translation in parentheses. Give concrete, local "
        "Mauritius tips: hidden beaches, Sega traditions, Creole food, hiking tips, sea "
        f"conditions, etiquette. The player's name is {user.get('name', 'Explorer')}, currently "
        f"level {user.get('level', 1)} with {user.get('xp', 0)} XP. Suggest An Deor tours when "
        "relevant: 'Blue Bay Snorkel Safari', 'Le Pouce Sunrise Hike', 'Creole Table Cooking Class', "
        "'Le Morne Kite Session', 'Sega Night by the Sea'. Keep answers under 160 words."
    )

    history = await db.chat_messages.find({"session_id": session_id}, {"_id": 0}).sort("ts", 1).to_list(50)

    chat_client = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=session_id,
        system_message=system,
    ).with_model("anthropic", "claude-sonnet-4-5-20250929")

    # Replay history into the chat
    for m in history:
        if m["role"] == "user":
            try:
                await chat_client.send_message(UserMessage(text=m["content"]))
            except Exception:
                pass

    try:
        reply = await chat_client.send_message(UserMessage(text=payload.message))
    except Exception as e:
        logger.exception("LLM error")
        raise HTTPException(502, f"AI error: {e}")

    now = datetime.now(timezone.utc).isoformat()
    await db.chat_messages.insert_many([
        {"session_id": session_id, "user_id": user["user_id"], "role": "user", "content": payload.message, "ts": now},
        {"session_id": session_id, "user_id": user["user_id"], "role": "assistant", "content": reply, "ts": now},
    ])
    return {"reply": reply, "session_id": session_id}


@api.get("/chat/history")
async def chat_history(user: dict = Depends(get_current_user)):
    session_id = f"chat_{user['user_id']}"
    rows = await db.chat_messages.find({"session_id": session_id}, {"_id": 0}).sort("ts", 1).to_list(200)
    return rows


# ---------- Admin ----------
@api.get("/admin/bookings")
async def admin_bookings(_: dict = Depends(require_admin)):
    rows = await db.bookings.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return rows


@api.get("/admin/users")
async def admin_users(_: dict = Depends(require_admin)):
    rows = await db.users.find({}, {"_id": 0, "password_hash": 0}).sort("xp", -1).to_list(500)
    return rows


@api.get("/admin/tours")
async def admin_tours(_: dict = Depends(require_admin)):
    """Returns full tour records WITH guide_pin so admins can share PINs with their guides."""
    rows = await db.tours.find({}, {"_id": 0}).to_list(100)
    return rows


# ---------- Root ----------
@api.get("/")
async def root():
    return {"app": "An Deor Quest", "status": "ok"}


app.include_router(api)

# Codex sub-router (lore, audio narration, GPX uploads/downloads)
api_codex = build_codex_router(db, require_admin, get_current_user)
app.include_router(api_codex, prefix="/api")

# Main Quests router (thematic tour bundles)
api_mq = build_main_quests_router(db, get_current_user)
app.include_router(api_mq, prefix="/api")

# Self-guided journeys router (free, multi-stop, GPX-exportable, GPS-checkin)
api_sg = build_self_guided_router(db, get_current_user)
app.include_router(api_sg, prefix="/api")

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=".*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
