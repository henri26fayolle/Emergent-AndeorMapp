import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { api, formatErr } from "@/lib/api";
import RpgHud from "@/components/RpgHud";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Mountain, Droplet, Landmark, Compass, Sparkles, Check, Star, Crown, Lock, Eye, Plus, Trophy,
} from "lucide-react";
import { toast } from "sonner";
import { playClick, playSelect } from "@/lib/sound";

const ICON_MAP = { Mountain, Droplet, Landmark, Compass };

const THEME = {
  jungle: { bg: "from-[#0E3E2D] via-[#125538] to-[#1B6F4B]", chip: "bg-jungle-500", ring: "ring-jungle-500" },
  ocean:  { bg: "from-[#053948] via-[#0A6A7E] to-[#0F8FA8]", chip: "bg-ocean-500",  ring: "ring-ocean-500" },
  sunset: { bg: "from-[#5A1A0E] via-[#9A3A1F] to-[#E27447]", chip: "bg-sunset-500", ring: "ring-sunset-500" },
  sun:    { bg: "from-[#5C4017] via-[#A37522] to-[#E8B241]", chip: "bg-sun-500 text-ink-900", ring: "ring-sun-500" },
};

export default function MainQuests() {
  const [quests, setQuests] = useState([]);
  const [tours, setTours] = useState([]);
  const [busy, setBusy] = useState(null);

  const load = async () => {
    const [q, t] = await Promise.all([api.get("/main-quests"), api.get("/tours")]);
    setQuests(q.data);
    setTours(t.data);
  };
  useEffect(() => { load(); }, []);

  const tourName = (id) => tours.find((t) => t.tour_id === id)?.name || id;
  const tourPrice = (id) => tours.find((t) => t.tour_id === id)?.price || 0;
  const tourRegion = (id) => tours.find((t) => t.tour_id === id)?.region || "";

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

  return (
    <div className="min-h-screen relative overflow-x-hidden bg-jungle-700">
      <div className="absolute inset-0 paper-bg" />
      <RpgHud />

      <main className="relative max-w-6xl mx-auto px-6 lg:px-10 py-10 lg:py-14 pb-44 pr-20">
        <motion.header initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
          <span className="chip"><Trophy className="w-3 h-3" /> Main Quests</span>
          <h1 className="font-display text-4xl lg:text-5xl mt-3 italic">Choose your Mauritian saga</h1>
          <p className="text-ink-700 mt-2 max-w-2xl text-sm">
            Each Main Quest is a curated bundle of tours that, when completed, awards a unique title, a <strong>50% bundle voucher</strong>,
            a leaderboard entry and a final epilogue from Ti Dodo. Bigger quests can also unlock a branded T-shirt or a partner goodie.
            You can be on <strong>multiple quests at once</strong> — but only your <strong>focused</strong> quest lights up the map.
          </p>
        </motion.header>

        <div className="grid gap-6 lg:gap-8">
          {quests.map((q, i) => {
            const Icon = ICON_MAP[q.icon] || Sparkles;
            const t = THEME[q.theme_color] || THEME.jungle;
            const pct = q.progress?.percent || 0;
            const totalEur = q.tour_ids.reduce((a, id) => a + tourPrice(id), 0);
            const aovMur = totalEur * 50;

            return (
              <motion.div
                key={q.main_quest_id}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 + i * 0.07, duration: 0.45, ease: "easeOut" }}
                data-testid={`mq-${q.main_quest_id}`}
              >
                <Card className={`overflow-hidden border-4 ${q.focused ? "border-sun-500" : "border-sand-100"} shadow-lift relative`}>
                  {/* Themed banner */}
                  <div
                    className={`relative px-6 lg:px-8 py-6 lg:py-7 bg-gradient-to-br ${t.bg} text-sand-100`}
                  >
                    <div
                      aria-hidden
                      className="absolute inset-0 opacity-15 pointer-events-none"
                      style={{
                        backgroundImage:
                          "radial-gradient(rgba(255,255,255,0.7) 1px, transparent 1px)",
                        backgroundSize: "10px 10px",
                      }}
                    />
                    <div className="relative flex items-start justify-between gap-4 flex-wrap">
                      <div className="flex items-center gap-4">
                        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ring-4 ring-sand-100/30 ${t.chip}`}>
                          <Icon className="w-8 h-8" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h2 className="font-display text-2xl lg:text-3xl italic">{q.title}</h2>
                            {q.focused && (
                              <Badge className="rounded-full bg-sun-500 text-ink-900 font-bold tracking-wider" data-testid={`mq-focused-${q.main_quest_id}`}>
                                <Star className="w-3 h-3 mr-1" /> Focused
                              </Badge>
                            )}
                            {q.completed && (
                              <Badge className="rounded-full bg-sand-100 text-jungle-700 font-bold tracking-wider">
                                <Crown className="w-3 h-3 mr-1" /> Completed
                              </Badge>
                            )}
                          </div>
                          <p className="opacity-90 text-sm mt-1 italic">{q.subtitle}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {q.enrolled ? (
                          <>
                            {!q.focused && (
                              <Button
                                onClick={() => { playClick(); act(`/main-quests/${q.main_quest_id}/focus`, `Now focused: ${q.title}`); }}
                                disabled={busy === `/main-quests/${q.main_quest_id}/focus`}
                                size="sm"
                                data-testid={`mq-focus-${q.main_quest_id}`}
                                className="rounded-full bg-sun-500 hover:bg-sun-600 text-ink-900 font-bold tracking-wider"
                              >
                                <Star className="w-4 h-4 mr-1" /> Focus
                              </Button>
                            )}
                            <Button
                              onClick={() => { playClick(); act(`/main-quests/${q.main_quest_id}/unenroll`, `Left ${q.title}`); }}
                              disabled={busy === `/main-quests/${q.main_quest_id}/unenroll`}
                              size="sm"
                              variant="outline"
                              data-testid={`mq-leave-${q.main_quest_id}`}
                              className="rounded-full bg-sand-100/15 border-sand-100/30 text-sand-100 hover:bg-sand-100/25"
                            >
                              Leave
                            </Button>
                          </>
                        ) : (
                          <Button
                            onClick={() => { playClick(); act(`/main-quests/${q.main_quest_id}/enroll`, `Enrolled in ${q.title}`); }}
                            disabled={busy === `/main-quests/${q.main_quest_id}/enroll`}
                            data-testid={`mq-enroll-${q.main_quest_id}`}
                            className="rounded-full bg-sand-100 text-jungle-700 hover:bg-white font-bold tracking-wider"
                          >
                            <Plus className="w-4 h-4 mr-1" /> Enrol
                          </Button>
                        )}
                      </div>
                    </div>

                    <p className="relative mt-5 max-w-2xl text-sand-100/90 leading-relaxed text-sm lg:text-base italic">
                      "{q.lore_intro}"
                    </p>

                    <div className="relative mt-5 flex items-center gap-3 flex-wrap">
                      <div className="text-[10px] tracking-[0.3em] uppercase text-sand-100/80 font-bold">
                        {q.progress.completed}/{q.progress.total} tours completed
                      </div>
                      <div className="flex-1 min-w-[180px] max-w-md">
                        <div className="h-2 rounded-full bg-sand-100/15 overflow-hidden">
                          <div className="h-full bg-sand-100 rounded-full transition-[width] duration-500" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                      <div className="text-[10px] tracking-[0.3em] uppercase text-sand-100/80 font-bold">{pct}%</div>
                    </div>
                  </div>

                  {/* Quest tours + tiers */}
                  <div className="bg-sand-100 p-6 lg:p-8">
                    <div className="grid lg:grid-cols-[1fr_280px] gap-6">
                      <div>
                        <div className="text-[10px] tracking-[0.3em] uppercase text-ink-700 font-bold mb-3">
                          Tours in this saga
                        </div>
                        <ul className="space-y-2">
                          {q.tour_ids.map((id) => {
                            const done = q.progress.completed_tours.includes(id);
                            return (
                              <li
                                key={id}
                                data-testid={`mq-tour-${q.main_quest_id}-${id}`}
                                className={`flex items-center gap-3 rounded-xl border px-3 py-2 ${
                                  done ? "border-jungle-500 bg-jungle-500/10" : "border-ink-900/15 bg-white/60"
                                }`}
                              >
                                <div
                                  className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                                    done ? "bg-jungle-500 text-white" : "bg-sand-300 text-ink-700"
                                  }`}
                                >
                                  {done ? <Check className="w-3.5 h-3.5" /> : <Lock className="w-3 h-3" />}
                                </div>
                                <div className="flex-1 text-sm font-semibold">{tourName(id)}</div>
                                <div className="text-[10px] tracking-[0.25em] uppercase text-ink-700 opacity-70">
                                  {tourRegion(id)}
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      </div>

                      <div>
                        <div className="text-[10px] tracking-[0.3em] uppercase text-ink-700 font-bold mb-3">
                          Rewards on completion
                        </div>
                        <ul className="space-y-2 text-sm">
                          <li className="flex items-start gap-2 text-ink-900">
                            <Sparkles className="w-4 h-4 mt-0.5 text-sunset-500" />
                            <span><strong>50%</strong> bundle voucher (any tour, 60 days)</span>
                          </li>
                          <li className="flex items-start gap-2 text-ink-900">
                            <Crown className="w-4 h-4 mt-0.5 text-sunset-500" />
                            <span>Unique title: <em>"{q.title_earned}"</em></span>
                          </li>
                          <li className="flex items-start gap-2 text-ink-900">
                            <Trophy className="w-4 h-4 mt-0.5 text-sunset-500" />
                            <span>Leaderboard entry on andeor.mu</span>
                          </li>
                          {aovMur >= 15000 && (
                            <li className="flex items-start gap-2 text-ink-900">
                              <Sparkles className="w-4 h-4 mt-0.5 text-sun-500" />
                              <span>Branded An Deor T-shirt (saga ≥ Rs 15,000)</span>
                            </li>
                          )}
                          {aovMur >= 25000 && (
                            <li className="flex items-start gap-2 text-ink-900">
                              <Sparkles className="w-4 h-4 mt-0.5 text-sun-500" />
                              <span>Partner Goodie (saga ≥ Rs 25,000)</span>
                            </li>
                          )}
                          <li className="flex items-start gap-2 text-ink-900">
                            <Eye className="w-4 h-4 mt-0.5 text-sunset-500" />
                            <span>A final epilogue from Ti Dodo</span>
                          </li>
                        </ul>
                        <div className="text-[10px] tracking-[0.25em] uppercase text-ink-700 opacity-70 mt-3">
                          Saga value · ~Rs {aovMur.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
