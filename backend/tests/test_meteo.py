"""Backend tests for the Mauritius Meteo Station endpoint (/api/meteo/trails)."""
import os
import time
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://explore-earn-5.preview.emergentagent.com").rstrip("/")
METEO_URL = f"{BASE_URL}/api/meteo/trails"

EXPECTED_TRAIL_IDS = {"le-morne-brabant", "black-river-gorges", "tamarind-falls", "le-pouce"}
VALID_BUCKETS = {"clear", "cloudy", "fog", "drizzle", "rain", "heavy_rain",
                 "thunder", "thunder_hail", "freezing_rain", "snow"}
VALID_STATUSES = {"open", "caution", "closed"}


@pytest.fixture(scope="module")
def first_response():
    """Single GET shared across tests for top-level shape checks."""
    r = requests.get(METEO_URL, timeout=20)
    return r


# -- BACKEND-MET-1 ---------------------------------------------------------
class TestMeteoEndpointShape:
    def test_status_200(self, first_response):
        assert first_response.status_code == 200, f"got {first_response.status_code}: {first_response.text[:200]}"

    def test_top_level_keys(self, first_response):
        data = first_response.json()
        for k in ("station", "weather", "forecast", "trails", "updated_at"):
            assert k in data, f"missing key: {k}"

    def test_no_auth_required(self):
        # explicit fresh request without cookies
        r = requests.get(METEO_URL, timeout=20)
        assert r.status_code == 200


# -- BACKEND-MET-2 ---------------------------------------------------------
class TestMeteoTrails:
    def test_four_trails(self, first_response):
        data = first_response.json()
        trails = data["trails"]
        assert isinstance(trails, list)
        assert len(trails) == 4

    def test_trail_ids(self, first_response):
        ids = {t["trail_id"] for t in first_response.json()["trails"]}
        assert ids == EXPECTED_TRAIL_IDS, f"trail ids mismatch: {ids}"

    def test_trail_fields(self, first_response):
        for t in first_response.json()["trails"]:
            for k in ("trail_id", "name", "region", "lat", "lon", "elev_m",
                      "distance_km", "difficulty", "tagline", "status", "reason"):
                assert k in t, f"trail {t.get('trail_id')} missing {k}"
            assert t["status"] in VALID_STATUSES
            assert isinstance(t["reason"], str) and len(t["reason"]) > 0
            assert isinstance(t["lat"], (int, float))
            assert isinstance(t["lon"], (int, float))


# -- BACKEND-MET-3 ---------------------------------------------------------
class TestMeteoWeatherAndForecast:
    def test_weather_fields(self, first_response):
        w = first_response.json()["weather"]
        for k in ("temp_c", "code", "bucket", "label", "wind_kmh", "humidity", "is_day"):
            assert k in w, f"weather missing {k}"
        assert w["bucket"] in VALID_BUCKETS

    def test_forecast_array(self, first_response):
        f = first_response.json()["forecast"]
        assert isinstance(f, list)
        assert len(f) == 4, f"forecast length expected 4, got {len(f)}"
        for d in f:
            for k in ("date", "code", "bucket", "label", "min", "max", "precip_pct"):
                assert k in d, f"forecast item missing {k}"
            assert d["bucket"] in VALID_BUCKETS


# -- BACKEND-MET-4 ---------------------------------------------------------
class TestMeteoCache:
    def test_cache_returns_same_updated_at(self):
        r1 = requests.get(METEO_URL, timeout=20)
        time.sleep(0.5)
        r2 = requests.get(METEO_URL, timeout=20)
        assert r1.status_code == 200 and r2.status_code == 200
        d1, d2 = r1.json(), r2.json()
        # Cache TTL = 600s, so two back-to-back calls must return identical updated_at
        assert d1["updated_at"] == d2["updated_at"], (
            f"cache miss: updated_at differs ({d1['updated_at']} vs {d2['updated_at']})"
        )

    def test_endpoint_does_not_500(self):
        r = requests.get(METEO_URL, timeout=20)
        assert r.status_code != 500, f"endpoint returned 500: {r.text[:300]}"
