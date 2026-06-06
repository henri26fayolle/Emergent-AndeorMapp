import { Link, useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { findAvatar } from "@/lib/avatars";
import AvatarPickerDialog from "@/components/AvatarPickerDialog";
import HudPanels from "@/components/HudPanels";
import EpilogueWatcher from "@/components/EpilogueWatcher";
import { isMuted, toggleMuted, subscribe, playClick } from "@/lib/sound";
import { useEffect, useState } from "react";
import {
  ScrollText, Sparkles, Layers, Gift, Trophy, ShieldCheck, LogOut, Map as MapIcon, MessageCircle, Volume2, VolumeX, Crown,
} from "lucide-react";

const ACTIONS = [
  { id: "map",     panel: null,          label: "Map",         icon: MapIcon },
  { id: "saga",    panel: "main-quests", label: "Main Quests", icon: Crown },
  { id: "journal", panel: "quests",      label: "Side Quests", icon: ScrollText },
  { id: "bag",     panel: "badges",      label: "Bag",         icon: Layers },
  { id: "vault",   panel: "rewards",     label: "Vault",       icon: Gift },
  { id: "rank",    panel: "leaderboard", label: "Rank",        icon: Trophy },
  { id: "ti-dodo", panel: "companion",   label: "Ti Dodo",     icon: MessageCircle },
];

export default function RpgHud() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [openPanel, setOpenPanel] = useState(null);
  const [muted, setMuted] = useState(isMuted());
  useEffect(() => subscribe(setMuted), []);

  if (!user) return null;

  const handleAction = (a) => {
    playClick();
    if (a.panel === null) {
      // Map button — go to (or stay on) dashboard, close any open panel
      setOpenPanel(null);
      if (location.pathname !== "/dashboard") navigate("/dashboard");
    } else {
      setOpenPanel(a.panel);
    }
  };

  const meta = user.avatar ? findAvatar(user.avatar) : null;
  const Icon = meta?.icon;
  const xpInLevel = user.xp % 100;
  const xpToNext = 100 - xpInLevel;

  return (
    <>
      {/* Side action stack — vertical floating buttons (game menu) */}
      <motion.nav
        initial={{ opacity: 0, x: 24 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        className="fixed right-4 lg:right-6 top-1/2 -translate-y-1/2 z-40 flex flex-col gap-3"
        data-testid="rpg-hud-actions"
      >
        {ACTIONS.map((a, i) => {
          const active = a.panel ? openPanel === a.panel : location.pathname === "/dashboard" && !openPanel;
          const ActionIcon = a.icon;
          return (
            <motion.button
              key={a.id}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.08 + i * 0.06, duration: 0.3, ease: "easeOut" }}
              whileHover={{ x: -4, scale: 1.04 }}
              whileTap={{ scale: 0.94 }}
              onClick={() => handleAction(a)}
              data-testid={`hud-action-${a.id}`}
              className={`group relative w-12 h-12 rounded-2xl flex items-center justify-center shadow-clay border border-black/5 transition-colors ${
                active
                  ? "bg-jungle-500 text-sand-100"
                  : "bg-sand-100/95 backdrop-blur text-jungle-700 hover:bg-white"
              }`}
              title={a.label}
            >
              <ActionIcon className="w-5 h-5" />
              <span className="absolute right-full mr-3 px-2 py-1 rounded-full bg-jungle-700 text-sand-100 text-[10px] font-bold tracking-[0.2em] uppercase opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                {a.label}
              </span>
            </motion.button>
          );
        })}
        {user.role === "admin" && (
          <motion.button
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5, duration: 0.3 }}
            whileHover={{ x: -4 }}
            whileTap={{ scale: 0.94 }}
            onClick={() => { playClick(); navigate("/admin"); }}
            data-testid="hud-action-admin"
            className="w-12 h-12 rounded-2xl flex items-center justify-center bg-sunset-500 text-white shadow-clay"
            title="Admin"
          >
            <ShieldCheck className="w-5 h-5" />
          </motion.button>
        )}
        <motion.button
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.55, duration: 0.3 }}
          whileHover={{ x: -4 }}
          whileTap={{ scale: 0.94 }}
          onClick={() => { playClick(); toggleMuted(); }}
          data-testid="hud-action-mute"
          className="w-12 h-12 rounded-2xl flex items-center justify-center bg-sand-100/95 backdrop-blur text-ink-700 shadow-clay border border-black/5"
          title={muted ? "Unmute" : "Mute"}
        >
          {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
        </motion.button>
        <motion.button
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.6, duration: 0.3 }}
          whileHover={{ x: -4 }}
          whileTap={{ scale: 0.94 }}
          onClick={async () => { playClick(); await logout(); navigate("/"); }}
          data-testid="hud-action-logout"
          className="w-12 h-12 rounded-2xl flex items-center justify-center bg-sand-100/95 backdrop-blur text-ink-700 shadow-clay border border-black/5"
          title="Sign out"
        >
          <LogOut className="w-5 h-5" />
        </motion.button>
      </motion.nav>

      {/* AvatarPickerDialog mounted globally so it can be triggered from the floating avatar HUD */}
      <AvatarPickerDialog open={avatarOpen} onOpenChange={setAvatarOpen} />

      {/* In-game modal panels — Main Quests / Side Quests / Bag / Vault / Rank / Ti Dodo */}
      <HudPanels panel={openPanel} onClose={() => setOpenPanel(null)} />

      {/* Global watcher — plays the Main Quest Epilogue cutscene on completion */}
      <EpilogueWatcher />

      <style>{`@keyframes hudShimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
    </>
  );
}
