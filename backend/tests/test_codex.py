"""Tests for Codex (lore + audio + GPX) endpoints."""
import os
import io
import time
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://explore-earn-5.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admin@andeor.mu"
ADMIN_PASSWORD = "AnDeor2026!"

REGIONS = ["north-coast", "central-culture", "black-river", "east-lagoons", "south-wild"]

VALID_GPX = """<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="test" xmlns="http://www.topografix.com/GPX/1/1">
  <trk><name>Le Pouce</name>
    <trkseg>
      <trkpt lat="-20.2000" lon="57.5000"><ele>100</ele></trkpt>
      <trkpt lat="-20.2010" lon="57.5010"><ele>150</ele></trkpt>
      <trkpt lat="-20.2020" lon="57.5020"><ele>200</ele></trkpt>
      <trkpt lat="-20.2030" lon="57.5030"><ele>250</ele></trkpt>
    </trkseg>
  </trk>
</gpx>"""


@pytest.fixture(scope="session")
def admin_session():
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=15)
    assert r.status_code == 200, f"Admin login failed: {r.status_code} {r.text}"
    return s


@pytest.fixture(scope="session")
def anon_session():
    return requests.Session()


@pytest.fixture(scope="session")
def le_pouce_tour_id(admin_session):
    r = admin_session.get(f"{API}/tours", timeout=10)
    assert r.status_code == 200
    tours = r.json()
    # Look for a black-river hike tour
    for t in tours:
        if "le-pouce" in t.get("tour_id", "") or ("hike" in t.get("tour_id", "") and t.get("region") == "black-river"):
            return t["tour_id"]
    # Fallback: any black-river tour
    for t in tours:
        if t.get("region") == "black-river":
            return t["tour_id"]
    return tours[0]["tour_id"]


# ---------- Public codex region tests ----------
class TestCodexPublic:
    @pytest.mark.parametrize("region_id", REGIONS)
    def test_get_codex_region_public(self, anon_session, region_id):
        r = anon_session.get(f"{API}/codex/region/{region_id}", timeout=10)
        assert r.status_code == 200, f"{region_id}: {r.status_code} {r.text[:200]}"
        data = r.json()
        assert data["region_id"] == region_id
        assert data["lore_title"], f"Missing lore_title for {region_id}"
        assert data["lore_summary"], f"Missing lore_summary for {region_id}"
        assert data["lore_text"], f"Missing lore_text for {region_id}"
        assert data["audio_url"] == f"/api/codex/audio/{region_id}"
        assert "audio_ready" in data
        assert isinstance(data["gpx_files"], list)

    def test_get_codex_region_not_found(self, anon_session):
        r = anon_session.get(f"{API}/codex/region/no-such-region", timeout=10)
        assert r.status_code == 404


# ---------- Audio streaming ----------
class TestCodexAudio:
    def test_audio_cached_south_wild(self, anon_session):
        r = anon_session.get(f"{API}/codex/audio/south-wild", timeout=60, stream=True)
        assert r.status_code == 200
        assert r.headers.get("content-type", "").startswith("audio/mpeg")
        chunk = next(r.iter_content(chunk_size=1024), b"")
        assert len(chunk) > 0

    def test_audio_not_found(self, anon_session):
        r = anon_session.get(f"{API}/codex/audio/no-such-region", timeout=10)
        assert r.status_code == 404


# ---------- Admin auth gating ----------
class TestAdminAuthGating:
    def test_patch_region_requires_admin(self, anon_session):
        r = anon_session.patch(f"{API}/codex/admin/region/north-coast", json={"lore_title": "X"}, timeout=10)
        assert r.status_code in (401, 403), f"Expected 401/403, got {r.status_code}"

    def test_regen_audio_requires_admin(self, anon_session):
        r = anon_session.post(f"{API}/codex/admin/region/north-coast/audio/regenerate", timeout=10)
        assert r.status_code in (401, 403)

    def test_upload_gpx_requires_admin(self, anon_session, le_pouce_tour_id):
        files = {"file": ("x.gpx", VALID_GPX, "application/gpx+xml")}
        r = anon_session.post(f"{API}/codex/admin/tour/{le_pouce_tour_id}/gpx", files=files, timeout=10)
        assert r.status_code in (401, 403)

    def test_delete_gpx_requires_admin(self, anon_session, le_pouce_tour_id):
        r = anon_session.delete(f"{API}/codex/admin/tour/{le_pouce_tour_id}/gpx/anything.gpx", timeout=10)
        assert r.status_code in (401, 403)


# ---------- Admin lore update ----------
class TestAdminLoreUpdate:
    def test_patch_region_lore_persists(self, admin_session, anon_session):
        # Snapshot current
        r0 = anon_session.get(f"{API}/codex/region/north-coast", timeout=10).json()
        orig_title = r0["lore_title"]
        new_title = f"TEST_TITLE_{int(time.time())}"
        r = admin_session.patch(
            f"{API}/codex/admin/region/north-coast",
            json={"lore_title": new_title},
            timeout=10,
        )
        assert r.status_code == 200
        assert r.json().get("ok") is True

        # Verify via public GET
        r2 = anon_session.get(f"{API}/codex/region/north-coast", timeout=10).json()
        assert r2["lore_title"] == new_title

        # Restore
        admin_session.patch(
            f"{API}/codex/admin/region/north-coast",
            json={"lore_title": orig_title},
            timeout=10,
        )

    def test_patch_invalidates_audio_cache(self, admin_session, anon_session):
        # Pre-warm: ensure central-culture mp3 exists (it does per disk check)
        r_before = anon_session.get(f"{API}/codex/region/central-culture", timeout=10).json()
        # PATCH should delete the cached file → audio_ready False
        orig_summary = r_before["lore_summary"]
        admin_session.patch(
            f"{API}/codex/admin/region/central-culture",
            json={"lore_summary": orig_summary + " "},  # trivial change
            timeout=10,
        )
        r_after = anon_session.get(f"{API}/codex/region/central-culture", timeout=10).json()
        assert r_after["audio_ready"] is False
        # Restore
        admin_session.patch(
            f"{API}/codex/admin/region/central-culture",
            json={"lore_summary": orig_summary},
            timeout=10,
        )

    def test_patch_empty_payload_400(self, admin_session):
        r = admin_session.patch(
            f"{API}/codex/admin/region/north-coast", json={"unknown": "x"}, timeout=10
        )
        assert r.status_code == 400


# ---------- Admin GPX upload + download + delete ----------
class TestAdminGpx:
    def test_upload_invalid_extension(self, admin_session, le_pouce_tour_id):
        files = {"file": ("bad.txt", "hello", "text/plain")}
        r = admin_session.post(f"{API}/codex/admin/tour/{le_pouce_tour_id}/gpx", files=files, timeout=10)
        assert r.status_code == 400

    def test_upload_invalid_content(self, admin_session, le_pouce_tour_id):
        files = {"file": ("fake.gpx", "<notgpx>hi</notgpx>", "application/gpx+xml")}
        r = admin_session.post(f"{API}/codex/admin/tour/{le_pouce_tour_id}/gpx", files=files, timeout=10)
        assert r.status_code == 400

    def test_upload_too_large(self, admin_session, le_pouce_tour_id):
        big = b"<gpx>" + b"x" * (5 * 1024 * 1024 + 10)
        files = {"file": ("big.gpx", big, "application/gpx+xml")}
        r = admin_session.post(f"{API}/codex/admin/tour/{le_pouce_tour_id}/gpx", files=files, timeout=30)
        assert r.status_code == 400

    def test_upload_valid_download_delete_lifecycle(self, admin_session, anon_session, le_pouce_tour_id):
        fname = f"TEST_track_{int(time.time())}.gpx"
        files = {"file": (fname, VALID_GPX, "application/gpx+xml")}
        r = admin_session.post(f"{API}/codex/admin/tour/{le_pouce_tour_id}/gpx", files=files, timeout=15)
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["ok"] is True
        gpx = body["gpx"]
        assert gpx["filename"] == fname
        # Parsed metadata should be present
        assert gpx["distance_km"] is not None and gpx["distance_km"] > 0
        assert gpx["elevation_m"] is not None and gpx["elevation_m"] > 0

        # Verify via public codex/region of black-river includes it
        # Find the region for this tour
        tour_r = admin_session.get(f"{API}/tours", timeout=10).json()
        tour = next(t for t in tour_r if t["tour_id"] == le_pouce_tour_id)
        region_id = tour["region"]
        codex = anon_session.get(f"{API}/codex/region/{region_id}", timeout=10).json()
        match = next((g for g in codex["gpx_files"] if g["filename"] == fname), None)
        assert match is not None, f"Uploaded GPX {fname} not in {region_id} codex"
        assert match["distance_km"] == gpx["distance_km"]
        assert match["elevation_m"] == gpx["elevation_m"]

        # Download (public)
        dl = anon_session.get(f"{API}/codex/gpx/{le_pouce_tour_id}/{fname}", timeout=10)
        assert dl.status_code == 200
        assert dl.headers.get("content-type", "").startswith("application/gpx+xml")
        assert b"<gpx" in dl.content

        # Delete
        d = admin_session.delete(f"{API}/codex/admin/tour/{le_pouce_tour_id}/gpx/{fname}", timeout=10)
        assert d.status_code == 200

        # Verify removed
        dl2 = anon_session.get(f"{API}/codex/gpx/{le_pouce_tour_id}/{fname}", timeout=10)
        assert dl2.status_code == 404


# ---------- Audio regenerate ----------
class TestAudioRegenerate:
    def test_regenerate_existing_cached(self, admin_session, anon_session):
        # south-wild has cached audio on disk
        r = admin_session.post(
            f"{API}/codex/admin/region/south-wild/audio/regenerate", timeout=90
        )
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["ok"] is True
        assert body["audio_url"].endswith("/codex/audio/south-wild")
        # Now audio_ready should be true again
        check = anon_session.get(f"{API}/codex/region/south-wild", timeout=10).json()
        assert check["audio_ready"] is True
