import { useEffect, useState } from "react";
import { api, formatErr } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import Header from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Compass, CheckCircle2, Sparkles } from "lucide-react";

export default function Quests() {
  const { refresh } = useAuth();
  const [quests, setQuests] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [busyId, setBusyId] = useState(null);

  const load = async () => {
    const [q, b] = await Promise.all([api.get("/quests"), api.get("/bookings")]);
    setQuests(q.data); setBookings(b.data);
  };
  useEffect(() => { load(); }, []);

  const complete = async (booking_id) => {
    setBusyId(booking_id);
    try {
      const { data } = await api.post("/bookings/complete", { booking_id });
      if (data.already) toast.info("Already completed.");
      else {
        toast.success(`+${data.xp_gained} XP! Level ${data.new_level}. ${data.rewards_granted?.length ? `🎁 ${data.rewards_granted.length} reward(s) unlocked!` : ""}`);
      }
      await refresh();
      await load();
    } catch (e) {
      toast.error(formatErr(e.response?.data?.detail) || e.message);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="min-h-screen paper-bg">
      <Header />
      <main className="max-w-7xl mx-auto px-6 lg:px-10 py-12">
        <div className="mb-10">
          <span className="chip">Quests</span>
          <h1 className="font-display text-4xl lg:text-5xl mt-3">Goals worth chasing</h1>
        </div>

        <div className="grid lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 space-y-4">
            {quests.map((q) => {
              const pct = Math.min(100, Math.round((q.progress / q.target) * 100));
              return (
                <Card key={q.quest_id} className="card-clay p-6 flex items-center gap-5" data-testid={`quest-row-${q.quest_id}`}>
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${q.completed ? "bg-jungle-500 text-white" : "bg-sand-200 text-jungle-500"}`}>
                    {q.completed ? <CheckCircle2 className="w-7 h-7" /> : <Sparkles className="w-6 h-6" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-display text-xl">{q.name}</h3>
                      <Badge variant="outline" className="rounded-full border-sunset-500/30 text-sunset-500">+{q.xp_reward} XP</Badge>
                      {q.completed && <Badge className="rounded-full bg-jungle-500 text-white">Done</Badge>}
                    </div>
                    <p className="text-sm text-ink-700 mt-1">{q.description}</p>
                    <div className="mt-3 flex items-center gap-3">
                      <Progress value={pct} className="h-2 flex-1 bg-sand-200" />
                      <span className="text-xs text-ink-700 tabular-nums">{q.progress}/{q.target}</span>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          <Card className="card-clay p-6 lg:col-span-5" data-testid="my-bookings-panel">
            <h3 className="font-display text-2xl mb-1">My bookings</h3>
            <p className="text-sm text-ink-700 mb-5">Complete a booking after the experience to claim XP & rewards.</p>
            {bookings.length === 0 ? (
              <div className="text-ink-700 text-center py-10">
                <Compass className="w-10 h-10 mx-auto mb-3 text-sunset-500" />
                Nothing booked yet.
              </div>
            ) : (
              <div className="space-y-3">
                {bookings.map((b) => (
                  <div key={b.booking_id} className="p-4 rounded-2xl bg-sand-100 border border-sand-300" data-testid={`booking-row-${b.booking_id}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold">{b.tour_name}</div>
                        <div className="text-xs text-ink-700">{b.date}</div>
                      </div>
                      {b.status === "completed" ? (
                        <Badge className="rounded-full bg-jungle-500 text-white">Completed</Badge>
                      ) : (
                        <Button onClick={() => complete(b.booking_id)} disabled={busyId === b.booking_id} data-testid={`complete-${b.booking_id}`} className="rounded-full bg-sunset-500 hover:bg-sunset-600 text-white">
                          {busyId === b.booking_id ? "…" : "Mark completed"}
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </main>
    </div>
  );
}
