import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Crown, Sparkles, Copy, ChevronRight, Trophy, Gift, Shirt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { playChime, playClick, playUnlock } from "@/lib/sound";

const THEME_BG = {
  jungle: "from-[#0E3E2D] via-[#125538] to-[#1B6F4B]",
  ocean:  "from-[#053948] via-[#0A6A7E] to-[#0F8FA8]",
  sunset: "from-[#5A1A0E] via-[#9A3A1F] to-[#E27447]",
  sun:    "from-[#5C4017] via-[#A37522] to-[#E8B241]",
};

// Typewriter — reused pattern from Prologue/MainQuestStory
function useTypewriter(text, speed = 28, deps = []) {
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
 * Climactic cutscene shown when a Main Quest is fully completed.
 * Props:
 *  - quest: { main_quest_id, title, title_earned, epilogue, theme_color, theme_hex, reward_code, discount_pct, physical_tiers }
 *  - onClose
 */
export default function MainQuestEpilogue({ quest, onClose }) {
  const [beat, setBeat] = useState(0); // 0 ti-dodo, 1 title reveal, 2 spoils
  const { out, done, finish } = useTypewriter(quest?.epilogue || "", 24, [quest?.main_quest_id]);
  const playedRef = useRef(false);

  // Sound cue once when the cutscene appears
  useEffect(() => {
    if (!quest || playedRef.current) return;
    playedRef.current = true;
    try { playChime(); } catch {}
  }, [quest]);

  // Play unlock chime when the title reveal beat opens
  useEffect(() => {
    if (beat === 1) { try { playUnlock(); } catch {} }
  }, [beat]);

  const advance = () => {
    playClick();
    if (beat === 0) {
      if (!done) { finish(); return; }
      setBeat(1);
    } else if (beat === 1) {
      setBeat(2);
    } else {
      onClose();
    }
  };

  // Keyboard advance
  useEffect(() => {
    if (!quest) return;
    const onKey = (e) => {
      if (e.key === " " || e.key === "Enter" || e.key === "ArrowRight") {
        e.preventDefault();
        advance();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [beat, done, quest]);

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(quest.reward_code);
      toast.success(`Code copied · ${quest.reward_code}`);
    } catch {
      toast.error("Copy failed");
    }
  };

  if (!quest) return null;
  const themeBg = THEME_BG[quest.theme_color] || THEME_BG.jungle;
  const themeHex = quest.theme_hex || "#1B6F4B";

  return (
    <AnimatePresence>
      <motion.div
        key={`epilogue-${quest.main_quest_id}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.55, ease: "easeOut" }}
        className="fixed inset-0 z-[120] flex items-center justify-center p-6"
        data-testid={`mq-epilogue-${quest.main_quest_id}`}
      >
        {/* Themed fullscreen backdrop */}
        <div className={`absolute inset-0 bg-gradient-to-br ${themeBg}`} />
        {/* Star field */}
        <div
          aria-hidden
          className="absolute inset-0 opacity-30 pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(rgba(255,255,255,0.85) 1px, transparent 1px), radial-gradient(rgba(255,255,255,0.45) 1px, transparent 1px)",
            backgroundSize: "28px 28px, 56px 56px",
            backgroundPosition: "0 0, 14px 14px",
          }}
        />
        {/* Slow orbiting glow */}
        <motion.div
          aria-hidden
          className="absolute pointer-events-none rounded-full"
          style={{
            width: 900, height: 900,
            background: `radial-gradient(circle, ${themeHex}99 0%, ${themeHex}33 35%, transparent 70%)`,
            filter: "blur(20px)",
          }}
          initial={{ opacity: 0.6, scale: 0.8 }}
          animate={{ opacity: [0.55, 0.85, 0.55], scale: [0.85, 1.05, 0.85] }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Skip */}
        <button
          onClick={() => { playClick(); onClose(); }}
          data-testid="mq-epilogue-skip"
          className="absolute top-6 right-6 z-10 px-4 py-2 rounded-full bg-white/15 hover:bg-white/25 backdrop-blur text-sand-100 text-xs font-bold tracking-[0.3em] uppercase transition-colors"
        >
          Skip →
        </button>

        {/* Stage */}
        <div className="relative max-w-3xl w-full text-center">
          <AnimatePresence mode="wait">
            {beat === 0 && (
              <motion.button
                key="beat-monologue"
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                onClick={advance}
                data-testid="mq-epilogue-monologue"
                className="block w-full text-left"
              >
                <div className="text-[11px] tracking-[0.4em] uppercase text-sand-100/70 font-bold mb-3 inline-flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5" /> A saga remembered
                </div>
                <div className="relative bg-sand-100 border-4 border-jungle-700 rounded-3xl shadow-lift p-7 lg:p-9">
                  <div className="absolute -top-4 left-7 bg-jungle-700 text-sand-100 px-4 py-1 rounded-full font-display text-sm tracking-wider">
                    Ti Dodo
                  </div>
                  <p className="font-display text-xl lg:text-2xl leading-snug text-ink-900 italic min-h-[6.5rem]">
                    "{out}"
                    <span className={`inline-block w-2.5 h-6 ml-1 align-middle bg-ink-900 ${done ? "opacity-0" : "animate-pulse"}`} />
                  </p>
                  <div className="mt-5 flex items-center justify-between text-xs tracking-[0.25em] uppercase text-ink-700">
                    <span>Chapter 1 of 3</span>
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
                key="beat-title"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="text-center"
                data-testid="mq-epilogue-title"
              >
                <motion.div
                  initial={{ scale: 0.4, rotate: -12, opacity: 0 }}
                  animate={{ scale: 1, rotate: 0, opacity: 1 }}
                  transition={{ duration: 0.7, ease: "backOut" }}
                  className="mx-auto w-32 h-32 rounded-full bg-sand-100 ring-8 ring-sand-100/30 flex items-center justify-center shadow-lift"
                  style={{ boxShadow: `0 0 60px 12px ${themeHex}88` }}
                >
                  <Crown className="w-16 h-16" style={{ color: themeHex }} />
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5, duration: 0.5 }}
                  className="mt-6 inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-sand-100/15 backdrop-blur text-sand-100 text-[11px] font-bold tracking-[0.35em] uppercase"
                >
                  <Sparkles className="w-3.5 h-3.5" /> Title earned
                </motion.div>

                <motion.h2
                  initial={{ opacity: 0, y: 14, letterSpacing: "0.1em" }}
                  animate={{ opacity: 1, y: 0, letterSpacing: "0em" }}
                  transition={{ delay: 0.65, duration: 0.7 }}
                  className="mt-4 font-display text-5xl lg:text-6xl text-sand-100 italic"
                >
                  {quest.title_earned}
                </motion.h2>

                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.1 }}
                  className="mt-3 text-sand-100/70 italic text-sm"
                >
                  — Awarded by Ti Dodo, on behalf of the island of Mauritius —
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.4, duration: 0.45 }}
                  className="mt-10"
                >
                  <Button
                    onClick={advance}
                    data-testid="mq-epilogue-claim"
                    className="rounded-full bg-sand-100 hover:bg-white text-jungle-700 font-bold tracking-[0.2em] uppercase px-7 h-12"
                  >
                    Claim your spoils <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </motion.div>
              </motion.div>
            )}

            {beat === 2 && (
              <motion.div
                key="beat-spoils"
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="text-left"
                data-testid="mq-epilogue-spoils"
              >
                <div className="text-[11px] tracking-[0.4em] uppercase text-sand-100/70 font-bold mb-3 inline-flex items-center gap-2 justify-center w-full">
                  <Trophy className="w-3.5 h-3.5" /> Chapter 3 of 3 · Your spoils
                </div>
                <div className="bg-sand-100 border-4 border-jungle-700 rounded-3xl shadow-lift p-7 lg:p-8">
                  <ul className="space-y-4 text-base">
                    <motion.li
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.05 }}
                      className="flex items-start gap-3"
                    >
                      <Gift className="w-5 h-5 mt-1 text-sunset-500 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="font-display text-lg italic">
                          {quest.discount_pct}% bundle voucher
                        </div>
                        <div className="text-xs text-ink-700">Stack-and-save: any An Deor tour, valid 60 days.</div>
                        <div className="mt-2 flex items-center gap-2">
                          <code
                            data-testid="mq-epilogue-code"
                            className="font-mono text-sm tracking-wider bg-sand-200 border-2 border-dashed border-jungle-700/40 rounded-2xl px-3 py-2 flex-1 truncate"
                          >
                            {quest.reward_code}
                          </code>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={copyCode}
                            data-testid="mq-epilogue-copy"
                            className="rounded-full"
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </motion.li>

                    <motion.li
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.15 }}
                      className="flex items-start gap-3"
                    >
                      <Crown className="w-5 h-5 mt-1 text-sunset-500 shrink-0" />
                      <div className="flex-1">
                        <div className="font-display text-lg italic">
                          Unique title — "{quest.title_earned}"
                        </div>
                        <div className="text-xs text-ink-700">Displayed on your profile + leaderboard.</div>
                      </div>
                    </motion.li>

                    {quest.physical_tiers?.includes("tshirt") && (
                      <motion.li
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.25 }}
                        className="flex items-start gap-3"
                      >
                        <Shirt className="w-5 h-5 mt-1 text-sun-500 shrink-0" />
                        <div>
                          <div className="font-display text-lg italic">Branded An Deor T-shirt</div>
                          <div className="text-xs text-ink-700">Ti Dodo will email you for size + shipping.</div>
                        </div>
                      </motion.li>
                    )}

                    {quest.physical_tiers?.includes("partner-goodie") && (
                      <motion.li
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.35 }}
                        className="flex items-start gap-3"
                      >
                        <Gift className="w-5 h-5 mt-1 text-sun-500 shrink-0" />
                        <div>
                          <div className="font-display text-lg italic">Partner goodie unlocked</div>
                          <div className="text-xs text-ink-700">Mystery box — Ti Dodo will reveal it in your inbox.</div>
                        </div>
                      </motion.li>
                    )}

                    <motion.li
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.45 }}
                    >
                      <Badge className="rounded-full bg-jungle-500 text-white">Saga value · ~Rs {quest.aov_mur?.toLocaleString?.() || 0}</Badge>
                    </motion.li>
                  </ul>

                  <div className="mt-7 flex justify-end">
                    <Button
                      onClick={onClose}
                      data-testid="mq-epilogue-close"
                      className="rounded-full bg-jungle-700 hover:bg-jungle-600 text-sand-100 font-bold tracking-[0.2em] uppercase px-6 h-11"
                    >
                      Return to the map <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
