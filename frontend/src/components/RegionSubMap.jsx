import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { ChevronLeft, MapPin, Sparkles, Footprints } from "lucide-react";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import { playOpenScene, playSelect, playClick } from "@/lib/sound";
import VenueModal from "@/components/VenueModal";
import AvatarHud from "@/components/AvatarHud";
import SelfGuidedModal from "@/components/SelfGuidedModal";
import SelfGuidedPinPreview from "@/components/SelfGuidedPinPreview";
import { api } from "@/lib/api";

/**
 * Reusable sub-map for any region with rich venue artwork.
 * Renders a zoom/pannable background + venue pins + venue modal.
 *
 * Props:
 *  - open, onClose
 *  - mapImage          — public path to the artwork PNG
 *  - title, subtitle   — banner copy (e.g. "Port Louis" / "Capital of An Deor")
 *  - subregion         — string ("port-louis" / "north-coast") — used to pick tours
 *  - tours             — array of all tours
 *  - tourIcons         — { [tour_id]: LucideIcon }   (fallback MapPin)
 *  - focusedQuest, focusedTourIds, profile — same as before
 *  - hudScope          — passed to AvatarHud (e.g. "port-louis" / "north-coast")
 *  - labelStrip        — optional function (tour_name) → display label (default: pass-through)
 *  - testIdPrefix      — string used to namespace data-testids (e.g. "port-louis" / "north-coast")
 */
export default function RegionSubMap({
  open,
  onClose,
  mapImage,
  title,
  subtitle,
  subregion,
  tours,
  tourIcons = {},
  focusedQuest,
  focusedTourIds,
  labelStrip = (n) => n,
  testIdPrefix = "region",
}) {
  const { refresh } = useAuth();
  const [openTourId, setOpenTourId] = useState(null);
  const [journeys, setJourneys] = useState([]);
  const [openJourneyId, setOpenJourneyId] = useState(null);
  // Per-pin popover preview — { journey_id, stop_id }
  const [openStop, setOpenStop] = useState(null);

  const refreshJourneys = () => {
    api.get("/self-guided")
      .then((r) => setJourneys((r.data || []).filter((j) => j.subregion === subregion)))
      .catch(() => { /* noop */ });
  };

  useEffect(() => {
    if (!open) return;
    api.get("/self-guided")
      .then((r) => setJourneys((r.data || []).filter((j) => j.subregion === subregion)))
      .catch(() => setJourneys([]));
  }, [open, subregion]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    playOpenScene();
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  const venueTours = tours.filter((t) => t.subregion === subregion);

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
        data-testid={`${testIdPrefix}-sub-map`}
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
                <motion.img
                  src={mapImage}
                  alt={title}
                  initial={{ scale: 1.08, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 1.0, ease: "easeOut" }}
                  className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none"
                  draggable={false}
                />
                <div className="absolute inset-0 bg-gradient-to-b from-black/15 via-transparent to-black/35 pointer-events-none" />

                {venueTours.map((t, i) => {
                  const Icon = tourIcons[t.tour_id] || MapPin;
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
                      data-testid={`${testIdPrefix}-pin-${t.tour_id}`}
                      title={t.name}
                    >
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
                        {isFocused && (
                          <>
                            <span
                              aria-hidden
                              className="absolute -inset-8 rounded-full pointer-events-none"
                              style={{ background: `radial-gradient(circle, ${themeHex}88 0%, ${themeHex}33 40%, transparent 75%)`, animation: "focusedPulse 2.4s ease-in-out infinite" }}
                            />
                            <span
                              aria-hidden
                              className="absolute -inset-3 rounded-full pointer-events-none border-2"
                              style={{ borderColor: themeHex, boxShadow: `0 0 18px 3px ${themeHex}77`, animation: "focusedRing 3s ease-in-out infinite" }}
                            />
                          </>
                        )}
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
                          {labelStrip(t.name)}
                        </div>
                      </div>
                    </motion.button>
                  );
                })}

                {/* Self-guided journey overlay — dashed route line + free POI pins */}
                {journeys.map((j) => {
                  const themeJ = j.theme_hex || "#0F8FA8";
                  const completed = new Set(j.progress?.completed_stops || []);
                  const polyPoints = j.stops.map((s) => `${s.city_x ?? 50},${s.city_y ?? 50}`).join(" ");
                  return (
                    <div key={j.journey_id} className="absolute inset-0 pointer-events-none">
                      {/* Dashed route line connecting stops */}
                      <svg
                        viewBox="0 0 100 100"
                        preserveAspectRatio="none"
                        className="absolute inset-0 w-full h-full"
                        aria-hidden
                      >
                        <polyline
                          points={polyPoints}
                          fill="none"
                          stroke={themeJ}
                          strokeWidth="0.45"
                          strokeDasharray="1.2 1"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          opacity="0.85"
                        />
                      </svg>
                      {/* Free POI pins */}
                      {j.stops.map((s, idx) => {
                        const x = s.city_x ?? 50;
                        const y = s.city_y ?? 50;
                        const done = completed.has(s.stop_id);
                        const isPreviewing = openStop?.journey_id === j.journey_id && openStop?.stop_id === s.stop_id;
                        return (
                          <motion.button
                            key={s.stop_id}
                            onClick={(e) => {
                              e.stopPropagation();
                              playSelect();
                              setOpenStop(isPreviewing ? null : { journey_id: j.journey_id, stop_id: s.stop_id });
                            }}
                            initial={{ opacity: 0, scale: 0.4 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.45 + idx * 0.07, duration: 0.35, ease: "backOut" }}
                            whileHover={{ scale: 1.18 }}
                            whileTap={{ scale: 0.92 }}
                            className="absolute -translate-x-1/2 -translate-y-1/2 group z-20 pointer-events-auto"
                            style={{ left: `${x}%`, top: `${y}%` }}
                            data-testid={`${testIdPrefix}-sg-stop-${s.stop_id}`}
                            title={s.name}
                          >
                            {/* Tooltip — hidden while the popover is open for this pin */}
                            {!isPreviewing && (
                              <div className="absolute left-1/2 bottom-full mb-2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                <div className="relative rounded-2xl shadow-lift px-3 py-1.5 whitespace-nowrap max-w-[16rem]" style={{ background: themeJ, color: "#FFF7E2" }}>
                                  <div className="font-display text-xs italic">{s.name}</div>
                                  <div className="text-[9px] tracking-[0.25em] uppercase opacity-85">{j.title} · stop {idx + 1}/{j.stops.length}</div>
                                </div>
                              </div>
                            )}
                            <div
                              className="w-7 h-7 lg:w-8 lg:h-8 rounded-full flex items-center justify-center border-2 border-dashed bg-sand-100/95 backdrop-blur"
                              style={{ borderColor: themeJ, boxShadow: done ? `0 0 0 2px ${themeJ}, 0 4px 10px rgba(0,0,0,0.3)` : "0 4px 10px rgba(0,0,0,0.25)" }}
                            >
                              <Footprints className="w-3.5 h-3.5" style={{ color: themeJ }} />
                            </div>
                            <div
                              className="absolute left-1/2 -translate-x-1/2 -bottom-4 rounded-full px-1.5 py-0.5 text-[8.5px] tracking-[0.2em] uppercase font-bold whitespace-nowrap shadow-clay"
                              style={{ background: themeJ, color: "#FFF7E2" }}
                            >
                              Free
                            </div>
                          </motion.button>
                        );
                      })}

                      {/* Per-pin popover — at most one open at a time, anchored within this journey's container */}
                      {openStop?.journey_id === j.journey_id && (() => {
                        const sIdx = j.stops.findIndex((s) => s.stop_id === openStop.stop_id);
                        if (sIdx < 0) return null;
                        const s = j.stops[sIdx];
                        return (
                          <SelfGuidedPinPreview
                            journey={j}
                            stop={s}
                            idx={sIdx}
                            themeHex={themeJ}
                            done={completed.has(s.stop_id)}
                            onClose={() => setOpenStop(null)}
                            onOpenFullJourney={() => { setOpenStop(null); setOpenJourneyId(j.journey_id); }}
                            onStarted={() => { refreshJourneys(); refresh && refresh(); }}
                          />
                        );
                      })()}
                    </div>
                  );
                })}
              </TransformComponent>

              <div className="absolute top-0 inset-x-0 z-30 p-5 lg:p-7 flex justify-between items-start gap-3 pointer-events-none">
                <button
                  onClick={() => { playClick(); onClose(); }}
                  data-testid={`${testIdPrefix}-back`}
                  className="inline-flex items-center gap-2 rounded-full bg-sand-100/95 backdrop-blur px-4 py-2 text-sm font-bold tracking-wider text-ink-900 hover:bg-white shadow-clay transition-colors pointer-events-auto"
                >
                  <ChevronLeft className="w-4 h-4" /> Back to map
                </button>
                <div className="text-right text-sand-100 pointer-events-auto">
                  <div className="font-display text-3xl lg:text-4xl drop-shadow [text-shadow:0_2px_10px_rgba(0,0,0,0.65)] italic">{title}</div>
                  <div className="text-[10px] tracking-[0.3em] uppercase mt-1 opacity-80">{subtitle}</div>
                </div>
              </div>

              {focusedQuest && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="absolute top-20 left-1/2 -translate-x-1/2 z-30 rounded-full px-4 py-2 text-sand-100 text-xs font-bold tracking-[0.2em] uppercase flex items-center gap-2 shadow-lift"
                  style={{ background: themeHex }}
                  data-testid={`${testIdPrefix}-focused-banner`}
                >
                  <Sparkles className="w-3.5 h-3.5" /> Focused · {focusedQuest.title}
                </motion.div>
              )}
            </>
          )}
        </TransformWrapper>

        <AvatarHud />

        <VenueModal
          open={!!openTourId}
          tourId={openTourId}
          focusedQuest={focusedQuest}
          isFocused={openTourId ? focusedTourIds?.has(openTourId) : false}
          onClose={() => setOpenTourId(null)}
          onBooked={() => refresh && refresh()}
        />

        {/* Self-guided journey modal — shown when a free POI pin is tapped */}
        <SelfGuidedModal
          open={!!openJourneyId}
          journeyId={openJourneyId}
          onClose={() => setOpenJourneyId(null)}
          onActivated={() => { /* HUD watches active_self_guided via /me/profile */ refresh && refresh(); }}
        />

        <style>{`
          @keyframes focusedPulse { 0%,100% { opacity: 0.55; transform: scale(1); } 50% { opacity: 1; transform: scale(1.2); } }
          @keyframes focusedRing { 0%,100% { transform: scale(1); opacity: 0.85; } 50% { transform: scale(1.15); opacity: 1; } }
        `}</style>
      </motion.div>
    </AnimatePresence>
  );
}
