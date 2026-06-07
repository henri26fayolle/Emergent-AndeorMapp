"""Tests for the language preference flow (iter16)."""
import os
import time
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "http://localhost:8001").rstrip("/")
API = f"{BASE_URL}/api"


def _register():
    email = f"lang_test_{int(time.time()*1000)}@andeor.mu"
    r = requests.post(f"{API}/auth/register", json={
        "email": email, "password": "testpass123", "name": "Lang Tester",
        "tutorial_completed": True,
    }, timeout=15)
    assert r.status_code == 200, r.text
    return r.json()


def test_default_language_is_english():
    data = _register()
    assert data["user"]["language"] == "en"


def test_register_with_explicit_language():
    email = f"lang_test_{int(time.time()*1000)}@andeor.mu"
    r = requests.post(f"{API}/auth/register", json={
        "email": email, "password": "testpass123", "name": "FR",
        "language": "fr", "tutorial_completed": True,
    }, timeout=15)
    assert r.status_code == 200
    assert r.json()["user"]["language"] == "fr"


def test_register_unknown_language_falls_back_to_english():
    email = f"lang_test_{int(time.time()*1000)}@andeor.mu"
    r = requests.post(f"{API}/auth/register", json={
        "email": email, "password": "testpass123", "name": "BadLang",
        "language": "xx", "tutorial_completed": True,
    }, timeout=15)
    assert r.status_code == 200
    assert r.json()["user"]["language"] == "en"


def test_patch_me_language_valid():
    data = _register()
    token = data["token"]
    h = {"Authorization": f"Bearer {token}"}
    for lang in ("fr", "mfe", "en"):
        r = requests.patch(f"{API}/me", json={"language": lang}, headers=h, timeout=15)
        assert r.status_code == 200, r.text
        assert r.json()["language"] == lang


def test_patch_me_language_invalid_rejected():
    data = _register()
    token = data["token"]
    r = requests.patch(f"{API}/me", json={"language": "zz"},
                       headers={"Authorization": f"Bearer {token}"}, timeout=15)
    assert r.status_code == 400
    assert "language" in r.json()["detail"].lower()
