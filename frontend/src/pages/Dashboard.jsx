import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import RpgHud from "@/components/RpgHud";
import MapMauritius from "@/components/MapMauritius";
import RegionScene from "@/components/RegionScene";
import { Sparkles } from "lucide-react";

const WORLD_BG = "https://images.pexels.com/photos/36731927/pexels-photo-36731927.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=1080&w=1920";

export default function Dashboard() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [regions, setRegions] = useState([]);
  const [tours, setTours] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [activeRegion, setActiveRegion] = useState(null);
  const [greetingDone, setGreetingDone] = useState(false);

  const load = async () => {
    const [p, r, t, b] = await Promise.all([
      api.get("/me/profile"),
      api.get("/regions"),
      api.get("/tours"),
      api.get("/bookings"),
    ]);
    setProfile(p.data); setRegions(r.data); setTours(t.data); setBookings(b.data);
  };
  useEffect(() => { load(); }, []);

  // Auto-fade the welcome ribbon
  useEffect(() => {
    const t = setTimeout(() => setGreetingDone(true), 5500);
    return () => clearTimeout(t);
  }, []);

  // Reload when scene closes (in case bookings/XP changed)
  const closeRegion = async () => {
    setActiveRegion(null);
    await load();
  };

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-jungle-700">
        <div className="font-display text-xl text-sand-100 animate-pulse">Charting the island…</div>
      </div>
    );
  }

  const unlocked = new Set(profile.regions_unlocked || []);
  const pendingBookings = bookings.filter((b) => b.status !== "completed");

  return (
    <div className="fixed inset-0 overflow-hidden bg-jungle-700">
      {/* World backdrop */}
      <motion.img
        src={WORLD_BG}
        alt=""
        initial={{ scale: 1.08, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 1.4, ease: "easeOut" }}
        className="absolute inset-0 w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-jungle-700/30 via-jungle-700/30 to-jungle-700/85" />
      <div className="absolute inset-0 paper-bg opacity-20 mix-blend-overlay" />

      {/* Top-left welcome ribbon (auto-fades) */}
      <AnimatePresence>
        {!greetingDone && (
          <motion.div
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.5 }}
            className="absolute top-6 left-6 lg:top-10 lg:left-24 z-20 max-w-md"
            data-testid="world-greeting"
          >
            <div className="bg-sand-100/95 backdrop-blur-xl border-4 border-jungle-700 rounded-3xl shadow-lift p-5 relative">
              <div className="absolute -top-4 left-6 bg-jungle-700 text-sand-100 px-4 py-1 rounded-full font-display text-sm tracking-wider">
                Ti Dodo
              </div>
              <p className="font-display text-lg lg:text-xl italic text-ink-900 leading-snug">
                "Bonzour, {profile.name || "explorer"}. {unlocked.size === 1
                  ? "The North awaits — tap its pin to begin."
                  : `${unlocked.size} regions yours, ${regions.length - unlocked.size} still sealed.`}"
              </p>
              {pendingBookings.length > 0 && (
                <div className="mt-3 text-xs tracking-[0.2em] uppercase text-sunset-600 flex items-center gap-2">
                  <Sparkles className="w-3 h-3" /> {pendingBookings.length} quest{pendingBookings.length > 1 ? "s" : ""} pending check-in
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* The world map — centered, large */}
      <div className="absolute inset-0 z-10 flex items-center justify-center">
        <div className="relative w-[min(94vw,86vh)] aspect-square" data-testid="world-map">
          <MapMauritius regions={regions} unlocked={unlocked} onRegionClick={setActiveRegion} />
        </div>
      </div>

      {/* RPG HUD */}
      <RpgHud />

      {/* Region Scene overlay */}
      <AnimatePresence>
        {activeRegion && (
          <RegionScene
            region={activeRegion}
            tours={tours}
            unlocked={unlocked.has(activeRegion.region_id)}
            onClose={closeRegion}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
