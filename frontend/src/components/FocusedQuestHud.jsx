import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Flag, ChevronRight, Mountain, Droplet, Landmark, Compass } from "lucide-react";
import { api } from "@/lib/api";
import { playClick } from "@/lib/sound";
import useOverlayOpen from "@/hooks/useOverlayOpen";

const ICON_MAP = { Mountain, Droplet, Landmark, Compass };

// Each saga's coloured icon tile colour — pulled from the same palette as the
// MainQuests teaser cards so the HUD reads as the same family.
const THEME_TILE = {
  jungle: "bg-jungle-500 text-white",
  ocean:  "bg-ocean-500  text-white",
  sunset: "bg-sunset-500 text-white",
  sun:    "bg-sun-500    text-ink-900",
};

const THEME_BAR = {
  jungle: "bg-jungle-500",
  ocean:  "bg-ocean-500",
  sunset: "bg-sunset-500",
  sun:    "bg-sun-500",
};

/**
 * Floating Main-Quest HUD card — top-right of the viewport. Visible ONLY
 * when the player has a Focused saga in progress AND no blocking overlay
 * (Character Sheet, sub-maps, venue modal, cinematics) is mounted.
 *
 * Clicking it opens the Character Sheet on the Adventure tab via a custom
 * window event the AvatarHud listens for.
 */
export default function FocusedQuestHud() {
  const [quests, setQuests] = useState([]);
  const [tours, setTours] = useState([]);
  const overlayOpen = useOverlayOpen();

  const reload = useCallback(async () => {
    try {
      const [q, t] = await Promise.all([api.get("/main-quests"), api.get("/tours")]);
      setQuests(q.data || []);
      setTours(t.data || []);
    } catch { /* HUD is decorative — silent */ }
  }, []);

  useEffect(() => {
    reload();
    const onSignal = () => reload();
    window.addEventListener("focus", onSignal);
    window.addEventListener("andeor:notifications-refresh", onSignal);
    window.addEventListener("andeor:checkin-completed", onSignal);
    window.addEventListener("andeor:trail-completed", onSignal);
    return () => {
      window.removeEventListener("focus", onSignal);
      window.removeEventListener("andeor:notifications-refresh", onSignal);
      window.removeEventListener("andeor:checkin-completed", onSignal);
      window.removeEventListener("andeor:trail-completed", onSignal);
    };
  }, [reload]);

  const focused = quests.find((q) => q.focused && !q.completed);
  if (!focused) return null;

  const Icon = ICON_MAP[focused.icon] || Flag;
  const tile = THEME_TILE[focused.theme_color] || THEME_TILE.sunset;
  const bar = THEME_BAR[focused.theme_color] || THEME_BAR.sunset;
  const total = focused.progress?.total || 0;
  const done  = focused.progress?.completed || 0;
  const completedTours = focused.progress?.completed_tours || [];

  // Next un-completed tour in the saga
  const nextTourId = (focused.tour_ids || []).find((id) => !completedTours.includes(id));
  const nextTour = nextTourId ? tours.find((t) => t.tour_id === nextTourId) : null;
  const nextLabel = focused.completed
    ? "Saga complete — claim your reward"
    : nextTour
      ? `Next · ${nextTour.name}`
      : (done < total ? `Next stop · ${done + 1} / ${total}` : "Ready to claim");

  const segments = Array.from({ length: total || 1 }, (_, i) => i < done);

  const open = () => {
    playClick();
    window.dispatchEvent(new CustomEvent("andeor:open-character-sheet", { detail: { tab: "adventure" } }));
  };

  return (
    <AnimatePresence>
      {!overlayOpen && (
        <motion.button
          key="focused-quest-hud"
          initial={{ opacity: 0, x: 24, y: -8 }}
          animate={{ opacity: 1, x: 0, y: 0 }}
          exit={{ opacity: 0, x: 24, y: -8 }}
          transition={{ duration: 0.32, ease: "easeOut" }}
          onClick={open}
          data-testid="focused-quest-hud"
          aria-label={`Open Character Sheet — Focused saga: ${focused.title}`}
          className="fixed top-6 right-6 lg:top-8 lg:right-8 z-40 w-[19rem] max-w-[calc(100vw-2rem)] text-left group select-none"
        >
          <div
            className="relative rounded-2xl px-3.5 py-3 bg-[#0E1B26]/95 backdrop-blur-md text-sand-100 shadow-[0_18px_44px_-10px_rgba(0,0,0,0.55)] border border-white/8 hover:bg-[#13212E]/95 transition-colors"
            style={{ borderColor: "rgba(255,255,255,0.07)" }}
          >
            <div className="flex items-start gap-3">
              {/* Coloured icon tile */}
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 shadow-clay ${tile}`}>
                <Icon className="w-5 h-5" strokeWidth={2.25} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="text-[10px] tracking-[0.3em] uppercase font-bold text-sun-500">
                  Main Quest
                </div>
                <div className="font-display text-base lg:text-lg italic leading-tight mt-0.5 truncate">
                  {focused.title}
                </div>
              </div>

              <ChevronRight className="w-4 h-4 text-sand-100/55 mt-2 shrink-0 group-hover:translate-x-0.5 transition-transform" />
            </div>

            {/* Segmented progress bar */}
            <div className="mt-3 flex items-center gap-1.5" data-testid="focused-quest-hud-progress">
              {segments.map((on, i) => (
                <span
                  key={i}
                  className={`flex-1 h-1.5 rounded-full transition-colors duration-500 ${on ? bar : "bg-white/10"}`}
                />
              ))}
            </div>

            {/* Next stop hint */}
            <div className="mt-2 text-[12px] text-sand-100/70 leading-snug truncate" data-testid="focused-quest-hud-next">
              {nextLabel}
            </div>
          </div>
        </motion.button>
      )}
    </AnimatePresence>
  );
}
