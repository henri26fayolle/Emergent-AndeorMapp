import { useState } from "react";
import { motion } from "framer-motion";
import { BookOpen } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { findAvatar } from "@/lib/avatars";
import { playClick } from "@/lib/sound";
import CharacterSheet from "@/components/CharacterSheet";
import AvatarPickerDialog from "@/components/AvatarPickerDialog";

/**
 * Bottom-left Character Card — the single permanent in-game UI element.
 * Shows avatar bubble + name + level + XP bar. Clicking the bubble opens
 * the full Character Sheet (Main Quest, Bag, Side Quests, Rewards,
 * Leaderboard, Ti Dodo) — replaces the old right-rail action stack.
 *
 * Self-contained: owns both the Character Sheet modal and the Avatar
 * Picker dialog so it can be dropped anywhere (Dashboard, sub-maps).
 */
export default function AvatarHud() {
  const { user } = useAuth();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [avatarPickerOpen, setAvatarPickerOpen] = useState(false);

  if (!user) return null;

  const meta = user.avatar ? findAvatar(user.avatar) : null;
  const AvatarIcon = meta?.icon || BookOpen;

  const xp = user.xp ?? 0;
  const level = user.level ?? 1;
  const xpInLevel = xp % 100;
  const xpToNext = 100 - xpInLevel;

  return (
    <>
      <div
        data-hud="avatar"
        className="fixed bottom-6 left-6 lg:bottom-12 lg:left-12 z-40 select-none"
      >
        <motion.button
          onClick={() => { playClick(); setSheetOpen(true); }}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.95 }}
          data-testid="avatar-hud-bubble"
          aria-label="Open character sheet"
          className={`relative w-20 h-20 rounded-full bg-gradient-to-br ${meta?.gradient || "from-jungle-600 to-jungle-700"} ring-4 ring-sand-100 shadow-lift flex items-center justify-center overflow-hidden text-sand-100`}
        >
          {meta?.image ? (
            <img src={meta.image} alt={meta.name || "Avatar"} className="absolute inset-0 w-full h-full object-cover" draggable={false} />
          ) : (
            <AvatarIcon className="w-9 h-9" />
          )}
          <span aria-hidden className="absolute inset-0 rounded-full pointer-events-none" style={{ boxShadow: "inset 0 0 18px rgba(232,178,65,0.45)" }} />
          <span
            className="absolute -bottom-1 -right-1 bg-sun-500 text-ink-900 rounded-full text-[11px] font-bold w-7 h-7 flex items-center justify-center shadow-clay border-[3px] border-sand-100"
            data-testid="avatar-hud-level"
          >
            {level}
          </span>
        </motion.button>

        <div className="mt-3 w-48 rounded-2xl bg-jungle-700 text-sand-100 px-3 py-2 shadow-clay pointer-events-none">
          <div className="flex items-center justify-between gap-2">
            <span className="font-display text-sm italic truncate" data-testid="avatar-hud-name">
              {user.name?.split(" ")[0] || "Explorer"}
            </span>
            <span className="text-[9px] tracking-[0.25em] uppercase font-bold opacity-80 shrink-0">Lv {level}</span>
          </div>
          <div className="mt-1.5 h-1.5 rounded-full bg-sand-100/15 overflow-hidden relative" data-testid="avatar-hud-xp">
            <motion.div
              initial={false}
              animate={{ width: `${xpInLevel}%` }}
              transition={{ duration: 0.7, ease: "easeOut" }}
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-sun-500 to-sunset-500 rounded-full"
            />
          </div>
          <div className="mt-1 flex justify-between text-[8.5px] tracking-[0.2em] uppercase font-bold opacity-75 tabular-nums">
            <span>{xp} XP</span>
            <span>{xpToNext} to Lv {level + 1}</span>
          </div>
        </div>
      </div>

      <CharacterSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onChangeAvatar={() => { setSheetOpen(false); setAvatarPickerOpen(true); }}
      />

      <AvatarPickerDialog open={avatarPickerOpen} onOpenChange={setAvatarPickerOpen} />
    </>
  );
}
