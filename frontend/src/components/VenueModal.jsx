import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import { api, formatErr } from "@/lib/api";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Play, Pause, BookOpen, X, ChevronRight, Sparkles, Loader2, Clock, Coins, Award } from "lucide-react";
import { playSelect, playClick } from "@/lib/sound";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

function fmtTime(s) {
  if (!isFinite(s) || s < 0) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

/**
 * Rich venue modal — opens when a player taps a pin on a city sub-map.
 * - Compact mode: image, name, "accept the quest" action, play-audio button, read-more chip
 * - Expanded mode: wider modal with the full written lore alongside the actions
 */
export default function VenueModal({ open, tourId, focusedQuest, isFocused, onClose, onBooked }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [busy, setBusy] = useState(false);

  // Audio
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [audioLoading, setAudioLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    if (!open || !tourId) {
      setData(null);
      setExpanded(false);
      setPlaying(false);
      setProgress(0);
      setDuration(0);
      if (audioRef.current) {
        try { audioRef.current.pause(); audioRef.current.src = ""; } catch {}
      }
      return;
    }
    setLoading(true);
    axios.get(`${API}/codex/tour/${tourId}`).then((r) => {
      setData(r.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [open, tourId]);

  const togglePlay = async () => {
    if (!data?.audio_url) return;
    const el = audioRef.current;
    if (!el) return;
    if (playing) { el.pause(); return; }
    if (!el.src) {
      el.src = `${process.env.REACT_APP_BACKEND_URL}${data.audio_url}`;
      setAudioLoading(true);
    }
    try { await el.play(); } catch { setAudioLoading(false); }
  };

  const accept = async () => {
    if (!tourId) return;
    setBusy(true);
    try {
      await api.post("/bookings", { tour_id: tourId });
      playSelect();
      toast.success(`Quest accepted: "${data.name}".`);
      onBooked && onBooked();
      onClose();
    } catch (e) {
      toast.error(formatErr(e.response?.data?.detail) || e.message);
    } finally {
      setBusy(false);
    }
  };

  const themeHex = focusedQuest?.theme_hex || "#E27447";

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        data-testid="venue-modal"
        className={`p-0 overflow-hidden border-4 border-jungle-700 rounded-3xl transition-[max-width] duration-500 ease-out ${
          expanded ? "max-w-3xl" : "max-w-md"
        }`}
      >
        <DialogTitle className="sr-only">{data?.name || "Venue"}</DialogTitle>
        <DialogDescription className="sr-only">Venue details and quest booking.</DialogDescription>

        {loading || !data ? (
          <div className="p-10 text-center">
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-jungle-700" />
            <div className="mt-2 text-xs tracking-[0.25em] uppercase text-ink-700">Loading…</div>
          </div>
        ) : (
          <div className={`grid ${expanded ? "lg:grid-cols-[1fr_1.2fr]" : "grid-cols-1"} gap-0`}>
            {/* === LEFT (compact face) === */}
            <div className="bg-sand-100">
              {/* Hero image */}
              <div className="relative aspect-[4/3] overflow-hidden">
                {data.image ? (
                  <img src={data.image} alt={data.name} className="absolute inset-0 w-full h-full object-cover" draggable={false} />
                ) : (
                  <div className="absolute inset-0 bg-jungle-700" />
                )}
                <div className="absolute inset-0 bg-gradient-to-b from-black/15 via-transparent to-black/55" />
                {isFocused && focusedQuest && (
                  <div
                    className="absolute top-3 left-3 inline-flex items-center gap-1 rounded-full text-white text-[10px] font-bold tracking-[0.2em] uppercase px-2.5 py-1 shadow-clay"
                    style={{ background: themeHex }}
                    data-testid="venue-focused-pill"
                  >
                    <Sparkles className="w-3 h-3" /> Quest tour · {focusedQuest.title}
                  </div>
                )}
                <button
                  onClick={onClose}
                  data-testid="venue-close"
                  className="absolute top-3 right-3 w-8 h-8 rounded-full bg-sand-100/95 backdrop-blur text-jungle-700 flex items-center justify-center hover:bg-white shadow-clay"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
                {/* Title overlay */}
                <div className="absolute left-0 right-0 bottom-0 p-4 lg:p-5">
                  <div className="text-[10px] tracking-[0.3em] uppercase text-sand-100/85 font-bold">
                    {data.subregion ? "Port Louis · Venue" : (data.region || "Mauritius").replace(/-/g, " ")}
                  </div>
                  <h3 className="font-display text-2xl lg:text-3xl text-sand-100 italic drop-shadow leading-tight mt-0.5">{data.name}</h3>
                </div>
              </div>

              {/* Meta + actions */}
              <div className="p-5 lg:p-6">
                <div className="flex items-center gap-3 flex-wrap text-xs text-ink-700 mb-3">
                  <span className="inline-flex items-center gap-1"><Coins className="w-3.5 h-3.5 text-sunset-500" /> €{data.price}</span>
                  {data.duration && (
                    <span className="inline-flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-sunset-500" /> {data.duration}</span>
                  )}
                  <span className="inline-flex items-center gap-1"><Award className="w-3.5 h-3.5 text-sunset-500" /> +{data.xp_reward} XP</span>
                </div>

                {/* Description tagline */}
                {data.lore_summary && (
                  <p className="text-sm text-ink-900 italic mb-4">{data.lore_summary}</p>
                )}

                {/* Audio + Read row */}
                <div className="flex items-center gap-3 mb-4">
                  <button
                    onClick={togglePlay}
                    disabled={!data.audio_url}
                    data-testid="venue-play-audio"
                    className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 transition-colors shadow-lift ${
                      data.audio_url ? "bg-sunset-500 hover:bg-sunset-600 text-white" : "bg-sand-300 text-ink-700 cursor-not-allowed"
                    }`}
                    aria-label={playing ? "Pause narration" : "Play narration"}
                  >
                    {audioLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : playing ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 translate-x-0.5" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] tracking-[0.25em] uppercase font-bold text-ink-700 mb-1">
                      {playing ? "Listening to Ti Dodo" : data.audio_url ? "Audio sneak peek (1 min)" : "Audio coming soon"}
                    </div>
                    <button
                      onClick={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const pct = (e.clientX - rect.left) / rect.width;
                        if (audioRef.current && duration) audioRef.current.currentTime = pct * duration;
                      }}
                      data-testid="venue-audio-progress"
                      className="block w-full h-1.5 rounded-full bg-sand-300 overflow-hidden cursor-pointer"
                      aria-label="Seek narration"
                    >
                      <div className="h-full bg-jungle-700 rounded-full transition-[width] duration-150" style={{ width: duration ? `${(progress / duration) * 100}%` : "0%" }} />
                    </button>
                    <div className="flex justify-between text-[10px] tracking-[0.2em] uppercase opacity-75 mt-0.5">
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

                <Button
                  variant="outline"
                  onClick={() => { playClick(); setExpanded((v) => !v); }}
                  data-testid="venue-read-toggle"
                  disabled={!data.lore_text}
                  className="w-full rounded-full bg-jungle-700/5 border-jungle-700/30 text-jungle-700 font-bold tracking-wider hover:bg-jungle-700/10 mb-3"
                >
                  <BookOpen className="w-4 h-4 mr-2" />
                  {expanded ? "Hide the lore" : "Read the full lore"}
                </Button>

                <Button
                  onClick={accept}
                  disabled={busy}
                  data-testid="venue-accept"
                  className="w-full rounded-full bg-sunset-500 hover:bg-sunset-600 text-white font-bold tracking-wider shadow-clay"
                >
                  {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ChevronRight className="w-4 h-4 mr-1" />}
                  Accept the Quest
                </Button>
              </div>
            </div>

            {/* === RIGHT (expanded lore) === */}
            <AnimatePresence>
              {expanded && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.35, ease: "easeOut" }}
                  className="bg-[linear-gradient(135deg,#F8EFD8_0%,#F2E2BD_55%,#E9D49B_100%)] border-l-4 border-jungle-700 p-6 lg:p-8 max-h-[80vh] overflow-y-auto relative"
                  data-testid="venue-lore-panel"
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
                  <div className="relative">
                    <div className="text-[10px] tracking-[0.35em] uppercase text-amber-900/80 font-bold">From the Codex</div>
                    <h4 className="font-display text-2xl text-ink-900 italic leading-tight mt-1 mb-4">
                      {data.lore_title || data.name}
                    </h4>
                    <p className="text-ink-900 text-[15px] leading-relaxed first-letter:font-display first-letter:text-5xl first-letter:float-left first-letter:mr-2 first-letter:leading-[0.85] first-letter:text-jungle-700">
                      {data.lore_text}
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
