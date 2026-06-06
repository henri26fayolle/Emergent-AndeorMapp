import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import RpgHud from "@/components/RpgHud";
import MapMauritius from "@/components/MapMauritius";
import RegionScene from "@/components/RegionScene";
import PortLouisCityMap from "@/components/PortLouisCityMap";
import AvatarHud from "@/components/AvatarHud";
import { Sparkles } from "lucide-react";
import { startAmbient, stopAmbient, playUnlock, playOpenScene } from "@/lib/sound";

export default function Dashboard() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [regions, setRegions] = useState([]);
  const [tours, setTours] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [mainQuests, setMainQuests] = useState([]);
  const [activeRegion, setActiveRegion] = useState(null);
  const [showPortLouis, setShowPortLouis] = useState(false);
  const [greetingDone, setGreetingDone] = useState(false);
  const prevUnlockedRef = useRef(null);

  const load = async () => {
    const [p, r, t, b, mq] = await Promise.all([
      api.get("/me/profile"),
      api.get("/regions"),
      api.get("/tours"),
      api.get("/bookings"),
      api.get("/main-quests").catch(() => ({ data: [] })),
    ]);
    const newUnlocked = new Set(p.data.regions_unlocked || []);
    // If the unlocked set grew since last load, play the unlock chime
    if (prevUnlockedRef.current) {
      const grew = [...newUnlocked].some((id) => !prevUnlockedRef.current.has(id));
      if (grew) playUnlock();
    }
    prevUnlockedRef.current = newUnlocked;
    setProfile(p.data); setRegions(r.data); setTours(t.data); setBookings(b.data);
    setMainQuests(mq.data);
  };
  useEffect(() => { load(); }, []);

  // Auto-fade the welcome ribbon
  useEffect(() => {
    const t = setTimeout(() => setGreetingDone(true), 5500);
    return () => clearTimeout(t);
  }, []);

  // Ambient ocean — start on first user gesture (browser autoplay policy)
  useEffect(() => {
    const onFirst = () => { startAmbient(); window.removeEventListener("pointerdown", onFirst); window.removeEventListener("keydown", onFirst); };
    window.addEventListener("pointerdown", onFirst, { once: true });
    window.addEventListener("keydown", onFirst, { once: true });
    return () => {
      window.removeEventListener("pointerdown", onFirst);
      window.removeEventListener("keydown", onFirst);
      stopAmbient();
    };
  }, []);

  // Reload when scene closes (in case bookings/XP changed)
  const closeRegion = async () => {
    setActiveRegion(null);
    await load();
  };

  // Cursor-based parallax tilt
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const onMouseMove = (e) => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const nx = (e.clientX - w / 2) / (w / 2); // -1..1
    const ny = (e.clientY - h / 2) / (h / 2);
    setTilt({ x: -ny * 3, y: nx * 3 });
  };
  const onMouseLeave = () => setTilt({ x: 0, y: 0 });

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-jungle-700">
        <div className="font-display text-xl text-sand-100 animate-pulse">Charting the island…</div>
      </div>
    );
  }

  const unlocked = new Set(profile.regions_unlocked || []);
  const pendingBookings = bookings.filter((b) => b.status !== "completed");

  // Focused Main Quest → which regions contain a tour from it (for golden glow)
  const focused = mainQuests.find((q) => q.focused);
  const focusedRegions = new Set();
  const focusedRemainingByRegion = {};
  if (focused) {
    for (const tid of focused.tour_ids) {
      const t = tours.find((tt) => tt.tour_id === tid);
      if (!t) continue;
      focusedRegions.add(t.region);
      const done = focused.progress?.completed_tours?.includes(tid);
      if (!done) {
        focusedRemainingByRegion[t.region] = (focusedRemainingByRegion[t.region] || 0) + 1;
      }
    }
  }

  return (
    <div className="fixed inset-0 overflow-hidden">
      {/* Fallback ocean colour (visible only while the video loads) */}
      <div
        className="absolute inset-0"
        style={{ background: "#3FA8C0" }}
      />

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

      {/* The world map — fullscreen video with pin overlay, gentle parallax tilt */}
      <div
        className="absolute inset-0 z-10"
        onMouseMove={onMouseMove}
        onMouseLeave={onMouseLeave}
        style={{ perspective: "1400px" }}
      >
        <div
          className="absolute inset-0"
          data-testid="world-map"
          style={{
            transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
            transformStyle: "preserve-3d",
            transition: "transform 0.45s cubic-bezier(0.2, 0.8, 0.2, 1)",
          }}
        >
          <MapMauritius
            regions={regions}
            unlocked={unlocked}
            onRegionClick={(r) => {
              if (r.region_id === "central-culture") {
                playOpenScene();
                setShowPortLouis(true);
              } else {
                setActiveRegion(r);
              }
            }}
            focusedQuest={focused}
            focusedRegions={focusedRegions}
            focusedRemainingByRegion={focusedRemainingByRegion}
          />
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
            focusedQuest={focused}
            focusedTourIds={new Set(focused?.tour_ids || [])}
          />
        )}
      </AnimatePresence>

      {/* Direct Port Louis city sub-map (skips the RegionScene modal) */}
      <PortLouisCityMap
        open={showPortLouis}
        onClose={async () => { setShowPortLouis(false); await load(); }}
        tours={tours}
        focusedQuest={focused}
        focusedTourIds={new Set(focused?.tour_ids || [])}
      />

      {/* Floating avatar — opens codex/audio/lore/GPX drawer */}
      <AvatarHud profile={profile} regions={regions} />
    </div>
  );
}
