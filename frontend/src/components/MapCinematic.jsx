import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * Full-screen cinematic that bridges the Prologue's final beat into the
 * world map. The video plays once, then cross-fades into the live map
 * already mounted beneath it.
 */
export default function MapCinematic({ onDone }) {
  const videoRef = useRef(null);
  const [fading, setFading] = useState(false);
  const [muted, setMuted] = useState(false);
  const finishedRef = useRef(false);

  const finish = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    setFading(true);
    // Wait for the fade-out before unmounting
    setTimeout(() => onDone && onDone(), 1100);
  };

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    // The user just clicked "Enter Mauritius" → that gesture lets us autoplay
    // with sound on most browsers. If the browser still refuses, retry muted
    // so the video at least plays.
    v.muted = false;
    v.volume = 0.7;
    const playPromise = v.play();
    if (playPromise && playPromise.catch) {
      playPromise.catch(() => {
        try {
          v.muted = true;
          setMuted(true);
          const p2 = v.play();
          if (p2 && p2.catch) p2.catch(() => finish());
        } catch { finish(); }
      });
    }
  }, []);

  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    if (!v.muted) v.volume = 0.7;
    setMuted(v.muted);
    // If we were paused after a failed unmuted autoplay, kick play again
    if (v.paused) { try { v.play(); } catch { /* noop */ } }
  };

  // Safety fallback — if `ended` never fires, hard-stop after 8 s
  useEffect(() => {
    const t = setTimeout(finish, 8000);
    return () => clearTimeout(t);
  }, []);

  return (
    <AnimatePresence>
      {!fading ? (
        <motion.div
          key="cinematic"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="fixed inset-0 z-[80] bg-black"
          data-testid="map-cinematic"
        >
          <video
            ref={videoRef}
            src="/prologue_to_map.mp4"
            autoPlay
            playsInline
            onEnded={finish}
            onError={finish}
            onClick={finish}
            className="absolute inset-0 w-full h-full object-cover cursor-pointer"
          />
          {/* Subtle vignette to match map ambient */}
          <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-transparent via-transparent to-jungle-700/40" />

          {/* Audio toggle (top-left) — useful if the browser blocked unmuted autoplay */}
          <button
            onClick={(e) => { e.stopPropagation(); toggleMute(); }}
            data-testid="map-cinematic-mute"
            aria-label={muted ? "Unmute" : "Mute"}
            className="absolute top-8 left-8 px-3.5 py-2 rounded-full bg-white/15 hover:bg-white/25 backdrop-blur text-sand-100 text-xs tracking-[0.3em] uppercase font-bold transition-colors"
          >
            {muted ? "♪ Sound on" : "Mute"}
          </button>

          {/* Skip hint */}
          <button
            onClick={finish}
            data-testid="map-cinematic-skip"
            className="absolute bottom-8 right-8 px-4 py-2 rounded-full bg-white/15 hover:bg-white/25 backdrop-blur text-sand-100 text-xs tracking-[0.3em] uppercase font-bold transition-colors"
          >
            Skip →
          </button>
        </motion.div>
      ) : (
        <motion.div
          key="cinematic-fade"
          initial={{ opacity: 1 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 1.0, ease: "easeInOut" }}
          className="fixed inset-0 z-[80] bg-black pointer-events-none"
        >
          <video
            src="/prologue_to_map.mp4"
            autoPlay={false}
            muted
            playsInline
            className="absolute inset-0 w-full h-full object-cover"
            ref={(el) => {
              // Freeze on the last frame for the fade so it visually blends
              if (el && videoRef.current) {
                try { el.currentTime = videoRef.current.duration || 0; } catch { /* noop */ }
              }
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
