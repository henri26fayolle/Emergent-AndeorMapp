import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { BookOpen, Headphones, Map as MapIcon, ScrollText, X, Mountain, Wind, Waves, Landmark, Anchor } from "lucide-react";
import RegionCodex from "@/components/RegionCodex";
import { findAvatar } from "@/lib/avatars";
import { playClick, playSelect } from "@/lib/sound";

// Radial action definitions — each opens the drawer pre-filtered to a tab
const ACTIONS = [
  { id: "listen", label: "Listen", icon: Headphones, tab: "listen" },
  { id: "read",   label: "Read",   icon: BookOpen,   tab: "read" },
  { id: "gpx",    label: "Tracks", icon: MapIcon,    tab: "gpx" },
  { id: "lore",   label: "Lore",   icon: ScrollText, tab: "read" },
];

const REGION_ICON = {
  "north-coast":     Waves,
  "black-river":     Mountain,
  "south-wild":      Wind,
  "east-lagoons":    Anchor,
  "central-culture": Landmark,
};

export default function AvatarHud({ profile, regions = [] }) {
  const [fanOpen, setFanOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState(null); // null = closed, otherwise "listen"|"read"|"gpx"
  const [region, setRegion] = useState("north-coast");

  // Close fan on outside click
  useEffect(() => {
    if (!fanOpen) return;
    const handler = (e) => {
      if (!e.target.closest?.("[data-hud='avatar']")) setFanOpen(false);
    };
    window.addEventListener("pointerdown", handler);
    return () => window.removeEventListener("pointerdown", handler);
  }, [fanOpen]);

  if (!profile) return null;

  const avatar = findAvatar(profile.avatar) || { name: "Explorer", icon: BookOpen, gradient: "from-jungle-600 to-jungle-700" };
  const AvatarIcon = avatar.icon;

  return (
    <>
      {/* Floating avatar — bottom-left */}
      <div
        data-hud="avatar"
        className="fixed bottom-6 left-6 z-40 select-none"
        onMouseEnter={() => setFanOpen(true)}
        onMouseLeave={() => setFanOpen(false)}
      >
        {/* Radial action ring */}
        <AnimatePresence>
          {fanOpen && ACTIONS.map((a, i) => {
            const Icon = a.icon;
            // Fan upward & to the right, like a Pokemon Mystery Dungeon command wheel
            const angle = -90 - i * 22;  // -90deg (up), -112, -134, -156
            const r = 92;
            const rad = (angle * Math.PI) / 180;
            const x = Math.cos(rad) * r;
            const y = Math.sin(rad) * r;
            return (
              <motion.button
                key={a.id}
                data-testid={`avatar-hud-${a.id}`}
                onClick={(e) => {
                  e.stopPropagation();
                  playSelect();
                  setDrawerTab(a.tab);
                  setFanOpen(false);
                }}
                initial={{ opacity: 0, x: 0, y: 0, scale: 0.4 }}
                animate={{ opacity: 1, x, y, scale: 1 }}
                exit={{ opacity: 0, x: 0, y: 0, scale: 0.4 }}
                transition={{ delay: i * 0.035, duration: 0.28, ease: "backOut" }}
                whileHover={{ scale: 1.15 }}
                whileTap={{ scale: 0.92 }}
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 group"
              >
                <span className="flex flex-col items-center">
                  <span className="w-12 h-12 rounded-full bg-sand-100 text-jungle-700 flex items-center justify-center shadow-lift border-2 border-jungle-700">
                    <Icon className="w-5 h-5" />
                  </span>
                  <span className="text-[9px] tracking-[0.25em] uppercase mt-1 font-bold bg-jungle-700 text-sand-100 rounded-full px-2 py-0.5 shadow-clay opacity-0 group-hover:opacity-100 transition-opacity">
                    {a.label}
                  </span>
                </span>
              </motion.button>
            );
          })}
        </AnimatePresence>

        {/* Avatar bubble */}
        <motion.button
          onClick={() => { playClick(); setFanOpen((v) => !v); }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.94 }}
          data-testid="avatar-hud-bubble"
          className={`relative w-20 h-20 rounded-full bg-gradient-to-br ${avatar.gradient || "from-jungle-600 to-jungle-700"} ring-4 ring-sand-100 shadow-lift flex items-center justify-center overflow-hidden text-sand-100`}
        >
          <AvatarIcon className="w-9 h-9" />
          {/* Soft glowing rim while idle */}
          <span aria-hidden className="absolute inset-0 rounded-full pointer-events-none" style={{ boxShadow: "inset 0 0 18px rgba(232,178,65,0.45)" }} />
          {/* Pulse hint */}
          <span aria-hidden className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-sun-500 ring-2 ring-sand-100 animate-pulse" />
        </motion.button>

        {/* Player tag */}
        <div className="mt-2 text-center rounded-full bg-jungle-700 text-sand-100 px-3 py-1 text-[9px] tracking-[0.25em] uppercase font-bold whitespace-nowrap shadow-clay pointer-events-none">
          {profile.name?.split(" ")[0] || "Explorer"} · Lv {profile.level || 1}
        </div>
      </div>

      {/* Codex drawer */}
      <Sheet open={drawerTab !== null} onOpenChange={(o) => !o && setDrawerTab(null)}>
        <SheetContent
          side="left"
          data-testid="avatar-codex-drawer"
          className="w-[min(100vw,560px)] sm:max-w-none p-0 overflow-y-auto bg-sand-100 border-r-4 border-jungle-700"
        >
          <SheetHeader className="px-6 pt-6 pb-3">
            <SheetTitle className="font-display text-2xl italic flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-sunset-500" /> Adventurer's Codex
            </SheetTitle>
            <SheetDescription className="text-ink-700 text-sm">
              Listen, read or download the spirit of each region. Free for all explorers.
            </SheetDescription>
          </SheetHeader>

          {/* Region picker */}
          <div className="px-6 pb-3">
            <div className="text-[10px] tracking-[0.3em] uppercase text-ink-700 font-bold mb-2">Choose a region</div>
            <div className="flex flex-wrap gap-2">
              {regions.map((r) => {
                const Icon = REGION_ICON[r.region_id] || BookOpen;
                const active = region === r.region_id;
                return (
                  <button
                    key={r.region_id}
                    onClick={() => { playSelect(); setRegion(r.region_id); }}
                    data-testid={`codex-region-${r.region_id}`}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold tracking-[0.15em] uppercase border-2 transition-colors ${
                      active
                        ? "bg-jungle-700 text-sand-100 border-jungle-700 shadow-clay"
                        : "bg-white text-ink-900 border-ink-900/15 hover:bg-sand-200"
                    }`}
                  >
                    <Icon className="w-3 h-3" /> {r.name}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="px-6 pb-12">
            {/* Pass an initial tab hint via the key so it remounts when changing tabs */}
            <RegionCodex key={`${region}-${drawerTab}`} regionId={region} initialTab={drawerTab || "listen"} />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
