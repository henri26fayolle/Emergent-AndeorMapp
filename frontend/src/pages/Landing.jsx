import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Compass, Gift, Trophy, Map, Sparkles, Mountain } from "lucide-react";
import Header from "@/components/Header";

const HERO_IMG = "https://images.pexels.com/photos/36731927/pexels-photo-36731927.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940";
const ALT_IMG = "https://images.pexels.com/photos/7415730/pexels-photo-7415730.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940";

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen paper-bg">
      <Header />

      {/* HERO */}
      <section className="relative max-w-7xl mx-auto px-6 lg:px-10 pt-12 pb-20 grid lg:grid-cols-12 gap-12 items-center">
        <div className="lg:col-span-7">
          <span className="chip mb-6" data-testid="hero-tagline">
            <span className="w-2 h-2 rounded-full bg-sunset-500" /> Mauritius · Game your travels
          </span>
          <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl text-ink-900 leading-[0.95] mb-6" data-testid="hero-title">
            Explore Mauritius.<br />
            <span className="text-jungle-500">Unlock the </span>
            <span className="text-sunset-500">good stuff.</span>
          </h1>
          <p className="text-lg text-ink-700 max-w-xl mb-10">
            Book outdoor & cultural tours with An Deor. Earn XP, collect rare island cards, level up your explorer rank
            and unlock <strong>real discounts</strong> & partner goodies on your next adventure.
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <Button onClick={() => navigate("/register")} data-testid="hero-cta-start" className="btn-pill bg-jungle-500 hover:bg-jungle-600 text-white shadow-lift hover:-translate-y-0.5">
              <Compass className="w-5 h-5" /> Start the quest
            </Button>
            <Button variant="outline" onClick={() => navigate("/tours")} data-testid="hero-cta-tours" className="btn-pill border-ink-900/20 hover:bg-sand-200">
              Browse tours
            </Button>
          </div>

          <div className="mt-12 grid grid-cols-3 gap-6 max-w-lg">
            {[
              { icon: Map, k: "12", l: "regions" },
              { icon: Sparkles, k: "30+", l: "collectibles" },
              { icon: Gift, k: "100%", l: "rewards" },
            ].map((s, i) => (
              <div key={i} className="text-center" data-testid={`hero-stat-${i}`}>
                <s.icon className="w-6 h-6 mx-auto text-sunset-500 mb-2" />
                <div className="font-display text-3xl text-ink-900">{s.k}</div>
                <div className="text-xs tracking-[0.2em] uppercase text-ink-700 mt-1">{s.l}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-5 relative">
          <div className="relative rounded-[2.5rem] overflow-hidden shadow-lift border-8 border-white rotate-1 hover:rotate-0 transition-transform duration-500">
            <img src={HERO_IMG} alt="Mauritius coast" className="w-full h-[520px] object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-jungle-700/60 via-transparent to-transparent" />
            <div className="absolute bottom-6 left-6 right-6 text-white">
              <div className="chip bg-white/20 text-white border border-white/30 backdrop-blur">
                <Mountain className="w-3 h-3" /> South Coast Quest
              </div>
              <div className="font-display text-2xl mt-3">+180 XP · Wind Rider badge</div>
            </div>
          </div>
          <div className="absolute -bottom-6 -left-6 w-40 h-40 rounded-3xl bg-sunset-500 -rotate-6 shadow-clay overflow-hidden hidden md:block">
            <img src={ALT_IMG} alt="Mauritius" className="w-full h-full object-cover mix-blend-multiply opacity-90" />
          </div>
          <div className="absolute -top-4 -right-4 bg-sun-500 text-ink-900 rounded-full px-5 py-3 font-display text-sm shadow-clay animate-float hidden md:block">
            🪙 Loyalty unlocks daily
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="max-w-7xl mx-auto px-6 lg:px-10 py-20">
        <div className="flex items-end justify-between mb-12 flex-wrap gap-4">
          <div>
            <span className="chip">How it works</span>
            <h2 className="font-display text-4xl lg:text-5xl mt-4 max-w-2xl">Travel, play, earn. <span className="text-jungle-500">Repeat.</span></h2>
          </div>
          <p className="max-w-md text-ink-700">An Deor turns every booking into a quest. Real tours give real rewards — across our marketplace and partners.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { i: Compass, t: "Book a tour", d: "Choose any outdoor or cultural experience curated by An Deor guides.", n: "01" },
            { i: Sparkles, t: "Meet your guide", d: "Complete the tour and rate your guide to claim XP, region cards & badges.", n: "02" },
            { i: Gift, t: "Unlock rewards", d: "Use codes for discounts on next tours, or claim partner goodies (rhum, spa, food).", n: "03" },
          ].map((s, i) => (
            <Card key={i} className="card-clay p-8 hover:-translate-y-1 hover:shadow-lift transition-all" data-testid={`how-step-${i}`}>
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-2xl bg-jungle-500/10 flex items-center justify-center">
                  <s.i className="w-6 h-6 text-jungle-500" />
                </div>
                <div className="font-display text-5xl text-sand-300">{s.n}</div>
              </div>
              <div className="font-display text-2xl mt-6">{s.t}</div>
              <p className="text-ink-700 mt-3 leading-relaxed">{s.d}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-7xl mx-auto px-6 lg:px-10 pb-24">
        <div className="card-clay overflow-hidden grid md:grid-cols-2">
          <div className="p-12 lg:p-16 flex flex-col justify-center">
            <Trophy className="w-10 h-10 text-sunset-500 mb-4" />
            <h2 className="font-display text-4xl lg:text-5xl mb-4">Your dodo awaits.</h2>
            <p className="text-ink-700 mb-8 max-w-md">Start at Level 1, explore Grand Baie, and climb to Le Morne legend. Every adventure counts.</p>
            <div>
              <Button onClick={() => navigate("/register")} data-testid="cta-register-btn" className="btn-pill bg-sunset-500 hover:bg-sunset-600 text-white shadow-lift">
                Create your explorer profile
              </Button>
            </div>
          </div>
          <div className="relative min-h-[320px]">
            <img src="https://images.pexels.com/photos/15018959/pexels-photo-15018959.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940" alt="Mauritius snorkel" className="absolute inset-0 w-full h-full object-cover" />
          </div>
        </div>
      </section>

      <footer className="border-t border-sand-300 py-8 text-center text-sm text-ink-700">
        An Deor · Marketplace & travel agency for outdoor and cultural Mauritius experiences.
      </footer>
    </div>
  );
}
