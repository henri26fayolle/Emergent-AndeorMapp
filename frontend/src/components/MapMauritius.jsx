import { motion } from "framer-motion";
import { Waves, Mountain, Wind, Anchor, Landmark, Lock, MapPin } from "lucide-react";
import { playSelect } from "@/lib/sound";

// Stylised hand-positioned Mauritius regions — playful game-map look (not geo-accurate)
const POSITIONS = {
  "north-coast":     { x: 50, y: 16, name: "North Coast",   icon: Waves },
  "central-culture": { x: 52, y: 46, name: "Port Louis",    icon: Landmark },
  "black-river":     { x: 23, y: 55, name: "Black River",   icon: Mountain },
  "east-lagoons":    { x: 79, y: 58, name: "East Lagoons",  icon: Anchor },
  "south-wild":      { x: 38, y: 84, name: "Le Morne",      icon: Wind },
};

export default function MapMauritius({ regions = [], unlocked = new Set(), onRegionClick }) {
  return (
    <div className="relative w-full h-full">
      {/* Compass decoration */}
      <div className="absolute top-3 left-3 z-10 w-14 h-14 lg:w-16 lg:h-16 rounded-full bg-sand-100/90 border-2 border-jungle-700/30 flex items-center justify-center shadow-clay">
        <svg viewBox="0 0 40 40" className="w-9 h-9 text-jungle-700">
          <circle cx="20" cy="20" r="18" fill="none" stroke="currentColor" strokeWidth="1" />
          <polygon points="20,4 23,20 20,18 17,20" fill="#D46F4D" />
          <polygon points="20,36 17,20 20,22 23,20" fill="currentColor" />
          <text x="20" y="9" fontSize="6" textAnchor="middle" fill="currentColor" fontFamily="Cabinet Grotesk, sans-serif" fontWeight="800">N</text>
        </svg>
      </div>

      <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" className="w-full h-full">
        <defs>
          <radialGradient id="sea" cx="50%" cy="50%" r="65%">
            <stop offset="0" stopColor="#BFE4E8" stopOpacity="0.6" />
            <stop offset="0.7" stopColor="#006C7A" stopOpacity="0.35" />
            <stop offset="1" stopColor="#004B56" stopOpacity="0.5" />
          </radialGradient>
          <linearGradient id="land" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#5C9D86" />
            <stop offset="1" stopColor="#1C4037" />
          </linearGradient>
          <pattern id="trees" patternUnits="userSpaceOnUse" width="6" height="6">
            <circle cx="3" cy="3" r="0.7" fill="#102E25" opacity="0.35" />
          </pattern>
          <radialGradient id="fog" cx="50%" cy="50%" r="60%">
            <stop offset="0" stopColor="#102E25" stopOpacity="0.55" />
            <stop offset="0.6" stopColor="#102E25" stopOpacity="0.25" />
            <stop offset="1" stopColor="#102E25" stopOpacity="0" />
          </radialGradient>
          <filter id="landShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="0.8" />
          </filter>
        </defs>

        {/* Sea backdrop */}
        <rect x="0" y="0" width="100" height="100" fill="url(#sea)" />

        {/* Continuous ocean ripple rings (rotating slowly) */}
        <g opacity="0.45" stroke="#BFE4E8" fill="none" strokeWidth="0.2" style={{ transformOrigin: "50% 50%" }}>
          <g style={{ animation: "mapSpin 60s linear infinite", transformOrigin: "50% 50%", transformBox: "fill-box" }}>
            <circle cx="50" cy="50" r="42" strokeDasharray="0.6 1.5" />
          </g>
          <g style={{ animation: "mapSpinR 90s linear infinite", transformOrigin: "50% 50%", transformBox: "fill-box" }}>
            <circle cx="50" cy="50" r="46" strokeDasharray="0.4 2" />
          </g>
          <g style={{ animation: "mapSpin 120s linear infinite", transformOrigin: "50% 50%", transformBox: "fill-box" }}>
            <circle cx="50" cy="50" r="49" strokeDasharray="0.3 2.5" />
          </g>
        </g>

        {/* Pulsing inner rings */}
        <g fill="none" stroke="#FFFFFF" opacity="0.18">
          <circle cx="50" cy="50" r="40">
            <animate attributeName="r" values="40;48;40" dur="6s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.18;0;0.18" dur="6s" repeatCount="indefinite" />
          </circle>
        </g>

        {/* Island shadow */}
        <path
          d="M50,8 C72,11 90,25 90,42 C92,58 80,72 60,74 C42,76 24,70 18,54 C12,40 18,24 30,14 C36,9 42,7 50,8 Z"
          fill="rgba(0,0,0,0.25)"
          transform="translate(2,3)"
          filter="url(#landShadow)"
        />
        {/* Island main */}
        <path
          d="M50,8 C72,11 90,25 90,42 C92,58 80,72 60,74 C42,76 24,70 18,54 C12,40 18,24 30,14 C36,9 42,7 50,8 Z"
          fill="url(#land)"
          stroke="#102E25"
          strokeWidth="0.6"
        />
        {/* Tree dots over island */}
        <path
          d="M50,8 C72,11 90,25 90,42 C92,58 80,72 60,74 C42,76 24,70 18,54 C12,40 18,24 30,14 C36,9 42,7 50,8 Z"
          fill="url(#trees)"
        />
        {/* Beach rim */}
        <path
          d="M50,8 C72,11 90,25 90,42 C92,58 80,72 60,74 C42,76 24,70 18,54 C12,40 18,24 30,14 C36,9 42,7 50,8 Z"
          fill="none"
          stroke="#F2E2B6"
          strokeWidth="0.5"
          strokeOpacity="0.9"
        />
        {/* Reef dashes */}
        <path
          d="M50,4 C75,7 95,22 94,42 C96,60 82,77 60,80 C40,82 22,75 14,56 C8,40 14,22 28,10 C34,5 42,3 50,4 Z"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="0.25"
          strokeDasharray="0.5 1.6"
          opacity="0.45"
        />

        {/* Decorative peaks */}
        <path d="M36,80 L40,76 L44,80 Z" fill="#102E25" opacity="0.5" />
        <path d="M27,52 L30,46 L33,52 Z" fill="#102E25" opacity="0.55" />

        {/* Swaying palm trees on island */}
        {[
          { x: 70, y: 22, scale: 1.0, delay: 0 },
          { x: 25, y: 35, scale: 0.9, delay: 0.6 },
          { x: 80, y: 50, scale: 1.1, delay: 1.2 },
          { x: 32, y: 65, scale: 0.85, delay: 0.3 },
          { x: 62, y: 60, scale: 0.95, delay: 0.9 },
        ].map((p, i) => (
          <g key={i} transform={`translate(${p.x} ${p.y}) scale(${p.scale})`} style={{ transformOrigin: `${p.x}px ${p.y}px` }}>
            <g style={{ animation: `palmSway 3.4s ease-in-out ${p.delay}s infinite`, transformOrigin: "0 6px", transformBox: "fill-box" }}>
              {/* Trunk */}
              <rect x="-0.4" y="0" width="0.8" height="6" fill="#3A2317" rx="0.3" />
              {/* Fronds */}
              <path d="M0,-1 Q-4,-2 -5,1 Q-3,-1 0,0 Z" fill="#1C4037" />
              <path d="M0,-1 Q4,-2 5,1 Q3,-1 0,0 Z" fill="#1C4037" />
              <path d="M0,-1 Q-3,-4 -2,-6 Q0,-3 0,0 Z" fill="#265448" />
              <path d="M0,-1 Q3,-4 2,-6 Q0,-3 0,0 Z" fill="#265448" />
              <path d="M0,-1 Q-4,-3 -4,-4 Q-1,-2 0,0 Z" fill="#3A7868" />
              <path d="M0,-1 Q4,-3 4,-4 Q1,-2 0,0 Z" fill="#3A7868" />
              <circle cx="0" cy="-1" r="0.4" fill="#5C4327" />
            </g>
          </g>
        ))}
      </svg>

      {/* Region pins overlay */}
      {regions.map((r, i) => {
        const pos = POSITIONS[r.region_id] || { x: 50, y: 50, name: r.name, icon: MapPin };
        const RegionIcon = pos.icon;
        const isUnlocked = unlocked.has(r.region_id);
        return (
          <motion.button
            key={r.region_id}
            data-testid={`map-region-${r.region_id}`}
            onClick={() => { playSelect(); onRegionClick && onRegionClick(r); }}
            initial={{ opacity: 0, scale: 0.6, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ delay: 0.2 + i * 0.1, duration: 0.4, ease: "backOut" }}
            whileHover={{ scale: 1.08, y: -3 }}
            whileTap={{ scale: 0.94 }}
            className="absolute -translate-x-1/2 -translate-y-1/2 group"
            style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
            title={r.name}
          >
            <div className="relative flex flex-col items-center gap-2">
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
              <div
                className={`relative w-14 h-14 lg:w-16 lg:h-16 rounded-2xl flex items-center justify-center shadow-lift transition-transform border-4 ${
                  isUnlocked
                    ? "bg-sunset-500 border-sand-100 text-white"
                    : "bg-sand-100 border-ink-900/40 border-dashed text-ink-700"
                }`}
              >
                {isUnlocked ? <RegionIcon className="w-6 h-6" /> : <Lock className="w-5 h-5" />}
                {isUnlocked && (
                  <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 rounded-full bg-sun-500 ring-2 ring-sand-100 animate-pulse" />
                )}
              </div>
              <div
                className={`rounded-full px-3 py-1 text-[10px] font-bold tracking-[0.2em] uppercase whitespace-nowrap shadow-clay ${
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
        @keyframes palmSway { 0%,100% { transform: rotate(-3deg); } 50% { transform: rotate(3deg); } }
        @keyframes fogPulse { 0%,100% { opacity: 0.85; transform: scale(0.95); } 50% { opacity: 0.5; transform: scale(1.08); } }
      `}</style>
    </div>
  );
}
