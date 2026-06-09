from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import os
import json
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

try:
    from emergentintegrations.llm.chat import LlmChat, UserMessage
except Exception:
    LlmChat = None
    UserMessage = None

from codex import build_router as build_codex_router, seed_lore
from db_postgres import create_postgres_database
from main_quests import build_router as build_main_quests_router, seed_main_quests
from self_guided import build_router as build_self_guided_router, seed_self_guided
from meteo import build_router as build_meteo_router
from info_center import build_router as build_info_center_router
from admin_extra import build_router as build_admin_extra_router

# ---------- Database ----------
supabase_db_url = os.environ.get("SUPABASE_DB_URL", "").strip()
if supabase_db_url:
    client = None
    db = create_postgres_database(supabase_db_url)
else:
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
        "language": u.get("language", "en"),
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
    language: Optional[str] = None  # "en" | "fr" | "mfe"


class UpdateMeIn(BaseModel):
    name: Optional[str] = None
    avatar: Optional[str] = None
    tutorial_completed: Optional[bool] = None
    language: Optional[str] = None  # "en" | "fr" | "mfe" (Mauritian Creole)


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class SessionIn(BaseModel):
    session_id: str


class AndeorSessionIn(BaseModel):
    user_id: str = Field(min_length=1)
    email: EmailStr
    name: Optional[str] = None
    picture: Optional[str] = None
    roles: List[str] = Field(default_factory=list)


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


# ---------- Seed data (content lives in /app/backend/seeds/*.seed.json) ----------
SEEDS_DIR = ROOT_DIR / "seeds"

def _load_seed(name: str) -> list:
    return json.loads((SEEDS_DIR / name).read_text(encoding="utf-8"))

REGIONS = _load_seed("regions.seed.json")
TOURS = _load_seed("tours.seed.json")
QUESTS = _load_seed("quests.seed.json")
REWARD_TEMPLATES = _load_seed("reward_templates.seed.json")


async def seed_data():
    # Regions
    if await db.regions.count_documents({}) == 0:
        await db.regions.insert_many([dict(r) for r in REGIONS])
    # Tours — upsert all seed tours so new entries and field additions are always applied
    for t in TOURS:
        await db.tours.update_one(
            {"tour_id": t["tour_id"]},
            {"$set": dict(t)},
            upsert=True,
        )
    # Remove original placeholder tours that have been superseded by real marketplace tours
    current_ids = {t["tour_id"] for t in TOURS}
    legacy_ids = {"t-hike-le-pouce", "t-creole-table", "t-kite-le-morne"}
    to_purge = list(legacy_ids - current_ids)
    if to_purge:
        await db.tours.delete_many({"tour_id": {"$in": to_purge}})
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
    if hasattr(db, "connect"):
        await db.connect()
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
    if hasattr(db, "close"):
        await db.close()
    elif client:
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
        "language": payload.language if payload.language in {"en", "fr", "mfe"} else "en",
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
    if "language" in update and update["language"] not in {"en", "fr", "mfe"}:
        raise HTTPException(400, "Unsupported language. Use 'en', 'fr' or 'mfe'.")
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
    access_token = create_access_token(user_id, email)
    set_auth_cookie(response, access_token)
    user_doc = await db.users.find_one({"user_id": user_id}, {"_id": 0, "password_hash": 0})
    return {"user": public_user(user_doc), "token": access_token}


@api.post("/auth/andeor/session")
async def andeor_session(payload: AndeorSessionIn, request: Request, response: Response):
    bridge_secret = os.environ.get("ANDEOR_GAME_BRIDGE_SECRET", "")
    if not bridge_secret:
        raise HTTPException(503, "Andeor account bridge is not configured")

    auth = request.headers.get("Authorization", "")
    token = auth[7:] if auth.startswith("Bearer ") else ""
    if not token or not secrets.compare_digest(token, bridge_secret):
        raise HTTPException(401, "Unauthorized account bridge request")

    email = payload.email.lower()
    role = "admin" if any(r in {"admin", "superadmin"} for r in payload.roles) else "player"
    now = datetime.now(timezone.utc).isoformat()
    existing = await db.users.find_one({"andeor_user_id": payload.user_id})
    if not existing:
        existing = await db.users.find_one({"email": email})

    if existing:
        user_id = existing["user_id"]
        update = {
            "andeor_user_id": payload.user_id,
            "email": email,
            "name": payload.name or existing.get("name") or email.split("@")[0],
            "picture": payload.picture or existing.get("picture"),
            "auth_provider": "andeor",
            "updated_at": now,
        }
        if not existing.get("avatar"):
            update["avatar"] = "akil"
        if not existing.get("tutorial_completed"):
            update["tutorial_completed"] = True
        if existing.get("role") != "admin":
            update["role"] = role
        await db.users.update_one({"user_id": user_id}, {"$set": update})
    else:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        await db.users.insert_one({
            "user_id": user_id,
            "andeor_user_id": payload.user_id,
            "email": email,
            "name": payload.name or email.split("@")[0],
            "password_hash": None,
            "role": role,
            "auth_provider": "andeor",
            "xp": 0,
            "level": 1,
            "regions_unlocked": ["north-coast", "black-river", "south-wild", "east-lagoons", "central-culture"],
            "cards": [],
            "badges": [],
            "picture": payload.picture,
            "avatar": "akil",
            "tutorial_completed": True,
            "language": "en",
            "created_at": now,
            "updated_at": now,
        })

    access_token = create_access_token(user_id, email)
    set_auth_cookie(response, access_token)
    user_doc = await db.users.find_one({"user_id": user_id}, {"_id": 0, "password_hash": 0})
    return {"user": public_user(user_doc), "token": access_token}


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


@api.get("/me/greeting")
async def me_greeting(user: dict = Depends(get_current_user)):
    """Returns a dynamic Ti Dodo greeting line personalised to this player's current context."""
    if not EMERGENT_LLM_KEY or LlmChat is None or UserMessage is None:
        # Graceful fallback — no AI configured
        name = user.get("name", "explorer")
        xp = user.get("xp", 0)
        regions_count = len(user.get("regions_unlocked", []))
        fallback = (
            f"Bonzour, {name}. {regions_count} region{'s' if regions_count != 1 else ''} unlocked, {xp} XP earned."
        )
        return {"greeting": fallback}

    # Build player context
    name = user.get("name", "explorer")
    xp = user.get("xp", 0)
    level = user.get("level", 1)
    regions_unlocked = user.get("regions_unlocked", [])
    regions_count = len(regions_unlocked)
    badges = user.get("badges", [])
    badges_count = len(badges)

    # Last booking context
    last_booking = await db.bookings.find_one(
        {"user_id": user["user_id"]},
        {"_id": 0, "tour_name": 1, "status": 1, "date": 1},
        sort=[("created_at", -1)],
    )
    pending_count = await db.bookings.count_documents({"user_id": user["user_id"], "status": "confirmed"})

    # Time of day in Mauritius (UTC+4)
    hour_utc = datetime.now(timezone.utc).hour
    hour_mru = (hour_utc + 4) % 24
    if hour_mru < 6:
        time_ctx = "it's the middle of the night in Mauritius"
    elif hour_mru < 12:
        time_ctx = "it's morning in Mauritius"
    elif hour_mru < 17:
        time_ctx = "it's afternoon in Mauritius"
    elif hour_mru < 20:
        time_ctx = "it's evening in Mauritius"
    else:
        time_ctx = "it's night in Mauritius"

    lang = user.get("language", "en")
    lang_directive = {
        "en":  "Reply in English. You may include one Creole word with translation in parentheses.",
        "fr":  "Réponds en français, tu peux inclure un seul mot créole avec traduction entre parenthèses.",
        "mfe": "Reponn an kreol morisien natirel. Enn sél fraz, kourt.",
    }.get(lang, "Reply in English.")

    ctx_parts = [
        f"Player name: {name}",
        f"Level {level}, {xp} XP",
        f"{regions_count} region(s) unlocked",
        f"{badges_count} badge(s) earned",
        time_ctx,
    ]
    if last_booking:
        status_label = "completed" if last_booking["status"] == "completed" else "upcoming"
        ctx_parts.append(f"Last tour: '{last_booking['tour_name']}' ({status_label})")
    if pending_count > 0:
        ctx_parts.append(f"{pending_count} pending booking(s)")

    context_str = ". ".join(ctx_parts)

    system = (
        "You are Ti Dodo, the warm and wise AI companion of Andeor — a Mauritius outdoor travel platform. "
        "Your job is to greet a returning player with ONE short sentence (max 20 words). "
        "The greeting should feel personal and alive — reference their actual progress, time of day, or last adventure. "
        "Never repeat the same generic formula. Be warm, poetic when fitting, rooted in Mauritius. "
        f"{lang_directive} "
        "Reply with ONLY the greeting sentence, no quotes, no prefix."
    )

    prompt = f"Generate a greeting for this player. Context: {context_str}"

    try:
        chat_client = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"greeting_{user['user_id']}_{hour_utc}",
            system_message=system,
        ).with_model("anthropic", "claude-haiku-4-5-20251001")
        greeting = await chat_client.send_message(UserMessage(text=prompt))
        # Strip surrounding quotes if the model added them
        greeting = greeting.strip().strip('"').strip("'")
    except Exception:
        logger.exception("Greeting LLM error")
        greeting = f"Bonzour, {name}. {xp} XP and {regions_count} regions — the island remembers you."

    return {"greeting": greeting}


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
    if not EMERGENT_LLM_KEY or LlmChat is None or UserMessage is None:
        raise HTTPException(500, "AI is not configured")
    session_id = payload.session_id or f"chat_{user['user_id']}"
    lang_directive = {
        "en":  "Reply in English. You may sprinkle the occasional Creole word with English translation in parentheses.",
        "fr":  "Réponds en français. Tu peux saupoudrer occasionnellement un mot créole avec sa traduction française entre parenthèses. Ton chaleureux et tutoyé.",
        "mfe": "Reponn an kreol morisien. Sirtou ekrir an Kreol Morisien natirel — pa melanze tro fransé/anglé. Trad an parantez si u uzz enn mot teknik anglais/fransé.",
    }.get(user.get("language", "en"), "Reply in English. You may sprinkle the occasional Creole word with English translation in parentheses.")

    system = (
        "You are 'Ti Dodo', the friendly AI travel companion for An Deor — a Mauritius-based "
        "outdoor & cultural travel marketplace. Speak warmly. "
        f"{lang_directive} "
        "Give concrete, local Mauritius tips: hidden beaches, Sega traditions, Creole food, "
        "hiking tips, sea conditions, etiquette. "
        f"The player's name is {user.get('name', 'Explorer')}, currently level "
        f"{user.get('level', 1)} with {user.get('xp', 0)} XP. Suggest An Deor tours when "
        "relevant — name real Andeor tours like: 'Hiking at Black River Gorges', 'Kayak with Dolphins', "
        "'Canyoning Tamarind Falls', 'Le Morne Brabant Hike', 'Wild South E-bike Adventure', "
        "'Pieter Both Exclusive Guided Climb', 'Sunrise Hike at Le Morne Brabant'. "
        "Always link to andeor.travel for booking. Keep answers under 160 words."
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

# Mauritius meteo station (weather + trail conditions for the 4 famous hikes)
api_meteo = build_meteo_router()
app.include_router(api_meteo, prefix="/api")

# Information Center auxiliary modules (events/holidays, transport, safety)
api_info = build_info_center_router(db)
app.include_router(api_info, prefix="/api")

# Admin polish — Tour CRUD, booking CSV export, reward template + advisory mgmt
api_admin_extra = build_admin_extra_router(db, require_admin)
app.include_router(api_admin_extra, prefix="/api")

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=".*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
