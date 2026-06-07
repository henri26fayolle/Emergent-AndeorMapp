/**
 * Tiny helpers that turn the player's clock + location into compact "context tags"
 * (`tod` / `weather`) used to fetch context-aware lore audio from the backend.
 *
 * Buckets are intentionally coarse so the backend can cache TTS variants per
 * (journey_id, stop_id, tod, weather).
 */

// --- Time of day -----------------------------------------------------------

export function currentTimeOfDay(date = new Date()) {
  const h = date.getHours();
  if (h >= 5  && h <  7)  return "dawn";
  if (h >= 7  && h < 11)  return "morning";
  if (h >= 11 && h < 15)  return "midday";
  if (h >= 15 && h < 18)  return "golden_hour";
  if (h >= 18 && h < 20)  return "dusk";
  return "night";
}

// --- Weather (Open-Meteo, no API key needed) -------------------------------

const WEATHER_CACHE_MS = 30 * 60 * 1000; // 30 min
const memCache = new Map(); // key -> { tag, t }

function bucketFromCode(code) {
  if (code === undefined || code === null) return "clear";
  if ([0, 1].includes(code)) return "clear";
  if ([2, 3].includes(code)) return "cloudy";
  if ([45, 48].includes(code)) return "fog";
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "rain";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "rain"; // treat snow as rain (rare in Mauritius)
  if ([95, 96, 99].includes(code)) return "thunder";
  return "clear";
}

function cacheKey(lat, lon) {
  // round to 0.25° (~25 km) — fine enough for "Mauritian weather" and cache-friendly
  return `${Math.round(lat * 4) / 4}|${Math.round(lon * 4) / 4}`;
}

/**
 * Fetch the current weather bucket for given coordinates.
 * Falls back to "clear" silently on any failure — this is decorative, never blocking.
 */
export async function fetchWeatherBucket(lat, lon) {
  if (lat == null || lon == null) return "clear";
  const key = cacheKey(lat, lon);
  const hit = memCache.get(key);
  if (hit && Date.now() - hit.t < WEATHER_CACHE_MS) return hit.tag;

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=weather_code`;
    const r = await fetch(url, { method: "GET" });
    if (!r.ok) return "clear";
    const data = await r.json();
    const code = data?.current?.weather_code;
    const tag = bucketFromCode(code);
    memCache.set(key, { tag, t: Date.now() });
    return tag;
  } catch {
    return "clear";
  }
}

/**
 * Resolve `{tod, weather}` for the player. If no lat/lon given, weather is "clear".
 */
export async function resolveAudioContext({ lat = null, lon = null } = {}) {
  const tod = currentTimeOfDay();
  const weather = await fetchWeatherBucket(lat, lon);
  return { tod, weather };
}

/**
 * Append `?tod=...&weather=...` to an audio URL.
 */
export function withAudioContext(url, ctx) {
  if (!ctx) return url;
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}tod=${encodeURIComponent(ctx.tod)}&weather=${encodeURIComponent(ctx.weather)}`;
}
