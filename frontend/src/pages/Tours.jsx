import { useEffect, useState } from "react";
import { api, formatErr } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import Header from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Clock, MapPin, Sparkles, Compass } from "lucide-react";
import { toast } from "sonner";

export default function Tours() {
  const { user } = useAuth();
  const [tours, setTours] = useState([]);
  const [regions, setRegions] = useState([]);
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    Promise.all([api.get("/tours"), api.get("/regions")]).then(([t, r]) => { setTours(t.data); setRegions(r.data); });
  }, []);

  const filtered = tours.filter((t) => filter === "all" || t.category === filter);
  const regionName = (id) => regions.find((r) => r.region_id === id)?.name || id;

  const book = async () => {
    if (!selected) return;
    setBusy(true);
    try {
      await api.post("/bookings", { tour_id: selected.tour_id });
      toast.success(`Booked "${selected.name}". Go complete it from your dashboard.`);
      setSelected(null);
    } catch (e) {
      toast.error(formatErr(e.response?.data?.detail) || e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen paper-bg">
      <Header />
      <main className="max-w-7xl mx-auto px-6 lg:px-10 py-12">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-10">
          <div>
            <span className="chip">Tours marketplace</span>
            <h1 className="font-display text-4xl lg:text-5xl mt-3">Pick your next quest</h1>
            <p className="text-ink-700 mt-2 max-w-xl">Outdoor or cultural — every tour you book grants XP, regions, cards & badges.</p>
          </div>
          <div className="flex gap-2" data-testid="tours-filters">
            {[{ k: "all", l: "All" }, { k: "outdoor", l: "Outdoor" }, { k: "culture", l: "Culture" }].map((f) => (
              <Button key={f.k} variant={filter === f.k ? "default" : "outline"} onClick={() => setFilter(f.k)} data-testid={`tours-filter-${f.k}`} className={`rounded-full ${filter === f.k ? "bg-jungle-500 hover:bg-jungle-600 text-white" : "border-ink-900/20"}`}>
                {f.l}
              </Button>
            ))}
          </div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((t) => (
            <Card key={t.tour_id} className="card-clay overflow-hidden group hover:-translate-y-1 hover:shadow-lift transition-all" data-testid={`tour-card-${t.tour_id}`}>
              <div className="relative h-48 overflow-hidden">
                <img src={t.image} alt={t.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                <div className="absolute inset-0 bg-gradient-to-t from-jungle-700/60 to-transparent" />
                <Badge className={`absolute top-3 left-3 rounded-full ${t.category === "outdoor" ? "bg-jungle-500" : "bg-sunset-500"} text-white`}>
                  {t.category}
                </Badge>
                <Badge className="absolute top-3 right-3 rounded-full bg-sun-500 text-ink-900 font-bold">+{t.xp_reward} XP</Badge>
              </div>
              <div className="p-6">
                <div className="flex items-center gap-3 text-xs tracking-[0.2em] uppercase text-ink-700 mb-2">
                  <MapPin className="w-3 h-3" /> {regionName(t.region)}
                  <span>·</span>
                  <Clock className="w-3 h-3" /> {t.duration}
                </div>
                <h3 className="font-display text-xl mb-2">{t.name}</h3>
                <p className="text-sm text-ink-700 mb-5 line-clamp-2">{t.description}</p>
                <div className="flex items-center justify-between">
                  <div className="font-display text-2xl text-jungle-500">€{t.price}</div>
                  <Button onClick={() => setSelected(t)} data-testid={`tour-book-${t.tour_id}`} className="rounded-full bg-sunset-500 hover:bg-sunset-600 text-white">
                    <Compass className="w-4 h-4 mr-1" /> Book
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </main>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent data-testid="book-dialog" className="rounded-3xl max-w-md">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="font-display text-2xl">Confirm booking</DialogTitle>
                <DialogDescription className="text-ink-700">{selected.name} — €{selected.price}</DialogDescription>
              </DialogHeader>
              <div className="rounded-2xl bg-sand-100 p-4 my-2 flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-sunset-500 mt-1" />
                <div className="text-sm text-ink-700">
                  Booking is <strong>mocked for demo</strong>. After confirmation, mark the tour as <em>completed</em> from your bookings to earn XP, cards and unlock rewards.
                </div>
              </div>
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setSelected(null)} data-testid="book-cancel" className="rounded-full">Cancel</Button>
                <Button onClick={book} disabled={busy} data-testid="book-confirm" className="rounded-full bg-jungle-500 hover:bg-jungle-600 text-white">{busy ? "Booking…" : "Confirm"}</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
