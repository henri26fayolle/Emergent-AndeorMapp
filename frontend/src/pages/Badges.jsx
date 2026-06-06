import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { api } from "@/lib/api";
import RpgHud from "@/components/RpgHud";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, Lock, Award, Layers, Compass, MapPin } from "lucide-react";
import { playClick } from "@/lib/sound";

const CARD_LIB = {
  "card-blue-bay":      { name: "Blue Bay Reef",   tagline: "Turquoise & coral garden", image: "https://images.pexels.com/photos/15018959/pexels-photo-15018959.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940", rarity: "Common" },
  "card-le-pouce":      { name: "Le Pouce Summit", tagline: "Sunrise ridge",            image: "https://images.pexels.com/photos/8387277/pexels-photo-8387277.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",   rarity: "Rare" },
  "card-creole-table":  { name: "Creole Table",    tagline: "Rougaille mastery",        image: "https://images.pexels.com/photos/32793278/pexels-photo-32793278.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",  rarity: "Rare" },
  "card-le-morne":      { name: "Le Morne Wind",   tagline: "Kite legend",              image: "https://images.pexels.com/photos/7415730/pexels-photo-7415730.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",   rarity: "Epic" },
  "card-sega":          { name: "Sega Soul",       tagline: "Beach drum night",         image: "https://images.pexels.com/photos/36731927/pexels-photo-36731927.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",  rarity: "Rare" },
};

const BADGE_LIB = {
  "badge-reef-friend":   { name: "Reef Friend",   tone: "ocean",  desc: "Snorkeled responsibly." },
  "badge-ridge-runner":  { name: "Ridge Runner",  tone: "jungle", desc: "Conquered a Mauritian summit." },
  "badge-piment-master": { name: "Piment Master", tone: "sunset", desc: "Cooked authentic Creole." },
  "badge-wind-rider":    { name: "Wind Rider",    tone: "ocean",  desc: "Tamed Le Morne wind." },
  "badge-sega-soul":     { name: "Sega Soul",     tone: "sunset", desc: "Danced through a Sega night." },
};

const rarityColor = { Common: "bg-ocean-100 text-ocean-700", Rare: "bg-sun-500 text-ink-900", Epic: "bg-sunset-500 text-white" };
const toneStyle = { ocean: "bg-ocean-500 text-white", jungle: "bg-jungle-500 text-white", sunset: "bg-sunset-500 text-white" };

export default function Badges() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [tours, setTours] = useState([]);
  const [regions, setRegions] = useState([]);

  useEffect(() => {
    Promise.all([api.get("/me/profile"), api.get("/tours"), api.get("/regions")]).then(([p, t, r]) => {
      setProfile(p.data); setTours(t.data); setRegions(r.data);
    });
  }, []);

  if (!profile) return <div className="min-h-screen flex items-center justify-center bg-jungle-700"><div className="font-display text-xl text-sand-100 animate-pulse">Opening your bag…</div></div>;

  const ownedCards = new Set(profile.cards || []);
  const ownedBadges = new Set(profile.badges || []);
  const cardCount = Object.keys(CARD_LIB).length;
  const badgeCount = Object.keys(BADGE_LIB).length;

  // Map card_id -> tour that unlocks it
  const cardToTour = {};
  tours.forEach((t) => { if (t.card_id) cardToTour[t.card_id] = t; });
  const regionName = (id) => regions.find((r) => r.region_id === id)?.name || id;

  const unowned = Object.entries(CARD_LIB).filter(([id]) => !ownedCards.has(id));

  return (
    <div className="min-h-screen relative overflow-x-hidden bg-jungle-700">
      <div className="absolute inset-0 paper-bg" />
      <RpgHud />

      <main className="relative max-w-6xl mx-auto px-6 lg:px-10 py-10 lg:py-14 pb-44 pr-20">
        <motion.header initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
          <span className="chip"><Layers className="w-3 h-3" /> Adventurer's bag</span>
          <h1 className="font-display text-4xl lg:text-5xl mt-3 italic">Cards & seals</h1>
          <p className="text-ink-700 mt-2 text-sm">
            <strong>{ownedCards.size}/{cardCount}</strong> cards · <strong>{ownedBadges.size}/{badgeCount}</strong> seals earned
          </p>
        </motion.header>

        <h2 className="font-display text-2xl italic mb-5">Island cards</h2>
        <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-12">
          {Object.entries(CARD_LIB).map(([id, c], i) => {
            const owned = ownedCards.has(id);
            return (
              <motion.div
                key={id}
                initial={{ opacity: 0, y: 12, rotate: -1 }}
                animate={{ opacity: 1, y: 0, rotate: 0 }}
                transition={{ delay: i * 0.06, duration: 0.35 }}
                whileHover={{ y: -6, rotate: owned ? 1 : 0 }}
              >
                <Card className={`overflow-hidden border-4 ${owned ? "border-sand-100" : "border-sand-100/40 grayscale"} bg-jungle-700 shadow-lift relative`} data-testid={`card-${id}`}>
                  <div className="relative h-44">
                    <img src={c.image} alt={c.name} className="w-full h-full object-cover" style={{ filter: owned ? "saturate(1.15)" : "saturate(0.4)" }} />
                    <div className="absolute inset-0 bg-gradient-to-t from-jungle-700/85 via-transparent to-transparent" />
                    <Badge className={`absolute top-3 left-3 rounded-full ${rarityColor[c.rarity]}`}>{c.rarity}</Badge>
                    {!owned && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-14 h-14 rounded-full bg-sand-100/95 flex items-center justify-center"><Lock className="w-6 h-6 text-ink-700" /></div>
                      </div>
                    )}
                  </div>
                  <div className="p-4 bg-sand-100">
                    <div className="font-display text-lg italic">{c.name}</div>
                    <div className="text-xs text-ink-700">{c.tagline}</div>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* POKEDEX DISCOVERY FEED — only show if any unowned cards */}
        {unowned.length > 0 && (
          <section className="mb-12" data-testid="pokedex-feed">
            <div className="flex items-end justify-between mb-5 flex-wrap gap-2">
              <h2 className="font-display text-2xl italic">Still to discover</h2>
              <span className="text-xs tracking-[0.25em] uppercase text-ink-700">{unowned.length} card{unowned.length > 1 ? "s" : ""} sealed</span>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              {unowned.map(([id, c], i) => {
                const tour = cardToTour[id];
                return (
                  <motion.div
                    key={id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    data-testid={`pokedex-row-${id}`}
                  >
                    <Card className="card-clay p-4 flex items-center gap-4">
                      <div className="relative w-20 h-24 rounded-2xl overflow-hidden shrink-0 border-2 border-dashed border-ink-900/30">
                        <img src={c.image} alt="" className="w-full h-full object-cover blur-[2px] grayscale opacity-70" />
                        <div className="absolute inset-0 flex items-center justify-center bg-jungle-700/40">
                          <Lock className="w-6 h-6 text-sand-100" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-display text-lg italic">{c.name}</h3>
                          <Badge className={`rounded-full text-[10px] ${rarityColor[c.rarity]}`}>{c.rarity}</Badge>
                        </div>
                        <div className="text-xs text-ink-700 mt-0.5">{c.tagline}</div>
                        {tour ? (
                          <div className="mt-2 text-xs text-jungle-700 flex items-center gap-1.5">
                            <MapPin className="w-3 h-3 text-sunset-500" />
                            Earned at <strong>{tour.name}</strong> · {regionName(tour.region)}
                          </div>
                        ) : (
                          <div className="mt-2 text-xs text-ink-700">Hidden quest — rumor only.</div>
                        )}
                      </div>
                      {tour && (
                        <Button
                          size="sm"
                          onClick={() => { playClick(); navigate(`/tours?focus=${tour.tour_id}`); }}
                          data-testid={`pokedex-find-${id}`}
                          className="rounded-full bg-jungle-700 hover:bg-jungle-600 text-sand-100 shrink-0"
                        >
                          <Compass className="w-3.5 h-3.5 mr-1" /> Find quest
                        </Button>
                      )}
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </section>
        )}

        <h2 className="font-display text-2xl italic mb-5">Seals of completion</h2>
        <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {Object.entries(BADGE_LIB).map(([id, b], i) => {
            const owned = ownedBadges.has(id);
            return (
              <motion.div
                key={id}
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.06, duration: 0.35, ease: "backOut" }}
              >
                <Card className={`card-clay p-6 text-center ${owned ? "" : "opacity-60"}`} data-testid={`badge-${id}`}>
                  <div className={`w-20 h-20 rounded-full mx-auto flex items-center justify-center ring-4 ring-sand-100 shadow-lift ${owned ? toneStyle[b.tone] : "bg-sand-300"}`}>
                    {owned ? <Award className="w-9 h-9" /> : <Lock className="w-7 h-7 text-ink-700" />}
                  </div>
                  <div className="font-display text-base mt-4 italic">{b.name}</div>
                  <div className="text-xs text-ink-700 mt-1">{b.desc}</div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
