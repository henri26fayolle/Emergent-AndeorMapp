import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Compass, Download, Play, MapPin, Check, Lock, Sparkles, Footprints } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { api, formatErr } from "@/lib/api";
import { toast } from "sonner";
import { playClick, playChime } from "@/lib/sound";

const THEME = {
  jungle: "#1B6F4B",
  ocean:  "#0F8FA8",
  sunset: "#E27447",
  sun:    "#E8B241",
};

export default function SelfGuidedModal({ open, journeyId, onClose, onActivated }) {
  const [j, setJ] = useState(null);
  const [busy, setBusy] = useState(false);

  // Defer state writes via queueMicrotask so they don't happen synchronously during the
  // effect run (satisfies react-hooks/set-state-in-effect).
  useEffect(() => {
    if (!open || !journeyId) return;
    queueMicrotask(() => setJ(null));
    api.get(`/self-guided/${journeyId}`).then((r) => setJ(r.data)).catch(() => { /* noop */ });
  }, [open, journeyId]);

  if (!open) return null;

  const themeHex = THEME[j?.theme_color] || "#1B6F4B";
  const completed = new Set(j?.progress?.completed_stops || []);
  const finished = j?.progress?.finished;
  const started = j?.progress?.started;

  const start = async () => {
    setBusy(true);
    try {
      await api.post(`/self-guided/${journeyId}/start`);
      playChime();
      toast.success(`On the trail · ${j.title}`);
      window.dispatchEvent(new CustomEvent("andeor:self-guided-changed"));
      onActivated && onActivated(journeyId);
      onClose();
    } catch (e) {
      toast.error(formatErr(e.response?.data?.detail) || e.message);
    } finally {
      setBusy(false);
    }
  };

  const downloadGpx = async () => {
    playClick();
    // Open via XHR to use authenticated cookies, then trigger save
    const url = `${api.defaults.baseURL}/self-guided/${journeyId}/gpx`;
    try {
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("GPX fetch failed");
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${journeyId}.gpx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      toast.success("GPX downloaded — happy trails!");
    } catch (e) {
      toast.error("Couldn't download GPX");
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="fixed inset-0 z-[95] flex items-center justify-center p-4 sm:p-6"
        onClick={onClose}
        data-testid={`self-guided-modal-${journeyId}`}
      >
        <div className="absolute inset-0 bg-jungle-700/75 backdrop-blur-sm" />
        <motion.div
          initial={{ opacity: 0, y: 22, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 14, scale: 0.98 }}
          transition={{ duration: 0.32, ease: "easeOut" }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-2xl max-h-[88vh] flex flex-col bg-sand-100 border-4 border-jungle-700 rounded-3xl shadow-lift overflow-hidden"
        >
          {/* Header */}
          <div
            className="relative shrink-0 px-6 py-5 text-sand-100"
            style={{ background: `linear-gradient(135deg, ${themeHex} 0%, #102E25 110%)` }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-sand-100/15 backdrop-blur text-[10px] tracking-[0.3em] uppercase font-bold mb-2">
                  <Footprints className="w-3 h-3" /> Self-guided · Free
                </div>
                {j ? (
                  <>
                    <h2 className="font-display text-2xl lg:text-3xl italic leading-tight">{j.title}</h2>
                    <p className="text-xs lg:text-sm opacity-85 italic mt-1">{j.subtitle}</p>
                  </>
                ) : (
                  <div className="h-12 bg-sand-100/15 rounded animate-pulse" />
                )}
              </div>
              <button
                onClick={onClose}
                aria-label="Close"
                data-testid="self-guided-close"
                className="shrink-0 w-9 h-9 rounded-full bg-sand-100/15 hover:bg-sand-100/25 backdrop-blur flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="overflow-y-auto flex-1 px-6 py-5 paper-bg">
            {!j ? (
              <div className="text-center text-ink-700 py-8">Loading…</div>
            ) : (
              <>
                <p className="italic text-ink-700 leading-relaxed text-sm lg:text-base mb-5">
                  &ldquo;{j.lore_intro}&rdquo;
                </p>

                {/* Progress strip */}
                <div className="flex items-center gap-3 mb-5">
                  <div className="text-[10px] tracking-[0.3em] uppercase text-ink-700 font-bold tabular-nums">
                    {j.progress.completed}/{j.progress.total} stops
                  </div>
                  <div className="flex-1 h-1.5 rounded-full bg-sand-300 overflow-hidden">
                    <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${j.progress.percent}%`, background: themeHex }} />
                  </div>
                  <div className="text-[10px] tracking-[0.3em] uppercase text-ink-700 font-bold">{j.progress.percent}%</div>
                </div>

                {/* Stops list */}
                <ol className="space-y-2 mb-6">
                  {j.stops.map((s, i) => {
                    const done = completed.has(s.stop_id);
                    return (
                      <li
                        key={s.stop_id}
                        data-testid={`self-guided-stop-${s.stop_id}`}
                        className={`flex items-start gap-3 rounded-2xl border-2 px-3 py-3 ${done ? "border-jungle-500 bg-jungle-500/10" : "border-dashed border-ink-900/20 bg-white/60"}`}
                      >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${done ? "bg-jungle-500 text-white" : "bg-sand-200 text-ink-700"}`}>
                          {done ? <Check className="w-4 h-4" /> : <span className="text-xs font-bold tabular-nums">{i + 1}</span>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-display text-base italic leading-tight">{s.name}</div>
                          {done ? (
                            <div className="text-xs text-ink-700 mt-1 leading-relaxed">{s.lore}</div>
                          ) : (
                            <div className="text-[11px] text-ink-700/70 italic mt-0.5 inline-flex items-center gap-1">
                              <Lock className="w-3 h-3" /> Tap &ldquo;I&apos;m here&rdquo; on the trail to unlock
                            </div>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ol>

                {/* Reward summary */}
                <div className="flex items-center gap-2 flex-wrap mb-5">
                  <Badge className="rounded-full bg-sunset-500 text-white">+{j.xp_reward} XP on completion</Badge>
                  {j.badge_id && <Badge variant="outline" className="rounded-full border-jungle-700/30 text-jungle-700"><Sparkles className="w-3 h-3 mr-1" />Free badge</Badge>}
                  {finished && <Badge className="rounded-full bg-jungle-500 text-white">Completed</Badge>}
                </div>

                {/* CTAs */}
                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={start}
                    disabled={busy || finished}
                    data-testid="self-guided-start"
                    className="rounded-full bg-jungle-700 hover:bg-jungle-600 text-sand-100 font-bold tracking-wider px-6 h-11"
                  >
                    <Play className="w-4 h-4 mr-1" /> {started ? "Continue on the trail" : "Start the journey"}
                  </Button>
                  <Button
                    onClick={downloadGpx}
                    variant="outline"
                    data-testid="self-guided-gpx"
                    className="rounded-full px-5 h-11"
                  >
                    <Download className="w-4 h-4 mr-1" /> Download GPX
                  </Button>
                </div>
              </>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
