import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import Header from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Lock, Award } from "lucide-react";

// Display metadata for cards & badges (derived from tour seed)
const CARD_LIB = {
  "card-blue-bay": { name: "Blue Bay Reef", tagline: "Turquoise & coral garden", image: "https://images.pexels.com/photos/15018959/pexels-photo-15018959.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940", rarity: "Common" },
  "card-le-pouce": { name: "Le Pouce Summit", tagline: "Sunrise ridge", image: "https://images.pexels.com/photos/8387277/pexels-photo-8387277.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940", rarity: "Rare" },
  "card-creole-table": { name: "Creole Table", tagline: "Rougaille mastery", image: "https://images.pexels.com/photos/32793278/pexels-photo-32793278.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940", rarity: "Rare" },
  "card-le-morne": { name: "Le Morne Wind", tagline: "Kite legend", image: "https://images.pexels.com/photos/7415730/pexels-photo-7415730.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940", rarity: "Epic" },
  "card-sega": { name: "Sega Soul", tagline: "Beach drum night", image: "https://images.pexels.com/photos/36731927/pexels-photo-36731927.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940", rarity: "Rare" },
};

const BADGE_LIB = {
  "badge-reef-friend": { name: "Reef Friend", tone: "ocean", desc: "Snorkeled responsibly." },
  "badge-ridge-runner": { name: "Ridge Runner", tone: "jungle", desc: "Conquered a Mauritian summit." },
  "badge-piment-master": { name: "Piment Master", tone: "sunset", desc: "Cooked authentic Creole dishes." },
  "badge-wind-rider": { name: "Wind Rider", tone: "ocean", desc: "Caught the Le Morne wind." },
  "badge-sega-soul": { name: "Sega Soul", tone: "sunset", desc: "Danced through a Sega night." },
};

const rarityColor = { Common: "bg-ocean-100 text-ocean-700", Rare: "bg-sun-500 text-ink-900", Epic: "bg-sunset-500 text-white" };
const toneStyle = { ocean: "bg-ocean-500 text-white", jungle: "bg-jungle-500 text-white", sunset: "bg-sunset-500 text-white" };

export default function Badges() {
  const [profile, setProfile] = useState(null);
  useEffect(() => { api.get("/me/profile").then((r) => setProfile(r.data)); }, []);

  if (!profile) return <div className="min-h-screen flex items-center justify-center paper-bg"><div className="font-display text-xl text-jungle-500 animate-pulse">Loading…</div></div>;

  const ownedCards = new Set(profile.cards || []);
  const ownedBadges = new Set(profile.badges || []);

  return (
    <div className="min-h-screen paper-bg">
      <Header />
      <main className="max-w-7xl mx-auto px-6 lg:px-10 py-12">
        <div className="mb-10">
          <span className="chip">Collection</span>
          <h1 className="font-display text-4xl lg:text-5xl mt-3">Cards & badges</h1>
        </div>

        <h2 className="font-display text-2xl mb-5">Island cards</h2>
        <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-12">
          {Object.entries(CARD_LIB).map(([id, c]) => {
            const owned = ownedCards.has(id);
            return (
              <Card key={id} className={`card-clay overflow-hidden ${owned ? "" : "opacity-60 grayscale"}`} data-testid={`card-${id}`}>
                <div className="relative h-48">
                  <img src={c.image} alt={c.name} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-jungle-700/70 to-transparent" />
                  <Badge className={`absolute top-3 left-3 rounded-full ${rarityColor[c.rarity]}`}>{c.rarity}</Badge>
                  {!owned && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center"><Lock className="w-6 h-6 text-ink-700" /></div>
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <div className="font-display text-lg">{c.name}</div>
                  <div className="text-xs text-ink-700">{c.tagline}</div>
                </div>
              </Card>
            );
          })}
        </div>

        <h2 className="font-display text-2xl mb-5">Badges</h2>
        <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {Object.entries(BADGE_LIB).map(([id, b]) => {
            const owned = ownedBadges.has(id);
            return (
              <Card key={id} className={`card-clay p-6 text-center ${owned ? "" : "opacity-60"}`} data-testid={`badge-${id}`}>
                <div className={`w-20 h-20 rounded-3xl mx-auto flex items-center justify-center ${owned ? toneStyle[b.tone] : "bg-sand-300"}`}>
                  {owned ? <Award className="w-9 h-9" /> : <Lock className="w-7 h-7 text-ink-700" />}
                </div>
                <div className="font-display text-lg mt-4">{b.name}</div>
                <div className="text-xs text-ink-700 mt-1">{b.desc}</div>
              </Card>
            );
          })}
        </div>
      </main>
    </div>
  );
}
