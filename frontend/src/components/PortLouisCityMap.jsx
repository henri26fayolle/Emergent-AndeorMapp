import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import {
  ChevronLeft, MapPin, BookOpen, Utensils, Landmark, Church, Castle, Trophy, Sparkles, ChefHat,
} from "lucide-react";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import { playOpenScene, playSelect, playClick } from "@/lib/sound";
import VenueModal from "@/components/VenueModal";
import AvatarHud from "@/components/AvatarHud";

const PORT_LOUIS_MAP = "/port_louis_map.png";

const TOUR_ICON = {
  "t-pl-aapravasi-ghat": Landmark,
  "t-pl-blue-penny": BookOpen,
  "t-pl-central-market": Utensils,
  "t-pl-cathedral": Church,
  "t-pl-citadelle": Castle,
  "t-pl-champ-de-mars": Trophy,
  "t-creole-table": ChefHat,
};

export default function PortLouisCityMap({ open, onClose, tours, focusedQuest, focusedTourIds, profile }) {
  const { refresh } = useAuth();
  const [openTourId, setOpenTourId] = useState(null);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    playOpenScene();
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  const cityTours = tours.filter((t) => t.subregion === "port-louis");

  if (!open) return null;
  const themeHex = focusedQuest?.theme_hex || "#E8B241";

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.35 }}
        className="fixed inset-0 z-[70] overflow-hidden bg-jungle-700"
        data-testid="port-louis-city-map"
      >
        <TransformWrapper
          initialScale={1}
          minScale={1}
          maxScale={4}
          wheel={{ step: 0.18, smoothStep: 0.005 }}
          doubleClick={{ disabled: false, mode: "toggle", step: 1.8 }}
          panning={{ velocityDisabled: false }}
          limitToBounds={true}
          centerOnInit={true}
        >
          {() => (
            <>
              <TransformComponent
                wrapperStyle={{ width: "100%", height: "100%" }}
                contentStyle={{ width: "100%", height: "100%", position: "relative" }}
              >
                {/* The city artwork */}
                <motion.img
                  src={PORT_LOUIS_MAP}
                  alt="Port Louis"
                  initial={{ scale: 1.08, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 1.0, ease: "easeOut" }}
                  className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none"
                  draggable={false}
                />
                <div className="absolute inset-0 bg-gradient-to-b from-black/15 via-transparent to-black/35 pointer-events-none" />

                {/* Pins (inside TransformComponent so they zoom with the artwork) */}
                {cityTours.map((t, i) => {
                  const Icon = TOUR_ICON[t.tour_id] || MapPin;
                  const isFocused = focusedTourIds?.has(t.tour_id);
                  const x = t.city_x ?? 50;
                  const y = t.city_y ?? 50;
                  return (
                    <motion.button
                      key={t.tour_id}
                      onClick={(e) => { e.stopPropagation(); playSelect(); setOpenTourId(t.tour_id); }}
                      initial={{ opacity: 0, scale: 0.5, y: -8 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      transition={{ delay: 0.3 + i * 0.08, duration: 0.4, ease: "backOut" }}
                      whileHover={{ scale: 1.12, y: -4 }}
                      whileTap={{ scale: 0.94 }}
                      className="absolute -translate-x-1/2 -translate-y-full group z-20"
                      style={{ left: `${x}%`, top: `${y}%` }}
                      data-testid={`port-louis-pin-${t.tour_id}`}
                      title={t.name}
                    >
                      {/* Tooltip */}
                      <div className="absolute left-1/2 bottom-full mb-3 -translate-x-1/2 opacity-0 group-hover:opacity-100 -translate-y-1 group-hover:translate-y-0 transition-all pointer-events-none">
                        <div className="relative bg-jungle-700 text-sand-100 rounded-2xl shadow-lift px-4 py-2 whitespace-nowrap max-w-xs">
                          <div className="font-display text-sm italic">{t.name}</div>
                          <div className="text-[10px] tracking-[0.2em] uppercase opacity-80 mt-0.5">€{t.price} · +{t.xp_reward} XP</div>
                          {isFocused && (
                            <div className="text-[10px] tracking-[0.2em] uppercase mt-1 inline-block px-2 py-0.5 rounded-full text-white" style={{ background: themeHex }}>
                              ★ Quest tour
                            </div>
                          )}
                          <span className="absolute left-1/2 -bottom-1.5 -translate-x-1/2 w-3 h-3 bg-jungle-700 rotate-45" />
                        </div>
                      </div>

                      <div className="relative flex flex-col items-center gap-1.5">
                        {/* Focused aura */}
                        {isFocused && (
                          <>
                            <span
                              aria-hidden
                              className="absolute -inset-8 rounded-full pointer-events-none"
                              style={{
                                background: `radial-gradient(circle, ${themeHex}88 0%, ${themeHex}33 40%, transparent 75%)`,
                                animation: "focusedPulse 2.4s ease-in-out infinite",
                              }}
                            />
                            <span
                              aria-hidden
                              className="absolute -inset-3 rounded-full pointer-events-none border-2"
                              style={{ borderColor: themeHex, boxShadow: `0 0 18px 3px ${themeHex}77`, animation: "focusedRing 3s ease-in-out infinite" }}
                            />
                          </>
                        )}
                        {/* Pin head */}
                        <div
                          className="relative w-11 h-11 lg:w-12 lg:h-12 rounded-full flex items-center justify-center shadow-lift border-[3px] bg-sand-100 text-jungle-700"
                          style={{
                            ...(isFocused
                              ? { boxShadow: `0 0 0 3px ${themeHex}, 0 8px 18px rgba(0,0,0,0.35)` }
                              : { boxShadow: "0 6px 12px rgba(0,0,0,0.32)" }),
                            borderColor: isFocused ? themeHex : "#F8EFD8",
                          }}
                        >
                          <Icon className="w-5 h-5" />
                        </div>
                        <span aria-hidden className="w-0.5 h-2.5 bg-sand-100/80 drop-shadow" />
                        <div className="rounded-full px-2.5 py-0.5 text-[10px] font-bold tracking-[0.25em] uppercase whitespace-nowrap shadow-clay bg-sand-100 text-jungle-700 -mt-1">
                          {t.name.replace("Port Louis ", "").replace("(UNESCO)", "").trim()}
                        </div>
                      </div>
                    </motion.button>
                  );
                })}
              </TransformComponent>

              {/* Top bar (fixed — outside zoomable area) */}
              <div className="absolute top-0 inset-x-0 z-30 p-5 lg:p-7 flex justify-between items-start gap-3 pointer-events-none">
                <button
                  onClick={() => { playClick(); onClose(); }}
                  data-testid="port-louis-back"
                  className="inline-flex items-center gap-2 rounded-full bg-sand-100/95 backdrop-blur px-4 py-2 text-sm font-bold tracking-wider text-ink-900 hover:bg-white shadow-clay transition-colors pointer-events-auto"
                >
                  <ChevronLeft className="w-4 h-4" /> Back to map
                </button>
                <div className="text-right text-sand-100 pointer-events-auto">
                  <div className="font-display text-3xl lg:text-4xl drop-shadow [text-shadow:0_2px_10px_rgba(0,0,0,0.65)] italic">Port Louis</div>
                  <div className="text-[10px] tracking-[0.3em] uppercase mt-1 opacity-80">Capital of An Deor</div>
                </div>
              </div>

              {/* Focused-quest banner */}
              {focusedQuest && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="absolute top-20 left-1/2 -translate-x-1/2 z-30 rounded-full px-4 py-2 text-sand-100 text-xs font-bold tracking-[0.2em] uppercase flex items-center gap-2 shadow-lift"
                  style={{ background: themeHex }}
                  data-testid="port-louis-focused-banner"
                >
                  <Sparkles className="w-3.5 h-3.5" /> Focused · {focusedQuest.title}
                </motion.div>
              )}

              {/* Zoom controls removed — wheel, double-click, and pinch-zoom still work */}
            </>
          )}
        </TransformWrapper>

        {/* Floating Avatar HUD — same UX as world map but scoped to the city's venues */}
        <AvatarHud
          profile={profile}
          scope="port-louis"
          tours={cityTours}
        />

        {/* Rich venue modal — replaces the simple "Accept this quest?" dialog */}
        <VenueModal
          open={!!openTourId}
          tourId={openTourId}
          focusedQuest={focusedQuest}
          isFocused={openTourId ? focusedTourIds?.has(openTourId) : false}
          onClose={() => setOpenTourId(null)}
          onBooked={() => refresh && refresh()}
        />

        <style>{`
          @keyframes focusedPulse { 0%,100% { opacity: 0.55; transform: scale(1); } 50% { opacity: 1; transform: scale(1.2); } }
          @keyframes focusedRing { 0%,100% { transform: scale(1); opacity: 0.85; } 50% { transform: scale(1.15); opacity: 1; } }
        `}</style>
      </motion.div>
    </AnimatePresence>
  );
}
