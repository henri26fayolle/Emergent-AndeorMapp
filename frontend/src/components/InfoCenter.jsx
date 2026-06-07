import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Wind, Droplets, Thermometer, CloudSun, CloudFog, CloudRain, CloudLightning, Sun, Cloud,
  MapPin, AlertTriangle, CheckCircle2, Ban, Info, CalendarDays, Bus, ShieldAlert,
  Car, Phone, Sparkles, Waves, Anchor,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { api, formatErr } from "@/lib/api";
import { playClick, playChime } from "@/lib/sound";
import { toast } from "sonner";

// Map weather bucket → icon
const WEATHER_ICON = {
  clear:         Sun,
  cloudy:        Cloud,
  fog:           CloudFog,
  drizzle:       CloudRain,
  rain:          CloudRain,
  heavy_rain:    CloudRain,
  freezing_rain: CloudRain,
  snow:          CloudRain,
  thunder:       CloudLightning,
  thunder_hail:  CloudLightning,
};

// Tailwind colour per status
const STATUS_STYLE = {
  open:    { bg: "bg-jungle-500",  text: "text-jungle-700",  badge: "bg-jungle-500 text-white",  label: "Open",     Icon: CheckCircle2 },
  caution: { bg: "bg-sun-500",     text: "text-sun-600",     badge: "bg-sun-500 text-ink-900",   label: "Caution",  Icon: AlertTriangle },
  closed:  { bg: "bg-sunset-500",  text: "text-sunset-500",  badge: "bg-sunset-500 text-white",  label: "Closed",   Icon: Ban },
};

// Tab catalog — designed to grow as new info modules ship
const TABS = [
  { id: "weather",   label: "Weather & Trails",   icon: CloudSun },
  { id: "events",    label: "Events & Holidays",  icon: CalendarDays },
  { id: "transport", label: "Roads & Transport",  icon: Bus },
  { id: "safety",    label: "Safety Advisories",  icon: ShieldAlert },
];

const TRADITION_STYLE = {
  hindu:     { dot: "bg-sunset-500", label: "Hindu",     ring: "ring-sunset-500/40" },
  tamil:     { dot: "bg-sun-500",    label: "Tamil",     ring: "ring-sun-500/40" },
  muslim:    { dot: "bg-jungle-500", label: "Muslim",    ring: "ring-jungle-500/40" },
  christian: { dot: "bg-ocean-700",  label: "Christian", ring: "ring-ocean-700/40" },
  chinese:   { dot: "bg-sunset-600", label: "Chinese",   ring: "ring-sunset-600/40" },
  sega:      { dot: "bg-sun-600",    label: "Séga",      ring: "ring-sun-600/40" },
  creole:    { dot: "bg-jungle-700", label: "Creole",    ring: "ring-jungle-700/40" },
  secular:   { dot: "bg-ink-700",    label: "National",  ring: "ring-ink-700/30" },
};

const RIP_STYLE = {
  low:      { bg: "bg-jungle-500",  label: "Low rip risk",      Icon: CheckCircle2 },
  moderate: { bg: "bg-sun-500",     label: "Moderate rip risk", Icon: AlertTriangle },
  high:     { bg: "bg-sunset-500",  label: "High rip risk",     Icon: AlertTriangle },
};

// Endpoint each tab pulls from (module-scoped so the effect's dep array stays stable)
const ENDPOINT = { weather: "/meteo/trails", events: "/info/events", transport: "/info/transport", safety: "/info/safety" };

function formatDate(iso) {
  try {
    return new Date(iso).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
  } catch { return iso; }
}

/**
 * Vacoas Information Center — the player's tap-anywhere hub for live
 * Mauritius travel intelligence. Reached by tapping the centre-map info pin.
 *
 * Tabbed by design so future info modules (events, transport advisories,
 * safety bulletins, cultural calendar, …) slot in cleanly without
 * restructuring this shell.
 */
export default function InfoCenter({ open, onClose }) {
  const [tab, setTab] = useState(TABS[0].id);
  // Per-tab cached payload so switching tabs doesn't re-fetch unnecessarily
  const [payloads, setPayloads] = useState({ weather: null, events: null, transport: null, safety: null });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [booking, setBooking] = useState(false);

  // Reset to first tab when re-opened
  useEffect(() => { if (open) queueMicrotask(() => setTab(TABS[0].id)); }, [open]);

  // Lazy-fetch the active tab's payload only if we don't already have it
  useEffect(() => {
    if (!open) return undefined;
    if (payloads[tab]) return undefined; // already loaded
    let cancelled = false;
    queueMicrotask(() => { setLoading(true); setError(null); });
    api.get(ENDPOINT[tab])
      .then((r) => { if (!cancelled) queueMicrotask(() => setPayloads((p) => ({ ...p, [tab]: r.data }))); })
      .catch((e) => { if (!cancelled) queueMicrotask(() => setError(formatErr(e.response?.data?.detail) || e.message)); })
      .finally(() => { if (!cancelled) queueMicrotask(() => setLoading(false)); });
    return () => { cancelled = true; };
  }, [open, tab, payloads]);

  // Esc closes
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === "Escape") { e.stopPropagation(); onClose && onClose(); } };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open, onClose]);

  const data = payloads.weather; // legacy alias for the weather payload
  const CurrentIcon = data ? (WEATHER_ICON[data.weather?.bucket] || CloudSun) : Info;

  const bookTransfer = async () => {
    if (booking) return;
    setBooking(true);
    try {
      const { data: res } = await api.post("/info/transport/book");
      try { playChime(); } catch { /* noop */ }
      toast.success(`Interest registered — ref ${res.reference}`);
    } catch (e) {
      toast.error(formatErr(e.response?.data?.detail) || e.message);
    } finally {
      setBooking(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="info-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-[96] flex items-center justify-center p-3 sm:p-6"
          data-testid="info-center"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={() => { playClick(); onClose && onClose(); }}
            className="absolute inset-0 bg-jungle-700/70 backdrop-blur-sm"
            data-testid="info-center-backdrop"
          />

          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.32, ease: "easeOut" }}
            className="relative w-full max-w-4xl max-h-[90vh] flex flex-col bg-sand-100 border-4 border-ocean-700 rounded-3xl shadow-lift overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="relative shrink-0 px-5 lg:px-7 py-4 bg-gradient-to-br from-ocean-700 to-ocean-500 text-sand-100 flex items-center gap-4 overflow-hidden">
              <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ background: "radial-gradient(circle at 20% 30%, #FFFFFF66 0%, transparent 40%)" }} aria-hidden />
              <div className="relative w-14 h-14 rounded-full bg-sand-100/15 ring-3 ring-sand-100 flex items-center justify-center shadow-lift">
                <Info className="w-7 h-7" />
              </div>
              <div className="relative min-w-0 flex-1">
                <div className="text-[10px] tracking-[0.35em] uppercase opacity-80 font-bold">Vacoas Information Center</div>
                <h2 className="font-display text-xl lg:text-2xl italic truncate" data-testid="info-center-title">
                  Live Mauritius travel intel
                </h2>
                <div className="text-[10px] tracking-[0.25em] uppercase opacity-75 font-bold mt-0.5">
                  {data?.station?.label || "Central plateau · Vacoas-Phoenix"}
                </div>
              </div>
              <button
                onClick={() => { playClick(); onClose && onClose(); }}
                data-testid="info-center-close"
                aria-label="Close information center"
                className="shrink-0 w-10 h-10 rounded-full bg-sand-100/15 hover:bg-sand-100/25 backdrop-blur flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tabs */}
            <Tabs value={tab} onValueChange={(v) => { playClick(); setTab(v); }} className="flex-1 flex flex-col min-h-0">
              <TabsList
                className="shrink-0 mx-4 sm:mx-6 mt-3 sm:mt-4 mb-1 sm:mb-2 bg-sand-200/70 p-1 rounded-2xl flex flex-wrap gap-1 h-auto justify-start"
                data-testid="info-center-tabs"
              >
                {TABS.map((t) => {
                  const TabIcon = t.icon;
                  return (
                    <TabsTrigger
                      key={t.id}
                      value={t.id}
                      data-testid={`info-center-tab-${t.id}`}
                      className="rounded-xl px-3 sm:px-4 py-1.5 text-xs sm:text-sm font-bold tracking-[0.12em] uppercase data-[state=active]:bg-ocean-700 data-[state=active]:text-sand-100 data-[state=active]:shadow-clay text-ink-700 hover:text-ink-900 transition-colors inline-flex items-center gap-1.5"
                    >
                      <TabIcon className="w-3.5 h-3.5" /> {t.label}
                    </TabsTrigger>
                  );
                })}
              </TabsList>

              {/* Body */}
              <div className="relative flex-1 overflow-y-auto px-4 sm:px-6 py-5 paper-bg space-y-6" data-testid="info-center-body">
                <TabsContent value="weather" className="m-0 space-y-6 focus-visible:outline-none">
                  {tab === "weather" && loading && <Loader label="Calling the information center…" testid="info-center-loading" />}
                  {tab === "weather" && error && <ErrorBanner error={error} />}

                  {data && !loading && !error && (
                    <>
                      {/* Current weather hero */}
                      <section className="rounded-2xl border-2 border-ocean-700/30 bg-sand-100/80 backdrop-blur p-5" data-testid="info-current">
                        <div className="flex items-center justify-between flex-wrap gap-4">
                          <div className="flex items-center gap-4">
                            <CurrentIcon className="w-12 h-12 text-ocean-700 shrink-0" />
                            <div>
                              <div className="text-[10px] tracking-[0.25em] uppercase font-bold text-ink-700">Right now</div>
                              <div className="font-display text-3xl italic text-ink-900 leading-tight">
                                {data.weather?.temp_c != null ? `${Math.round(data.weather.temp_c)}°C` : "—"}
                              </div>
                              <div className="font-display italic text-ink-700">{data.weather?.label}</div>
                            </div>
                          </div>
                          <div className="flex gap-4 text-sm text-ink-700">
                            <Stat icon={Wind}        label="Wind"     value={data.weather?.wind_kmh != null ? `${Math.round(data.weather.wind_kmh)} km/h` : "—"} />
                            <Stat icon={Droplets}    label="Humidity" value={data.weather?.humidity != null ? `${data.weather.humidity}%` : "—"} />
                            <Stat icon={Thermometer} label="Hi/Lo"    value={data.forecast?.[0] ? `${Math.round(data.forecast[0].max)}° / ${Math.round(data.forecast[0].min)}°` : "—"} />
                          </div>
                        </div>
                      </section>

                      {/* 4-day forecast */}
                      <section data-testid="info-forecast">
                        <h3 className="font-display text-lg italic text-ink-900 mb-3">Next 4 days</h3>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          {(data.forecast || []).map((d) => {
                            const Icon = WEATHER_ICON[d.bucket] || CloudSun;
                            return (
                              <div
                                key={d.date}
                                data-testid={`info-forecast-${d.date}`}
                                className="rounded-2xl border-2 border-ocean-700/20 bg-sand-100/85 p-3 text-center"
                              >
                                <div className="text-[10px] tracking-[0.25em] uppercase font-bold text-ink-700">{formatDate(d.date)}</div>
                                <Icon className="w-7 h-7 text-ocean-700 mx-auto my-2" />
                                <div className="text-sm text-ink-900 tabular-nums">
                                  <span className="font-bold">{Math.round(d.max)}°</span>
                                  <span className="text-ink-700"> / {Math.round(d.min)}°</span>
                                </div>
                                <div className="text-[10px] tracking-[0.2em] uppercase text-ink-700 mt-1">{d.label}</div>
                                {d.precip_pct != null && (
                                  <div className="text-[10px] text-ocean-700 mt-0.5">{d.precip_pct}% rain</div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </section>

                      {/* Trails */}
                      <section data-testid="info-trails">
                        <h3 className="font-display text-lg italic text-ink-900 mb-3">Famous trails today</h3>
                        <div className="space-y-2.5">
                          {(data.trails || []).map((t) => {
                            const s = STATUS_STYLE[t.status] || STATUS_STYLE.open;
                            return (
                              <div
                                key={t.trail_id}
                                data-testid={`info-trail-${t.trail_id}`}
                                data-trail-status={t.status}
                                className="rounded-2xl border-2 border-jungle-700/15 bg-sand-100/90 p-3.5 flex items-start gap-3"
                              >
                                <div className={`w-10 h-10 rounded-xl ${s.bg} text-white flex items-center justify-center shrink-0 shadow-clay`}>
                                  <s.Icon className="w-5 h-5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-display text-base italic text-ink-900 leading-tight">{t.name}</span>
                                    <span className={`rounded-full px-2 py-0.5 text-[9px] tracking-[0.2em] uppercase font-bold ${s.badge}`}>
                                      {s.label}
                                    </span>
                                  </div>
                                  <div className="text-[10px] tracking-[0.18em] uppercase font-bold text-ink-700 mt-0.5">
                                    {t.difficulty} · {t.distance_km} km · {t.elev_m} m elev
                                  </div>
                                  <div className="text-sm text-ink-700 mt-1.5 italic leading-snug">{t.reason || t.tagline}</div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        <div className="mt-3 flex items-center gap-2 text-[10px] tracking-[0.2em] uppercase text-ink-700/80 font-bold">
                          <MapPin className="w-3 h-3" /> Auto-derived from Vacoas station · Mauritius Meteorological Services aligned
                        </div>
                      </section>
                    </>
                  )}
                </TabsContent>

                {/* ===== EVENTS & HOLIDAYS ============================== */}
                <TabsContent value="events" className="m-0 space-y-6 focus-visible:outline-none">
                  {tab === "events" && loading && <Loader label="Reading the island's calendar…" testid="info-center-loading-events" />}
                  {tab === "events" && error && <ErrorBanner error={error} />}
                  {tab === "events" && payloads.events && (
                    <>
                      <section data-testid="info-holidays">
                        <h3 className="font-display text-lg italic text-ink-900 mb-3">Upcoming public holidays</h3>
                        <div className="space-y-2.5">
                          {(payloads.events.holidays || []).map((h) => {
                            const t = TRADITION_STYLE[h.tradition] || TRADITION_STYLE.secular;
                            return (
                              <div
                                key={`${h.date}-${h.name}`}
                                data-testid={`info-holiday-${h.date}`}
                                className={`rounded-2xl border-2 border-jungle-700/15 bg-sand-100/90 p-3.5 flex items-start gap-3 ring-2 ring-offset-2 ring-offset-sand-100 ${t.ring}`}
                              >
                                <div className="shrink-0 text-center w-14">
                                  <div className="text-[10px] tracking-[0.2em] uppercase font-bold text-ink-700">{new Date(h.date).toLocaleDateString("en-GB", { month: "short" })}</div>
                                  <div className="font-display text-2xl italic text-ink-900 leading-none">{new Date(h.date).getDate()}</div>
                                  <div className="text-[10px] tracking-[0.15em] uppercase text-ink-700/80">{h.weekday?.slice(0, 3)}</div>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-display text-base italic text-ink-900 leading-tight">{h.name}</span>
                                    <span className={`rounded-full px-2 py-0.5 text-[9px] tracking-[0.2em] uppercase font-bold text-white ${t.dot}`}>{t.label}</span>
                                  </div>
                                  <div className="text-[10px] tracking-[0.18em] uppercase font-bold text-ink-700 mt-0.5">
                                    {h.days_until === 0 ? "Today" : h.days_until === 1 ? "Tomorrow" : `in ${h.days_until} days`}
                                  </div>
                                  <div className="text-sm text-ink-700 mt-1.5 italic leading-snug">{h.note}</div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </section>

                      <section data-testid="info-events">
                        <h3 className="font-display text-lg italic text-ink-900 mb-3">Recurring cultural events</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {(payloads.events.events || []).map((e) => {
                            const t = TRADITION_STYLE[e.tradition] || TRADITION_STYLE.secular;
                            return (
                              <div
                                key={e.event_id}
                                data-testid={`info-event-${e.event_id}`}
                                className="rounded-2xl border-2 border-jungle-700/15 bg-sand-100/90 p-3.5"
                              >
                                <div className="flex items-center gap-2 mb-1.5">
                                  <span className={`w-2.5 h-2.5 rounded-full ${t.dot}`} aria-hidden />
                                  <span className="text-[10px] tracking-[0.2em] uppercase font-bold text-ink-700">{e.venue}</span>
                                </div>
                                <div className="font-display text-base italic text-ink-900 leading-tight">{e.title}</div>
                                <div className="text-[11px] tracking-[0.15em] uppercase text-ocean-700 font-bold mt-1">{e.when_pattern}</div>
                                <div className="text-sm text-ink-700 mt-1.5 italic leading-snug">{e.tagline}</div>
                              </div>
                            );
                          })}
                        </div>
                      </section>
                    </>
                  )}
                </TabsContent>

                {/* ===== ROADS & TRANSPORT ============================== */}
                <TabsContent value="transport" className="m-0 space-y-6 focus-visible:outline-none">
                  {tab === "transport" && loading && <Loader label="Calling the transfer desk…" testid="info-center-loading-transport" />}
                  {tab === "transport" && error && <ErrorBanner error={error} />}
                  {tab === "transport" && payloads.transport && (
                    <>
                      {/* Partner transfer CTA */}
                      <section data-testid="info-book-transfer" className="rounded-2xl border-2 border-ocean-700/30 bg-gradient-to-br from-ocean-700 to-ocean-500 text-sand-100 p-5">
                        <div className="flex items-start gap-4 flex-wrap">
                          <div className="w-12 h-12 rounded-2xl bg-sand-100/15 ring-2 ring-sand-100/40 flex items-center justify-center shrink-0">
                            <Car className="w-6 h-6" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-[10px] tracking-[0.3em] uppercase font-bold opacity-80">An Deor Transfers · {payloads.transport.partner_transfer_app?.status === "coming_soon" ? "Beta soon" : "Live"}</div>
                            <h3 className="font-display text-xl italic leading-tight">Book a transfer from anywhere on the island</h3>
                            <p className="text-sm opacity-90 mt-1.5 italic leading-snug">{payloads.transport.partner_transfer_app?.note}</p>
                          </div>
                          <Button
                            onClick={bookTransfer}
                            disabled={booking}
                            data-testid="info-book-transfer-cta"
                            className="rounded-full bg-sand-100 text-ocean-700 hover:bg-sand-200 font-bold tracking-[0.15em] uppercase text-xs px-5 shadow-clay"
                          >
                            {booking ? "Registering…" : "Book a transfer"} <Sparkles className="w-3.5 h-3.5 ml-1" />
                          </Button>
                        </div>
                      </section>

                      {/* Ride-share */}
                      <section data-testid="info-rideshare">
                        <h3 className="font-display text-lg italic text-ink-900 mb-3">Ride-share & on-demand</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          {(payloads.transport.rideshare || []).map((r) => (
                            <div key={r.name} data-testid={`info-rideshare-${r.name.toLowerCase().replace(/\s+/g, "-")}`} className="rounded-2xl border-2 border-jungle-700/15 bg-sand-100/90 p-3.5">
                              <div className="text-[10px] tracking-[0.2em] uppercase font-bold text-ocean-700">{r.kind}</div>
                              <div className="font-display text-base italic text-ink-900 leading-tight mt-0.5">{r.name}</div>
                              <a href={`tel:${r.phone}`} className="inline-flex items-center gap-1.5 text-sm text-jungle-700 hover:text-jungle-500 mt-1.5 font-bold tabular-nums">
                                <Phone className="w-3.5 h-3.5" /> {r.phone}
                              </a>
                              <div className="text-xs text-ink-700 mt-1.5 italic leading-snug">{r.note}</div>
                            </div>
                          ))}
                        </div>
                      </section>

                      {/* Taxis */}
                      <section data-testid="info-taxis">
                        <h3 className="font-display text-lg italic text-ink-900 mb-3">Trusted taxi stands</h3>
                        <div className="space-y-2.5">
                          {(payloads.transport.taxis || []).map((t) => (
                            <div key={t.name} data-testid={`info-taxi-${t.name.toLowerCase().replace(/\s+/g, "-")}`} className="rounded-2xl border-2 border-jungle-700/15 bg-sand-100/90 p-3.5 flex items-start gap-3 flex-wrap">
                              <div className="flex-1 min-w-0">
                                <div className="font-display text-base italic text-ink-900 leading-tight">{t.name}</div>
                                <div className="text-[11px] tracking-[0.15em] uppercase text-ink-700 font-bold mt-0.5">{t.where}</div>
                                <div className="text-sm text-ink-700 italic mt-1">{t.note}</div>
                              </div>
                              <a href={`tel:${t.phone}`} className="inline-flex items-center gap-1.5 text-sm text-jungle-700 hover:text-jungle-500 font-bold tabular-nums shrink-0">
                                <Phone className="w-3.5 h-3.5" /> {t.phone}
                              </a>
                            </div>
                          ))}
                        </div>
                      </section>

                      {/* Public transit tips */}
                      <section data-testid="info-transit">
                        <h3 className="font-display text-lg italic text-ink-900 mb-3">Public transport tips</h3>
                        <ul className="space-y-2">
                          {(payloads.transport.public_transit_tips || []).map((tip, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-ink-700">
                              <Bus className="w-4 h-4 text-ocean-700 shrink-0 mt-0.5" />
                              <span className="italic leading-snug">{tip}</span>
                            </li>
                          ))}
                        </ul>
                      </section>

                      {/* Road advisories */}
                      <section data-testid="info-road-advisories">
                        <h3 className="font-display text-lg italic text-ink-900 mb-3">Road advisories</h3>
                        {(payloads.transport.road_advisories || []).length === 0 ? (
                          <div className="rounded-2xl border-2 border-jungle-500/30 bg-jungle-500/5 p-4 text-sm text-jungle-700 italic">
                            All roads clear right now — no active advisories.
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {payloads.transport.road_advisories.map((a, i) => (
                              <div key={i} className="rounded-2xl border-2 border-sun-500/40 bg-sand-100/90 p-3.5">
                                <div className="font-display text-base italic text-ink-900">{a.road}</div>
                                <div className="text-sm text-ink-700 italic mt-1">{a.note}</div>
                              </div>
                            ))}
                          </div>
                        )}
                      </section>
                    </>
                  )}
                </TabsContent>

                {/* ===== SAFETY ADVISORIES ============================== */}
                <TabsContent value="safety" className="m-0 space-y-6 focus-visible:outline-none">
                  {tab === "safety" && loading && <Loader label="Pulling the sea & sky bulletin…" testid="info-center-loading-safety" />}
                  {tab === "safety" && error && <ErrorBanner error={error} />}
                  {tab === "safety" && payloads.safety && (
                    <>
                      {/* Cyclone level */}
                      <section
                        data-testid="info-cyclone"
                        data-cyclone-level={payloads.safety.cyclone?.level}
                        className="rounded-2xl border-2 p-5 flex items-center gap-4"
                        style={{ borderColor: payloads.safety.cyclone?.color, background: `${payloads.safety.cyclone?.color}15` }}
                      >
                        <div className="w-14 h-14 rounded-full text-white flex items-center justify-center shrink-0 shadow-clay" style={{ background: payloads.safety.cyclone?.color }}>
                          <ShieldAlert className="w-7 h-7" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[10px] tracking-[0.3em] uppercase font-bold text-ink-700">Cyclone warning level</div>
                          <div className="font-display text-xl italic text-ink-900 leading-tight">{payloads.safety.cyclone?.label}</div>
                          <div className="text-sm text-ink-700 italic mt-1 leading-snug">{payloads.safety.cyclone?.note}</div>
                        </div>
                      </section>

                      {/* Surf */}
                      <section data-testid="info-surf" className="rounded-2xl border-2 border-ocean-700/30 bg-sand-100/90 p-5 flex items-center gap-4">
                        <Waves className="w-12 h-12 text-ocean-700 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="text-[10px] tracking-[0.3em] uppercase font-bold text-ink-700">West-coast surf report</div>
                          <div className="font-display text-xl italic text-ink-900 leading-tight">{payloads.safety.surf?.size}</div>
                          <div className="text-sm text-ink-700 italic mt-1 leading-snug">{payloads.safety.surf?.note}</div>
                        </div>
                      </section>

                      {/* Beaches & rip currents */}
                      <section data-testid="info-beaches">
                        <h3 className="font-display text-lg italic text-ink-900 mb-3">Beaches — rip-current profile</h3>
                        <div className="space-y-2.5">
                          {(payloads.safety.beaches || []).map((b) => {
                            const r = RIP_STYLE[b.rip_profile] || RIP_STYLE.low;
                            return (
                              <div
                                key={b.beach_id}
                                data-testid={`info-beach-${b.beach_id}`}
                                data-rip-profile={b.rip_profile}
                                className="rounded-2xl border-2 border-jungle-700/15 bg-sand-100/90 p-3.5 flex items-start gap-3"
                              >
                                <div className={`w-10 h-10 rounded-xl ${r.bg} text-white flex items-center justify-center shrink-0 shadow-clay`}>
                                  <Anchor className="w-5 h-5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-display text-base italic text-ink-900 leading-tight">{b.name}</span>
                                    <span className={`rounded-full px-2 py-0.5 text-[9px] tracking-[0.2em] uppercase font-bold text-white ${r.bg}`}>{r.label}</span>
                                  </div>
                                  <div className="text-sm text-ink-700 mt-1.5 italic leading-snug">{b.note}</div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        <div className="mt-3 flex items-center gap-2 text-[10px] tracking-[0.2em] uppercase text-ink-700/80 font-bold">
                          <MapPin className="w-3 h-3" /> Cyclone & surf signals are auto-derived from Vacoas wind data
                        </div>
                      </section>
                    </>
                  )}
                </TabsContent>
              </div>
            </Tabs>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Stat({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="w-4 h-4 text-ocean-700" />
      <div>
        <div className="text-[10px] tracking-[0.25em] uppercase font-bold text-ink-700">{label}</div>
        <div className="font-display italic text-ink-900 leading-tight">{value}</div>
      </div>
    </div>
  );
}

function Loader({ label, testid }) {
  return (
    <div className="text-center py-14 text-ink-700 italic" data-testid={testid}>
      {label}
    </div>
  );
}

function ErrorBanner({ error }) {
  return (
    <div className="text-center py-14 text-sunset-600 italic" data-testid="info-center-error">
      Couldn&rsquo;t reach the station. {error}
    </div>
  );
}
