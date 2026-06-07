"""
Iteration 14 — Admin Polish (P3): Tours CRUD, Bookings CSV export,
Rewards templates CRUD, Road Advisories CRUD, plus Info Center integration.
"""
import os
import time
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://explore-earn-5.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admin@andeor.mu"
ADMIN_PASSWORD = "AnDeor2026!"


@pytest.fixture(scope="module")
def admin_session():
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=20)
    assert r.status_code == 200, f"Admin login failed: {r.status_code} {r.text[:200]}"
    return s


@pytest.fixture(scope="module")
def player_session():
    s = requests.Session()
    email = f"TEST_player_{int(time.time())}@example.com"
    r = s.post(f"{API}/auth/register", json={"email": email, "password": "explore123", "name": "TEST Player"}, timeout=20)
    if r.status_code not in (200, 201):
        pytest.skip(f"player register failed: {r.status_code} {r.text[:120]}")
    return s


# --- Admin auth gate ---
class TestAdminAuthGate:
    def test_no_auth_rejected(self):
        r = requests.get(f"{API}/admin/rewards", timeout=15)
        assert r.status_code in (401, 403), f"expected 401/403 got {r.status_code}"

    def test_player_role_rejected(self, player_session):
        r = player_session.get(f"{API}/admin/rewards", timeout=15)
        assert r.status_code in (401, 403), f"non-admin should be rejected, got {r.status_code}"

        r2 = player_session.get(f"{API}/admin/bookings/export.csv", timeout=15)
        assert r2.status_code in (401, 403)


# --- Tours CRUD ---
class TestToursCRUD:
    TOUR_ID = f"test-tour-{int(time.time())}"

    def test_create_tour(self, admin_session):
        payload = {
            "tour_id": self.TOUR_ID, "name": "TEST Snorkel", "region": "north-coast",
            "category": "water", "xp_reward": 50, "guide_pin": "REEF42",
        }
        r = admin_session.post(f"{API}/admin/tours", json=payload, timeout=15)
        assert r.status_code == 200, f"{r.status_code} {r.text[:200]}"
        body = r.json()
        assert body["tour_id"] == self.TOUR_ID
        assert body["name"] == "TEST Snorkel"

    def test_duplicate_tour_returns_409(self, admin_session):
        payload = {
            "tour_id": self.TOUR_ID, "name": "Dup", "region": "x",
            "category": "water",
        }
        r = admin_session.post(f"{API}/admin/tours", json=payload, timeout=15)
        assert r.status_code == 409

    def test_patch_tour(self, admin_session):
        r = admin_session.patch(f"{API}/admin/tours/{self.TOUR_ID}", json={"name": "TEST Snorkel v2"}, timeout=15)
        assert r.status_code == 200
        assert r.json()["name"] == "TEST Snorkel v2"

    def test_delete_refuses_with_active_booking(self, admin_session, player_session):
        # Create a booking on the test tour
        r = player_session.post(f"{API}/bookings", json={"tour_id": self.TOUR_ID, "date": "2026-12-31"}, timeout=15)
        if r.status_code not in (200, 201):
            pytest.skip(f"booking create failed: {r.status_code} {r.text[:200]}")
        booking_id = r.json().get("booking_id")
        # Delete should fail
        d = admin_session.delete(f"{API}/admin/tours/{self.TOUR_ID}", timeout=15)
        assert d.status_code == 409, f"expected 409 with active booking, got {d.status_code} {d.text[:120]}"
        # Cleanup: cancel booking via DB? We don't have cancel API in scope, so leave the test tour.
        # Try direct delete by cancelling via... fallback: use admin endpoint if exists -- skip cleanup
        TestToursCRUD._booking_id = booking_id

    def test_delete_after_no_active_booking(self, admin_session):
        # Try to delete -- if previous test created a booking, this may still 409.
        # Create a *separate* clean tour and delete it to validate the happy-path
        tid = f"test-clean-{int(time.time())}"
        admin_session.post(f"{API}/admin/tours", json={
            "tour_id": tid, "name": "TEST Clean", "region": "x", "category": "other",
        }, timeout=15)
        d = admin_session.delete(f"{API}/admin/tours/{tid}", timeout=15)
        assert d.status_code == 200


# --- Bookings CSV export ---
class TestBookingsCsvExport:
    def test_export_csv(self, admin_session):
        r = admin_session.get(f"{API}/admin/bookings/export.csv", timeout=20)
        assert r.status_code == 200
        ct = r.headers.get("content-type", "")
        assert "text/csv" in ct, f"bad content-type: {ct}"
        cd = r.headers.get("content-disposition", "")
        assert "attachment" in cd.lower(), f"missing attachment header: {cd}"
        body = r.text
        header = body.splitlines()[0]
        required = ["booking_id","user_id","user_email","user_name","tour_id","tour_name","tour_category","tour_region","date","status","created_at","completed_at","xp_awarded"]
        for col in required:
            assert col in header, f"missing column {col} in CSV header: {header}"
        # at least one data row
        assert len(body.splitlines()) >= 2, "expected at least one booking row"


# --- Rewards CRUD ---
class TestRewardsCRUD:
    RID = f"test-rwd-{int(time.time())}"

    def test_list_rewards(self, admin_session):
        r = admin_session.get(f"{API}/admin/rewards", timeout=15)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_create_reward(self, admin_session):
        payload = {
            "reward_id": self.RID, "type": "discount", "title": "TEST 10% off",
            "code_prefix": "TEST10", "partner": "TEST Partner", "min_xp": 100,
        }
        r = admin_session.post(f"{API}/admin/rewards", json=payload, timeout=15)
        assert r.status_code == 200, f"{r.status_code} {r.text[:200]}"
        b = r.json()
        assert b["reward_id"] == self.RID
        assert b["type"] == "discount"

    def test_duplicate_reward_returns_409(self, admin_session):
        r = admin_session.post(f"{API}/admin/rewards", json={
            "reward_id": self.RID, "type": "discount", "title": "dup",
            "code_prefix": "X", "partner": "X",
        }, timeout=15)
        assert r.status_code == 409

    def test_invalid_type_rejected(self, admin_session):
        r = admin_session.post(f"{API}/admin/rewards", json={
            "reward_id": f"{self.RID}-bad", "type": "freebie", "title": "x",
            "code_prefix": "X", "partner": "X",
        }, timeout=15)
        assert r.status_code in (400, 422), f"expected validation error, got {r.status_code}"

    def test_patch_reward(self, admin_session):
        r = admin_session.patch(f"{API}/admin/rewards/{self.RID}", json={"title": "TEST patched"}, timeout=15)
        assert r.status_code == 200
        assert r.json()["title"] == "TEST patched"

    def test_delete_reward(self, admin_session):
        r = admin_session.delete(f"{API}/admin/rewards/{self.RID}", timeout=15)
        assert r.status_code == 200


# --- Advisories CRUD + Info Center integration ---
class TestAdvisoriesCRUD:
    advisory_id = None

    def test_list_advisories(self, admin_session):
        r = admin_session.get(f"{API}/admin/road-advisories", timeout=15)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_create_advisory(self, admin_session):
        r = admin_session.post(f"{API}/admin/road-advisories", json={
            "road": "TEST M1 Phoenix", "status": "caution", "note": "TEST roadworks 15min delays",
        }, timeout=15)
        assert r.status_code == 200, f"{r.status_code} {r.text[:200]}"
        b = r.json()
        assert b["road"] == "TEST M1 Phoenix"
        assert b.get("advisory_id")
        TestAdvisoriesCRUD.advisory_id = b["advisory_id"]

    def test_invalid_status_rejected(self, admin_session):
        r = admin_session.post(f"{API}/admin/road-advisories", json={
            "road": "TEST", "status": "danger", "note": "x",
        }, timeout=15)
        assert r.status_code in (400, 422)

    def test_info_transport_shows_advisory(self):
        r = requests.get(f"{API}/info/transport", timeout=15)
        assert r.status_code == 200
        data = r.json()
        ads = data.get("road_advisories", [])
        roads = [a.get("road") for a in ads]
        assert "TEST M1 Phoenix" in roads, f"advisory missing from /api/info/transport: {roads}"

    def test_patch_advisory(self, admin_session):
        aid = TestAdvisoriesCRUD.advisory_id
        if not aid:
            pytest.skip("no advisory_id from prior test")
        r = admin_session.patch(f"{API}/admin/road-advisories/{aid}", json={"note": "TEST updated note"}, timeout=15)
        assert r.status_code == 200
        b = r.json()
        assert b["note"] == "TEST updated note"
        assert b.get("updated_at")

    def test_delete_advisory_and_info_transport_clears(self, admin_session):
        aid = TestAdvisoriesCRUD.advisory_id
        if not aid:
            pytest.skip("no advisory_id from prior test")
        r = admin_session.delete(f"{API}/admin/road-advisories/{aid}", timeout=15)
        assert r.status_code == 200
        # Info transport should no longer include it
        r2 = requests.get(f"{API}/info/transport", timeout=15)
        ads = r2.json().get("road_advisories", [])
        roads = [a.get("road") for a in ads]
        assert "TEST M1 Phoenix" not in roads


# --- Teardown: cleanup leftover TEST tour if possible ---
def test_zz_cleanup(admin_session):
    # try to cancel any booking on test tours? not exposed. Just delete tour if no active bookings.
    tours = admin_session.get(f"{API}/admin/tours", timeout=15).json()
    for t in tours:
        if isinstance(t, dict) and t.get("tour_id", "").startswith("test-"):
            admin_session.delete(f"{API}/admin/tours/{t['tour_id']}", timeout=15)
