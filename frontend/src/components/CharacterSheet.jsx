import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Crown, Layers, ScrollText, Gift, Trophy, MessageCircle, LogOut, Volume2, VolumeX, ShieldCheck, User as UserIcon } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { findAvatar } from "@/lib/avatars";
import { playClick, playChime, isMuted, toggleMuted, subscribe } from "@/lib/sound";
import { useNavigate } from "react-router-dom";
import SagaConfetti from "@/components/SagaConfetti";
import MainQuests from "@/pages/MainQuests";
import Badges from "@/pages/Badges";
import Quests from "@/pages/Quests";
import Rewards from "@/pages/Rewards";
import Leaderboard from "@/pages/Leaderboard";
import Companion from "@/pages/Companion";

/**
 * The player's Character Sheet — the single entry point reached by clicking the
 * bottom-left avatar. Replaces the right-rail action stack.
 *
 * Tabs:
 *   adventure   — Main Quest + Bag (cards/badges) stacked (default)
 *   side-quests — Side Quests
 *   rewards     — Treasure vault
 *   leaderboard — Top explorers
 *   companion   — Ti Dodo chat
 */
const TABS = [
  { id: "adventure",   label: "Adventure",   icon: Crown },
  { id: "side-quests", label: "Side Quests", icon: ScrollText },
  { id: "rewards",     label: "Rewards",     icon: Gift },
  { id: "leaderboard", label: "Leaderboard", icon: Trophy },
  { id: "companion",   label: "Ti Dodo",     icon: MessageCircle },
];

export default function CharacterSheet({ open, onClose, onChangeAvatar, unreadBreakdown }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState("adventure");
  const [muted, setMuted] = useState(isMuted());
  // Each time the sheet opens with a ready saga we bump this nonce so SagaConfetti
  // fires a fresh one-shot burst inside the Adventure tab.
  const [confettiTick, setConfettiTick] = useState(0);
  useEffect(() => subscribe(setMuted), []);

  // Reset to default tab whenever the sheet is reopened
  useEffect(() => { if (open) queueMicrotask(() => setTab("adventure")); }, [open]);

  // Fire confetti when the sheet opens AND the player has a saga ready to claim.
  // Use the breakdown computed by AvatarHud — no extra API call here.
  useEffect(() => {
    if (!open) return;
    if ((unreadBreakdown?.sagas || 0) > 0) {
      queueMicrotask(() => {
        setConfettiTick((n) => n + 1);
        // A celebratory chime cue to match the visual
        try { playChime(); } catch { /* noop */ }
      });
    }
  }, [open, unreadBreakdown?.sagas]);

  // Esc closes — stop propagation so a parent (e.g. RegionSubMap) doesn't also dismiss
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose && onClose();
      }
    };
    window.addEventListener("keydown", onKey, true); // capture phase so we run first
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open, onClose]);

  if (!user) return null;

  const meta = user.avatar ? findAvatar(user.avatar) : null;
  const AvatarIcon = meta?.icon || UserIcon;
  const xp = user.xp ?? 0;
  const level = user.level ?? 1;
  const xpInLevel = xp % 100;
  const xpToNext = 100 - xpInLevel;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="character-sheet"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-[95] flex items-center justify-center p-3 sm:p-6"
          data-testid="character-sheet"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={() => { playClick(); onClose && onClose(); }}
            className="absolute inset-0 bg-jungle-700/70 backdrop-blur-sm"
            data-testid="character-sheet-backdrop"
          />

          {/* Sheet */}
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.32, ease: "easeOut" }}
            className="relative w-full max-w-6xl max-h-[90vh] flex flex-col bg-sand-100 border-4 border-jungle-700 rounded-3xl shadow-lift overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header — player overview + tools */}
            <div className="relative shrink-0 px-5 lg:px-7 py-4 bg-jungle-700 text-sand-100 flex items-center gap-4">
              {/* Avatar bubble */}
              <button
                onClick={() => { playClick(); onChangeAvatar && onChangeAvatar(); }}
                data-testid="character-sheet-change-avatar"
                title="Change avatar"
                className={`relative w-14 h-14 rounded-full bg-gradient-to-br ${meta?.gradient || "from-jungle-600 to-jungle-700"} ring-3 ring-sand-100 shadow-lift flex items-center justify-center overflow-hidden text-sand-100 shrink-0`}
              >
                {meta?.image ? (
                  <img src={meta.image} alt={meta.name || "Avatar"} className="absolute inset-0 w-full h-full object-cover" draggable={false} />
                ) : (
                  <AvatarIcon className="w-6 h-6" />
                )}
                <span className="absolute -bottom-1 -right-1 bg-sun-500 text-ink-900 rounded-full text-[10px] font-bold w-6 h-6 flex items-center justify-center shadow-clay border-2 border-jungle-700">
                  {level}
                </span>
              </button>

              <div className="min-w-0 flex-1">
                <div className="text-[10px] tracking-[0.35em] uppercase opacity-75 font-bold">An Deor · Explorer</div>
                <h2 className="font-display text-xl lg:text-2xl italic truncate" data-testid="character-sheet-name">
                  {user.name || "Traveler"}
                </h2>
                <div className="mt-1.5 h-1.5 max-w-[16rem] rounded-full bg-sand-100/15 overflow-hidden relative">
                  <motion.div
                    initial={false}
                    animate={{ width: `${xpInLevel}%` }}
                    transition={{ duration: 0.7, ease: "easeOut" }}
                    className="absolute inset-y-0 left-0 bg-gradient-to-r from-sun-500 to-sunset-500 rounded-full"
                  />
                </div>
                <div className="mt-0.5 flex gap-3 text-[9px] tracking-[0.25em] uppercase font-bold opacity-80 tabular-nums">
                  <span>{xp} XP</span>
                  <span>{xpToNext} to Lv {level + 1}</span>
                </div>
              </div>

              {/* Right-side header tools (always visible — compact on mobile) */}
              <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                {user.role === "admin" && (
                  <button
                    onClick={() => { playClick(); onClose && onClose(); navigate("/admin"); }}
                    data-testid="character-sheet-admin"
                    title="Admin"
                    className="w-9 h-9 rounded-full bg-sand-100/15 hover:bg-sand-100/25 backdrop-blur flex items-center justify-center transition-colors"
                  >
                    <ShieldCheck className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => { playClick(); toggleMuted(); }}
                  data-testid="character-sheet-mute"
                  title={muted ? "Unmute" : "Mute"}
                  className="w-9 h-9 rounded-full bg-sand-100/15 hover:bg-sand-100/25 backdrop-blur flex items-center justify-center transition-colors"
                >
                  {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>
                <button
                  onClick={async () => { playClick(); await logout(); navigate("/"); }}
                  data-testid="character-sheet-logout"
                  title="Sign out"
                  className="w-9 h-9 rounded-full bg-sand-100/15 hover:bg-sand-100/25 backdrop-blur flex items-center justify-center transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>

              <button
                onClick={() => { playClick(); onClose && onClose(); }}
                data-testid="character-sheet-close"
                aria-label="Close character sheet"
                className="shrink-0 w-10 h-10 rounded-full bg-sand-100/15 hover:bg-sand-100/25 backdrop-blur flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tabs */}
            <Tabs value={tab} onValueChange={(v) => { playClick(); setTab(v); }} className="flex-1 flex flex-col min-h-0">
              <TabsList
                className="shrink-0 mx-4 sm:mx-6 mt-3 sm:mt-4 mb-1 sm:mb-2 bg-sand-200/70 p-1 rounded-2xl flex flex-wrap gap-1 h-auto justify-start"
                data-testid="character-sheet-tabs"
              >
                {TABS.map((t) => {
                  const Icon = t.icon;
                  return (
                    <TabsTrigger
                      key={t.id}
                      value={t.id}
                      data-testid={`character-sheet-tab-${t.id}`}
                      className="rounded-xl px-3 sm:px-4 py-1.5 text-xs sm:text-sm font-bold tracking-[0.12em] uppercase data-[state=active]:bg-jungle-700 data-[state=active]:text-sand-100 data-[state=active]:shadow-clay text-ink-700 hover:text-ink-900 transition-colors inline-flex items-center gap-1.5"
                    >
                      <Icon className="w-3.5 h-3.5" /> {t.label}
                    </TabsTrigger>
                  );
                })}
              </TabsList>

              <div className="relative flex-1 overflow-y-auto px-3 sm:px-5 lg:px-7 pt-2 pb-6 paper-bg" data-testid="character-sheet-body">
                <TabsContent value="adventure" className="m-0 space-y-8 focus-visible:outline-none">
                  {tab === "adventure" && (
                    <>
                      <section data-testid="character-sheet-section-main-quest" className="relative">
                        <SectionHeading icon={Crown} title="Main Quest" subtitle="Choose a Mauritian saga" />
                        <MainQuests embedded />
                        {/* Celebratory burst when the player has a saga ready to claim */}
                        <SagaConfetti trigger={confettiTick} origin="top" />
                      </section>
                      <div className="h-px bg-jungle-700/15" aria-hidden />
                      <section data-testid="character-sheet-section-bag">
                        <SectionHeading icon={Layers} title="Bag" subtitle="Cards & seals you've earned" />
                        <Badges embedded />
                      </section>
                    </>
                  )}
                </TabsContent>

                <TabsContent value="side-quests" className="m-0 focus-visible:outline-none">
                  {tab === "side-quests" && <Quests embedded />}
                </TabsContent>

                <TabsContent value="rewards" className="m-0 focus-visible:outline-none">
                  {tab === "rewards" && <Rewards embedded />}
                </TabsContent>

                <TabsContent value="leaderboard" className="m-0 focus-visible:outline-none">
                  {tab === "leaderboard" && <Leaderboard embedded />}
                </TabsContent>

                <TabsContent value="companion" className="m-0 focus-visible:outline-none">
                  {tab === "companion" && <Companion embedded />}
                </TabsContent>
              </div>
            </Tabs>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function SectionHeading({ icon: Icon, title, subtitle }) {
  return (
    <div className="mb-4 flex items-center gap-2.5">
      <span className="w-9 h-9 rounded-2xl bg-jungle-700 text-sand-100 flex items-center justify-center shadow-clay">
        <Icon className="w-4 h-4" />
      </span>
      <div>
        <div className="font-display text-xl italic leading-none">{title}</div>
        <div className="text-[10px] tracking-[0.25em] uppercase text-ink-700 font-bold mt-0.5">{subtitle}</div>
      </div>
    </div>
  );
}
