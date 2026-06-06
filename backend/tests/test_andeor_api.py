"""End-to-end API tests for An Deor Quest backend."""
import os
import time
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://explore-earn-5.preview.emergentagent.com").rstrip("/")
ADMIN_EMAIL = "admin@andeor.mu"
ADMIN_PASSWORD = "AnDeor2026!"


# ---------------- Fixtures ----------------
@pytest.fixture(scope="session")
def player_creds():
    suffix = uuid.uuid4().hex[:8]
    return {
        "email": f"test_player_{suffix}@example.com",
        "password": "explore123",
        "name": f"TEST Player {suffix}",
    }


@pytest.fixture(scope="session")
def player_session(player_creds):
    s = requests.Session()
    r = s.post(f"{BASE_URL}/api/auth/register", json=player_creds, timeout=20)
    assert r.status_code == 200, f"register failed: {r.status_code} {r.text}"
    body = r.json()
    assert "user" in body and body["user"]["email"] == player_creds["email"].lower()
    assert "token" in body
    # Cookie should be set
    assert s.cookies.get("access_token"), "access_token cookie not set"
    return s


@pytest.fixture(scope="session")
def admin_session():
    s = requests.Session()
    r = s.post(f"{BASE_URL}/api/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=20)
    assert r.status_code == 200, f"admin login failed: {r.status_code} {r.text}"
    assert r.json()["user"]["role"] == "admin"
    assert s.cookies.get("access_token")
    return s


# ---------------- Auth ----------------
class TestAuth:
    def test_root(self):
        r = requests.get(f"{BASE_URL}/api/", timeout=10)
        assert r.status_code == 200
        assert r.json().get("status") == "ok"

    def test_register_duplicate(self, player_creds, player_session):
        r = requests.post(f"{BASE_URL}/api/auth/register", json=player_creds, timeout=20)
        assert r.status_code == 400

    def test_login_invalid(self):
        r = requests.post(f"{BASE_URL}/api/auth/login",
                          json={"email": "nouser@example.com", "password": "wrong"}, timeout=15)
        assert r.status_code == 401

    def test_me(self, player_session, player_creds):
        r = player_session.get(f"{BASE_URL}/api/auth/me", timeout=15)
        assert r.status_code == 200
        assert r.json()["email"] == player_creds["email"].lower()

    def test_me_unauthenticated(self):
        r = requests.get(f"{BASE_URL}/api/auth/me", timeout=15)
        assert r.status_code == 401

    def test_admin_login_role(self, admin_session):
        r = admin_session.get(f"{BASE_URL}/api/auth/me", timeout=15)
        assert r.status_code == 200
        assert r.json()["role"] == "admin"


# ---------------- Catalog ----------------
class TestCatalog:
    def test_regions(self):
        r = requests.get(f"{BASE_URL}/api/regions", timeout=15)
        assert r.status_code == 200
        regions = r.json()
        assert len(regions) == 5
        ids = {x["region_id"] for x in regions}
        assert "north-coast" in ids

    def test_tours(self):
        r = requests.get(f"{BASE_URL}/api/tours", timeout=15)
        assert r.status_code == 200
        tours = r.json()
        assert len(tours) == 5
        names = {t["name"] for t in tours}
        assert "Blue Bay Snorkel Safari" in names

    def test_tour_detail(self):
        r = requests.get(f"{BASE_URL}/api/tours/t-snorkel-blue-bay", timeout=15)
        assert r.status_code == 200
        assert r.json()["xp_reward"] == 120

    def test_tour_404(self):
        r = requests.get(f"{BASE_URL}/api/tours/nope", timeout=15)
        assert r.status_code == 404

    def test_quests_requires_auth(self):
        r = requests.get(f"{BASE_URL}/api/quests", timeout=15)
        assert r.status_code == 401

    def test_quests_authed(self, player_session):
        r = player_session.get(f"{BASE_URL}/api/quests", timeout=15)
        assert r.status_code == 200
        quests = r.json()
        assert len(quests) == 5
        for q in quests:
            assert "progress" in q and "target" in q and "completed" in q


# ---------------- Bookings & complete flow ----------------
class TestBookingFlow:
    def test_create_booking(self, player_session):
        r = player_session.post(f"{BASE_URL}/api/bookings", json={"tour_id": "t-snorkel-blue-bay"}, timeout=20)
        assert r.status_code == 200
        b = r.json()
        assert b["tour_id"] == "t-snorkel-blue-bay"
        assert b["status"] == "confirmed"
        assert b["tour_name"] == "Blue Bay Snorkel Safari"
        # Persistence
        r2 = player_session.get(f"{BASE_URL}/api/bookings", timeout=15)
        assert r2.status_code == 200
        ids = [x["booking_id"] for x in r2.json()]
        assert b["booking_id"] in ids
        pytest.booking_id = b["booking_id"]

    def test_create_booking_invalid_tour(self, player_session):
        r = player_session.post(f"{BASE_URL}/api/bookings", json={"tour_id": "nope"}, timeout=15)
        assert r.status_code == 404

    def test_complete_awards_xp_and_unlocks(self, player_session):
        bid = getattr(pytest, "booking_id", None)
        assert bid, "booking not created in prior test"
        r = player_session.post(f"{BASE_URL}/api/bookings/complete", json={"booking_id": bid}, timeout=20)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["ok"] is True
        assert data["xp_gained"] == 120
        assert data["new_xp"] >= 120
        assert data["card_unlocked"] == "card-blue-bay"
        assert data["badge_unlocked"] == "badge-reef-friend"
        # At least one reward granted (>=100 XP)
        assert len(data["rewards_granted"]) >= 1

        # Verify profile reflects updates
        prof = player_session.get(f"{BASE_URL}/api/me/profile", timeout=15).json()
        assert prof["xp"] >= 120
        assert "card-blue-bay" in prof["cards"]
        assert "badge-reef-friend" in prof["badges"]
        assert "east-lagoons" in prof["regions_unlocked"]
        assert "north-coast" in prof["regions_unlocked"]

    def test_complete_idempotent(self, player_session):
        bid = pytest.booking_id
        r = player_session.post(f"{BASE_URL}/api/bookings/complete", json={"booking_id": bid}, timeout=15)
        assert r.status_code == 200
        assert r.json().get("already") is True


# ---------------- Rewards ----------------
class TestRewards:
    def test_list_my_rewards(self, player_session):
        r = player_session.get(f"{BASE_URL}/api/me/rewards", timeout=15)
        assert r.status_code == 200
        rewards = r.json()
        assert len(rewards) >= 1
        assert "code" in rewards[0] and rewards[0]["code"].startswith(rewards[0].get("code", "")[:6])
        pytest.reward_id = rewards[0]["user_reward_id"]

    def test_redeem(self, player_session):
        rid = pytest.reward_id
        r = player_session.post(f"{BASE_URL}/api/me/rewards/{rid}/redeem", timeout=15)
        assert r.status_code == 200
        # Verify redeemed flag
        rewards = player_session.get(f"{BASE_URL}/api/me/rewards", timeout=15).json()
        redeemed = [x for x in rewards if x["user_reward_id"] == rid][0]
        assert redeemed["redeemed"] is True

    def test_redeem_unknown(self, player_session):
        r = player_session.post(f"{BASE_URL}/api/me/rewards/unknown/redeem", timeout=15)
        assert r.status_code == 404


# ---------------- Leaderboard ----------------
class TestLeaderboard:
    def test_leaderboard_excludes_admin(self):
        r = requests.get(f"{BASE_URL}/api/leaderboard", timeout=15)
        assert r.status_code == 200
        rows = r.json()
        assert isinstance(rows, list)
        for row in rows:
            assert "xp" in row and "name" in row
        # Admin should not appear
        emails = [row.get("email", "") for row in rows]
        assert ADMIN_EMAIL not in emails


# ---------------- AI Chat ----------------
class TestChat:
    def test_chat_unauth(self):
        r = requests.post(f"{BASE_URL}/api/chat", json={"message": "hi"}, timeout=15)
        assert r.status_code == 401

    def test_chat_reply(self, player_session):
        r = player_session.post(f"{BASE_URL}/api/chat",
                                json={"message": "Suggest a culture tour in 1 sentence."}, timeout=60)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "reply" in data and isinstance(data["reply"], str) and len(data["reply"]) > 5
        assert "session_id" in data

    def test_chat_history(self, player_session):
        time.sleep(1)
        r = player_session.get(f"{BASE_URL}/api/chat/history", timeout=15)
        assert r.status_code == 200
        hist = r.json()
        roles = {m["role"] for m in hist}
        assert "user" in roles and "assistant" in roles


# ---------------- Admin ----------------
class TestAdmin:
    def test_admin_only_blocks_player(self, player_session):
        r = player_session.get(f"{BASE_URL}/api/admin/bookings", timeout=15)
        assert r.status_code == 403

    def test_admin_bookings(self, admin_session):
        r = admin_session.get(f"{BASE_URL}/api/admin/bookings", timeout=15)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_admin_users(self, admin_session):
        r = admin_session.get(f"{BASE_URL}/api/admin/users", timeout=15)
        assert r.status_code == 200
        users = r.json()
        assert any(u["email"] == ADMIN_EMAIL for u in users)


# ---------------- Logout ----------------
class TestLogout:
    def test_logout_clears(self, player_creds):
        s = requests.Session()
        s.post(f"{BASE_URL}/api/auth/login",
               json={"email": player_creds["email"], "password": player_creds["password"]}, timeout=15)
        assert s.cookies.get("access_token")
        r = s.post(f"{BASE_URL}/api/auth/logout", timeout=15)
        assert r.status_code == 200
        # Cookie cleared by server (Set-Cookie with empty value)
        # Subsequent call should be 401
        r2 = s.get(f"{BASE_URL}/api/auth/me", timeout=15)
        assert r2.status_code == 401
