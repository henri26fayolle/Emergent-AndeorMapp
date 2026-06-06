import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import Header from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Compass, Trophy, Sparkles, MapPin, Lock, ChevronRight, Gift } from "lucide-react";
import MapMauritius from "@/components/MapMauritius";

export default function Dashboard() {
  const { user, refresh } = useAuth();
  const [profile, setProfile] = useState(null);
  const [regions, setRegions] = useState([]);
  const [quests, setQuests] = useState([]);
  const [bookings, setBookings] = useState([]);

  const load = async () => {
    const [p, r, q, b] = await Promise.all([
      api.get("/me/profile"),
      api.get("/regions"),
      api.get("/quests"),
      api.get("/bookings"),
    ]);
    setProfile(p.data); setRegions(r.data); setQuests(q.data); setBookings(b.data);
  };
  useEffect(() => { load(); }, []);

  if (!profile) return <div className="min-h-screen flex items-center justify-center paper-bg"><div className="font-display text-xl text-jungle-500 animate-pulse">Loading your map…</div></div>;

  const xpToNext = 100 - (profile.xp % 100);
  const xpPct = profile.xp % 100;
  const unlockedRegionIds = new Set(profile.regions_unlocked || []);

  return (
    <div className="min-h-screen paper-bg">
      <Header />
      <main className="max-w-7xl mx-auto px-6 lg:px-10 py-10 lg:py-14">
        {/* PROFILE STRIP */}
        <section className="grid lg:grid-cols-12 gap-6 mb-12">
          <Card className="card-clay p-8 lg:col-span-7 relative overflow-hidden" data-testid="profile-card">
            <div className="absolute inset-0 topo-bg opacity-50" />
            <div className="relative">
              <span className="chip"><Sparkles className="w-3 h-3" /> Explorer Profile</span>
              <h1 className="font-display text-4xl lg:text-5xl mt-4">
                Salam, <span className="text-jungle-500">{profile.name || "Explorer"}</span>
              </h1>
              <p className="text-ink-700 mt-2">Level {profile.level} · {profile.xp} XP · {unlockedRegionIds.size} regions unlocked</p>
              <div className="mt-6 max-w-md">
                <div className="flex justify-between text-xs tracking-[0.2em] uppercase text-ink-700 mb-2">
                  <span>Lv {profile.level}</span><span>{xpToNext} XP to Lv {profile.level + 1}</span>
                </div>
                <Progress value={xpPct} data-testid="xp-progress" className="h-3 bg-sand-200" />
              </div>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link to="/tours"><Button data-testid="dash-book-btn" className="btn-pill bg-jungle-500 hover:bg-jungle-600 text-white shadow-lift hover:-translate-y-0.5"><Compass className="w-4 h-4" /> Book a tour</Button></Link>
                <Link to="/companion"><Button data-testid="dash-companion-btn" variant="outline" className="btn-pill border-ink-900/20 hover:bg-sand-200"><Sparkles className="w-4 h-4" /> Ask Ti Dodo</Button></Link>
              </div>
            </div>
          </Card>

          <div className="lg:col-span-5 grid grid-cols-2 gap-4">
            {[
              { i: Trophy, l: "Bookings", v: profile.bookings_count || 0, c: "text-sunset-500", tid: "stat-bookings" },
              { i: Sparkles, l: "Cards", v: (profile.cards || []).length, c: "text-sun-600", tid: "stat-cards" },
              { i: MapPin, l: "Regions", v: (profile.regions_unlocked || []).length, c: "text-jungle-500", tid: "stat-regions" },
              { i: Gift, l: "Badges", v: (profile.badges || []).length, c: "text-ocean-500", tid: "stat-badges" },
            ].map((s, i) => (
              <Card key={i} className="card-clay p-6" data-testid={s.tid}>
                <s.i className={`w-6 h-6 ${s.c}`} />
                <div className="font-display text-4xl mt-4">{s.v}</div>
                <div className="text-xs tracking-[0.2em] uppercase text-ink-700 mt-1">{s.l}</div>
              </Card>
            ))}
          </div>
        </section>

        {/* MAP */}
        <section className="mb-12">
          <div className="flex items-end justify-between mb-6 flex-wrap gap-4">
            <div>
              <span className="chip">Mauritius map</span>
              <h2 className="font-display text-3xl lg:text-4xl mt-3">Your island, region by region</h2>
            </div>
            <div className="text-sm text-ink-700">Unlock regions by completing tours.</div>
          </div>
          <MapMauritius regions={regions} unlocked={unlockedRegionIds} />
        </section>

        {/* QUESTS + BOOKINGS */}
        <section className="grid lg:grid-cols-12 gap-6">
          <Card className="card-clay p-8 lg:col-span-7" data-testid="quests-preview">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-display text-2xl">Active quests</h3>
              <Link to="/quests" className="text-sm text-jungle-500 hover:underline flex items-center gap-1" data-testid="quests-all-link">See all <ChevronRight className="w-4 h-4" /></Link>
            </div>
            <div className="space-y-4">
              {quests.slice(0, 3).map((q) => {
                const pct = Math.min(100, Math.round((q.progress / q.target) * 100));
                return (
                  <div key={q.quest_id} className="flex items-center gap-4 p-4 rounded-2xl bg-sand-100 border border-sand-300" data-testid={`quest-${q.quest_id}`}>
                    <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center shadow-clay">
                      <Sparkles className={`w-5 h-5 ${q.completed ? "text-jungle-500" : "text-sunset-500"}`} />
                    </div>
                    <div className="flex-1">
                      <div className="font-display text-lg">{q.name}</div>
                      <div className="text-sm text-ink-700">{q.description}</div>
                      <Progress value={pct} className="h-2 mt-2 bg-sand-300" />
                    </div>
                    <Badge variant="outline" className="rounded-full border-jungle-500/30 text-jungle-500">+{q.xp_reward} XP</Badge>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card className="card-clay p-8 lg:col-span-5" data-testid="bookings-card">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-display text-2xl">My bookings</h3>
              <Link to="/tours" className="text-sm text-jungle-500 hover:underline" data-testid="bookings-all-link">Book more</Link>
            </div>
            {bookings.length === 0 ? (
              <div className="text-ink-700 text-center py-8">
                <Compass className="w-10 h-10 mx-auto mb-3 text-sunset-500" />
                No bookings yet. Pick your first adventure.
              </div>
            ) : (
              <div className="space-y-3">
                {bookings.slice(0, 4).map((b) => (
                  <div key={b.booking_id} className="flex items-center justify-between p-3 rounded-2xl bg-sand-100 border border-sand-300" data-testid={`booking-${b.booking_id}`}>
                    <div>
                      <div className="font-semibold">{b.tour_name}</div>
                      <div className="text-xs text-ink-700">{b.date} · {b.status}</div>
                    </div>
                    <Badge className={`rounded-full ${b.status === "completed" ? "bg-jungle-500 text-white" : "bg-sun-500 text-ink-900"}`}>{b.status}</Badge>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </section>
      </main>
    </div>
  );
}
