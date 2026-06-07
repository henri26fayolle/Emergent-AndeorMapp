import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

// Sand → sunset → jungle palette so the burst feels native to the parchment world.
const COLOURS = [
  "#E8B241", // sun-500
  "#E96A4A", // sunset-500
  "#F0C75E", // sand accent
  "#265448", // jungle-700
  "#0F8FA8", // ocean-500
  "#F1E4C0", // sand-100
];

const PARTICLE_COUNT = 36;

function makeParticles(seed = 0) {
  // Generate once; the burst is single-shot per trigger.
  return Array.from({ length: PARTICLE_COUNT }, (_, i) => {
    // Spread upward in a fan
    const angle = (-Math.PI / 2) + (Math.random() - 0.5) * (Math.PI * 0.95); // mostly upward
    const distance = 120 + Math.random() * 180; // px
    const dx = Math.cos(angle) * distance;
    const dy = Math.sin(angle) * distance;
    return {
      id: `p-${seed}-${i}`,
      dx,
      dy,
      rotate: (Math.random() - 0.5) * 540,
      size: 5 + Math.random() * 7,
      colour: COLOURS[(i + seed) % COLOURS.length],
      delay: Math.random() * 0.08,
      shape: i % 3, // 0 square, 1 circle, 2 rectangle (streamer)
      duration: 1.1 + Math.random() * 0.7,
    };
  });
}

/**
 * One-shot confetti burst — fires whenever `trigger` flips truthy.
 * Renders nothing once the animation completes. Pointer-events: none so it
 * never blocks the underlying UI (e.g. the Claim button beneath it).
 *
 * Props:
 *   - trigger:  flips truthy to fire (a counter / nonce works best)
 *   - origin:   "center" | "top" — where on the host the burst originates from
 */
export default function SagaConfetti({ trigger, origin = "center" }) {
  const [particles, setParticles] = useState([]);

  useEffect(() => {
    if (!trigger) return undefined;
    const next = makeParticles(trigger);
    queueMicrotask(() => setParticles(next));
    // Clear ~2s later so we never accumulate
    const t = setTimeout(() => queueMicrotask(() => setParticles([])), 2200);
    return () => clearTimeout(t);
  }, [trigger]);

  if (particles.length === 0) return null;

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden z-30"
      data-testid="saga-confetti"
    >
      <AnimatePresence>
        {particles.map((p) => (
          <motion.span
            key={p.id}
            initial={{ x: 0, y: 0, opacity: 0, rotate: 0, scale: 0.7 }}
            animate={{
              x:      [0, p.dx * 0.6, p.dx],
              y:      [0, p.dy * 0.55, p.dy + 220], // arc then gravity drop
              opacity: [0, 1, 1, 0],
              rotate:  [0, p.rotate * 0.4, p.rotate],
              scale:   [0.7, 1, 1, 0.9],
            }}
            transition={{
              duration: p.duration,
              delay: p.delay,
              ease: ["easeOut", "linear", "easeIn"],
              times: [0, 0.15, 0.7, 1],
            }}
            className="absolute"
            style={{
              left: "50%",
              top: origin === "top" ? "8%" : "50%",
              width: p.shape === 2 ? p.size * 2.2 : p.size,
              height: p.size,
              background: p.colour,
              borderRadius: p.shape === 1 ? "9999px" : p.shape === 2 ? "2px" : "3px",
              transform: "translate(-50%, -50%)",
              boxShadow: "0 1px 2px rgba(0,0,0,0.25)",
            }}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
