import { motion } from "framer-motion";
import { Waves, Mountain, Wind, Anchor, Landmark, Lock, MapPin } from "lucide-react";
import { playSelect } from "@/lib/sound";

const MAP_IMG = "https://customer-assets.emergentagent.com/job_explore-earn-5/artifacts/u2e8zjyp_mauritius-map-design-in-progress.png";

// Coordinates calibrated to the isometric illustration.
// x/y are percentages of the image container.
const POSITIONS = {
  "north-coast":     { x: 60, y: 22, name: "North Coast",  icon: Waves,    short: "North" },
  "central-culture": { x: 56, y: 64, name: "Port Louis",   icon: Landmark, short: "Centre" },
  "black-river":     { x: 41, y: 58, name: "Black River",  icon: Mountain, short: "Gorges" },
  "east-lagoons":    { x: 74, y: 50, name: "East Lagoons", icon: Anchor,   short: "East" },
  "south-wild":      { x: 25, y: 82, name: "Le Morne",     icon: Wind,     short: "South" },
};

export default function MapMauritius({ regions = [], unlocked = new Set(), onRegionClick }) {
  return (
    <div className="relative w-full h-full">
      {/* Compass decoration */}
      <div className="absolute top-3 left-3 z-30 w-14 h-14 lg:w-16 lg:h-16 rounded-full bg-sand-100/90 border-2 border-jungle-700/30 flex items-center justify-center shadow-clay">
        <svg viewBox="0 0 40 40" className="w-9 h-9 text-jungle-700">
          <circle cx="20" cy="20" r="18" fill="none" stroke="currentColor" strokeWidth="1" />
          <polygon points="20,4 23,20 20,18 17,20" fill="#D46F4D" />
          <polygon points="20,36 17,20 20,22 23,20" fill="currentColor" />
          <text x="20" y="9" fontSize="6" textAnchor="middle" fill="currentColor" fontFamily="Cabinet Grotesk, sans-serif" fontWeight="800">N</text>
        </svg>
      </div>

      {/* Animated ocean rings + the isometric island artwork */}
      <div className="absolute inset-0">
        <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 w-full h-full" aria-hidden>
          <defs>
            <radialGradient id="sea" cx="50%" cy="50%" r="65%">
              <stop offset="0" stopColor="#7BC7D9" stopOpacity="0.15" />
              <stop offset="1" stopColor="#006C7A" stopOpacity="0" />
            </radialGradient>
          </defs>
          <rect x="0" y="0" width="100" height="100" fill="url(#sea)" />
          <g opacity="0.55" stroke="#FFFFFF" fill="none" strokeWidth="0.18">
            <g style={{ animation: "mapSpin 80s linear infinite", transformOrigin: "50% 50%", transformBox: "fill-box" }}>
              <circle cx="50" cy="50" r="46" strokeDasharray="0.5 1.6" />
            </g>
            <g style={{ animation: "mapSpinR 120s linear infinite", transformOrigin: "50% 50%", transformBox: "fill-box" }}>
              <circle cx="50" cy="50" r="49" strokeDasharray="0.3 2.2" />
            </g>
          </g>
          <g fill="none" stroke="#FFFFFF" opacity="0.22">
            <circle cx="50" cy="50" r="42">
              <animate attributeName="r" values="42;48;42" dur="7s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.22;0;0.22" dur="7s" repeatCount="indefinite" />
            </circle>
          </g>
        </svg>

        {/* The isometric Mauritius illustration */}
        <motion.img
          src={MAP_IMG}
          alt="Mauritius"
          initial={{ opacity: 0, scale: 1.06, y: 6 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 1.0, ease: "easeOut" }}
          className="absolute inset-0 w-full h-full object-contain pointer-events-none select-none"
          draggable={false}
          style={{ filter: "drop-shadow(0 25px 35px rgba(0,40,60,0.45))" }}
        />
      </div>

      {/* Region pins overlay */}
      {regions.map((r, i) => {
        const pos = POSITIONS[r.region_id] || { x: 50, y: 50, name: r.name, icon: MapPin, short: r.name };
        const RegionIcon = pos.icon;
        const isUnlocked = unlocked.has(r.region_id);
        return (
          <motion.button
            key={r.region_id}
            data-testid={`map-region-${r.region_id}`}
            onClick={() => { playSelect(); onRegionClick && onRegionClick(r); }}
            initial={{ opacity: 0, scale: 0.5, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ delay: 0.25 + i * 0.1, duration: 0.45, ease: "backOut" }}
            whileHover={{ scale: 1.1, y: -4 }}
            whileTap={{ scale: 0.94 }}
            className="absolute -translate-x-1/2 -translate-y-full group z-20"
            style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
            title={pos.name}
          >
            <div className="relative flex flex-col items-center gap-1.5">
              {/* Fog-of-war pulse for locked pins */}
              {!isUnlocked && (
                <span
                  aria-hidden
                  className="absolute -inset-8 rounded-full pointer-events-none"
                  style={{
                    background: "radial-gradient(circle, rgba(16,46,37,0.7) 0%, rgba(16,46,37,0.35) 45%, transparent 78%)",
                    filter: "blur(1.5px)",
                    animation: "fogPulse 4s ease-in-out infinite",
                  }}
                />
              )}

              {/* Glow halo for unlocked pins */}
              {isUnlocked && (
                <span
                  aria-hidden
                  className="absolute -inset-6 rounded-full pointer-events-none"
                  style={{
                    background: "radial-gradient(circle, rgba(232,178,65,0.55) 0%, rgba(232,178,65,0.15) 45%, transparent 75%)",
                    animation: "pinGlow 2.6s ease-in-out infinite",
                  }}
                />
              )}

              {/* Pin head (teardrop-style) */}
              <div
                className={`relative w-12 h-12 lg:w-14 lg:h-14 rounded-full flex items-center justify-center shadow-lift border-[3px] ${
                  isUnlocked
                    ? "bg-sunset-500 border-sand-100 text-white"
                    : "bg-sand-100 border-ink-900/40 border-dashed text-ink-700"
                }`}
                style={{ filter: isUnlocked ? "drop-shadow(0 6px 0 rgba(0,0,0,0.18))" : undefined }}
              >
                {isUnlocked ? <RegionIcon className="w-5 h-5 lg:w-6 lg:h-6" /> : <Lock className="w-4 h-4 lg:w-5 lg:h-5" />}
                {isUnlocked && (
                  <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-sun-500 ring-2 ring-sand-100 animate-pulse" />
                )}
              </div>

              {/* Pin stem */}
              <span aria-hidden className={`w-0.5 h-3 ${isUnlocked ? "bg-sunset-500" : "bg-ink-900/40"}`} />

              {/* Label */}
              <div
                className={`rounded-full px-3 py-1 text-[10px] font-bold tracking-[0.25em] uppercase whitespace-nowrap shadow-clay -mt-1 ${
                  isUnlocked ? "bg-sand-100 text-jungle-700" : "bg-sand-100/85 text-ink-700"
                }`}
              >
                {pos.name}
              </div>
            </div>
          </motion.button>
        );
      })}

      <style>{`
        @keyframes mapSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes mapSpinR { from { transform: rotate(0deg); } to { transform: rotate(-360deg); } }
        @keyframes fogPulse { 0%,100% { opacity: 0.85; transform: scale(0.95); } 50% { opacity: 0.5; transform: scale(1.1); } }
        @keyframes pinGlow { 0%,100% { opacity: 0.7; transform: scale(0.95); } 50% { opacity: 1; transform: scale(1.12); } }
      `}</style>
    </div>
  );
}
