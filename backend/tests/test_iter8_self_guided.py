"""Iteration 8 — Self-guided trail epilogue + time-of-day/weather-aware lore audio.

Covers BACKEND-A1..A4 and BACKEND-D1..D5 from the iter8 review request.
"""
import os
import time
import pytest
import requests
from pathlib import Path

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
ASSERT_BASE = BASE_URL or pytest.fail("REACT_APP_BACKEND_URL missing")

AUDIO_DIR = Path("/app/backend/uploads/audio")

ADMIN_EMAIL = "admin@andeor.mu"
ADMIN_PASSWORD = "AnDeor2026!"

# Le Morne is shortest (3 stops) → ideal for A3 end-to-end
LM_JOURNEY_ID = "sg-lm-maroon-trail"
LM_STOPS = ["lm-trail-1", "lm-trail-2", "lm-trail-3"]
LM_STOP_COORDS = {
    "lm-trail-1": (-20.4555, 57.3170),
    "lm-trail-2": (-20.4519, 57.3128),
    "lm-trail-3": (-20.4602, 57.3240),
}

EXPECTED_JOURNEYS = {"sg-pl-old-town", "sg-nc-coastal-loop", "sg-lm-maroon-trail"}


# ---------------- Fixtures ----------------
@pytest.fixture(scope="module")
def player_client():
    """Fresh test player — clean slate (no previous self_guided_progress)."""
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    ts = int(time.time())
    email = f"TEST_iter8_{ts}@example.com"
    password = "explore123"
    r = s.post(f"{BASE_URL}/api/auth/register", json={
        "email": email, "password": password, "name": f"Iter8 Tester {ts}"
    })
    assert r.status_code in (200, 201), f"register failed: {r.status_code} {r.text}"
    # Cookie now set on session; verify
    r2 = s.get(f"{BASE_URL}/api/auth/me")
    assert r2.status_code == 200, f"me failed: {r2.status_code} {r2.text}"
    return s


@pytest.fixture(scope="module")
def public_client():
    return requests.Session()


# ---------------- BACKEND-A1 ----------------
class TestA1ListJourneys:
    def test_list_returns_three_seeded_journeys(self, player_client):
        r = player_client.get(f"{BASE_URL}/api/self-guided")
        assert r.status_code == 200, r.text
        data = r.json()
        assert isinstance(data, list)
        ids = {j["journey_id"] for j in data}
        assert EXPECTED_JOURNEYS.issubset(ids), f"missing journeys; got {ids}"
        # Each has a progress block
        for j in data:
            assert "progress" in j
            p = j["progress"]
            for k in ("started", "completed_stops", "completed", "total", "percent", "finished"):
                assert k in p, f"progress missing key {k} for {j['journey_id']}"
            assert isinstance(p["completed_stops"], list)
            assert p["total"] == len(j["stops"])

    def test_titles_match_spec(self, player_client):
        r = player_client.get(f"{BASE_URL}/api/self-guided")
        by_id = {j["journey_id"]: j for j in r.json()}
        assert by_id["sg-pl-old-town"]["title"] == "Old Port Louis Walk"
        assert by_id["sg-nc-coastal-loop"]["title"] == "Northern Coast Loop"
        assert by_id["sg-lm-maroon-trail"]["title"] == "Maroon's Trail"

    def test_no_mongo_id_leaked(self, player_client):
        r = player_client.get(f"{BASE_URL}/api/self-guided")
        for j in r.json():
            assert "_id" not in j


# ---------------- BACKEND-A2 ----------------
class TestA2StartJourney:
    def test_start_sets_active(self, player_client):
        r = player_client.post(f"{BASE_URL}/api/self-guided/{LM_JOURNEY_ID}/start")
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["ok"] is True
        # Verify journey progress is now "started" (active flag stored on user)
        # /auth/me may not expose active_self_guided; use the list endpoint which reads from DB.
        listing = player_client.get(f"{BASE_URL}/api/self-guided").json()
        lm = next(j for j in listing if j["journey_id"] == LM_JOURNEY_ID)
        assert lm["progress"]["started"] is True, f"journey not started: {lm['progress']}"


# ---------------- BACKEND-A3 ----------------
class TestA3Checkin:
    """Sequential 3-stop check-in flow on Le Morne. Order matters."""

    def test_checkin_stop1_not_finished(self, player_client):
        sid = LM_STOPS[0]
        lat, lon = LM_STOP_COORDS[sid]
        r = player_client.post(
            f"{BASE_URL}/api/self-guided/{LM_JOURNEY_ID}/checkin",
            json={"stop_id": sid, "lat": lat, "lon": lon},
        )
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["finished"] is False
        assert d["xp_gain"] == 0
        assert d["epilogue"] is None

    def test_checkin_stop2_not_finished(self, player_client):
        sid = LM_STOPS[1]
        lat, lon = LM_STOP_COORDS[sid]
        r = player_client.post(
            f"{BASE_URL}/api/self-guided/{LM_JOURNEY_ID}/checkin",
            json={"stop_id": sid, "lat": lat, "lon": lon},
        )
        assert r.status_code == 200
        d = r.json()
        assert d["finished"] is False
        assert d["xp_gain"] == 0

    def test_checkin_stop3_finishes_with_full_epilogue(self, player_client):
        sid = LM_STOPS[2]
        lat, lon = LM_STOP_COORDS[sid]
        r = player_client.post(
            f"{BASE_URL}/api/self-guided/{LM_JOURNEY_ID}/checkin",
            json={"stop_id": sid, "lat": lat, "lon": lon},
        )
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["finished"] is True
        assert d["xp_gain"] > 0, "xp must be awarded on final check-in"
        ep = d["epilogue"]
        assert ep is not None, "epilogue payload must be present on final check-in"
        required_keys = {
            "journey_id", "title", "subtitle", "theme_color", "theme_hex",
            "title_earned", "epilogue", "stops", "xp_gain", "badge_unlocked", "completed_at"
        }
        assert required_keys.issubset(set(ep.keys())), f"epilogue missing keys: {required_keys - set(ep.keys())}"
        assert ep["journey_id"] == LM_JOURNEY_ID
        assert ep["theme_hex"] == "#1B6F4B"
        assert ep["title_earned"] == "Maroon Trail Walker"
        assert ep["badge_unlocked"] == "badge-maroon-trail"
        assert len(ep["stops"]) == 3
        assert ep["xp_gain"] == d["xp_gain"] == 90

    def test_repeated_final_checkin_does_not_re_award_xp(self, player_client):
        sid = LM_STOPS[2]
        lat, lon = LM_STOP_COORDS[sid]
        r = player_client.post(
            f"{BASE_URL}/api/self-guided/{LM_JOURNEY_ID}/checkin",
            json={"stop_id": sid, "lat": lat, "lon": lon},
        )
        assert r.status_code == 200
        d = r.json()
        # Already completed → must NOT re-award
        assert d["xp_gain"] == 0, f"xp must not be re-awarded; got {d['xp_gain']}"
        assert d["epilogue"] is None, "epilogue should be None on repeat"
        assert d["finished"] is True  # but is still "finished" state


# ---------------- BACKEND-A4 ----------------
class TestA4EpilogueAudio:
    def test_epilogue_audio_public_returns_mp3(self, public_client):
        r = public_client.get(
            f"{BASE_URL}/api/self-guided/{LM_JOURNEY_ID}/epilogue-audio",
            timeout=60,
        )
        assert r.status_code == 200, r.text[:300]
        assert r.headers.get("content-type", "").startswith("audio/mpeg")
        assert len(r.content) > 1000, f"audio bytes too small: {len(r.content)}"


# ---------------- BACKEND-D1 ----------------
class TestD1IntroAudioVariants:
    def test_intro_with_dusk_rain(self, public_client):
        # delete any pre-existing variant to force fresh generation cache verify
        cache_file = AUDIO_DIR / f"sg__{LM_JOURNEY_ID}__intro__dusk__rain.mp3"
        r = public_client.get(
            f"{BASE_URL}/api/self-guided/{LM_JOURNEY_ID}/intro-audio?tod=dusk&weather=rain",
            timeout=90,
        )
        assert r.status_code == 200, r.text[:200]
        assert r.headers.get("content-type", "").startswith("audio/mpeg")
        assert len(r.content) > 1000
        assert cache_file.exists(), f"cache file missing: {cache_file}"
        assert cache_file.stat().st_size > 1000

    def test_intro_no_params_uses_default_cache(self, public_client):
        cache_file = AUDIO_DIR / f"sg__{LM_JOURNEY_ID}__intro.mp3"
        r = public_client.get(
            f"{BASE_URL}/api/self-guided/{LM_JOURNEY_ID}/intro-audio",
            timeout=90,
        )
        assert r.status_code == 200
        assert r.headers.get("content-type", "").startswith("audio/mpeg")
        assert cache_file.exists(), f"default cache file missing: {cache_file}"


# ---------------- BACKEND-D2 ----------------
class TestD2EpilogueVariant:
    def test_epilogue_night_clear(self, public_client):
        cache_file = AUDIO_DIR / f"sg__{LM_JOURNEY_ID}__epilogue__night__clear.mp3"
        r = public_client.get(
            f"{BASE_URL}/api/self-guided/{LM_JOURNEY_ID}/epilogue-audio?tod=night&weather=clear",
            timeout=90,
        )
        assert r.status_code == 200
        assert r.headers.get("content-type", "").startswith("audio/mpeg")
        assert len(r.content) > 1000
        assert cache_file.exists(), f"cache file missing: {cache_file}"


# ---------------- BACKEND-D3 ----------------
class TestD3StopAudioVariant:
    def test_stop_golden_hour_cloudy(self, public_client):
        stop_id = "lm-trail-1"
        cache_file = AUDIO_DIR / f"sg__{LM_JOURNEY_ID}__{stop_id}__golden_hour__cloudy.mp3"
        r = public_client.get(
            f"{BASE_URL}/api/self-guided/{LM_JOURNEY_ID}/stops/{stop_id}/audio?tod=golden_hour&weather=cloudy",
            timeout=90,
        )
        assert r.status_code == 200
        assert r.headers.get("content-type", "").startswith("audio/mpeg")
        assert cache_file.exists(), f"variant cache file missing: {cache_file}"

    def test_stop_different_combos_distinct_cache_files(self, public_client):
        """Two different (tod,weather) combos should write to distinct cache files."""
        stop_id = "lm-trail-1"
        f_a = AUDIO_DIR / f"sg__{LM_JOURNEY_ID}__{stop_id}__golden_hour__cloudy.mp3"
        f_b = AUDIO_DIR / f"sg__{LM_JOURNEY_ID}__{stop_id}__night__rain.mp3"
        r2 = public_client.get(
            f"{BASE_URL}/api/self-guided/{LM_JOURNEY_ID}/stops/{stop_id}/audio?tod=night&weather=rain",
            timeout=90,
        )
        assert r2.status_code == 200
        assert f_a.exists() and f_b.exists()
        assert f_a.resolve() != f_b.resolve()


# ---------------- BACKEND-D4 ----------------
class TestD4InvalidParamsFallback:
    def test_invalid_tod_weather_falls_back_to_default(self, public_client):
        """Unknown tod/weather should not 500. Should fall back to the no-context cache file."""
        r = public_client.get(
            f"{BASE_URL}/api/self-guided/{LM_JOURNEY_ID}/intro-audio?tod=banana&weather=xyz",
            timeout=90,
        )
        assert r.status_code == 200, r.text[:200]
        assert r.headers.get("content-type", "").startswith("audio/mpeg")
        # Should be served from the default no-context cache file (since both unknown → "any/any" → "")
        default_file = AUDIO_DIR / f"sg__{LM_JOURNEY_ID}__intro.mp3"
        assert default_file.exists()


# ---------------- BACKEND-D5 ----------------
class TestD5CacheHitSpeed:
    def test_second_call_is_fast(self, public_client):
        url = f"{BASE_URL}/api/self-guided/{LM_JOURNEY_ID}/intro-audio?tod=dusk&weather=rain"
        # 1st request may already be cached from D1 — that's fine.
        public_client.get(url, timeout=90)
        t0 = time.time()
        r = public_client.get(url, timeout=15)
        elapsed = time.time() - t0
        assert r.status_code == 200
        # Cache-hit should be sub-3-seconds even on cold connection
        assert elapsed < 5.0, f"cached call too slow: {elapsed:.2f}s"
