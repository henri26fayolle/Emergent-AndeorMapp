import { Lock, MapPin } from "lucide-react";

// Stylised hand-positioned Mauritius "regions" — playful game-map look (not geo-accurate)
const POSITIONS = {
  "north-coast": { x: 50, y: 12, name: "North" },
  "black-river": { x: 22, y: 50, name: "Black River" },
  "south-wild": { x: 36, y: 80, name: "Le Morne" },
  "east-lagoons": { x: 78, y: 55, name: "East Lagoons" },
  "central-culture": { x: 52, y: 50, name: "Port Louis" },
};

export default function MapMauritius({ regions = [], unlocked = new Set() }) {
  return (
    <div className="relative w-full overflow-hidden rounded-3xl border border-sand-300 shadow-clay">
      <div className="aspect-[4/3] sm:aspect-[16/9] topo-bg relative">
        {/* Island silhouette */}
        <svg viewBox="0 0 100 75" preserveAspectRatio="none" className="absolute inset-0 w-full h-full">
          <defs>
            <linearGradient id="land" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#3A7868" />
              <stop offset="1" stopColor="#265448" />
            </linearGradient>
          </defs>
          <path
            d="M50,5 C70,8 88,22 88,40 C90,55 78,70 60,72 C42,74 24,68 18,52 C12,38 18,22 30,12 C36,7 42,4 50,5 Z"
            fill="url(#land)"
            stroke="#1C4037"
            strokeWidth="0.5"
            opacity="0.95"
          />
          <path
            d="M50,5 C70,8 88,22 88,40 C90,55 78,70 60,72 C42,74 24,68 18,52 C12,38 18,22 30,12 C36,7 42,4 50,5 Z"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="0.3"
            strokeDasharray="0.6 1.5"
            opacity="0.5"
          />
        </svg>

        {/* Region pins */}
        {regions.map((r) => {
          const pos = POSITIONS[r.region_id] || { x: 50, y: 50, name: r.name };
          const isUnlocked = unlocked.has(r.region_id);
          return (
            <button
              key={r.region_id}
              data-testid={`map-region-${r.region_id}`}
              className="absolute -translate-x-1/2 -translate-y-1/2 group"
              style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
              title={r.name}
            >
              <div className={`relative flex flex-col items-center gap-2`}>
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lift transition-transform group-hover:scale-110 ${
                    isUnlocked ? "bg-sunset-500" : "bg-sand-100 border-2 border-dashed border-ink-700/40"
                  }`}
                >
                  {isUnlocked ? <MapPin className="w-5 h-5 text-white" /> : <Lock className="w-4 h-4 text-ink-700" />}
                </div>
                <div
                  className={`rounded-full px-3 py-1 text-xs font-bold tracking-wider uppercase whitespace-nowrap ${
                    isUnlocked ? "bg-white text-jungle-500 shadow-clay" : "bg-white/70 text-ink-700"
                  }`}
                >
                  {r.name}
                </div>
                {isUnlocked && (
                  <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-sun-500 animate-pulse" />
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
