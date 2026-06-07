"""Iteration 22 — Vacoas Information Center auxiliary tabs.

Tests the 3 new endpoints under /api/info exposed by info_center.build_router():
  - GET  /api/info/events       — Mauritian public holidays + cultural events
  - GET  /api/info/transport    — ride-share, taxis, transit tips, advisories
  - POST /api/info/transport/book  (MOCKED — returns stub reference)
  - GET  /api/info/safety       — cyclone level, surf, beaches

All routes are unauthenticated (no auth) and read-only (no DB writes).
"""
from __future__ import annotations

import os
from datetime import date, datetime

import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/") or "https://explore-earn-5.preview.emergentagent.com"

VALID_TRADITIONS = {"hindu", "tamil", "muslim", "christian", "chinese", "sega", "creole", "secular"}
VALID_RIP_PROFILES = {"low", "moderate", "high"}


@pytest.fixture(scope="module")
def client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# ---------- BACKEND-INFO-1: /api/info/events ------------------------------
class TestInfoEvents:
    def test_events_returns_200(self, client):
        r = client.get(f"{BASE_URL}/api/info/events", timeout=15)
        assert r.status_code == 200, r.text

    def test_events_payload_shape(self, client):
        data = client.get(f"{BASE_URL}/api/info/events", timeout=15).json()
        # Top-level keys
        for key in ("today", "holidays", "events"):
            assert key in data, f"missing key {key}"
        # today is ISO date
        datetime.strptime(data["today"], "%Y-%m-%d")
        # holidays
        assert isinstance(data["holidays"], list) and len(data["holidays"]) >= 1
        for h in data["holidays"]:
            for f in ("date", "name", "tradition", "note", "days_until", "weekday"):
                assert f in h, f"holiday missing {f}: {h}"
            assert h["tradition"] in VALID_TRADITIONS
            assert isinstance(h["days_until"], int) and h["days_until"] >= 0
        # events
        assert isinstance(data["events"], list) and len(data["events"]) >= 1
        for e in data["events"]:
            for f in ("event_id", "venue", "title", "when_pattern", "tradition", "tagline"):
                assert f in e, f"event missing {f}: {e}"

    def test_events_sorted_and_past_excluded(self, client):
        data = client.get(f"{BASE_URL}/api/info/events", timeout=15).json()
        today = date.fromisoformat(data["today"])
        prev = None
        for h in data["holidays"]:
            d = date.fromisoformat(h["date"])
            assert d >= today, f"past holiday leaked: {h}"
            if prev is not None:
                assert d >= prev, f"holidays not sorted ascending: {h}"
            prev = d


# ---------- BACKEND-INFO-2: /api/info/transport ---------------------------
class TestInfoTransport:
    def test_transport_returns_200(self, client):
        r = client.get(f"{BASE_URL}/api/info/transport", timeout=15)
        assert r.status_code == 200, r.text

    def test_transport_payload_shape(self, client):
        data = client.get(f"{BASE_URL}/api/info/transport", timeout=15).json()
        for key in ("rideshare", "taxis", "public_transit_tips", "road_advisories", "partner_transfer_app"):
            assert key in data, f"missing key {key}"
        assert isinstance(data["rideshare"], list) and len(data["rideshare"]) >= 3
        assert isinstance(data["taxis"], list) and len(data["taxis"]) >= 3
        assert isinstance(data["public_transit_tips"], list) and len(data["public_transit_tips"]) >= 3
        assert all(isinstance(t, str) for t in data["public_transit_tips"])
        assert isinstance(data["road_advisories"], list)
        pta = data["partner_transfer_app"]
        for f in ("name", "status", "note"):
            assert f in pta, f"partner_transfer_app missing {f}"
        # Ride-share entry fields
        for r in data["rideshare"]:
            for f in ("name", "kind", "phone", "note"):
                assert f in r
        for t in data["taxis"]:
            for f in ("name", "where", "phone", "note"):
                assert f in t


# ---------- BACKEND-INFO-3: POST /api/info/transport/book (MOCKED) --------
class TestInfoTransportBook:
    def test_book_returns_200_and_stub_ref(self, client):
        r = client.post(f"{BASE_URL}/api/info/transport/book", timeout=15)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data.get("ok") is True
        ref = data.get("reference", "")
        assert ref.startswith("AND-T-"), f"reference shape: {ref}"
        assert isinstance(data.get("note"), str) and len(data["note"]) > 0


# ---------- BACKEND-INFO-4: /api/info/safety ------------------------------
class TestInfoSafety:
    def test_safety_returns_200(self, client):
        r = client.get(f"{BASE_URL}/api/info/safety", timeout=20)
        assert r.status_code == 200, r.text

    def test_safety_payload_shape(self, client):
        data = client.get(f"{BASE_URL}/api/info/safety", timeout=20).json()
        for key in ("cyclone", "surf", "beaches", "updated_at"):
            assert key in data, f"missing key {key}"
        cyc = data["cyclone"]
        for f in ("level", "label", "color", "note"):
            assert f in cyc
        assert cyc["level"] in (0, 1, 2, 3), f"unexpected cyclone level: {cyc['level']}"
        surf = data["surf"]
        for f in ("size", "note"):
            assert f in surf
        beaches = data["beaches"]
        assert isinstance(beaches, list) and len(beaches) >= 4
        for b in beaches:
            for f in ("beach_id", "name", "rip_profile", "note"):
                assert f in b
            assert b["rip_profile"] in VALID_RIP_PROFILES


# ---------- BACKEND-INFO-5: consistent across calls / no DB writes -------
class TestInfoConsistency:
    def test_events_consistent_between_calls(self, client):
        a = client.get(f"{BASE_URL}/api/info/events", timeout=15).json()
        b = client.get(f"{BASE_URL}/api/info/events", timeout=15).json()
        assert a["holidays"] == b["holidays"]
        assert a["events"] == b["events"]

    def test_transport_consistent_between_calls(self, client):
        a = client.get(f"{BASE_URL}/api/info/transport", timeout=15).json()
        b = client.get(f"{BASE_URL}/api/info/transport", timeout=15).json()
        assert a == b

    def test_safety_consistent_between_calls(self, client):
        a = client.get(f"{BASE_URL}/api/info/safety", timeout=20).json()
        b = client.get(f"{BASE_URL}/api/info/safety", timeout=20).json()
        # The cyclone/surf/beaches blocks should match (updated_at may differ if cache flips)
        assert a["beaches"] == b["beaches"]
        assert a["cyclone"]["level"] == b["cyclone"]["level"]

    def test_endpoints_unauthenticated(self, client):
        # No cookies/headers — should still 200
        s = requests.Session()
        for path in ("/api/info/events", "/api/info/transport", "/api/info/safety"):
            r = s.get(f"{BASE_URL}{path}", timeout=20)
            assert r.status_code == 200, f"{path} → {r.status_code}"
        r = s.post(f"{BASE_URL}/api/info/transport/book", timeout=15)
        assert r.status_code == 200
