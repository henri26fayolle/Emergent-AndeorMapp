import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { api, formatErr } from "@/lib/api";
import RpgHud from "@/components/RpgHud";
import QuestScroll from "@/components/QuestScroll";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Sparkles, ChevronRight } from "lucide-react";
import { toast } from "sonner";

export default function Tours() {
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
      toast.success(`Quest accepted: "${selected.name}". Find your guide & check in with their PIN.`);
      setSelected(null);
    } catch (e) {
      toast.error(formatErr(e.response?.data?.detail) || e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-x-hidden bg-jungle-700">
      <div className="absolute inset-0 paper-bg" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(255,255,255,0.4),_transparent_50%)]" />
      <RpgHud />

      <main className="relative max-w-7xl mx-auto px-6 lg:px-10 py-10 lg:py-14 pb-44 pr-20">
        <motion.header
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="mb-10 flex flex-wrap items-end justify-between gap-4"
        >
          <div>
            <span className="chip">Adventurer's board</span>
            <h1 className="font-display text-4xl lg:text-5xl mt-3 italic">All open quests</h1>
            <p className="text-ink-700 mt-2 max-w-xl text-sm">Each scroll is signed by an An Deor guide. Accept the quest, meet them on land, and claim the seal.</p>
          </div>
          <div className="flex gap-2" data-testid="tours-filters">
            {[{ k: "all", l: "All" }, { k: "outdoor", l: "Outdoor" }, { k: "culture", l: "Culture" }].map((f) => (
              <Button key={f.k} variant={filter === f.k ? "default" : "outline"} onClick={() => setFilter(f.k)} data-testid={`tours-filter-${f.k}`} className={`rounded-full ${filter === f.k ? "bg-jungle-700 hover:bg-jungle-600 text-sand-100" : "border-ink-900/20"}`}>
                {f.l}
              </Button>
            ))}
          </div>
        </motion.header>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {filtered.map((t) => (
            <QuestScroll key={t.tour_id} tour={t} regionName={regionName(t.region)} onBegin={setSelected} />
          ))}
        </div>
      </main>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent data-testid="book-dialog" className="rounded-3xl max-w-md">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="font-display text-2xl">Accept this quest?</DialogTitle>
                <DialogDescription className="text-ink-700">"{selected.name}" — €{selected.price} · +{selected.xp_reward} XP on completion.</DialogDescription>
              </DialogHeader>
              <div className="rounded-2xl bg-sand-100 border border-dashed border-ink-900/20 p-4 my-2 flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-sunset-500 mt-1" />
                <div className="text-sm text-ink-700">
                  Bookings are <strong>mocked for demo</strong>. After your real-world tour, ask the An Deor guide for their <strong>PIN</strong> and check in from your Journal.
                </div>
              </div>
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setSelected(null)} data-testid="book-cancel" className="rounded-full">Cancel</Button>
                <Button onClick={book} disabled={busy} data-testid="book-confirm" className="rounded-full bg-jungle-700 hover:bg-jungle-600 text-sand-100">
                  <ChevronRight className="w-4 h-4 mr-1" /> {busy ? "Sealing…" : "Accept quest"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
