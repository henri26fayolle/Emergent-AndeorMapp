"""Iteration 2 - Prologue/RPG flow backend tests.

Covers:
- public_user now exposes 'avatar' and 'tutorial_completed'
- /api/auth/register accepts optional avatar + tutorial_completed
- PATCH /api/me updates name/avatar/tutorial_completed (auth required)
- Admin seeded with avatar='scholar' and tutorial_completed=True
"""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://explore-earn-5.preview.emergentagent.com").rstrip("/")
ADMIN_EMAIL = "admin@andeor.mu"
ADMIN_PASSWORD = "AnDeor2026!"


@pytest.fixture(scope="module")
def new_player():
    s = requests.Session()
    suffix = uuid.uuid4().hex[:8]
    creds = {
        "email": f"prologue_{suffix}@example.com",
        "password": "explore123",
        "name": f"TEST Prologue {suffix}",
    }
    r = s.post(f"{BASE_URL}/api/auth/register", json=creds, timeout=20)
    assert r.status_code == 200, r.text
    return s, creds, r.json()


# ---- public_user shape ----
class TestPublicUserShape:
    def test_register_returns_avatar_and_tutorial_fields(self, new_player):
        _, _, body = new_player
        u = body["user"]
        assert "avatar" in u, "public_user must include avatar"
        assert "tutorial_completed" in u, "public_user must include tutorial_completed"
        # New password user with no avatar passed -> defaults
        assert u["avatar"] is None
        assert u["tutorial_completed"] is False

    def test_me_includes_new_fields(self, new_player):
        s, _, _ = new_player
        r = s.get(f"{BASE_URL}/api/auth/me", timeout=15)
        assert r.status_code == 200
        u = r.json()
        assert "avatar" in u and "tutorial_completed" in u


# ---- Register with optional fields ----
class TestRegisterWithOptionalFields:
    def test_register_with_avatar_and_tutorial(self):
        s = requests.Session()
        suffix = uuid.uuid4().hex[:8]
        payload = {
            "email": f"prologue_av_{suffix}@example.com",
            "password": "explore123",
            "name": f"TEST Av {suffix}",
            "avatar": "diver",
            "tutorial_completed": False,
        }
        r = s.post(f"{BASE_URL}/api/auth/register", json=payload, timeout=20)
        assert r.status_code == 200, r.text
        u = r.json()["user"]
        assert u["avatar"] == "diver"
        assert u["tutorial_completed"] is False

    def test_register_backward_compatible(self):
        # No avatar/tutorial_completed passed -> still works (defaults)
        s = requests.Session()
        suffix = uuid.uuid4().hex[:8]
        r = s.post(f"{BASE_URL}/api/auth/register", json={
            "email": f"prologue_bc_{suffix}@example.com",
            "password": "explore123",
            "name": "TEST Backcompat",
        }, timeout=20)
        assert r.status_code == 200


# ---- PATCH /api/me ----
class TestPatchMe:
    def test_unauthenticated_returns_401(self):
        r = requests.patch(f"{BASE_URL}/api/me", json={"avatar": "hiker"}, timeout=15)
        assert r.status_code == 401

    def test_patch_avatar(self, new_player):
        s, _, _ = new_player
        r = s.patch(f"{BASE_URL}/api/me", json={"avatar": "hiker"}, timeout=15)
        assert r.status_code == 200, r.text
        u = r.json()
        assert u["avatar"] == "hiker"
        # Persisted check
        me = s.get(f"{BASE_URL}/api/auth/me", timeout=15).json()
        assert me["avatar"] == "hiker"

    def test_patch_name(self, new_player):
        s, _, _ = new_player
        r = s.patch(f"{BASE_URL}/api/me", json={"name": "Renamed Explorer"}, timeout=15)
        assert r.status_code == 200
        assert r.json()["name"] == "Renamed Explorer"
        me = s.get(f"{BASE_URL}/api/auth/me", timeout=15).json()
        assert me["name"] == "Renamed Explorer"

    def test_patch_tutorial_completed(self, new_player):
        s, _, _ = new_player
        r = s.patch(f"{BASE_URL}/api/me", json={"tutorial_completed": True}, timeout=15)
        assert r.status_code == 200
        assert r.json()["tutorial_completed"] is True
        me = s.get(f"{BASE_URL}/api/auth/me", timeout=15).json()
        assert me["tutorial_completed"] is True

    def test_patch_combined(self, new_player):
        s, _, _ = new_player
        r = s.patch(f"{BASE_URL}/api/me", json={
            "avatar": "surfer",
            "name": "Combo",
            "tutorial_completed": True,
        }, timeout=15)
        assert r.status_code == 200
        u = r.json()
        assert u["avatar"] == "surfer"
        assert u["name"] == "Combo"
        assert u["tutorial_completed"] is True

    def test_patch_empty_body_is_noop(self, new_player):
        s, _, _ = new_player
        before = s.get(f"{BASE_URL}/api/auth/me", timeout=15).json()
        r = s.patch(f"{BASE_URL}/api/me", json={}, timeout=15)
        assert r.status_code == 200
        after = r.json()
        # Should reflect existing data, not wipe it
        assert after["email"] == before["email"]
        assert after["avatar"] == before["avatar"]


# ---- Admin seed values ----
class TestAdminSeed:
    def test_admin_has_avatar_and_tutorial_completed(self):
        s = requests.Session()
        r = s.post(f"{BASE_URL}/api/auth/login",
                   json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=15)
        assert r.status_code == 200, r.text
        u = r.json()["user"]
        assert u["role"] == "admin"
        assert u["tutorial_completed"] is True, "admin must be seeded with tutorial_completed=True"
        assert u["avatar"] == "scholar", f"admin avatar should be 'scholar', got {u['avatar']}"
