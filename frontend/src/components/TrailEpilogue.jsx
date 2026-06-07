import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import html2canvas from "html2canvas";
import {
  Crown, Sparkles, ChevronRight, Footprints, Download, Share2, Volume2, Pause, Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { findAvatar } from "@/lib/avatars";
import { playChime, playClick, playUnlock } from "@/lib/sound";
import { resolveAudioContext, withAudioContext } from "@/lib/context";

const THEME_BG = {
  jungle: "from-[#0E3E2D] via-[#125538] to-[#1B6F4B]",
  ocean:  "from-[#053948] via-[#0A6A7E] to-[#0F8FA8]",
  sunset: "from-[#5A1A0E] via-[#9A3A1F] to-[#E27447]",
  sun:    "from-[#5C4017] via-[#A37522] to-[#E8B241]",
};

function useTypewriter(text, speed = 24, deps = []) {
  const [out, setOut] = useState("");
  const [done, setDone] = useState(false);
  useEffect(() => {
    queueMicrotask(() => { setOut(""); setDone(false); });
    if (!text) { queueMicrotask(() => setDone(true)); return undefined; }
    let i = 0;
    const id = setInterval(() => {
      i++;
      setOut(text.slice(0, i));
      if (i >= text.length) { clearInterval(id); setDone(true); }
    }, speed);
    return () => clearInterval(id);
  }, [text, ...deps]);
  return { out, done, finish: () => { setOut(text); setDone(true); } };
}

/**
 * Climactic cutscene shown when a self-guided trail is fully completed.
 * Props:
 *  - epilogue: {journey_id, title, subtitle, theme_color, theme_hex, title_earned,
 *               epilogue, stops, xp_gain, badge_unlocked, completed_at}
 *  - onClose
 *
 * Beats:
 *  0 — Ti Dodo farewell monologue (typewriter + auto TTS)
 *  1 — Title earned reveal (animated medal)
 *  2 — Trail Postcard (downloadable / shareable PNG via html2canvas)
 */
export default function TrailEpilogue({ epilogue, onClose }) {
  const { user } = useAuth();
  const [beat, setBeat] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [exporting, setExporting] = useState(false);
  const audioRef = useRef(null);
  const postcardRef = useRef(null);

  const lore = epilogue?.epilogue || "";
  const { out, done, finish } = useTypewriter(lore, 24, [epilogue?.journey_id]);

  // Sound cue + auto-play Ti Dodo's farewell narration once
  useEffect(() => {
    if (!epilogue) return;
    try { playChime(); } catch { /* noop */ }
    let cancelled = false;
    (async () => {
      const ctx = await resolveAudioContext();
      if (cancelled) return;
      const url = withAudioContext(
        `${api.defaults.baseURL}/self-guided/${epilogue.journey_id}/epilogue-audio`,
        ctx,
      );
      audioRef.current = new Audio();
      audioRef.current.preload = "auto";
      audioRef.current.src = url;
      audioRef.current.addEventListener("play",  () => setPlaying(true));
      audioRef.current.addEventListener("pause", () => setPlaying(false));
      audioRef.current.addEventListener("ended", () => setPlaying(false));
      audioRef.current.play().catch(() => { /* autoplay denied — user must tap */ });
    })();
    return () => {
      cancelled = true;
      if (audioRef.current) {
        try { audioRef.current.pause(); } catch { /* noop */ }
      }
    };
  }, [epilogue?.journey_id]);

  // Unlock chime on title-reveal beat
  useEffect(() => {
    if (beat === 1) { try { playUnlock(); } catch { /* noop */ } }
  }, [beat]);

  const togglePlay = () => {
    playClick();
    if (!audioRef.current) return;
    if (audioRef.current.paused) audioRef.current.play().catch(() => { /* noop */ });
    else audioRef.current.pause();
  };

  const advance = () => {
    playClick();
    if (beat === 0) { if (!done) { finish(); return; } setBeat(1); }
    else if (beat === 1) { setBeat(2); }
    else { onClose(); }
  };

  // Keyboard advance
  useEffect(() => {
    if (!epilogue) return;
    const onKey = (e) => {
      if (e.key === "Escape") { onClose(); return; }
      if (e.key === " " || e.key === "Enter" || e.key === "ArrowRight") {
        e.preventDefault();
        advance();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [beat, done, epilogue]);

  const exportPostcard = async () => {
    if (!postcardRef.current || exporting) return;
    setExporting(true);
    playClick();
    try {
      const canvas = await html2canvas(postcardRef.current, {
        backgroundColor: null,
        scale: 2,
        useCORS: true,
        logging: false,
      });
      canvas.toBlob((blob) => {
        if (!blob) { toast.error("Couldn't render postcard"); setExporting(false); return; }
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `an-deor__${epilogue.journey_id}__postcard.png`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        toast.success("Postcard saved to your device!");
        setExporting(false);
      }, "image/png");
    } catch (e) {
      toast.error("Couldn't render postcard");
      setExporting(false);
    }
  };

  const sharePostcard = async () => {
    if (!postcardRef.current) return;
    playClick();
    try {
      const canvas = await html2canvas(postcardRef.current, {
        backgroundColor: null, scale: 2, useCORS: true, logging: false,
      });
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        const file = new File([blob], `${epilogue.journey_id}-postcard.png`, { type: "image/png" });
        const shareText = `I just walked the ${epilogue.title} at An Deor 🇲🇺`;
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], text: shareText, title: epilogue.title });
        } else {
          // Fallback — copy text to clipboard so user can paste alongside the download
          try { await navigator.clipboard.writeText(shareText); toast.info("Caption copied · downloading postcard…"); } catch { /* noop */ }
          await exportPostcard();
        }
      }, "image/png");
    } catch {
      await exportPostcard();
    }
  };

  const dateStr = useMemo(() => {
    const completed = epilogue?.completed_at;
    if (!completed) return "today";
    const d = new Date(completed);
    return d.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
  }, [epilogue?.completed_at]);

  if (!epilogue) return null;

  const themeBg = THEME_BG[epilogue.theme_color] || THEME_BG.jungle;
  const themeHex = epilogue.theme_hex || "#1B6F4B";
  const playerName = user?.name || "Traveler";
  const avatar = user?.avatar ? findAvatar(user.avatar) : null;

  return (
    <AnimatePresence>
      <motion.div
        key={`trail-epi-${epilogue.journey_id}`}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        transition={{ duration: 0.55, ease: "easeOut" }}
        className="fixed inset-0 z-[125] flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
        data-testid={`trail-epi-${epilogue.journey_id}`}
      >
        <div className={`absolute inset-0 bg-gradient-to-br ${themeBg}`} />
        <div
          aria-hidden
          className="absolute inset-0 opacity-25 pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(rgba(255,255,255,0.85) 1px, transparent 1px), radial-gradient(rgba(255,255,255,0.45) 1px, transparent 1px)",
            backgroundSize: "28px 28px, 56px 56px",
            backgroundPosition: "0 0, 14px 14px",
          }}
        />

        {/* Skip */}
        <button
          onClick={() => { playClick(); onClose(); }}
          data-testid="trail-epi-skip"
          className="absolute top-4 right-4 z-10 px-3 py-1.5 rounded-full bg-white/15 hover:bg-white/25 backdrop-blur text-sand-100 text-[10px] font-bold tracking-[0.3em] uppercase transition-colors"
        >
          Skip →
        </button>

        <div className="relative max-w-3xl w-full text-center py-10">
          <AnimatePresence mode="wait">
            {beat === 0 && (
              <motion.button
                key="beat-mono"
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                onClick={advance}
                data-testid="trail-epi-mono"
                className="block w-full text-left"
              >
                <div className="text-[11px] tracking-[0.4em] uppercase text-sand-100/75 font-bold mb-3 inline-flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5" /> Trail complete
                </div>
                <div className="relative bg-sand-100 border-4 border-jungle-700 rounded-3xl shadow-lift p-7 lg:p-9">
                  <div className="absolute -top-4 left-7 bg-jungle-700 text-sand-100 px-4 py-1 rounded-full font-display text-sm tracking-wider">
                    Ti Dodo
                  </div>
                  <p className="font-display text-xl lg:text-2xl leading-snug text-ink-900 italic min-h-[6.5rem]">
                    &ldquo;{out}&rdquo;
                    <span className={`inline-block w-2.5 h-6 ml-1 align-middle bg-ink-900 ${done ? "opacity-0" : "animate-pulse"}`} />
                  </p>
                  <div className="mt-5 flex items-center justify-between text-xs tracking-[0.25em] uppercase text-ink-700">
                    <button
                      onClick={(e) => { e.stopPropagation(); togglePlay(); }}
                      data-testid="trail-epi-listen"
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-white"
                      style={{ background: themeHex }}
                    >
                      {playing ? <Pause className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                      {playing ? "Pause" : "Listen"}
                    </button>
                    <span className="flex items-center gap-1">
                      {done ? "Continue" : "Skip"} <kbd className="px-2 py-0.5 rounded bg-jungle-700 text-sand-100 text-[10px]">Space</kbd>
                      <ChevronRight className={`w-4 h-4 ${done ? "animate-pulse" : ""}`} />
                    </span>
                  </div>
                </div>
              </motion.button>
            )}

            {beat === 1 && (
              <motion.div
                key="beat-title"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="text-center"
                data-testid="trail-epi-title"
              >
                <motion.div
                  initial={{ scale: 0.4, rotate: -12, opacity: 0 }}
                  animate={{ scale: 1, rotate: 0, opacity: 1 }}
                  transition={{ duration: 0.7, ease: "backOut" }}
                  className="mx-auto w-32 h-32 rounded-full bg-sand-100 ring-8 ring-sand-100/30 flex items-center justify-center shadow-lift"
                  style={{ boxShadow: `0 0 60px 12px ${themeHex}88` }}
                >
                  <Footprints className="w-16 h-16" style={{ color: themeHex }} />
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5, duration: 0.5 }}
                  className="mt-6 inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-sand-100/15 backdrop-blur text-sand-100 text-[11px] font-bold tracking-[0.35em] uppercase"
                >
                  <Sparkles className="w-3.5 h-3.5" /> Title earned
                </motion.div>
                <motion.h2
                  initial={{ opacity: 0, y: 14, letterSpacing: "0.1em" }}
                  animate={{ opacity: 1, y: 0, letterSpacing: "0em" }}
                  transition={{ delay: 0.65, duration: 0.7 }}
                  className="mt-4 font-display text-5xl lg:text-6xl text-sand-100 italic"
                >
                  {epilogue.title_earned}
                </motion.h2>
                <motion.div
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  transition={{ delay: 1.1 }}
                  className="mt-3 text-sand-100/70 italic text-sm"
                >
                  — {epilogue.title} · {epilogue.subtitle} —
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.4, duration: 0.45 }}
                  className="mt-10"
                >
                  <Button
                    onClick={advance}
                    data-testid="trail-epi-claim"
                    className="rounded-full bg-sand-100 hover:bg-white text-jungle-700 font-bold tracking-[0.2em] uppercase px-7 h-12"
                  >
                    Take your postcard <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </motion.div>
              </motion.div>
            )}

            {beat === 2 && (
              <motion.div
                key="beat-postcard"
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.55, ease: "easeOut" }}
                className="text-left"
                data-testid="trail-epi-postcard"
              >
                <div className="text-[11px] tracking-[0.4em] uppercase text-sand-100/75 font-bold mb-4 text-center inline-flex items-center justify-center gap-2 w-full">
                  <Sparkles className="w-3.5 h-3.5" /> Your trail postcard
                </div>

                {/* The actual postcard captured by html2canvas. Fixed aspect for share-friendly export. */}
                <div className="mx-auto" style={{ maxWidth: 720 }}>
                  <div
                    ref={postcardRef}
                    style={{ width: 720, aspectRatio: "16 / 9", margin: "0 auto" }}
                    className="relative rounded-3xl overflow-hidden shadow-lift"
                  >
                    <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${themeHex} 0%, #102E25 110%)` }} />
                    <div
                      aria-hidden
                      className="absolute inset-0 opacity-20 pointer-events-none"
                      style={{ backgroundImage: "radial-gradient(rgba(255,255,255,0.85) 1px, transparent 1px)", backgroundSize: "18px 18px" }}
                    />
                    <div className="relative h-full w-full p-7 text-sand-100 flex flex-col justify-between">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="text-[10px] tracking-[0.45em] uppercase opacity-85 font-bold">An Deor · Mauritius</div>
                          <div className="font-display text-3xl italic mt-1">{epilogue.title}</div>
                          <div className="text-xs tracking-[0.25em] uppercase opacity-85 mt-0.5">{epilogue.subtitle}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-[10px] tracking-[0.4em] uppercase opacity-80 font-bold">Walked on</div>
                          <div className="font-display text-lg italic">{dateStr}</div>
                        </div>
                      </div>

                      <div className="flex items-end justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="text-[10px] tracking-[0.45em] uppercase opacity-85 font-bold mb-1">Stops conquered</div>
                          <ul className="space-y-1.5">
                            {(epilogue.stops || []).map((s) => (
                              <li key={s.stop_id} className="flex items-center gap-2 text-sm">
                                <Check className="w-4 h-4 shrink-0" />
                                <span className="font-display italic truncate">{s.name}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div className="text-right flex flex-col items-end gap-1.5">
                          <div className="w-16 h-16 rounded-full bg-sand-100/15 ring-4 ring-sand-100/30 flex items-center justify-center font-display text-2xl italic">
                            {(playerName[0] || "?").toUpperCase()}
                          </div>
                          <div className="font-display text-lg italic">{playerName}</div>
                          {avatar?.title && <div className="text-[10px] tracking-[0.3em] uppercase opacity-85">{avatar.title}</div>}
                          <div className="mt-2 inline-flex items-center gap-1 text-[10px] tracking-[0.35em] uppercase font-bold bg-sand-100/15 px-2 py-1 rounded-full">
                            <Footprints className="w-3 h-3" /> {epilogue.title_earned}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-6 flex flex-wrap gap-2 justify-center">
                  <Button
                    onClick={sharePostcard}
                    disabled={exporting}
                    data-testid="trail-epi-share"
                    className="rounded-full bg-sand-100 hover:bg-white text-jungle-700 font-bold tracking-[0.2em] uppercase px-6 h-11"
                  >
                    <Share2 className="w-4 h-4 mr-1" /> Share
                  </Button>
                  <Button
                    onClick={exportPostcard}
                    disabled={exporting}
                    data-testid="trail-epi-download"
                    className="rounded-full bg-sand-100/95 hover:bg-sand-100 text-jungle-700 font-bold tracking-[0.2em] uppercase px-6 h-11"
                  >
                    <Download className="w-4 h-4 mr-1" /> {exporting ? "Rendering…" : "Save PNG"}
                  </Button>
                  <Button
                    onClick={onClose}
                    variant="outline"
                    data-testid="trail-epi-close"
                    className="rounded-full border-sand-100/40 text-sand-100 hover:bg-sand-100/15 font-bold tracking-[0.2em] uppercase px-5 h-11"
                  >
                    Back to the map
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
