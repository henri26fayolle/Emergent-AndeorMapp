import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { findAvatar } from "@/lib/avatars";
import AvatarPickerDialog from "@/components/AvatarPickerDialog";
import {
  ScrollText, Sparkles, Layers, Gift, Trophy, ShieldCheck, LogOut, Map as MapIcon, MessageCircle,
} from "lucide-react";

const ACTIONS = [
  { id: "map",     to: "/dashboard",   label: "Map",     icon: MapIcon },
  { id: "journal", to: "/quests",      label: "Journal", icon: ScrollText },
  { id: "bag",     to: "/badges",      label: "Bag",     icon: Layers },
  { id: "vault",   to: "/rewards",     label: "Vault",   icon: Gift },
  { id: "rank",    to: "/leaderboard", label: "Rank",    icon: Trophy },
  { id: "ti-dodo", to: "/companion",   label: "Ti Dodo", icon: MessageCircle },
];

export default function RpgHud() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [avatarOpen, setAvatarOpen] = useState(false);
  if (!user) return null;

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
          const active = location.pathname.startsWith(a.to);
          const ActionIcon = a.icon;
          return (
            <motion.button
              key={a.id}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.08 + i * 0.06, duration: 0.3, ease: "easeOut" }}
              whileHover={{ x: -4, scale: 1.04 }}
              whileTap={{ scale: 0.94 }}
              onClick={() => navigate(a.to)}
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
            onClick={() => navigate("/admin")}
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
          onClick={async () => { await logout(); navigate("/"); }}
          data-testid="hud-action-logout"
          className="w-12 h-12 rounded-2xl flex items-center justify-center bg-sand-100/95 backdrop-blur text-ink-700 shadow-clay border border-black/5"
          title="Sign out"
        >
          <LogOut className="w-5 h-5" />
        </motion.button>
      </motion.nav>

      {/* Bottom HUD bar — portrait + name + xp */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="fixed bottom-4 lg:bottom-6 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-2rem)] max-w-2xl"
        data-testid="rpg-hud-bar"
      >
        <div className="bg-sand-100/95 backdrop-blur-xl border-4 border-jungle-700 rounded-3xl shadow-lift p-3 lg:p-4 flex items-center gap-3 lg:gap-5">
          {/* Avatar portrait — click to swap */}
          <button
            onClick={() => setAvatarOpen(true)}
            data-testid="hud-avatar-portrait"
            className="relative w-14 h-14 lg:w-16 lg:h-16 rounded-2xl flex items-center justify-center shrink-0 border-2 border-jungle-700 overflow-hidden bg-gradient-to-br shadow-inner"
            style={meta ? { backgroundImage: undefined } : {}}
            aria-label="Change explorer"
          >
            <div className={`absolute inset-0 ${meta ? `bg-gradient-to-br ${meta.gradient}` : "bg-sunset-500"}`} />
            {Icon ? (
              <Icon className="relative w-7 h-7 text-white" />
            ) : (
              <span className="relative text-sm font-bold text-white">{(user.name || "?").slice(0, 2).toUpperCase()}</span>
            )}
            <span className="absolute -bottom-1 -right-1 bg-sun-500 text-ink-900 rounded-full text-[10px] font-bold w-6 h-6 flex items-center justify-center shadow-clay border-2 border-sand-100" data-testid="hud-level">
              {user.level}
            </span>
          </button>

          {/* Name + XP bar */}
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline justify-between gap-2 mb-1.5">
              <div className="truncate">
                <span className="font-display text-base lg:text-lg text-ink-900 leading-none">{user.name || "Explorer"}</span>
                {meta && <span className="hidden lg:inline ml-2 text-[10px] tracking-[0.2em] uppercase text-ink-700">· {meta.name}</span>}
              </div>
              <div className="text-[10px] tracking-[0.2em] uppercase text-ink-700 tabular-nums shrink-0" data-testid="hud-xp">
                {user.xp} XP · {xpToNext} to Lv {user.level + 1}
              </div>
            </div>
            <div className="h-3 rounded-full bg-sand-300 border border-ink-900/10 overflow-hidden relative">
              <motion.div
                initial={false}
                animate={{ width: `${xpInLevel}%` }}
                transition={{ duration: 0.7, ease: "easeOut" }}
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-jungle-400 to-sunset-500 rounded-full"
                data-testid="hud-xp-bar"
              />
              {/* Shimmer */}
              <div className="absolute inset-0 opacity-30 mix-blend-overlay bg-[linear-gradient(110deg,transparent_40%,white_50%,transparent_60%)] bg-[length:200%_100%] animate-[hudShimmer_2.4s_linear_infinite]" />
            </div>
          </div>

          {/* Brand corner */}
          <Link to="/dashboard" className="hidden md:flex items-center gap-2 shrink-0" data-testid="hud-brand">
            <div className="w-9 h-9 rounded-2xl bg-jungle-700 text-sand-100 font-display flex items-center justify-center">A</div>
          </Link>
        </div>
        <div className="flex justify-center mt-2">
          <div className="inline-block px-3 py-1 rounded-full bg-jungle-700/70 backdrop-blur text-[10px] tracking-[0.3em] uppercase text-sand-100">
            Tap your portrait to change explorer · Side menu to travel
          </div>
        </div>
      </motion.div>

      <AvatarPickerDialog open={avatarOpen} onOpenChange={setAvatarOpen} />

      <style>{`@keyframes hudShimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
    </>
  );
}
