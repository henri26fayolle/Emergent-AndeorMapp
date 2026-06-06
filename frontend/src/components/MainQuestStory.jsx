import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mountain, Droplet, Landmark, Compass, Sparkles, Check, Star, Crown, Lock, Eye, Plus, Trophy, ChevronLeft, ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { playClick } from "@/lib/sound";

const ICON_MAP = { Mountain, Droplet, Landmark, Compass };

const THEME = {
  jungle: { bg: "from-[#0E3E2D] via-[#125538] to-[#1B6F4B]", chip: "bg-jungle-500" },
  ocean:  { bg: "from-[#053948] via-[#0A6A7E] to-[#0F8FA8]", chip: "bg-ocean-500"  },
  sunset: { bg: "from-[#5A1A0E] via-[#9A3A1F] to-[#E27447]", chip: "bg-sunset-500" },
  sun:    { bg: "from-[#5C4017] via-[#A37522] to-[#E8B241]", chip: "bg-sun-500 text-ink-900" },
};

// Typewriter effect — adapted from the Prologue
function useTypewriter(text, speed = 22, deps = []) {
  const [out, setOut] = useState("");
  const [done, setDone] = useState(false);
  useEffect(() => {
    setOut(""); setDone(false);
    if (!text) { setDone(true); return; }
    let i = 0;
    const id = setInterval(() => {
      i++;
      setOut(text.slice(0, i));
      if (i >= text.length) { clearInterval(id); setDone(true); }
    }, speed);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, ...deps]);
  return { out, done, finish: () => { setOut(text); setDone(true); } };
}

/**
 * Animated, prologue-style story view for a single Main Quest.
 * Beats:
 *   0  Lore intro (typewriter)
 *   1  Tours in the saga (stagger reveal)
 *   2  Rewards on completion (stagger reveal) + action buttons
 */
export default function MainQuestStory({ quest, tours, busy, onBack, onAct }) {
  const [beat, setBeat] = useState(0);
  const Icon = ICON_MAP[quest.icon] || Sparkles;
  const theme = THEME[quest.theme_color] || THEME.jungle;
  const lore = `"${quest.lore_intro || ""}"`;
  const { out, done, finish } = useTypewriter(lore, 22, [quest.main_quest_id]);

  const tourName  = (id) => tours.find((t) => t.tour_id === id)?.name || id;
  const tourRegion = (id) => tours.find((t) => t.tour_id === id)?.region || "";
  const tourPrice = (id) => tours.find((t) => t.tour_id === id)?.price || 0;
  const aovMur = quest.tour_ids.reduce((a, id) => a + tourPrice(id), 0) * 50;
  const pct = quest.progress?.percent || 0;

  // Reset to beat 0 whenever the quest changes
  useEffect(() => { setBeat(0); }, [quest.main_quest_id]);

  const advance = () => {
    playClick();
    if (beat === 0) {
      if (!done) { finish(); return; }
      setBeat(1);
    } else if (beat === 1) {
      setBeat(2);
    }
  };

  // Keyboard advance — Space / Enter / →
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") { onBack(); return; }
      if (e.key === " " || e.key === "Enter" || e.key === "ArrowRight") {
        e.preventDefault();
        advance();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [beat, done]);

  return (
    <motion.div
      key={`story-${quest.main_quest_id}`}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="relative"
      data-testid={`mq-story-${quest.main_quest_id}`}
    >
      {/* Themed cinematic banner */}
      <div className={`relative rounded-3xl overflow-hidden bg-gradient-to-br ${theme.bg} text-sand-100 px-6 lg:px-10 py-8 lg:py-10 shadow-lift`}>
        <div
          aria-hidden
          className="absolute inset-0 opacity-15 pointer-events-none"
          style={{ backgroundImage: "radial-gradient(rgba(255,255,255,0.7) 1px, transparent 1px)", backgroundSize: "10px 10px" }}
        />
        <button
          onClick={() => { playClick(); onBack(); }}
          data-testid="mq-story-back"
          className="absolute top-4 left-4 z-10 inline-flex items-center gap-1.5 text-xs font-bold tracking-[0.25em] uppercase bg-sand-100/15 hover:bg-sand-100/25 backdrop-blur rounded-full px-3 py-1.5 transition-colors"
        >
          <ChevronLeft className="w-3.5 h-3.5" /> Sagas
        </button>

        <div className="relative flex items-start gap-4 lg:gap-5 mt-6 lg:mt-0">
          <motion.div
            initial={{ scale: 0.6, rotate: -8, opacity: 0 }}
            animate={{ scale: 1, rotate: 0, opacity: 1 }}
            transition={{ duration: 0.5, ease: "backOut" }}
            className={`w-16 h-16 lg:w-20 lg:h-20 rounded-3xl flex items-center justify-center ring-4 ring-sand-100/30 ${theme.chip}`}
          >
            <Icon className="w-8 h-8 lg:w-10 lg:h-10" />
          </motion.div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-display text-3xl lg:text-4xl italic">{quest.title}</h2>
              {quest.focused && (
                <Badge className="rounded-full bg-sun-500 text-ink-900 font-bold tracking-wider"><Star className="w-3 h-3 mr-1" /> Focused</Badge>
              )}
              {quest.completed && (
                <Badge className="rounded-full bg-sand-100 text-jungle-700 font-bold tracking-wider"><Crown className="w-3 h-3 mr-1" /> Completed</Badge>
              )}
            </div>
            <p className="opacity-90 text-sm lg:text-base italic mt-1">{quest.subtitle}</p>

            <div className="mt-4 flex items-center gap-3 flex-wrap">
              <div className="text-[10px] tracking-[0.3em] uppercase font-bold opacity-80">
                {quest.progress.completed}/{quest.progress.total} tours · {pct}%
              </div>
              <div className="flex-1 min-w-[160px] max-w-md h-1.5 rounded-full bg-sand-100/15 overflow-hidden">
                <div className="h-full bg-sand-100 rounded-full transition-[width] duration-500" style={{ width: `${pct}%` }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Beats */}
      <AnimatePresence mode="wait">
        {beat === 0 && (
          <motion.button
            key="beat-lore"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            onClick={advance}
            data-testid="mq-story-beat-lore"
            className="group w-full text-left mt-6"
          >
            <div className="relative bg-sand-100 border-4 border-jungle-700 rounded-3xl shadow-lift p-6 lg:p-8">
              <div className="absolute -top-4 left-6 bg-jungle-700 text-sand-100 px-4 py-1 rounded-full font-display text-sm tracking-wider">
                Ti Dodo
              </div>
              <p className="font-display text-xl lg:text-2xl leading-snug text-ink-900 min-h-[5rem] italic">
                {out}
                <span className={`inline-block w-2.5 h-6 ml-1 align-middle bg-ink-900 ${done ? "opacity-0" : "animate-pulse"}`} />
              </p>
              <div className="mt-4 flex items-center justify-between text-xs tracking-[0.25em] uppercase text-ink-700">
                <span>Chapter 1 / 3</span>
                <span className="flex items-center gap-1">
                  {done ? "Continue" : "Skip"} <kbd className="px-2 py-0.5 rounded bg-jungle-700 text-sand-100 text-[10px]">Space</kbd>
                  <ChevronRight className={`w-4 h-4 ${done ? "animate-pulse" : ""}`} />
                </span>
              </div>
            </div>
          </motion.button>
        )}

        {beat === 1 && (
          <motion.div
            key="beat-tours"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="mt-6"
            data-testid="mq-story-beat-tours"
          >
            <div className="bg-sand-100 border-4 border-jungle-700 rounded-3xl shadow-lift p-6 lg:p-8">
              <div className="font-display text-xs tracking-[0.3em] uppercase text-sunset-500 mb-2">Chapter 2 / 3 · The path</div>
              <h3 className="font-display text-2xl lg:text-3xl italic mb-5">Tours in this saga</h3>
              <ul className="space-y-2">
                {quest.tour_ids.map((id, i) => {
                  const done2 = quest.progress.completed_tours.includes(id);
                  return (
                    <motion.li
                      key={id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.05 + i * 0.08, duration: 0.32, ease: "easeOut" }}
                      data-testid={`mq-story-tour-${id}`}
                      className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 ${
                        done2 ? "border-jungle-500 bg-jungle-500/10" : "border-ink-900/15 bg-white/60"
                      }`}
                    >
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${done2 ? "bg-jungle-500 text-white" : "bg-sand-300 text-ink-700"}`}>
                        {done2 ? <Check className="w-4 h-4" /> : <Lock className="w-3.5 h-3.5" />}
                      </div>
                      <div className="flex-1 font-display italic text-base">{tourName(id)}</div>
                      <div className="text-[10px] tracking-[0.25em] uppercase text-ink-700 opacity-70">{tourRegion(id)}</div>
                    </motion.li>
                  );
                })}
              </ul>
              <div className="mt-5 flex justify-end">
                <Button onClick={advance} data-testid="mq-story-next-rewards" className="rounded-full bg-jungle-500 hover:bg-jungle-600 text-white">
                  See the rewards <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          </motion.div>
        )}

        {beat === 2 && (
          <motion.div
            key="beat-rewards"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="mt-6 space-y-4"
            data-testid="mq-story-beat-rewards"
          >
            <div className="bg-sand-100 border-4 border-jungle-700 rounded-3xl shadow-lift p-6 lg:p-8">
              <div className="font-display text-xs tracking-[0.3em] uppercase text-sunset-500 mb-2">Chapter 3 / 3 · The spoils</div>
              <h3 className="font-display text-2xl lg:text-3xl italic mb-5">Rewards on completion</h3>
              <ul className="space-y-3 text-sm lg:text-base">
                {[
                  { icon: Sparkles, text: <><strong>50%</strong> bundle voucher (any tour, 60 days)</> },
                  { icon: Crown,    text: <>Unique title: <em>"{quest.title_earned}"</em></> },
                  { icon: Trophy,   text: <>Leaderboard entry on andeor.mu</> },
                  ...(aovMur >= 15000 ? [{ icon: Sparkles, text: <>Branded An Deor T-shirt (saga ≥ Rs 15,000)</> }] : []),
                  ...(aovMur >= 25000 ? [{ icon: Sparkles, text: <>Partner Goodie (saga ≥ Rs 25,000)</> }] : []),
                  { icon: Eye, text: <>A final epilogue from Ti Dodo</> },
                ].map((r, i) => {
                  const Ri = r.icon;
                  return (
                    <motion.li
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.05 + i * 0.07 }}
                      className="flex items-start gap-2.5 text-ink-900"
                    >
                      <Ri className="w-4 h-4 mt-1 text-sunset-500 shrink-0" />
                      <span>{r.text}</span>
                    </motion.li>
                  );
                })}
              </ul>
              <div className="text-[10px] tracking-[0.25em] uppercase text-ink-700 opacity-70 mt-4">
                Saga value · ~Rs {aovMur.toLocaleString()}
              </div>

              <div className="mt-6 flex flex-wrap gap-2 justify-end">
                {quest.enrolled ? (
                  <>
                    {!quest.focused && (
                      <Button
                        onClick={() => onAct(`/main-quests/${quest.main_quest_id}/focus`, `Now focused: ${quest.title}`)}
                        disabled={busy === `/main-quests/${quest.main_quest_id}/focus`}
                        data-testid={`mq-story-focus-${quest.main_quest_id}`}
                        className="rounded-full bg-sun-500 hover:bg-sun-600 text-ink-900 font-bold tracking-wider"
                      >
                        <Star className="w-4 h-4 mr-1" /> Focus on this saga
                      </Button>
                    )}
                    <Button
                      onClick={() => onAct(`/main-quests/${quest.main_quest_id}/unenroll`, `Left ${quest.title}`)}
                      disabled={busy === `/main-quests/${quest.main_quest_id}/unenroll`}
                      variant="outline"
                      data-testid={`mq-story-leave-${quest.main_quest_id}`}
                      className="rounded-full"
                    >
                      Leave saga
                    </Button>
                  </>
                ) : (
                  <Button
                    onClick={() => onAct(`/main-quests/${quest.main_quest_id}/enroll`, `Enrolled in ${quest.title}`)}
                    disabled={busy === `/main-quests/${quest.main_quest_id}/enroll`}
                    data-testid={`mq-story-enroll-${quest.main_quest_id}`}
                    className="rounded-full bg-sunset-500 hover:bg-sunset-600 text-white font-bold tracking-wider"
                  >
                    <Plus className="w-4 h-4 mr-1" /> Embark on this saga
                  </Button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
