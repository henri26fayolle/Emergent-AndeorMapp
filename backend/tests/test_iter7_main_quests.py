"""Iteration 7 — Main Quests + Port Louis sub-map + extra tours.

Covers:
- GET /api/main-quests returns 4 quests with proper schema + progress
- POST /api/main-quests/{id}/enroll (auto-focus on first enrol)
- POST /api/main-quests/{id}/focus (auto-enrols)
- POST /api/main-quests/{id}/unenroll (re-focus to next or null)
- GET /api/main-quests/check-completion idempotency
- Auth required (401) on POST endpoints
- GET /api/tours includes new waterfalls + 6 Port Louis venues (city_x/city_y, subregion)
"""
import os
import time
import pytest
import requests


def _load_backend_url() -> str:
    url = os.environ.get("REACT_APP_BACKEND_URL", "").strip()
    if not url:
        try:
            with open("/app/frontend/.env", "r") as f:
                for line in f:
                    if line.startswith("REACT_APP_BACKEND_URL="):
                        url = line.split("=", 1)[1].strip()
                        break
        except FileNotFoundError:
            pass
    assert url, "REACT_APP_BACKEND_URL not set"
    return url.rstrip("/")


BASE_URL = _load_backend_url()
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admin@andeor.mu"
ADMIN_PASS = "AnDeor2026!"

EXPECTED_QUEST_IDS = {"mq-wayfarer", "mq-cascade", "mq-heritage", "mq-compleat"}

PL_VENUE_IDS = {
    "t-pl-aapravasi-ghat", "t-pl-blue-penny", "t-pl-central-market",
    "t-pl-cathedral", "t-pl-citadelle", "t-pl-champ-de-mars",
}
NEW_WATERFALL_IDS = {"t-hike-tamarind-falls", "t-chamarel-falls"}


@pytest.fixture(scope="module")
def admin_session():
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASS}, timeout=10)
    assert r.status_code == 200, f"Admin login failed: {r.status_code} {r.text}"
    return s


@pytest.fixture(scope="module")
def player_session():
    """Fresh test player to exercise enrol/focus/unenroll without polluting admin state."""
    s = requests.Session()
    email = f"TEST_iter7_{int(time.time())}@example.com"
    reg = s.post(f"{API}/auth/register", json={
        "email": email,
        "password": "explore123",
        "name": "Iter7 Tester",
    }, timeout=10)
    assert reg.status_code in (200, 201), f"register failed: {reg.status_code} {reg.text}"
    return s


# ---------- Tours catalog ----------
class TestToursCatalog:
    def test_new_tours_present(self, admin_session):
        r = admin_session.get(f"{API}/tours", timeout=10)
        assert r.status_code == 200
        tours = r.json()
        tour_ids = {t["tour_id"] for t in tours}
        assert NEW_WATERFALL_IDS.issubset(tour_ids), f"Missing waterfalls: {NEW_WATERFALL_IDS - tour_ids}"
        assert PL_VENUE_IDS.issubset(tour_ids), f"Missing PL venues: {PL_VENUE_IDS - tour_ids}"

    def test_pl_venue_fields(self, admin_session):
        r = admin_session.get(f"{API}/tours", timeout=10)
        tours = {t["tour_id"]: t for t in r.json()}
        for tid in PL_VENUE_IDS:
            t = tours[tid]
            assert t.get("subregion") == "port-louis", f"{tid} subregion wrong: {t.get('subregion')}"
            assert t.get("region") == "central-culture", f"{tid} region wrong"
            assert isinstance(t.get("city_x"), (int, float)), f"{tid} city_x missing"
            assert isinstance(t.get("city_y"), (int, float)), f"{tid} city_y missing"


# ---------- GET /main-quests ----------
class TestListMainQuests:
    def test_returns_4_quests_with_schema(self, player_session):
        r = player_session.get(f"{API}/main-quests", timeout=10)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        ids = {q["main_quest_id"] for q in data}
        assert ids == EXPECTED_QUEST_IDS, f"Quest IDs mismatch: {ids}"
        required = {
            "main_quest_id", "title", "subtitle", "lore_intro", "epilogue",
            "theme_color", "theme_hex", "icon", "tour_ids", "discount_pct",
            "enrolled", "focused", "completed", "progress",
        }
        for q in data:
            missing = required - set(q.keys())
            assert not missing, f"{q['main_quest_id']} missing keys: {missing}"
            assert q["discount_pct"] == 50
            p = q["progress"]
            assert {"completed", "total", "percent", "completed_tours"}.issubset(p.keys())
            # Fresh player → 0 completed
            assert p["completed"] == 0
            assert p["total"] == len(q["tour_ids"])
            assert q["enrolled"] is False
            assert q["focused"] is False
            assert q["completed"] is False

    def test_no_mongo_id_leaked(self, player_session):
        r = player_session.get(f"{API}/main-quests", timeout=10)
        for q in r.json():
            assert "_id" not in q


# ---------- Enrol / Focus / Unenroll ----------
class TestEnrolFocusUnenroll:
    def test_unauthenticated_post_returns_401(self):
        r = requests.post(f"{API}/main-quests/mq-wayfarer/enroll", timeout=10)
        assert r.status_code in (401, 403), f"Expected 401/403 for anon, got {r.status_code}"

    def test_first_enroll_auto_focuses(self, player_session):
        r = player_session.post(f"{API}/main-quests/mq-heritage/enroll", timeout=10)
        assert r.status_code == 200, r.text
        body = r.json()
        assert body.get("ok") is True
        assert "mq-heritage" in body.get("enrolled_main_quests", [])
        assert body.get("focused_main_quest") == "mq-heritage"

        # Verify via GET
        lst = player_session.get(f"{API}/main-quests", timeout=10).json()
        heritage = next(q for q in lst if q["main_quest_id"] == "mq-heritage")
        assert heritage["enrolled"] is True
        assert heritage["focused"] is True

    def test_second_enroll_does_not_change_focus(self, player_session):
        r = player_session.post(f"{API}/main-quests/mq-wayfarer/enroll", timeout=10)
        assert r.status_code == 200
        body = r.json()
        assert set(body.get("enrolled_main_quests", [])) == {"mq-heritage", "mq-wayfarer"}
        # Focus shouldn't have changed (endpoint only echoes focused_main_quest when it updates).
        # Verify via GET that mq-heritage is still focused.
        lst = player_session.get(f"{API}/main-quests", timeout=10).json()
        focused = [q for q in lst if q["focused"]]
        assert len(focused) == 1
        assert focused[0]["main_quest_id"] == "mq-heritage"

    def test_explicit_focus_switches(self, player_session):
        r = player_session.post(f"{API}/main-quests/mq-wayfarer/focus", timeout=10)
        assert r.status_code == 200
        assert r.json().get("focused_main_quest") == "mq-wayfarer"

        lst = player_session.get(f"{API}/main-quests", timeout=10).json()
        wayfarer = next(q for q in lst if q["main_quest_id"] == "mq-wayfarer")
        assert wayfarer["focused"] is True
        heritage = next(q for q in lst if q["main_quest_id"] == "mq-heritage")
        assert heritage["focused"] is False

    def test_focus_auto_enrols_if_not_enrolled(self, player_session):
        # mq-cascade not yet enrolled
        r = player_session.post(f"{API}/main-quests/mq-cascade/focus", timeout=10)
        assert r.status_code == 200
        body = r.json()
        assert body.get("focused_main_quest") == "mq-cascade"
        lst = player_session.get(f"{API}/main-quests", timeout=10).json()
        cascade = next(q for q in lst if q["main_quest_id"] == "mq-cascade")
        assert cascade["enrolled"] is True
        assert cascade["focused"] is True

    def test_unenroll_focused_reassigns(self, player_session):
        # Currently focused = mq-cascade; enrolled set = {heritage, wayfarer, cascade}
        r = player_session.post(f"{API}/main-quests/mq-cascade/unenroll", timeout=10)
        assert r.status_code == 200
        body = r.json()
        assert "mq-cascade" not in body.get("enrolled_main_quests", [])
        # Next focus should be one of the remaining enrolled, not null
        assert body.get("focused_main_quest") in {"mq-heritage", "mq-wayfarer"}

    def test_unenroll_all_clears_focus(self, player_session):
        # Remove the rest
        player_session.post(f"{API}/main-quests/mq-heritage/unenroll", timeout=10)
        r = player_session.post(f"{API}/main-quests/mq-wayfarer/unenroll", timeout=10)
        assert r.status_code == 200
        body = r.json()
        assert body.get("enrolled_main_quests") == []
        assert body.get("focused_main_quest") in (None,)

    def test_enroll_unknown_quest_404(self, player_session):
        r = player_session.post(f"{API}/main-quests/mq-doesnotexist/enroll", timeout=10)
        assert r.status_code == 404


# ---------- Check completion ----------
class TestCheckCompletion:
    def test_check_completion_idempotent_no_progress(self, player_session):
        r = player_session.get(f"{API}/main-quests/check-completion", timeout=10)
        assert r.status_code == 200
        body = r.json()
        assert body.get("newly_completed") == []
        # Re-call returns empty too
        r2 = player_session.get(f"{API}/main-quests/check-completion", timeout=10)
        assert r2.json().get("newly_completed") == []

    def test_check_completion_requires_auth(self):
        r = requests.get(f"{API}/main-quests/check-completion", timeout=10)
        assert r.status_code in (401, 403)
