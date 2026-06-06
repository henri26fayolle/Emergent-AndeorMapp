import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { api, formatErr } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import QuestScroll from "@/components/QuestScroll";
import NpcPortrait from "@/components/NpcPortrait";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { ChevronLeft, Lock, ChevronRight, MapPin } from "lucide-react";
import { toast } from "sonner";
import { playOpenScene, playSelect, playClick } from "@/lib/sound";

const NPC = {
  "north-coast":     { id: "naima",  name: "Naïma",  role: "Sea Guide",       line: "Ki manyer, traveler? Grand Baie ena en tas zafer pou montrer ou. (Lots to show you.)", img: "https://images.pexels.com/photos/36731927/pexels-photo-36731927.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=900&w=1600" },
  "black-river":     { id: "akil",   name: "Akil",   role: "Trail Master",    line: "Bizin lev boner si ou anvi atak Le Pouce. (Be up early if you want Le Pouce.)",         img: "https://images.pexels.com/photos/8387277/pexels-photo-8387277.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=900&w=1600" },
  "south-wild":      { id: "lea",    name: "Léa",    role: "Wind Whisperer",  line: "Le Morne kone ar ou avan ou kone ar li. (The wind knows you first.)",                  img: "https://images.pexels.com/photos/7415730/pexels-photo-7415730.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=900&w=1600" },
  "east-lagoons":    { id: "sanjay", name: "Sanjay", role: "Reef Keeper",     line: "Blue Bay clair couma cristal. Vinn snorkel avek mwa. (Crystal clear. Come snorkel.)",  img: "https://images.pexels.com/photos/15018959/pexels-photo-15018959.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=900&w=1600" },
  "central-culture": { id: "marie",  name: "Marie",  role: "Heritage Keeper", line: "Port Louis pa zis bazar — sa enn istwar. (Not just markets — a story.)",                img: "https://images.pexels.com/photos/32793278/pexels-photo-32793278.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=900&w=1600" },
};

export default function RegionScene({ region, tours, unlocked, onClose, focusedQuest, focusedTourIds }) {
  const { refresh } = useAuth();
  const [confirmTour, setConfirmTour] = useState(null);
  const [busy, setBusy] = useState(false);
  const meta = NPC[region.region_id] || { name: "Guide", role: "Explorer", line: "Welcome.", img: "" };
  // Hide sub-region tours from the main list — those live in city sub-maps
  const regionTours = tours.filter((t) => t.region === region.region_id && !t.subregion);

  // Lock body scroll while open + play open chime
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    playOpenScene();
    return () => { document.body.style.overflow = prev; };
  }, []);

  const book = async () => {
    if (!confirmTour) return;
    setBusy(true);
    try {
      await api.post("/bookings", { tour_id: confirmTour.tour_id });
      playSelect();
      toast.success(`Quest accepted: "${confirmTour.name}". Check in with the guide's PIN to claim XP.`);
      setConfirmTour(null);
      await refresh();
    } catch (e) {
      toast.error(formatErr(e.response?.data?.detail) || e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35 }}
      className="fixed inset-0 z-[60] overflow-hidden"
      data-testid="region-scene"
    >
      {/* Backdrop */}
      <motion.img
        key={meta.img}
        src={meta.img}
        alt=""
        initial={{ scale: 1.1, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 1.1, ease: "easeOut" }}
        className="absolute inset-0 w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-jungle-700/40 via-jungle-700/55 to-jungle-700/90" />

      {/* Top: return-to-map */}
      <div className="absolute top-0 inset-x-0 z-10 p-5 lg:p-7 flex justify-between items-center">
        <button
          onClick={() => { playClick(); onClose(); }}
          data-testid="region-back-btn"
          className="inline-flex items-center gap-2 rounded-full bg-sand-100/90 backdrop-blur px-4 py-2 text-sm font-bold tracking-wider text-ink-900 hover:bg-white shadow-clay transition-colors"
        >
          <ChevronLeft className="w-4 h-4" /> Return to map
        </button>
        <div className="text-right text-sand-100">
          <div className="font-display text-3xl lg:text-4xl drop-shadow [text-shadow:0_2px_10px_rgba(0,0,0,0.5)]" data-testid="region-title">{region.name}</div>
          <div className="text-[10px] tracking-[0.3em] uppercase mt-1 opacity-80">Region of Mauritius</div>
        </div>
      </div>

      {/* Center: locked or quest scrolls */}
      <div className="relative h-full flex flex-col px-5 lg:px-10 pt-24 pb-44 overflow-y-auto">
        {!unlocked ? (
          <div className="max-w-3xl mx-auto w-full">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-center text-sand-100 mb-8"
              data-testid="region-locked"
            >
              <div className="w-24 h-24 mx-auto rounded-full bg-sand-100/15 border-2 border-dashed border-sand-100/50 flex items-center justify-center mb-6">
                <Lock className="w-10 h-10" />
              </div>
              <h3 className="font-display text-3xl mb-3">This region is sealed.</h3>
              <p className="opacity-80">Reach <strong>{region.unlock_xp} XP</strong> by completing tours in unlocked regions, then the guides here will welcome you.</p>
              <p className="opacity-70 text-xs tracking-[0.25em] uppercase mt-6">But the island's stories are free — open your Codex (bottom-left avatar) to listen & read.</p>
            </motion.div>
          </div>
        ) : (
          <div className="max-w-6xl mx-auto w-full">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-sand-100/90 max-w-xl mb-8"
            >
              <p className="text-sm">{region.description}</p>
            </motion.div>
            {regionTours.length === 0 ? (
              <div className="text-sand-100/80 text-center py-12">No tours posted here yet — Ti Dodo is plotting new adventures.</div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 pb-10">
                {regionTours.map((t) => (
                  <QuestScroll key={t.tour_id} tour={t} regionName={region.name} onBegin={setConfirmTour} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom: NPC dialog box (Pokemon-style) with portrait */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.4 }}
        className="absolute left-1/2 -translate-x-1/2 bottom-5 lg:bottom-8 z-10 w-[calc(100%-2rem)] max-w-3xl flex items-end gap-3"
        data-testid="region-npc-dialog"
      >
        <motion.div
          initial={{ opacity: 0, x: -20, rotate: -4 }}
          animate={{ opacity: 1, x: 0, rotate: 0 }}
          transition={{ delay: 0.5, duration: 0.45, ease: "backOut" }}
          className="hidden sm:block w-24 h-24 lg:w-28 lg:h-28 shrink-0 rounded-3xl overflow-hidden border-4 border-jungle-700 shadow-lift"
          data-testid={`npc-portrait-${meta.id}`}
        >
          <NpcPortrait id={meta.id} className="w-full h-full" />
        </motion.div>
        <div className="bg-sand-100/95 backdrop-blur-xl border-4 border-jungle-700 rounded-3xl shadow-lift p-5 lg:p-6 relative flex-1">
          <div className="absolute -top-4 left-6 bg-jungle-700 text-sand-100 px-4 py-1 rounded-full font-display text-sm tracking-wider">
            {meta.name} · {meta.role}
          </div>
          <p className="font-display text-lg lg:text-xl leading-snug text-ink-900 italic">"{meta.line}"</p>
        </div>
      </motion.div>

      {/* Booking confirm */}
      <Dialog open={!!confirmTour} onOpenChange={(o) => !o && setConfirmTour(null)}>
        <DialogContent data-testid="region-book-dialog" className="rounded-3xl max-w-md">
          {confirmTour && (
            <>
              <DialogHeader>
                <DialogTitle className="font-display text-2xl">Accept this quest?</DialogTitle>
                <DialogDescription className="text-ink-700">
                  {meta.name} will be your guide for <strong>{confirmTour.name}</strong>. €{confirmTour.price} per adventurer. Reward: +{confirmTour.xp_reward} XP.
                </DialogDescription>
              </DialogHeader>
              <div className="rounded-2xl bg-sand-100 border border-dashed border-ink-900/20 p-4 my-2 text-sm text-ink-700">
                Bookings are <strong>mocked for demo</strong>. After your real-world tour, ask the guide for the PIN to check in & claim rewards.
              </div>
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setConfirmTour(null)} data-testid="region-book-cancel" className="rounded-full">Cancel</Button>
                <Button onClick={book} disabled={busy} data-testid="region-book-confirm" className="rounded-full bg-jungle-700 hover:bg-jungle-600 text-sand-100">
                  <ChevronRight className="w-4 h-4 mr-1" /> {busy ? "Sealing…" : "Accept quest"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
