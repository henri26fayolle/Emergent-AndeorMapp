"""Iteration 3 tests: guide PIN check-in, /complete admin gating, /admin/tours, avatar swap via PATCH /me."""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://explore-earn-5.preview.emergentagent.com").rstrip("/")
ADMIN_EMAIL = "admin@andeor.mu"
ADMIN_PASSWORD = "AnDeor2026!"

EXPECTED_PINS = {
    "t-snorkel-blue-bay": "REEF42",
    "t-hike-le-pouce": "RIDGE07",
    "t-creole-table": "PIMENT9",
    "t-kite-le-morne": "WIND88",
    "t-sega-night": "SEGA21",
}


def _register(suffix: str | None = None) -> requests.Session:
    suffix = suffix or uuid.uuid4().hex[:8]
    s = requests.Session()
    r = s.post(f"{BASE_URL}/api/auth/register", json={
        "email": f"TEST_iter3_{suffix}@example.com",
        "password": "explore123",
        "name": f"TEST iter3 {suffix}",
    }, timeout=20)
    assert r.status_code == 200, r.text
    return s


@pytest.fixture(scope="module")
def admin_session():
    s = requests.Session()
    r = s.post(f"{BASE_URL}/api/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=20)
    assert r.status_code == 200, r.text
    return s


@pytest.fixture(scope="module")
def player_session():
    return _register()


# ---------------- Public tours must NOT leak guide_pin ----------------
class TestPublicToursNoPin:
    def test_list_tours_excludes_guide_pin(self):
        r = requests.get(f"{BASE_URL}/api/tours", timeout=15)
        assert r.status_code == 200
        tours = r.json()
        assert len(tours) == 5
        for t in tours:
            assert "guide_pin" not in t, f"guide_pin leaked in /api/tours for {t.get('tour_id')}"

    def test_get_tour_excludes_guide_pin(self):
        for tid in EXPECTED_PINS:
            r = requests.get(f"{BASE_URL}/api/tours/{tid}", timeout=15)
            assert r.status_code == 200
            assert "guide_pin" not in r.json()


# ---------------- /api/admin/tours ----------------
class TestAdminTours:
    def test_admin_tours_blocks_anonymous(self):
        r = requests.get(f"{BASE_URL}/api/admin/tours", timeout=15)
        assert r.status_code == 401

    def test_admin_tours_blocks_player(self, player_session):
        r = player_session.get(f"{BASE_URL}/api/admin/tours", timeout=15)
        assert r.status_code == 403

    def test_admin_tours_returns_pins(self, admin_session):
        r = admin_session.get(f"{BASE_URL}/api/admin/tours", timeout=15)
        assert r.status_code == 200
        tours = r.json()
        assert len(tours) == 5
        by_id = {t["tour_id"]: t for t in tours}
        for tid, pin in EXPECTED_PINS.items():
            assert tid in by_id, f"{tid} missing"
            assert by_id[tid].get("guide_pin") == pin, f"{tid} pin mismatch"


# ---------------- /api/bookings/complete is admin-only ----------------
class TestCompleteAdminOnly:
    def test_player_complete_forbidden(self, player_session):
        # Create booking as player
        r = player_session.post(f"{BASE_URL}/api/bookings", json={"tour_id": "t-sega-night"}, timeout=20)
        assert r.status_code == 200
        bid = r.json()["booking_id"]
        # Player cannot self-complete
        r2 = player_session.post(f"{BASE_URL}/api/bookings/complete", json={"booking_id": bid}, timeout=15)
        assert r2.status_code == 403, r2.text

    def test_admin_can_force_complete(self, admin_session, player_session):
        # Player creates booking
        r = player_session.post(f"{BASE_URL}/api/bookings", json={"tour_id": "t-kite-le-morne"}, timeout=20)
        assert r.status_code == 200
        bid = r.json()["booking_id"]
        # Admin force-completes
        r2 = admin_session.post(f"{BASE_URL}/api/bookings/complete", json={"booking_id": bid}, timeout=20)
        assert r2.status_code == 200, r2.text
        data = r2.json()
        assert data["ok"] is True
        assert data.get("xp_gained") == 180 or data.get("already") is True


# ---------------- /api/bookings/checkin ----------------
class TestCheckIn:
    def test_checkin_correct_pin(self):
        s = _register()
        r = s.post(f"{BASE_URL}/api/bookings", json={"tour_id": "t-snorkel-blue-bay"}, timeout=20)
        bid = r.json()["booking_id"]
        r2 = s.post(f"{BASE_URL}/api/bookings/checkin", json={"booking_id": bid, "pin": "REEF42"}, timeout=20)
        assert r2.status_code == 200, r2.text
        data = r2.json()
        assert data["ok"] is True
        assert data["xp_gained"] == 120
        assert data["new_xp"] >= 120
        assert data["new_level"] >= 2  # 120 XP -> level 2
        assert data["card_unlocked"] == "card-blue-bay"
        assert data["badge_unlocked"] == "badge-reef-friend"
        # verify profile reflects updates
        prof = s.get(f"{BASE_URL}/api/me/profile", timeout=15).json()
        assert prof["xp"] >= 120
        assert "card-blue-bay" in prof["cards"]
        assert "east-lagoons" in prof["regions_unlocked"]

    def test_checkin_wrong_pin(self):
        s = _register()
        r = s.post(f"{BASE_URL}/api/bookings", json={"tour_id": "t-snorkel-blue-bay"}, timeout=20)
        bid = r.json()["booking_id"]
        r2 = s.post(f"{BASE_URL}/api/bookings/checkin", json={"booking_id": bid, "pin": "WRONG"}, timeout=15)
        assert r2.status_code == 400, r2.text
        assert "Invalid guide PIN" in r2.json().get("detail", "")

    def test_checkin_case_insensitive(self):
        s = _register()
        r = s.post(f"{BASE_URL}/api/bookings", json={"tour_id": "t-snorkel-blue-bay"}, timeout=20)
        bid = r.json()["booking_id"]
        r2 = s.post(f"{BASE_URL}/api/bookings/checkin", json={"booking_id": bid, "pin": "reef42"}, timeout=20)
        assert r2.status_code == 200, r2.text
        assert r2.json()["ok"] is True

    def test_checkin_other_users_booking_forbidden(self):
        owner = _register()
        intruder = _register()
        r = owner.post(f"{BASE_URL}/api/bookings", json={"tour_id": "t-creole-table"}, timeout=20)
        bid = r.json()["booking_id"]
        r2 = intruder.post(f"{BASE_URL}/api/bookings/checkin", json={"booking_id": bid, "pin": "PIMENT9"}, timeout=15)
        assert r2.status_code == 403, r2.text

    def test_checkin_nonexistent_booking(self):
        s = _register()
        r = s.post(f"{BASE_URL}/api/bookings/checkin", json={"booking_id": "bk_does_not_exist", "pin": "REEF42"}, timeout=15)
        assert r.status_code == 404

    def test_checkin_unauthenticated(self):
        r = requests.post(f"{BASE_URL}/api/bookings/checkin", json={"booking_id": "any", "pin": "REEF42"}, timeout=15)
        assert r.status_code == 401

    def test_all_pins_work(self):
        """Smoke test: each tour pin checks in successfully for its tour."""
        for tid, pin in EXPECTED_PINS.items():
            s = _register()
            r = s.post(f"{BASE_URL}/api/bookings", json={"tour_id": tid}, timeout=20)
            assert r.status_code == 200, f"booking {tid} failed"
            bid = r.json()["booking_id"]
            r2 = s.post(f"{BASE_URL}/api/bookings/checkin", json={"booking_id": bid, "pin": pin}, timeout=20)
            assert r2.status_code == 200, f"checkin {tid} pin={pin} failed: {r2.text}"
            assert r2.json()["ok"] is True


# ---------------- PATCH /api/me avatar swap ----------------
class TestAvatarSwap:
    def test_patch_me_avatar_updates_and_persists(self):
        s = _register()
        # Initial avatar should be None
        me1 = s.get(f"{BASE_URL}/api/auth/me", timeout=15).json()
        assert me1.get("avatar") in (None, "")
        # Patch to 'hiker'
        r = s.patch(f"{BASE_URL}/api/me", json={"avatar": "hiker"}, timeout=15)
        assert r.status_code == 200, r.text
        assert r.json()["avatar"] == "hiker"
        # Next /auth/me reflects change
        me2 = s.get(f"{BASE_URL}/api/auth/me", timeout=15).json()
        assert me2["avatar"] == "hiker"
        # Swap again to 'foodie'
        r2 = s.patch(f"{BASE_URL}/api/me", json={"avatar": "foodie"}, timeout=15)
        assert r2.status_code == 200
        assert r2.json()["avatar"] == "foodie"
        me3 = s.get(f"{BASE_URL}/api/auth/me", timeout=15).json()
        assert me3["avatar"] == "foodie"

    def test_patch_me_unauthenticated(self):
        r = requests.patch(f"{BASE_URL}/api/me", json={"avatar": "diver"}, timeout=15)
        assert r.status_code == 401
