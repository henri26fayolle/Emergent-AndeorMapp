import { motion } from "framer-motion";
import { Waves, Mountain, Wind, Anchor, Landmark, Lock, MapPin, Plus, Minus, RotateCcw } from "lucide-react";
import { TransformWrapper, TransformComponent, useControls } from "react-zoom-pan-pinch";
import { playSelect } from "@/lib/sound";

const MAP_VIDEO = "/mauritius_map_loop.mp4";

// Coordinates calibrated to the new 16:9 isometric video frame (1920x1080).
// x/y are percentages of the video frame itself (NOT the viewport).
const POSITIONS = {
  "north-coast":     { x: 49, y: 8,  name: "North Coast",  icon: Waves,    teaser: "Sega night · Naïma" },
  "central-culture": { x: 42, y: 29, name: "Port Louis",   icon: Landmark, teaser: "Creole table · Marie" },
  "black-river":     { x: 33, y: 55, name: "Black River",  icon: Mountain, teaser: "Le Pouce sunrise · Akil" },
  "east-lagoons":    { x: 65, y: 67, name: "East Lagoons", icon: Anchor,   teaser: "Blue Bay snorkel · Sanjay" },
  "south-wild":      { x: 34, y: 71, name: "Le Morne",     icon: Wind,     teaser: "Kite sessions · Léa" },
};

export default function MapMauritius({ regions = [], unlocked = new Set(), onRegionClick, focusedQuest = null, focusedRegions = new Set(), focusedRemainingByRegion = {} }) {
  return (
    <div
      className="absolute inset-0 overflow-hidden"
      style={{ containerType: "size" }}
      data-testid="world-map-cover"
    >
      <TransformWrapper
        initialScale={1}
        minScale={1}
        maxScale={3}
        wheel={{ step: 0.18, smoothStep: 0.005 }}
        doubleClick={{ disabled: false, mode: "toggle", step: 1.5 }}
        panning={{ velocityDisabled: false }}
        limitToBounds={true}
        centerOnInit={true}
      >
        {({ zoomIn, zoomOut, resetTransform }) => (
          <>
            <TransformComponent
              wrapperStyle={{ width: "100%", height: "100%" }}
              contentStyle={{ width: "100%", height: "100%" }}
            >
              {/* 16:9 cover-fit inner container — video + pin overlay share this coord space */}
              <div
                className="absolute left-1/2 top-1/2"
                style={{
                  width: "max(100cqw, calc(100cqh * 16 / 9))",
                  height: "max(100cqh, calc(100cqw * 9 / 16))",
                  transform: "translate(-50%, -50%)",
                }}
              >
        <motion.video
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.9, ease: "easeOut" }}
          className="absolute inset-0 w-full h-full object-fill pointer-events-none select-none"
          draggable={false}
        >
          <source src="/mauritius_map_loop.webm" type="video/webm" />
          <source src={MAP_VIDEO} type="video/mp4" />
        </motion.video>

        {/* Region pins overlay — coordinates are % of the video frame */}
        {regions.map((r, i) => {
          const pos = POSITIONS[r.region_id] || { x: 50, y: 50, name: r.name, icon: MapPin, teaser: "" };
          const RegionIcon = pos.icon;
          const isUnlocked = unlocked.has(r.region_id);
          const isFocused = focusedRegions.has(r.region_id);
          const remaining = focusedRemainingByRegion[r.region_id] || 0;
          const themeHex = focusedQuest?.theme_hex || "#E8B241";
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
              {/* HOVER TOOLTIP — speech-bubble teaser */}
              <div
                className="absolute left-1/2 bottom-full mb-3 -translate-x-1/2 opacity-0 -translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 pointer-events-none"
                data-testid={`map-tooltip-${r.region_id}`}
              >
                <div className="relative bg-jungle-700 text-sand-100 rounded-2xl shadow-lift px-4 py-2 whitespace-nowrap">
                  <div className="font-display text-sm italic leading-tight">{pos.name}</div>
                  <div className="text-[10px] tracking-[0.2em] uppercase opacity-80 mt-0.5">{pos.teaser}</div>
                  {isFocused && focusedQuest && (
                    <div
                      className="text-[10px] tracking-[0.2em] uppercase mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-white"
                      style={{ background: themeHex }}
                    >
                      ★ {focusedQuest.title} · {remaining} left
                    </div>
                  )}
                  <span className="absolute left-1/2 -bottom-1.5 -translate-x-1/2 w-3 h-3 bg-jungle-700 rotate-45" />
                </div>
              </div>

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
                {isUnlocked && !isFocused && (
                  <span
                    aria-hidden
                    className="absolute -inset-6 rounded-full pointer-events-none"
                    style={{
                      background: "radial-gradient(circle, rgba(232,178,65,0.55) 0%, rgba(232,178,65,0.15) 45%, transparent 75%)",
                      animation: "pinGlow 2.6s ease-in-out infinite",
                    }}
                  />
                )}

                {/* FOCUSED-QUEST aura — theme-coloured pulse + ring + drifting sparkles */}
                {isFocused && (
                  <>
                    <span
                      aria-hidden
                      className="absolute -inset-10 rounded-full pointer-events-none"
                      data-testid={`map-focused-aura-${r.region_id}`}
                      style={{
                        background: `radial-gradient(circle, ${themeHex}88 0%, ${themeHex}33 40%, transparent 75%)`,
                        animation: "focusedPulse 2.4s ease-in-out infinite",
                      }}
                    />
                    <span
                      aria-hidden
                      className="absolute -inset-4 rounded-full pointer-events-none border-2"
                      style={{
                        borderColor: themeHex,
                        boxShadow: `0 0 22px 4px ${themeHex}66`,
                        animation: "focusedRing 3s ease-in-out infinite",
                      }}
                    />
                    {[0, 1, 2].map((k) => (
                      <span
                        key={k}
                        aria-hidden
                        className="absolute pointer-events-none"
                        style={{
                          left: "50%",
                          top: "50%",
                          width: 6,
                          height: 6,
                          marginLeft: -3,
                          marginTop: -3,
                          borderRadius: "50%",
                          background: "#F4E9C9",
                          boxShadow: `0 0 8px 2px ${themeHex}`,
                          animation: `sparkleOrbit${k} ${4 + k}s linear infinite`,
                        }}
                      />
                    ))}
                  </>
                )}

                {/* Pin head */}
                <div
                  className={`relative w-12 h-12 lg:w-14 lg:h-14 rounded-full flex items-center justify-center shadow-lift border-[3px] ${
                    isUnlocked
                      ? "bg-sunset-500 border-sand-100 text-white"
                      : "bg-sand-100 border-ink-900/40 border-dashed text-ink-700"
                  }`}
                  style={{
                    filter: isUnlocked ? "drop-shadow(0 6px 0 rgba(0,0,0,0.18))" : undefined,
                    ...(isFocused ? { boxShadow: `0 0 0 3px ${themeHex}, 0 8px 18px rgba(0,0,0,0.28)` } : {}),
                  }}
                >
                  {isUnlocked ? <RegionIcon className="w-5 h-5 lg:w-6 lg:h-6" /> : <Lock className="w-4 h-4 lg:w-5 lg:h-5" />}
                  {isUnlocked && !isFocused && (
                    <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-sun-500 ring-2 ring-sand-100 animate-pulse" />
                  )}
                  {isFocused && remaining > 0 && (
                    <span
                      className="absolute -bottom-1 -right-1 rounded-full text-[10px] font-bold tracking-wider w-5 h-5 flex items-center justify-center text-white"
                      style={{ background: themeHex, boxShadow: "0 2px 4px rgba(0,0,0,0.35)" }}
                      data-testid={`map-focused-count-${r.region_id}`}
                    >
                      {remaining}
                    </span>
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
              </div>
            </TransformComponent>

            {/* Zoom controls — bottom-right */}
            <div className="absolute bottom-6 right-6 z-30 flex flex-col gap-2" data-testid="map-zoom-controls">
              <button
                onClick={() => zoomIn()}
                aria-label="Zoom in"
                data-testid="map-zoom-in"
                className="w-11 h-11 rounded-full bg-sand-100/95 backdrop-blur text-jungle-700 flex items-center justify-center shadow-lift hover:bg-white border-2 border-jungle-700 transition-colors"
              >
                <Plus className="w-5 h-5" />
              </button>
              <button
                onClick={() => zoomOut()}
                aria-label="Zoom out"
                data-testid="map-zoom-out"
                className="w-11 h-11 rounded-full bg-sand-100/95 backdrop-blur text-jungle-700 flex items-center justify-center shadow-lift hover:bg-white border-2 border-jungle-700 transition-colors"
              >
                <Minus className="w-5 h-5" />
              </button>
              <button
                onClick={() => resetTransform()}
                aria-label="Reset zoom"
                data-testid="map-zoom-reset"
                className="w-11 h-11 rounded-full bg-sand-100/95 backdrop-blur text-jungle-700 flex items-center justify-center shadow-lift hover:bg-white border-2 border-jungle-700 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </>
        )}
      </TransformWrapper>

      <style>{`
        @keyframes fogPulse { 0%,100% { opacity: 0.85; transform: scale(0.95); } 50% { opacity: 0.5; transform: scale(1.1); } }
        @keyframes pinGlow { 0%,100% { opacity: 0.7; transform: scale(0.95); } 50% { opacity: 1; transform: scale(1.12); } }
        @keyframes focusedPulse { 0%,100% { opacity: 0.55; transform: scale(1); } 50% { opacity: 1; transform: scale(1.2); } }
        @keyframes focusedRing { 0%,100% { transform: scale(1); opacity: 0.85; } 50% { transform: scale(1.15); opacity: 1; } }
        @keyframes sparkleOrbit0 { from { transform: rotate(0deg) translate(28px) rotate(0deg); } to { transform: rotate(360deg) translate(28px) rotate(-360deg); } }
        @keyframes sparkleOrbit1 { from { transform: rotate(120deg) translate(32px) rotate(-120deg); } to { transform: rotate(480deg) translate(32px) rotate(-480deg); } }
        @keyframes sparkleOrbit2 { from { transform: rotate(240deg) translate(36px) rotate(-240deg); } to { transform: rotate(600deg) translate(36px) rotate(-600deg); } }
      `}</style>
    </div>
  );
}
