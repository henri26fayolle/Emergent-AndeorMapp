import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import MainQuests from "@/pages/MainQuests";
import Quests from "@/pages/Quests";
import Badges from "@/pages/Badges";
import Rewards from "@/pages/Rewards";
import Leaderboard from "@/pages/Leaderboard";
import Companion from "@/pages/Companion";

const PANELS = {
  "main-quests": { title: "Main Quests",  subtitle: "Choose your Mauritian saga",    Component: MainQuests,  max: "max-w-5xl" },
  "quests":      { title: "Side Quests",  subtitle: "Small feats, big bragging rights", Component: Quests,    max: "max-w-5xl" },
  "badges":      { title: "Adventurer's Bag", subtitle: "Cards & seals you've earned",  Component: Badges,    max: "max-w-5xl" },
  "rewards":     { title: "Treasure Vault", subtitle: "Discount codes & partner goodies", Component: Rewards, max: "max-w-4xl" },
  "leaderboard": { title: "Hall of Explorers", subtitle: "Top of Mauritius",            Component: Leaderboard, max: "max-w-3xl" },
  "companion":   { title: "Ti Dodo",      subtitle: "Your AI Mauritian companion",     Component: Companion,   max: "max-w-3xl" },
};

export default function HudPanels({ panel, onClose }) {
  const config = panel ? PANELS[panel] : null;

  return (
    <AnimatePresence>
      {config && (
        <motion.div
          key={`hud-panel-${panel}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-[90] flex items-center justify-center p-4 sm:p-6"
          data-testid={`hud-panel-${panel}`}
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
            className="absolute inset-0 bg-jungle-700/70 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.32, ease: "easeOut" }}
            className={`relative w-full ${config.max} max-h-[88vh] flex flex-col bg-sand-100 border-4 border-jungle-700 rounded-3xl shadow-lift overflow-hidden`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Sticky header */}
            <div className="relative shrink-0 px-6 lg:px-8 py-4 bg-jungle-700 text-sand-100 flex items-center justify-between gap-4">
              <div>
                <div className="text-[10px] tracking-[0.35em] uppercase opacity-75 font-bold">An Deor · Codex</div>
                <h2 className="font-display text-2xl lg:text-3xl italic">{config.title}</h2>
                <p className="text-xs lg:text-sm opacity-85 italic">{config.subtitle}</p>
              </div>
              <button
                onClick={onClose}
                data-testid="hud-panel-close"
                aria-label="Close panel"
                className="shrink-0 w-10 h-10 rounded-full bg-sand-100/15 hover:bg-sand-100/25 backdrop-blur flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable body */}
            <div className="relative overflow-y-auto px-4 sm:px-6 lg:px-8 py-6 paper-bg flex-1">
              <config.Component embedded />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
