import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import axios from "axios";
import { Headphones, BookOpen, Play, Pause, Loader2 } from "lucide-react";
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
];

function fmtTime(s) {
  if (!isFinite(s) || s < 0) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

export default function TourCodex({ tourId, initialTab = "listen" }) {
  const [data, setData] = useState(null);
  const [tab, setTab] = useState(initialTab);
  const [loading, setLoading] = useState(true);

  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [audioLoading, setAudioLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    axios.get(`${API}/codex/tour/${tourId}`).then((r) => {
      if (!cancelled) { setData(r.data); setLoading(false); }
    }).catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [tourId]);

  useEffect(() => {
    return () => {
      if (audioRef.current) { try { audioRef.current.pause(); audioRef.current.src = ""; } catch {} }
    };
  }, [tourId]);

  const togglePlay = async () => {
    if (!data?.audio_url) return;
    const el = audioRef.current; if (!el) return;
    if (playing) { el.pause(); return; }
    if (!el.src) {
      el.src = apiAssetUrl(data.audio_url);
      setAudioLoading(true);
    }
    try { await el.play(); } catch { setAudioLoading(false); }
  };

  const seek = (pct) => {
    const el = audioRef.current; if (!el || !duration) return;
    el.currentTime = pct * duration;
  };

  if (loading) {
    return <div className="rounded-3xl bg-sand-100/85 p-6 text-ink-700 text-sm">Loading codex…</div>;
  }
  if (!data) return null;

  const hasLore = !!(data.lore_text || "").trim();
  const hasAudio = !!data.audio_url;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      data-testid="tour-codex"
      className="rounded-[32px] overflow-hidden border-4 border-jungle-700 shadow-lift bg-[linear-gradient(135deg,#F8EFD8_0%,#F2E2BD_55%,#E9D49B_100%)] relative"
    >
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

      <div className="relative p-5 lg:p-7">
        <div className="text-[10px] tracking-[0.35em] uppercase text-amber-900/70 font-bold">Venue Codex</div>
        <h3 className="font-display text-xl lg:text-2xl text-ink-900 italic leading-tight mt-1">{data.lore_title || data.name}</h3>
        {data.lore_summary && <p className="text-ink-700 italic text-sm mt-2 max-w-xl">{data.lore_summary}</p>}

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mt-5 mb-4" role="tablist">
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                role="tab"
                aria-selected={active}
                data-testid={`tour-codex-tab-${t.id}`}
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

        {tab === "listen" && (
          <div>
            {!hasAudio ? (
              <div className="text-ink-700 italic">No narration yet for this venue.</div>
            ) : (
              <div className="rounded-2xl bg-jungle-700 text-sand-100 p-4 flex items-center gap-4 shadow-clay">
                <button
                  onClick={togglePlay}
                  data-testid="tour-codex-play"
                  className="w-12 h-12 rounded-full bg-sunset-500 text-white flex items-center justify-center hover:bg-sunset-600 transition-colors shrink-0"
                  aria-label={playing ? "Pause narration" : "Play narration"}
                >
                  {audioLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : playing ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 translate-x-0.5" />}
                </button>
                <div className="flex-1">
                  <div className="font-display text-sm italic mb-1.5">{playing ? "Narrating…" : "Tap to hear Ti Dodo"}</div>
                  <button
                    onClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const pct = (e.clientX - rect.left) / rect.width;
                      seek(Math.max(0, Math.min(1, pct)));
                    }}
                    className="block w-full h-1.5 rounded-full bg-sand-100/15 overflow-hidden cursor-pointer"
                  >
                    <div className="h-full bg-sand-100 rounded-full transition-[width] duration-150" style={{ width: duration ? `${(progress / duration) * 100}%` : "0%" }} />
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
                  onError={() => setAudioLoading(false)}
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
                  {data.lore_text}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
