import { useEffect, useState, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { BookOpen } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { findAvatar } from "@/lib/avatars";
import { playClick } from "@/lib/sound";
import { api } from "@/lib/api";
import CharacterSheet from "@/components/CharacterSheet";
import AvatarPickerDialog from "@/components/AvatarPickerDialog";

// Snapshot of what the player has already "seen" — used to compute the red dot.
// Stored in localStorage keyed by user_id so two accounts on one device don't bleed.
function loadSeen(userId) {
  try {
    const raw = localStorage.getItem(`andeor.seen.${userId}`);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}
function saveSeen(userId, snapshot) {
  try { localStorage.setItem(`andeor.seen.${userId}`, JSON.stringify(snapshot)); } catch { /* noop */ }
}

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

  // Notification dot state — computed against a localStorage snapshot
  const [hasUnread, setHasUnread] = useState(false);
  const [unreadBreakdown, setUnreadBreakdown] = useState({ badges: 0, rewards: 0, sagas: 0, ready_saga_id: null });

  const refreshUnread = useCallback(async () => {
    if (!user) return;
    try {
      const [rewardsRes, questsRes, profileRes] = await Promise.all([
        api.get("/me/rewards").catch(() => ({ data: [] })),
        api.get("/main-quests").catch(() => ({ data: [] })),
        api.get("/me/profile").catch(() => ({ data: user })),
      ]);
      const liveBadges  = (profileRes.data.cards || []).length + (profileRes.data.badges || []).length;
      const liveRewards = (rewardsRes.data || []).filter((r) => !r.redeemed).length;
      const readySagas  = (questsRes.data || []).filter((q) => q?.progress?.percent === 100 && !q.completed);
      const liveSagas   = readySagas.length;
      const readySagaId = readySagas[0]?.main_quest_id || null;

      // Snapshot default policy (deliberately asymmetric):
      //   • badges  → defaults to live count (so existing badges DON'T trigger a dot on first login)
      //   • rewards → defaults to 0 (so unredeemed rewards DO dot until the player opens the sheet)
      //   • sagas   → defaults to 0 (same reasoning — ready sagas should pull the player back in)
      const seen = loadSeen(user.user_id) || { badges: liveBadges, rewards: 0, sagas: 0 };
      const newBadges  = Math.max(0, liveBadges  - (seen.badges || 0));
      const newRewards = Math.max(0, liveRewards - (seen.rewards || 0));
      const newSagas   = Math.max(0, liveSagas   - (seen.sagas || 0));
      queueMicrotask(() => {
        setUnreadBreakdown({ badges: newBadges, rewards: newRewards, sagas: newSagas, ready_saga_id: readySagaId });
        setHasUnread(newBadges + newRewards + newSagas > 0);
      });
    } catch {
      // Notification dot is decorative — silently ignore any errors.
    }
  }, [user]);

  // Mark current live state as "seen" — called when the user opens the sheet.
  const markAllSeen = useCallback(async () => {
    if (!user) return;
    try {
      const [rewardsRes, questsRes, profileRes] = await Promise.all([
        api.get("/me/rewards").catch(() => ({ data: [] })),
        api.get("/main-quests").catch(() => ({ data: [] })),
        api.get("/me/profile").catch(() => ({ data: user })),
      ]);
      saveSeen(user.user_id, {
        badges:  (profileRes.data.cards || []).length + (profileRes.data.badges || []).length,
        rewards: (rewardsRes.data || []).filter((r) => !r.redeemed).length,
        sagas:   (questsRes.data || []).filter((q) => q?.progress?.percent === 100 && !q.completed).length,
      });
      queueMicrotask(() => {
        setHasUnread(false);
        setUnreadBreakdown({ badges: 0, rewards: 0, sagas: 0, ready_saga_id: null });
      });
    } catch { /* noop */ }
  }, [user]);

  // Initial fetch + refresh on window focus + on app-wide signals
  useEffect(() => {
    if (!user) return undefined;
    refreshUnread();
    const onFocus = () => refreshUnread();
    const onSignal = () => refreshUnread();
    window.addEventListener("focus", onFocus);
    window.addEventListener("andeor:notifications-refresh", onSignal);
    window.addEventListener("andeor:self-guided-changed",   onSignal);
    window.addEventListener("andeor:trail-completed",       onSignal);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("andeor:notifications-refresh", onSignal);
      window.removeEventListener("andeor:self-guided-changed",   onSignal);
      window.removeEventListener("andeor:trail-completed",       onSignal);
    };
  }, [user, refreshUnread]);

  const markSeenTimerRef = useRef(null);

  const openSheet = () => {
    playClick();
    setSheetOpen(true);
    // Dismiss the dot after a short beat so the player notices it.
    // Track the timer so a fast close (< 1.2s) cancels it gracefully.
    if (markSeenTimerRef.current) clearTimeout(markSeenTimerRef.current);
    markSeenTimerRef.current = setTimeout(() => { markAllSeen(); }, 1200);
  };

  const closeSheet = () => {
    setSheetOpen(false);
    if (markSeenTimerRef.current) { clearTimeout(markSeenTimerRef.current); markSeenTimerRef.current = null; }
  };

  if (!user) return null;

  const meta = user.avatar ? findAvatar(user.avatar) : null;
  const AvatarIcon = meta?.icon || BookOpen;

  const xp = user.xp ?? 0;
  const level = user.level ?? 1;
  const xpInLevel = xp % 100;
  const xpToNext = 100 - xpInLevel;

  const unreadTotal = unreadBreakdown.badges + unreadBreakdown.rewards + unreadBreakdown.sagas;
  const unreadTitle = hasUnread
    ? [
        unreadBreakdown.badges  > 0 && `${unreadBreakdown.badges} new card${unreadBreakdown.badges  > 1 ? "s" : ""}`,
        unreadBreakdown.rewards > 0 && `${unreadBreakdown.rewards} unclaimed reward${unreadBreakdown.rewards > 1 ? "s" : ""}`,
        unreadBreakdown.sagas   > 0 && `${unreadBreakdown.sagas} saga${unreadBreakdown.sagas > 1 ? "s" : ""} ready`,
      ].filter(Boolean).join(" · ")
    : "";

  return (
    <>
      <div
        data-hud="avatar"
        className="fixed bottom-6 left-6 lg:bottom-12 lg:left-12 z-40 select-none"
      >
        <motion.button
          onClick={openSheet}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.95 }}
          data-testid="avatar-hud-bubble"
          aria-label={hasUnread ? `Open character sheet — ${unreadTitle}` : "Open character sheet"}
          title={unreadTitle || undefined}
          className={`relative w-20 h-20 rounded-full bg-gradient-to-br ${meta?.gradient || "from-jungle-600 to-jungle-700"} ring-4 ring-sand-100 shadow-lift flex items-center justify-center overflow-hidden text-sand-100`}
        >
          {meta?.image ? (
            <img src={meta.image} alt={meta.name || "Avatar"} className="absolute inset-0 w-full h-full object-cover pointer-events-none" draggable={false} />
          ) : (
            <AvatarIcon className="w-9 h-9 pointer-events-none" />
          )}
          <span aria-hidden className="absolute inset-0 rounded-full pointer-events-none" style={{ boxShadow: "inset 0 0 18px rgba(232,178,65,0.45)" }} />
          <span
            className="absolute -bottom-1 -right-1 bg-sun-500 text-ink-900 rounded-full text-[11px] font-bold w-7 h-7 flex items-center justify-center shadow-clay border-[3px] border-sand-100 pointer-events-none"
            data-testid="avatar-hud-level"
          >
            {level}
          </span>

          {/* Notification dot — pulsing red ping when there's something new to claim */}
          {hasUnread && (
            <span
              data-testid="avatar-hud-unread-dot"
              data-unread-count={unreadTotal}
              aria-label={unreadTitle}
              className="absolute -top-0.5 -right-0.5 pointer-events-none"
            >
              <span className="absolute inset-0 rounded-full bg-sunset-500 opacity-70 animate-ping" aria-hidden />
              <span className="relative block w-4 h-4 rounded-full bg-sunset-500 border-[2.5px] border-sand-100 shadow-clay" aria-hidden />
            </span>
          )}
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
        onClose={closeSheet}
        onChangeAvatar={() => { closeSheet(); setAvatarPickerOpen(true); }}
        unreadBreakdown={unreadBreakdown}
      />

      <AvatarPickerDialog open={avatarPickerOpen} onOpenChange={setAvatarPickerOpen} />
    </>
  );
}
