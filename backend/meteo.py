"""
Mauritius Meteo Station
=======================

Surfaces a single read-only endpoint the frontend's "Vacoas Meteo Station" pin
hits when the player taps it on the world map.

Returns:
  • current weather + 3-day forecast for central Mauritius (Vacoas ≈ -20.30, 57.49)
  • per-trail status (OPEN / CAUTION / CLOSED) auto-derived from the weather
    for the 4 most popular hikes.

No API key needed (Open-Meteo is free). Results cached in-process for 10
minutes so we never hammer the upstream during a busy session.
"""
from __future__ import annotations

import time
from typing import Optional

import httpx
from fastapi import APIRouter, HTTPException


# Central station — Vacoas (where the real Mauritius Meteorological Services sit).
STATION = {
    "name":  "Vacoas Meteo Station",
    "label": "Central plateau · Vacoas-Phoenix",
    "lat":   -20.30,
    "lon":    57.49,
}

# The 4 famous trails the player will see in the modal.
TRAILS = [
    {
        "trail_id": "le-morne-brabant",
        "name":     "Le Morne Brabant",
        "region":   "south-wild",
        "lat":      -20.4565, "lon": 57.3145,
        "elev_m":   556,
        "distance_km": 7.2,
        "difficulty":  "Hard",
        "tagline":  "UNESCO basalt cliff at the southwestern tip",
    },
    {
        "trail_id": "black-river-gorges",
        "name":     "Black River Gorges",
        "region":   "black-river",
        "lat":      -20.4360, "lon": 57.4360,
        "elev_m":   828,
        "distance_km": 16.8,
        "difficulty":  "Hard",
        "tagline":  "Endemic forest, ebony giants, kestrels & macaques",
    },
    {
        "trail_id": "tamarind-falls",
        "name":     "Tamarind Falls (7 Cascades)",
        "region":   "black-river",
        "lat":      -20.4060, "lon": 57.4622,
        "elev_m":   400,
        "distance_km": 8.5,
        "difficulty":  "Moderate",
        "tagline":  "Seven waterfalls cascading down basalt amphitheatres",
    },
    {
        "trail_id": "le-pouce",
        "name":     "Le Pouce",
        "region":   "central-culture",
        "lat":      -20.2050, "lon": 57.5470,
        "elev_m":   812,
        "distance_km": 5.6,
        "difficulty":  "Moderate",
        "tagline":  "The 'Thumb' — Mauritius' most photographed silhouette",
    },
]


# ---- Weather-code → bucket / label / icon ---------------------------------
def _bucket(code: Optional[int]) -> str:
    if code is None:
        return "clear"
    if code in (0, 1):
        return "clear"
    if code in (2, 3):
        return "cloudy"
    if code in (45, 48):
        return "fog"
    if code in (51, 53, 55, 56, 57):
        return "drizzle"
    if code in (61, 63, 80, 81):
        return "rain"
    if code in (65, 82):
        return "heavy_rain"
    if code in (66, 67):
        return "freezing_rain"
    if code in (71, 73, 75, 77, 85, 86):
        return "snow"
    if code == 95:
        return "thunder"
    if code in (96, 99):
        return "thunder_hail"
    return "clear"


BUCKET_LABEL = {
    "clear":         "Clear sky",
    "cloudy":        "Cloudy",
    "fog":           "Fog",
    "drizzle":       "Light drizzle",
    "rain":          "Rain",
    "heavy_rain":    "Heavy rain",
    "freezing_rain": "Freezing rain",
    "snow":          "Snow",
    "thunder":       "Thunderstorm",
    "thunder_hail":  "Thunderstorm with hail",
}


# ---- Auto status rules ----------------------------------------------------
# All four hikes share these rules with one trail-specific override per case.
def _status_for(trail: dict, bucket: str, wind_kmh: float) -> dict:
    """Return {status, reason} given the central station's current weather."""
    if bucket in ("thunder", "thunder_hail"):
        return {"status": "closed", "reason": "Thunderstorm over Mauritius — all hikes closed"}

    if bucket == "heavy_rain":
        # Basalt + steep faces become dangerously slick — close the two most exposed climbs
        if trail["trail_id"] in ("le-morne-brabant", "le-pouce"):
            return {"status": "closed", "reason": "Heavy rain — basalt face is too slick to climb safely"}
        return {"status": "caution", "reason": "Heavy rain — paths flooding, pack grip shoes & dry layers"}

    if bucket in ("rain", "drizzle"):
        if trail["trail_id"] == "le-morne-brabant":
            return {"status": "caution", "reason": "Wet basalt cliff — grip shoes mandatory, no scrambling solo"}
        return {"status": "open", "reason": "Damp trail — bring grip shoes, expect mud"}

    if bucket == "fog":
        if trail["trail_id"] == "le-pouce":
            return {"status": "caution", "reason": "Low visibility on the summit — wait for the cloud to lift"}
        return {"status": "open", "reason": "Cloudy ceiling — views may be limited"}

    if wind_kmh and wind_kmh >= 55 and trail["trail_id"] in ("le-morne-brabant", "le-pouce"):
        return {"status": "caution", "reason": f"Sustained wind {int(wind_kmh)} km/h on exposed ridges — keep low"}

    return {"status": "open", "reason": "Trail conditions are good — head out!"}


# ---- In-process cache -----------------------------------------------------
_cache = {"ts": 0.0, "payload": None}
_CACHE_TTL_S = 600  # 10 minutes


async def _fetch_open_meteo() -> dict:
    url = (
        "https://api.open-meteo.com/v1/forecast"
        f"?latitude={STATION['lat']}&longitude={STATION['lon']}"
        "&current=temperature_2m,weather_code,wind_speed_10m,relative_humidity_2m,is_day"
        "&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max"
        "&timezone=Indian%2FMauritius&forecast_days=4"
    )
    async with httpx.AsyncClient(timeout=8.0) as cx:
        r = await cx.get(url)
        r.raise_for_status()
        return r.json()


def build_router() -> APIRouter:
    router = APIRouter(prefix="/meteo")

    @router.get("/trails")
    async def trails():
        """Current weather (Vacoas) + per-trail auto-derived status."""
        now = time.time()
        if _cache["payload"] and (now - _cache["ts"]) < _CACHE_TTL_S:
            return _cache["payload"]

        try:
            raw = await _fetch_open_meteo()
        except Exception as e:
            # Open-Meteo down → degrade gracefully with "unknown" status
            if _cache["payload"]:
                return _cache["payload"]
            raise HTTPException(503, f"Meteo upstream unavailable: {e}")

        cur = raw.get("current", {}) or {}
        daily = raw.get("daily", {}) or {}

        bucket = _bucket(cur.get("weather_code"))
        weather = {
            "temp_c":      cur.get("temperature_2m"),
            "code":        cur.get("weather_code"),
            "bucket":      bucket,
            "label":       BUCKET_LABEL.get(bucket, "—"),
            "wind_kmh":    cur.get("wind_speed_10m"),
            "humidity":    cur.get("relative_humidity_2m"),
            "is_day":      cur.get("is_day"),
        }

        forecast = []
        dates  = daily.get("time", []) or []
        codes  = daily.get("weather_code", []) or []
        tmin   = daily.get("temperature_2m_min", []) or []
        tmax   = daily.get("temperature_2m_max", []) or []
        precip = daily.get("precipitation_probability_max", []) or []
        for i, d in enumerate(dates[:4]):
            b = _bucket(codes[i] if i < len(codes) else None)
            forecast.append({
                "date":   d,
                "code":   codes[i] if i < len(codes) else None,
                "bucket": b,
                "label":  BUCKET_LABEL.get(b, "—"),
                "min":    tmin[i] if i < len(tmin) else None,
                "max":    tmax[i] if i < len(tmax) else None,
                "precip_pct": precip[i] if i < len(precip) else None,
            })

        wind_kmh = float(cur.get("wind_speed_10m") or 0)
        trails_out = []
        for t in TRAILS:
            s = _status_for(t, bucket, wind_kmh)
            trails_out.append({**t, **s})

        payload = {
            "station":  STATION,
            "weather":  weather,
            "forecast": forecast,
            "trails":   trails_out,
            "updated_at": int(now),
        }
        _cache["payload"] = payload
        _cache["ts"] = now
        return payload

    return router
