import { motion } from "framer-motion";
import { Waves, Mountain, Wind, Anchor, Landmark, Lock, MapPin } from "lucide-react";

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
          <filter id="landShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="0.8" />
          </filter>
        </defs>

        {/* Sea backdrop */}
        <rect x="0" y="0" width="100" height="100" fill="url(#sea)" />
        {/* Ocean ripple rings */}
        <g opacity="0.4" stroke="#BFE4E8" fill="none" strokeWidth="0.2">
          <circle cx="50" cy="50" r="42" strokeDasharray="0.6 1.5" />
          <circle cx="50" cy="50" r="46" strokeDasharray="0.4 2" />
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

        {/* Le Morne ridge marker */}
        <path d="M36,80 L40,76 L44,80 Z" fill="#102E25" opacity="0.5" />
        {/* Le Pouce peak hint */}
        <path d="M27,52 L30,46 L33,52 Z" fill="#102E25" opacity="0.55" />
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
            onClick={() => onRegionClick && onRegionClick(r)}
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
    </div>
  );
}
