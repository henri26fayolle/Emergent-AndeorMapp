import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { api, formatErr } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import RpgHud from "@/components/RpgHud";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Compass, CheckCircle2, Sparkles, KeyRound, ScrollText } from "lucide-react";

export default function Quests() {
  const { refresh } = useAuth();
  const [quests, setQuests] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [busyId, setBusyId] = useState(null);
  const [checkInBooking, setCheckInBooking] = useState(null);
  const [pin, setPin] = useState("");
  const [error, setError] = useState(null);

  const load = async () => {
    const [q, b] = await Promise.all([api.get("/quests"), api.get("/bookings")]);
    setQuests(q.data); setBookings(b.data);
  };
  useEffect(() => { load(); }, []);

  const submitCheckIn = async (e) => {
    e?.preventDefault?.();
    if (!checkInBooking) return;
    setBusyId(checkInBooking.booking_id);
    setError(null);
    try {
      const { data } = await api.post("/bookings/checkin", { booking_id: checkInBooking.booking_id, pin });
      if (data.already) toast.info("Already checked in.");
      else toast.success(`+${data.xp_gained} XP! Level ${data.new_level}. ${data.rewards_granted?.length ? `🎁 ${data.rewards_granted.length} reward(s) unlocked!` : ""}`);
      setCheckInBooking(null);
      await refresh();
      await load();
    } catch (e) {
      setError(formatErr(e.response?.data?.detail) || e.message);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="min-h-screen relative overflow-x-hidden bg-jungle-700">
      <div className="absolute inset-0 paper-bg" />
      <RpgHud />

      <main className="relative max-w-6xl mx-auto px-6 lg:px-10 py-10 lg:py-14 pb-44 pr-20">
        <motion.header initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
          <span className="chip"><ScrollText className="w-3 h-3" /> Adventurer's journal</span>
          <h1 className="font-display text-4xl lg:text-5xl mt-3 italic">Your quests, your story</h1>
          <p className="text-ink-700 mt-2 max-w-xl text-sm">Track active goals and check in with your guide's PIN to claim seals, cards & rewards.</p>
        </motion.header>

        <div className="grid lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 space-y-3">
            <div className="text-xs font-bold tracking-[0.3em] uppercase text-ink-700 mb-2">— Quest log —</div>
            {quests.map((q, i) => {
              const pct = Math.min(100, Math.round((q.progress / q.target) * 100));
              return (
                <motion.div
                  key={q.quest_id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                >
                  <Card className="card-clay p-5 flex items-center gap-4 border-l-4" style={{ borderLeftColor: q.completed ? "#265448" : "#D46F4D" }} data-testid={`quest-row-${q.quest_id}`}>
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${q.completed ? "bg-jungle-500 text-white" : "bg-sand-200 text-jungle-700"}`}>
                      {q.completed ? <CheckCircle2 className="w-6 h-6" /> : <Sparkles className="w-5 h-5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-display text-lg italic">{q.name}</h3>
                        <Badge variant="outline" className="rounded-full border-sunset-500/30 text-sunset-500">+{q.xp_reward} XP</Badge>
                        {q.completed && <Badge className="rounded-full bg-jungle-500 text-white">Sealed</Badge>}
                      </div>
                      <p className="text-sm text-ink-700 mt-1">{q.description}</p>
                      <div className="mt-2 flex items-center gap-3">
                        <Progress value={pct} className="h-2 flex-1 bg-sand-200" />
                        <span className="text-xs text-ink-700 tabular-nums">{q.progress}/{q.target}</span>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div>

          <div className="lg:col-span-5">
            <div className="text-xs font-bold tracking-[0.3em] uppercase text-ink-700 mb-2">— Active scrolls —</div>
            <Card className="card-clay p-5 bg-[#FBF4E2]" data-testid="my-bookings-panel">
              <p className="text-sm text-ink-700 mb-4 flex items-start gap-2">
                <KeyRound className="w-4 h-4 mt-0.5 text-sunset-500 shrink-0" />
                Ask your An Deor guide for the tour's PIN at the end of the experience.
              </p>
              {bookings.length === 0 ? (
                <div className="text-ink-700 text-center py-8">
                  <Compass className="w-10 h-10 mx-auto mb-3 text-sunset-500" />
                  No active scrolls. Accept a quest from the map or marketplace.
                </div>
              ) : (
                <div className="space-y-3">
                  {bookings.map((b, i) => (
                    <motion.div
                      key={b.booking_id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="p-3 rounded-2xl bg-sand-100 border-2 border-dashed border-[#7A5A2B]/30"
                      data-testid={`booking-row-${b.booking_id}`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-semibold truncate italic">{b.tour_name}</div>
                          <div className="text-xs text-ink-700">{b.date}</div>
                        </div>
                        {b.status === "completed" ? (
                          <Badge className="rounded-full bg-jungle-500 text-white">Sealed</Badge>
                        ) : (
                          <Button
                            onClick={() => { setCheckInBooking(b); setPin(""); setError(null); }}
                            data-testid={`checkin-${b.booking_id}`}
                            className="rounded-full bg-sunset-500 hover:bg-sunset-600 text-white shrink-0"
                            size="sm"
                          >
                            <KeyRound className="w-3.5 h-3.5 mr-1" /> Check in
                          </Button>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>
      </main>

      <Dialog open={!!checkInBooking} onOpenChange={(o) => !o && setCheckInBooking(null)}>
        <DialogContent data-testid="checkin-dialog" className="rounded-3xl max-w-md">
          {checkInBooking && (
            <form onSubmit={submitCheckIn}>
              <DialogHeader>
                <DialogTitle className="font-display text-2xl flex items-center gap-2">
                  <KeyRound className="w-6 h-6 text-sunset-500" /> Guide check-in
                </DialogTitle>
                <DialogDescription className="text-ink-700">
                  Enter the PIN your An Deor guide gave you for <strong>{checkInBooking.tour_name}</strong>.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <Label htmlFor="pin-input" className="text-xs tracking-[0.2em] uppercase">Guide PIN</Label>
                <Input
                  id="pin-input"
                  data-testid="checkin-pin-input"
                  autoFocus
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="e.g. REEF42"
                  className="rounded-2xl mt-2 text-center text-2xl font-display tracking-[0.3em] uppercase h-14"
                />
                {error && <div className="text-sunset-600 text-sm mt-3" data-testid="checkin-error">{error}</div>}
                <div className="text-xs text-ink-700 mt-3">Demo PINs: REEF42, RIDGE07, PIMENT9, WIND88, SEGA21.</div>
              </div>
              <DialogFooter className="gap-2">
                <Button type="button" variant="outline" onClick={() => setCheckInBooking(null)} data-testid="checkin-cancel" className="rounded-full">Cancel</Button>
                <Button type="submit" disabled={!pin.trim() || busyId === checkInBooking.booking_id} data-testid="checkin-submit" className="rounded-full bg-jungle-700 hover:bg-jungle-600 text-sand-100">
                  {busyId === checkInBooking.booking_id ? "Verifying…" : "Claim rewards"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
