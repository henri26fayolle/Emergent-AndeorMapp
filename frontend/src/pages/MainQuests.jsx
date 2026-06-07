import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { api, formatErr } from "@/lib/api";
import RpgHud from "@/components/RpgHud";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Mountain, Droplet, Landmark, Compass, Sparkles, Star, Crown, Trophy, ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { playClick, playSelect } from "@/lib/sound";
import MainQuestStory from "@/components/MainQuestStory";

const ICON_MAP = { Mountain, Droplet, Landmark, Compass };

const THEME = {
  jungle: { bg: "from-[#0E3E2D] via-[#125538] to-[#1B6F4B]", chip: "bg-jungle-500" },
  ocean:  { bg: "from-[#053948] via-[#0A6A7E] to-[#0F8FA8]", chip: "bg-ocean-500"  },
  sunset: { bg: "from-[#5A1A0E] via-[#9A3A1F] to-[#E27447]", chip: "bg-sunset-500" },
  sun:    { bg: "from-[#5C4017] via-[#A37522] to-[#E8B241]", chip: "bg-sun-500 text-ink-900" },
};

export default function MainQuests({ embedded = false }) {
  const [quests, setQuests] = useState([]);
  const [tours, setTours] = useState([]);
  const [busy, setBusy] = useState(null);
  const [selectedId, setSelectedId] = useState(null);

  const load = async () => {
    const [q, t] = await Promise.all([api.get("/main-quests"), api.get("/tours")]);
    setQuests(q.data);
    setTours(t.data);
  };
  useEffect(() => { load(); }, []);

  const act = async (path, label) => {
    setBusy(path);
    try {
      await api.post(path);
      playSelect();
      await load();
      if (label) toast.success(label);
    } catch (e) {
      toast.error(formatErr(e.response?.data?.detail) || e.message);
    } finally {
      setBusy(null);
    }
  };

  const selected = selectedId ? quests.find((q) => q.main_quest_id === selectedId) : null;

  const inner = (
    <main className={embedded ? "relative" : "relative max-w-5xl mx-auto px-6 lg:px-10 py-10 lg:py-14 pb-44 pr-20"}>
      <AnimatePresence mode="wait">
        {selected ? (
          <MainQuestStory
            key="story"
            quest={selected}
            tours={tours}
            busy={busy}
            onBack={() => setSelectedId(null)}
            onAct={act}
          />
        ) : (
          <motion.div
            key="list"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.35 }}
          >
            <motion.header initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
              <span className="chip"><Trophy className="w-3 h-3" /> Main Quests</span>
              <h1 className="font-display text-3xl lg:text-4xl mt-3 italic">Choose your Mauritian saga</h1>
              <p className="text-ink-700 mt-2 max-w-2xl text-sm italic">
                Tap a saga to hear its story.
              </p>
            </motion.header>

            <div className="grid sm:grid-cols-2 gap-4 lg:gap-5">
              {quests.map((q, i) => {
                const Icon = ICON_MAP[q.icon] || Sparkles;
                const theme = THEME[q.theme_color] || THEME.jungle;
                const total = q.progress?.total || 1;
                const done  = q.progress?.completed || 0;
                const segments = Array.from({ length: total }, (_, k) => k < done);
                const isActive = !!q.focused && !q.completed;
                return (
                  <motion.button
                    key={q.main_quest_id}
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.04 + i * 0.06, duration: 0.4, ease: "easeOut" }}
                    whileHover={{ y: -4 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => { playClick(); setSelectedId(q.main_quest_id); }}
                    data-testid={`mq-teaser-${q.main_quest_id}`}
                    className="group text-left"
                  >
                    <Card className={`overflow-hidden border-4 ${isActive ? "border-sun-500" : "border-sand-100"} shadow-lift relative`}>
                      <div className="relative px-5 py-5 bg-[#0E1B26] text-sand-100">
                        <div
                          aria-hidden
                          className="absolute inset-0 opacity-10 pointer-events-none"
                          style={{ backgroundImage: "radial-gradient(rgba(255,255,255,0.5) 1px, transparent 1px)", backgroundSize: "12px 12px" }}
                        />
                        <div className="relative flex items-start gap-3.5">
                          {/* Coloured icon tile */}
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-clay ${theme.chip}`}>
                            <Icon className="w-6 h-6" strokeWidth={2.25} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <h2 className="font-display text-xl lg:text-2xl italic leading-tight">{q.title}</h2>
                              {isActive && (
                                <Badge className="rounded-full bg-sun-500 text-ink-900 text-[10px] tracking-wider font-bold">
                                  <Star className="w-3 h-3 mr-0.5" /> Active
                                </Badge>
                              )}
                              {q.completed && (
                                <Badge className="rounded-full bg-sand-100 text-jungle-700 text-[10px] tracking-wider font-bold">
                                  <Crown className="w-3 h-3 mr-0.5" /> Done
                                </Badge>
                              )}
                            </div>
                            <p className="opacity-80 italic text-xs lg:text-sm mt-0.5 line-clamp-1">{q.subtitle}</p>
                          </div>
                          <ChevronRight className="w-5 h-5 opacity-50 mt-1 group-hover:translate-x-1 transition-transform shrink-0" />
                        </div>

                        {/* Segmented progress bar */}
                        <div className="mt-4 flex items-center gap-1.5" data-testid={`mq-teaser-progress-${q.main_quest_id}`}>
                          {segments.map((on, k) => (
                            <span
                              key={k}
                              className={`flex-1 h-1.5 rounded-full transition-colors duration-500 ${on ? theme.chip : "bg-white/10"}`}
                            />
                          ))}
                        </div>

                        <div className="mt-1.5 flex items-center justify-between text-[10px] tracking-[0.25em] uppercase font-bold opacity-70 tabular-nums">
                          <span>{done}/{total} stops</span>
                          {q.completed
                            ? <span className="text-sun-500">Claim your spoils</span>
                            : isActive ? <span className="text-sun-500">In progress</span> : <span>Tap to enrol</span>}
                        </div>
                      </div>
                    </Card>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );

  if (embedded) return inner;
  return (
    <div className="min-h-screen relative overflow-x-hidden bg-jungle-700">
      <div className="absolute inset-0 paper-bg" />
      <RpgHud />
      {inner}
    </div>
  );
}
