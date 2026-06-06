import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { BookOpen, Headphones, Map as MapIcon, ScrollText, Mountain, Wind, Waves, Landmark, Anchor, User as UserIcon } from "lucide-react";
import RegionCodex from "@/components/RegionCodex";
import AvatarPickerDialog from "@/components/AvatarPickerDialog";
import { findAvatar } from "@/lib/avatars";
import { playClick, playSelect } from "@/lib/sound";

// Radial action definitions (4 items + 1 avatar swap)
const ACTIONS = [
  { id: "listen", label: "Listen", icon: Headphones, tab: "listen" },
  { id: "read",   label: "Read",   icon: BookOpen,   tab: "read" },
  { id: "gpx",    label: "Tracks", icon: MapIcon,    tab: "gpx" },
  { id: "lore",   label: "Lore",   icon: ScrollText, tab: "read" },
  { id: "swap",   label: "Change", icon: UserIcon,   tab: null }, // opens avatar picker
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
  const [drawerTab, setDrawerTab] = useState(null);
  const [avatarOpen, setAvatarOpen] = useState(false);
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

  const xp = profile.xp ?? 0;
  const level = profile.level ?? 1;
  const xpInLevel = xp % 100;
  const xpToNext = 100 - xpInLevel;

  // Radial fan geometry — quarter-arc hugging the avatar circle, with breathing room.
  // The avatar bubble is 80px (40 radius). We place icons along an arc at r=130 from the centre,
  // evenly spread from -90° (straight up) to 0° (straight right).
  // 5 actions × 22.5° step = 90° sweep.
  const fanRadius = 138;
  const startAngle = -90;
  const endAngle = 0;
  const step = (endAngle - startAngle) / (ACTIONS.length - 1);

  return (
    <>
      <div
        data-hud="avatar"
        className="fixed bottom-12 left-12 z-40 select-none"
        onMouseEnter={() => setFanOpen(true)}
        onMouseLeave={() => setFanOpen(false)}
      >
        {/* Radial action ring — quarter-arc hugging the avatar */}
        <AnimatePresence>
          {fanOpen && ACTIONS.map((a, i) => {
            const Icon = a.icon;
            const angle = startAngle + i * step;
            const rad = (angle * Math.PI) / 180;
            const x = Math.cos(rad) * fanRadius;
            const y = Math.sin(rad) * fanRadius;
            return (
              <motion.button
                key={a.id}
                data-testid={`avatar-hud-${a.id}`}
                onClick={(e) => {
                  e.stopPropagation();
                  playSelect();
                  if (a.id === "swap") setAvatarOpen(true);
                  else setDrawerTab(a.tab);
                  setFanOpen(false);
                }}
                initial={{ opacity: 0, x: 0, y: 0, scale: 0.4 }}
                animate={{ opacity: 1, x, y, scale: 1 }}
                exit={{ opacity: 0, x: 0, y: 0, scale: 0.4 }}
                transition={{ delay: i * 0.04, duration: 0.32, ease: "backOut" }}
                whileHover={{ scale: 1.15 }}
                whileTap={{ scale: 0.92 }}
                className="absolute left-10 top-10 -translate-x-1/2 -translate-y-1/2 group"
              >
                <span className="flex flex-col items-center">
                  <span className="w-12 h-12 rounded-full bg-sand-100 text-jungle-700 flex items-center justify-center shadow-lift border-2 border-jungle-700">
                    <Icon className="w-5 h-5" />
                  </span>
                  <span className="text-[9px] tracking-[0.25em] uppercase mt-1 font-bold bg-jungle-700 text-sand-100 rounded-full px-2 py-0.5 shadow-clay opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
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
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.95 }}
          data-testid="avatar-hud-bubble"
          className={`relative w-20 h-20 rounded-full bg-gradient-to-br ${avatar.gradient || "from-jungle-600 to-jungle-700"} ring-4 ring-sand-100 shadow-lift flex items-center justify-center overflow-hidden text-sand-100`}
          aria-label="Open codex"
        >
          {avatar.image ? (
            <img
              src={avatar.image}
              alt={avatar.name || "Avatar"}
              className="absolute inset-0 w-full h-full object-cover"
              draggable={false}
            />
          ) : (
            <AvatarIcon className="w-9 h-9" />
          )}
          {/* Soft inner rim */}
          <span aria-hidden className="absolute inset-0 rounded-full pointer-events-none" style={{ boxShadow: "inset 0 0 18px rgba(232,178,65,0.45)" }} />
          {/* Level badge */}
          <span className="absolute -bottom-1 -right-1 bg-sun-500 text-ink-900 rounded-full text-[11px] font-bold w-7 h-7 flex items-center justify-center shadow-clay border-[3px] border-sand-100" data-testid="avatar-hud-level">
            {level}
          </span>
        </motion.button>

        {/* Name + XP card sitting under the avatar */}
        <div className="mt-3 w-48 rounded-2xl bg-jungle-700 text-sand-100 px-3 py-2 shadow-clay pointer-events-none">
          <div className="flex items-center justify-between gap-2">
            <span className="font-display text-sm italic truncate" data-testid="avatar-hud-name">
              {profile.name?.split(" ")[0] || "Explorer"}
            </span>
            <span className="text-[9px] tracking-[0.25em] uppercase font-bold opacity-80 shrink-0">Lv {level}</span>
          </div>
          {/* XP bar */}
          <div className="mt-1.5 h-1.5 rounded-full bg-sand-100/15 overflow-hidden relative" data-testid="avatar-hud-xp">
            <motion.div
              initial={false}
              animate={{ width: `${xpInLevel}%` }}
              transition={{ duration: 0.7, ease: "easeOut" }}
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-sun-500 to-sunset-500 rounded-full"
            />
          </div>
          <div className="mt-1 flex justify-between text-[8.5px] tracking-[0.2em] uppercase font-bold opacity-75 tabular-nums">
            <span>{xp} XP</span>
            <span>{xpToNext} to Lv {level + 1}</span>
          </div>
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
            <RegionCodex key={`${region}-${drawerTab}`} regionId={region} initialTab={drawerTab || "listen"} />
          </div>
        </SheetContent>
      </Sheet>

      {/* Avatar picker (opened from the radial 'Change' action) */}
      <AvatarPickerDialog open={avatarOpen} onOpenChange={setAvatarOpen} />
    </>
  );
}
