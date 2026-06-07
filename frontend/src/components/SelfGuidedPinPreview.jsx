import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Footprints, MapPin, Sparkles, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api, formatErr } from "@/lib/api";
import { toast } from "sonner";
import { playClick, playChime } from "@/lib/sound";

function haversineM(lat1, lon1, lat2, lon2) {
  const R = 6_371_000;
  const p1 = (lat1 * Math.PI) / 180;
  const p2 = (lat2 * Math.PI) / 180;
  const dp = ((lat2 - lat1) * Math.PI) / 180;
  const dl = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function formatDistance(m) {
  if (m == null) return null;
  if (m < 1000) return `${Math.round(m / 5) * 5} m`;
  return `${(m / 1000).toFixed(1)} km`;
}

/**
 * Tiny anchored popover shown when a player taps a free self-guided trail pin.
 * Replaces the heavy SelfGuidedModal-on-every-click flow: now they get a quick
 * preview (stop name, distance, "Start journey from here" CTA), and can still
 * open the full journey detail if they want.
 *
 * Position: absolute, anchored at the pin's `xPct`/`yPct` within the same
 * relative container holding the pins. Pops *above* the pin (or below near the
 * top edge) using `flipBelow` heuristic.
 */
export default function SelfGuidedPinPreview({
  journey,
  stop,
  idx,
  themeHex = "#0F8FA8",
  done,
  onClose,
  onOpenFullJourney,
  onStarted,
}) {
  const [pos, setPos] = useState(null);
  const [busy, setBusy] = useState(false);

  // Read a single GPS fix when the popover opens. We don't watch — the HUD
  // takes over watching once the journey is started.
  useEffect(() => {
    if (!navigator.geolocation) return undefined;
    let cancelled = false;
    navigator.geolocation.getCurrentPosition(
      (p) => { if (!cancelled) setPos({ lat: p.coords.latitude, lon: p.coords.longitude }); },
      () => { /* permission denied or unavailable — popover still works without distance */ },
      { enableHighAccuracy: true, maximumAge: 60000, timeout: 5000 },
    );
    return () => { cancelled = true; };
  }, []);

  const xPct = stop.city_x ?? 50;
  const yPct = stop.city_y ?? 50;
  const flipBelow = yPct < 22; // if pin sits near the top of the map, flip the popover below
  const distance_m = pos ? haversineM(pos.lat, pos.lon, stop.lat, stop.lon) : null;
  const distance_label = formatDistance(distance_m);
  const journeyStarted = !!journey.progress?.started;

  // Escape closes the popover
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose && onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const startHere = async () => {
    if (busy) return;
    setBusy(true);
    playClick();
    try {
      // Idempotent — server returns {ok:true, already:true} if a journey is already started.
      await api.post(`/self-guided/${journey.journey_id}/start`);
      playChime();
      window.dispatchEvent(new Event("andeor:self-guided-changed"));
      toast.success(`On the trail — head to ${stop.name}.`);
      onStarted && onStarted();
      onClose && onClose();
    } catch (e) {
      toast.error(formatErr(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        key={stop.stop_id}
        initial={{ opacity: 0, scale: 0.85, y: flipBelow ? -10 : 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.85, y: flipBelow ? -10 : 10 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
        className="absolute z-40 pointer-events-auto"
        style={{
          left: `${xPct}%`,
          top: `${yPct}%`,
          transform: flipBelow
            ? "translate(-50%, 1.4rem)"
            : "translate(-50%, calc(-100% - 1.6rem))",
          width: "min(17rem, 80vw)",
        }}
        onClick={(e) => e.stopPropagation()}
        data-testid={`sg-pin-preview-${stop.stop_id}`}
      >
          <div
            className="relative rounded-2xl bg-sand-100 border-2 shadow-lift overflow-hidden"
            style={{ borderColor: themeHex }}
          >
            {/* Theme strip at top */}
            <div className="absolute inset-x-0 top-0 h-1.5" style={{ background: themeHex }} />

            {/* Close button */}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); playClick(); onClose && onClose(); }}
              className="absolute top-2.5 right-2.5 w-6 h-6 rounded-full bg-ink-900/10 hover:bg-ink-900/20 flex items-center justify-center transition-colors"
              data-testid={`sg-pin-preview-close-${stop.stop_id}`}
              aria-label="Close"
            >
              <X className="w-3.5 h-3.5 text-ink-900" />
            </button>

            <div className="p-3.5 pt-4 pr-9">
              {/* Journey + stop position chip */}
              <div className="flex items-center gap-1.5 text-[9px] tracking-[0.3em] uppercase font-bold text-ink-700 mb-1">
                <Footprints className="w-3 h-3" style={{ color: themeHex }} />
                <span>Free trail · stop {idx + 1}/{journey.stops.length}</span>
              </div>

              {/* Stop name */}
              <div className="font-display italic text-lg text-ink-900 leading-tight">
                {stop.name}
              </div>

              {/* Journey context */}
              <div className="mt-1 text-[10px] tracking-[0.2em] uppercase text-ink-700/80 font-bold truncate">
                {journey.title}
              </div>

              {/* Distance / done state */}
              <div className="mt-2 flex items-center gap-1.5 text-[11px] text-ink-700">
                <MapPin className="w-3.5 h-3.5 shrink-0" style={{ color: themeHex }} />
                {done ? (
                  <span className="font-bold" style={{ color: themeHex }}>Already checked in ✓</span>
                ) : distance_label ? (
                  <span><span className="font-bold">{distance_label}</span> from you</span>
                ) : (
                  <span className="italic opacity-80">Tap “Start” — GPS will guide you</span>
                )}
              </div>

              {/* CTAs */}
              <div className="mt-3 flex items-center gap-2">
                <Button
                  onClick={startHere}
                  disabled={busy || done}
                  data-testid={`sg-pin-preview-start-${stop.stop_id}`}
                  size="sm"
                  className="rounded-full font-bold tracking-[0.15em] uppercase text-[10px] h-8 px-3 text-sand-100 hover:opacity-95 transition-opacity flex-1"
                  style={{ background: themeHex }}
                >
                  <Sparkles className="w-3 h-3 mr-1" />
                  {done ? "Walked" : journeyStarted ? "Resume here" : "Start from here"}
                </Button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); playClick(); onOpenFullJourney && onOpenFullJourney(); }}
                  className="text-[10px] tracking-[0.2em] uppercase font-bold text-ink-700 hover:text-ink-900 inline-flex items-center gap-0.5 transition-colors"
                  data-testid={`sg-pin-preview-full-${stop.stop_id}`}
                >
                  Full <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Arrow / pointer towards the pin */}
            <div
              aria-hidden
              className="absolute left-1/2 -translate-x-1/2 w-3 h-3 rotate-45 bg-sand-100 border-2"
              style={{
                borderColor: themeHex,
                ...(flipBelow
                  ? { top: -7, borderRight: "none", borderBottom: "none" }
                  : { bottom: -7, borderLeft: "none", borderTop: "none" }),
              }}
            />
          </div>
        </motion.div>
      </AnimatePresence>
  );
}
