"""Tests for the Ti Dodo Saga voice-line endpoint (iter15)."""
import os
import time
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "http://localhost:8001").rstrip("/")
VOICE_URL = f"{BASE_URL}/api/codex/saga-voice"


def test_saga_voice_default():
    """No saga_id → returns the generic 'Mauritius is in your bones now' clip."""
    r = requests.get(VOICE_URL, timeout=60)
    assert r.status_code == 200
    assert r.headers["content-type"].startswith("audio/")
    assert len(r.content) > 1000
    assert r.content[:3] == b"ID3" or r.content[0] == 0xFF


@pytest.mark.parametrize("saga_id", ["mq-wayfarer", "mq-cascade", "mq-heritage", "mq-compleat"])
def test_saga_voice_per_saga(saga_id):
    """Each main quest has its own voice-line — cache key differs."""
    r = requests.get(VOICE_URL, params={"saga_id": saga_id}, timeout=60)
    assert r.status_code == 200
    assert r.headers["content-type"].startswith("audio/")
    assert len(r.content) > 1000


def test_saga_voice_unknown_falls_back():
    """An unknown saga_id falls back to the default clip rather than 404."""
    r = requests.get(VOICE_URL, params={"saga_id": "mq-nonexistent"}, timeout=60)
    assert r.status_code == 200
    assert r.headers["content-type"].startswith("audio/")


def test_saga_voice_is_cached():
    """Second request to the same key should be served from disk (fast)."""
    requests.get(VOICE_URL, params={"saga_id": "mq-wayfarer"}, timeout=60)
    t0 = time.monotonic()
    r = requests.get(VOICE_URL, params={"saga_id": "mq-wayfarer"}, timeout=10)
    elapsed = time.monotonic() - t0
    assert r.status_code == 200
    assert elapsed < 2.0, f"cached fetch took {elapsed:.2f}s (expected <2.0s)"


def test_saga_voice_no_auth_required():
    """Voice-line is a public asset — must not require auth."""
    r = requests.get(VOICE_URL, timeout=60, headers={})
    assert r.status_code == 200
