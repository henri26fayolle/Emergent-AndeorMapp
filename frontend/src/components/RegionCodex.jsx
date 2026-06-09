import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Headphones, BookOpen, Map, Play, Pause, Download, Loader2, Mountain, ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import axios from "axios";
import { API_BASE } from "@/lib/api";

const API = API_BASE;

function apiAssetUrl(url) {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith("/api/")) return `${API_BASE}${url.slice(4)}`;
  return `${API_BASE}${url.startsWith("/") ? "" : "/"}${url}`;
}

const TABS = [
  { id: "listen", label: "Listen", icon: Headphones },
  { id: "read",   label: "Read",   icon: BookOpen },
  { id: "gpx",    label: "Tracks", icon: Map },
];

function fmtTime(s) {
  if (!isFinite(s) || s < 0) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

export default function RegionCodex({ regionId, initialTab = "listen" }) {
  const [codex, setCodex] = useState(null);
  const [tab, setTab] = useState(initialTab);
  const [loading, setLoading] = useState(true);

  // Audio state
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [audioLoading, setAudioLoading] = useState(false);
  const [audioErr, setAudioErr] = useState(null);
  const [progress, setProgress] = useState(0); // seconds
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    axios.get(`${API}/codex/region/${regionId}`).then((r) => {
      if (!cancelled) {
        setCodex(r.data);
        setLoading(false);
      }
    }).catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [regionId]);

  // Stop audio when switching region
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
      }
    };
  }, [regionId]);

  const togglePlay = async () => {
    if (!codex?.audio_url) return;
    const el = audioRef.current;
    if (!el) return;
    if (playing) {
      el.pause();
      return;
    }
    if (!el.src) {
      el.src = apiAssetUrl(codex.audio_url);
      setAudioLoading(true);
      setAudioErr(null);
    }
    try {
      await el.play();
    } catch (e) {
      setAudioErr("Tap again to play");
      setAudioLoading(false);
    }
  };

  const seek = (pct) => {
    const el = audioRef.current;
    if (!el || !duration) return;
    el.currentTime = pct * duration;
  };

  if (loading) {
    return (
      <div className="rounded-3xl bg-sand-100/85 backdrop-blur p-6 text-ink-700 text-sm">
        Loading codex…
      </div>
    );
  }
  if (!codex) return null;

  const hasLore = !!(codex.lore_text || "").trim();
  const hasAudio = !!codex.audio_url;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut", delay: 0.15 }}
      data-testid="region-codex"
      className="rounded-[32px] overflow-hidden border-4 border-jungle-700 shadow-lift bg-[linear-gradient(135deg,#F8EFD8_0%,#F2E2BD_55%,#E9D49B_100%)] relative"
    >
      {/* Parchment grain */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none opacity-[0.18] mix-blend-multiply"
        style={{
          backgroundImage:
            "radial-gradient(rgba(122,90,38,0.5) 1px, transparent 1px)," +
            "radial-gradient(rgba(74,52,18,0.35) 1px, transparent 1px)",
          backgroundSize: "5px 5px, 11px 11px",
          backgroundPosition: "0 0, 2px 2px",
        }}
      />
      {/* Burnt edge ring */}
      <div aria-hidden className="absolute inset-0 pointer-events-none rounded-[28px] ring-1 ring-inset ring-amber-900/20" />

      <div className="relative p-5 lg:p-8">
        {/* Title */}
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <div className="text-[10px] tracking-[0.35em] uppercase text-amber-900/70 font-bold">
              Codex of An Deor
            </div>
            <h3
              className="font-display text-2xl lg:text-3xl text-ink-900 mt-1 leading-tight"
              data-testid="codex-title"
            >
              {codex.lore_title || codex.name}
            </h3>
            {codex.lore_summary && (
              <p className="text-ink-700 italic text-sm mt-2 max-w-xl">{codex.lore_summary}</p>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-5" role="tablist">
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                role="tab"
                aria-selected={active}
                data-testid={`codex-tab-${t.id}`}
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold tracking-[0.18em] uppercase transition-all border-2 ${
                  active
                    ? "bg-jungle-700 text-sand-100 border-jungle-700 shadow-clay"
                    : "bg-sand-100/70 text-ink-900 border-ink-900/15 hover:bg-sand-100"
                }`}
              >
                <Icon className="w-3.5 h-3.5" /> {t.label}
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        <div className="min-h-[140px]" data-testid={`codex-panel-${tab}`}>
          {tab === "listen" && (
            <div>
              {!hasAudio ? (
                <div className="text-ink-700 italic">No narration yet for this region.</div>
              ) : (
                <div className="rounded-3xl bg-jungle-700 text-sand-100 p-5 lg:p-6 flex items-center gap-4 lg:gap-6 relative overflow-hidden shadow-clay">
                  {/* Soundwave decoration */}
                  <div aria-hidden className="absolute inset-y-0 right-0 w-1/2 opacity-25 pointer-events-none">
                    <svg viewBox="0 0 200 60" preserveAspectRatio="none" className="w-full h-full">
                      {Array.from({ length: 40 }).map((_, i) => {
                        const h = 12 + Math.abs(Math.sin(i * 0.6) * 22) + (i % 4 === 0 ? 8 : 0);
                        return (
                          <rect
                            key={i}
                            x={i * 5}
                            y={(60 - h) / 2}
                            width="2"
                            height={h}
                            rx="1"
                            fill="#F4E9C9"
                          >
                            <animate
                              attributeName="height"
                              values={`${h};${h * 0.4};${h}`}
                              dur={`${1.2 + (i % 7) * 0.18}s`}
                              repeatCount="indefinite"
                            />
                          </rect>
                        );
                      })}
                    </svg>
                  </div>

                  <button
                    onClick={togglePlay}
                    data-testid="codex-audio-play"
                    aria-label={playing ? "Pause narration" : "Play narration"}
                    className="relative shrink-0 w-14 h-14 lg:w-16 lg:h-16 rounded-full bg-sunset-500 text-white flex items-center justify-center shadow-lift hover:bg-sunset-600 transition-colors"
                  >
                    {audioLoading ? (
                      <Loader2 className="w-6 h-6 animate-spin" />
                    ) : playing ? (
                      <Pause className="w-6 h-6" />
                    ) : (
                      <Play className="w-6 h-6 translate-x-0.5" />
                    )}
                  </button>

                  <div className="flex-1 relative">
                    <div className="font-display text-lg lg:text-xl mb-2">
                      {playing ? "Narrating…" : audioErr ? audioErr : "Sit back and listen"}
                    </div>
                    <button
                      onClick={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const pct = (e.clientX - rect.left) / rect.width;
                        seek(Math.max(0, Math.min(1, pct)));
                      }}
                      data-testid="codex-audio-progress"
                      className="block w-full h-2 rounded-full bg-sand-100/20 overflow-hidden cursor-pointer"
                      aria-label="Seek narration"
                    >
                      <div
                        className="h-full bg-sand-100 rounded-full transition-[width] duration-150"
                        style={{ width: duration ? `${(progress / duration) * 100}%` : "0%" }}
                      />
                    </button>
                    <div className="text-[10px] tracking-[0.25em] uppercase opacity-70 mt-1 flex justify-between">
                      <span>{fmtTime(progress)}</span>
                      <span>{fmtTime(duration)}</span>
                    </div>
                  </div>

                  <audio
                    ref={audioRef}
                    preload="none"
                    onLoadedMetadata={(e) => { setDuration(e.currentTarget.duration); setAudioLoading(false); }}
                    onCanPlay={() => setAudioLoading(false)}
                    onWaiting={() => setAudioLoading(true)}
                    onPlaying={() => { setPlaying(true); setAudioLoading(false); }}
                    onPause={() => setPlaying(false)}
                    onEnded={() => { setPlaying(false); setProgress(0); }}
                    onTimeUpdate={(e) => setProgress(e.currentTarget.currentTime)}
                    onError={() => { setAudioErr("Could not load audio"); setAudioLoading(false); }}
                  />
                </div>
              )}
            </div>
          )}

          {tab === "read" && (
            <div className="relative">
              {!hasLore ? (
                <div className="text-ink-700 italic">Lore is being written.</div>
              ) : (
                <div className="max-w-3xl text-sm lg:text-base text-ink-900 leading-relaxed">
                  <p className="first-letter:font-display first-letter:text-5xl lg:first-letter:text-6xl first-letter:float-left first-letter:mr-2 first-letter:leading-[0.85] first-letter:text-jungle-700">
                    {codex.lore_text}
                  </p>
                </div>
              )}
            </div>
          )}

          {tab === "gpx" && (
            <div>
              {(!codex.gpx_files || codex.gpx_files.length === 0) ? (
                <div className="text-ink-700 italic">
                  No GPX tracks uploaded for this region yet.
                  <div className="text-xs mt-2 opacity-70">
                    (Admin: upload .gpx files to a tour from the Admin page to make them appear here.)
                  </div>
                </div>
              ) : (
                <ul className="space-y-3" data-testid="codex-gpx-list">
                  {codex.gpx_files.map((g, i) => (
                    <li
                      key={`${g.tour_id}-${g.filename}`}
                      className="rounded-2xl bg-sand-100/80 border border-ink-900/10 p-4 flex items-center gap-4"
                      data-testid={`codex-gpx-${i}`}
                    >
                      <div className="w-11 h-11 shrink-0 rounded-full bg-jungle-700 text-sand-100 flex items-center justify-center">
                        <Mountain className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-display text-base lg:text-lg text-ink-900 leading-tight truncate">
                          {g.tour_name}
                        </div>
                        <div className="text-[10px] tracking-[0.25em] uppercase text-ink-700 opacity-80 mt-0.5 truncate">
                          {g.filename}
                        </div>
                        <div className="text-xs text-ink-700 mt-1 flex gap-3">
                          {typeof g.distance_km === "number" && (
                            <span className="inline-flex items-center gap-1">
                              <ArrowDownToLine className="w-3 h-3" /> {g.distance_km.toFixed(1)} km
                            </span>
                          )}
                          {typeof g.elevation_m === "number" && (
                            <span className="inline-flex items-center gap-1">
                              <ArrowUpFromLine className="w-3 h-3" /> {g.elevation_m} m gain
                            </span>
                          )}
                        </div>
                      </div>
                      <a
                        href={apiAssetUrl(g.url)}
                        download={g.filename}
                        data-testid={`codex-gpx-download-${i}`}
                        className="inline-flex items-center gap-2 rounded-full bg-sunset-500 hover:bg-sunset-600 text-white text-xs font-bold tracking-wider px-4 py-2 shadow-clay transition-colors"
                      >
                        <Download className="w-4 h-4" /> GPX
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
