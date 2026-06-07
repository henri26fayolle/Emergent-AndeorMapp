import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Footprints, Crosshair, Check, X, MapPin, Sparkles, Volume2, VolumeX, Pause, Play, Headphones } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api, formatErr } from "@/lib/api";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { playChime, playClick, playUnlock } from "@/lib/sound";

const THEME = {
  jungle: "#1B6F4B",
  ocean:  "#0F8FA8",
  sunset: "#E27447",
  sun:    "#E8B241",
};

function haversineM(lat1, lon1, lat2, lon2) {
  const R = 6_371_000;
  const p1 = (lat1 * Math.PI) / 180;
  const p2 = (lat2 * Math.PI) / 180;
  const dp = ((lat2 - lat1) * Math.PI) / 180;
  const dl = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/**
 * Floating "On the trail" HUD. Visible only while the player has an active
 * self-guided journey. Shows current stop, distance (if GPS), manual + GPS
 * check-in. Reveals the lore in a side card on successful check-in.
 */
export default function SelfGuidedHud() {
  const { user, refresh } = useAuth();
  const [journey, setJourney] = useState(null);
  const [pos, setPos] = useState(null);     // { lat, lon }
  const [unlockedStop, setUnlockedStop] = useState(null); // last revealed stop (after checkin)
  const [busy, setBusy] = useState(false);
  // Hands-free audio mode — when ON the next stop auto-plays inside ~120 m
  const [handsFree, setHandsFree] = useState(false);
  const [playing, setPlaying] = useState(false);
  const watchIdRef = useRef(null);
  const audioRef = useRef(null);
  const autoplayedStopsRef = useRef(new Set()); // prevent re-playing the same stop in hands-free

  // Refresh journey from server (called on mount + after each checkin + on user change)
  const loadActive = useCallback(async () => {
    try {
      const me = await api.get("/me/profile");
      const activeId = me.data?.active_self_guided;
      if (!activeId) { setJourney(null); return; }
      const j = await api.get(`/self-guided/${activeId}`);
      setJourney(j.data);
    } catch {
      setJourney(null);
    }
  }, []);

  // Mount + cross-component refresh — listen to a window event and react to user changes.
  // The setState calls inside loadActive are deferred via queueMicrotask so they don't
  // happen inline during the effect run (satisfies react-hooks/set-state-in-effect).
  useEffect(() => {
    queueMicrotask(() => loadActive());
    const h = () => { loadActive(); };
    window.addEventListener("andeor:self-guided-changed", h);
    return () => window.removeEventListener("andeor:self-guided-changed", h);
  }, [user?.user_id, loadActive]);

  // GPS watcher — attached only when a journey is active
  useEffect(() => {
    if (!journey || !navigator.geolocation) return undefined;
    const id = navigator.geolocation.watchPosition(
      (p) => setPos({ lat: p.coords.latitude, lon: p.coords.longitude, acc: p.coords.accuracy }),
      () => { /* permission denied / unavailable — manual check-in still works */ },
      { enableHighAccuracy: true, maximumAge: 4000, timeout: 8000 }
    );
    watchIdRef.current = id;
    return () => {
      try { navigator.geolocation.clearWatch(id); } catch { /* noop */ }
      watchIdRef.current = null;
      setPos(null);
    };
  }, [journey]);

  // Audio narration — `audioUrl` derives the streaming URL from journey.journey_id + stop_id.
  // playStopAudio is memoised so the auto-play effect below only fires when truly needed.
  const playStopAudio = useCallback(async (stop) => {
    if (!journey || !stop) return;
    const url = `${api.defaults.baseURL}/self-guided/${journey.journey_id}/stops/${stop.stop_id}/audio`;
    try {
      if (!audioRef.current) {
        audioRef.current = new Audio();
        audioRef.current.preload = "auto";
        audioRef.current.addEventListener("play",  () => setPlaying(true));
        audioRef.current.addEventListener("pause", () => setPlaying(false));
        audioRef.current.addEventListener("ended", () => setPlaying(false));
      }
      if (audioRef.current.src !== url) audioRef.current.src = url;
      await audioRef.current.play();
    } catch {
      /* autoplay denied — user must tap, the controls below still work */
    }
  }, [journey]);

  // Hands-free auto-play: when GPS shows we're within 200 m of the next stop and we haven't
  // played that stop yet in this trail session, fire the narration.
  useEffect(() => {
    if (!journey || journey.progress?.finished) return;
    const completedSet = new Set(journey.progress?.completed_stops || []);
    const nxt = journey.stops.find((s) => !completedSet.has(s.stop_id)) || journey.stops[journey.stops.length - 1];
    if (!handsFree || !nxt || !pos) return;
    const d = haversineM(pos.lat, pos.lon, nxt.lat, nxt.lon);
    if (d > 200) return;
    if (autoplayedStopsRef.current.has(nxt.stop_id)) return;
    autoplayedStopsRef.current.add(nxt.stop_id);
    playStopAudio(nxt);
  }, [handsFree, journey, pos, playStopAudio]);

  // Stop audio + reset autoplay log when the journey changes / finishes
  useEffect(() => {
    autoplayedStopsRef.current = new Set();
    return () => {
      if (audioRef.current) {
        try { audioRef.current.pause(); } catch { /* noop */ }
      }
    };
  }, [journey?.journey_id]);

  if (!journey || journey.progress?.finished) return null;

  const completed = new Set(journey.progress?.completed_stops || []);
  const nextStop = journey.stops.find((s) => !completed.has(s.stop_id)) || journey.stops[journey.stops.length - 1];
  const themeHex = THEME[journey.theme_color] || "#1B6F4B";

  const distanceM = pos && nextStop ? haversineM(pos.lat, pos.lon, nextStop.lat, nextStop.lon) : null;
  const gpsReady = distanceM != null;
  const closeEnough = gpsReady && distanceM <= 80; // 80 m radius

  const togglePlay = async () => {
    playClick();
    if (audioRef.current && !audioRef.current.paused) {
      audioRef.current.pause();
      return;
    }
    await playStopAudio(nextStop);
  };

  const checkIn = async (useGps) => {
    if (!nextStop) return;
    setBusy(true);
    try {
      const payload = { stop_id: nextStop.stop_id };
      if (useGps && pos) { payload.lat = pos.lat; payload.lon = pos.lon; }
      const { data } = await api.post(`/self-guided/${journey.journey_id}/checkin`, payload);
      if (data.already) {
        toast.info("Stop already unlocked");
      } else {
        playUnlock();
        setUnlockedStop({ ...nextStop, gps_distance_m: data.gps_distance_m });
        // Auto-play the just-unlocked stop's narration (#1 — audio reveal)
        playStopAudio(nextStop);
        if (data.finished) {
          playChime();
          toast.success(`Journey complete! +${data.xp_gain} XP${data.badge_unlocked ? " · 🏅 free badge unlocked" : ""}`);
          // Fire the climactic Trail Epilogue cutscene with the server's payload
          if (data.epilogue) {
            // small delay so the unlock-reveal modal animates in first
            setTimeout(() => {
              window.dispatchEvent(new CustomEvent("andeor:trail-completed", { detail: data.epilogue }));
            }, 600);
          }
        } else {
          toast.success(`Stop unlocked: ${nextStop.name}`);
        }
      }
      await loadActive();
      await refresh();
    } catch (e) {
      toast.error(formatErr(e.response?.data?.detail) || e.message);
    } finally {
      setBusy(false);
    }
  };

  const stopJourney = async () => {
    playClick();
    try {
      await api.post(`/self-guided/${journey.journey_id}/stop`);
      setJourney(null);
      toast.info("Trail paused — your progress is saved.");
    } catch { /* noop */ }
  };

  return (
    <>
      {/* Active-trail floating HUD — bottom-center on mobile, bottom-right on desktop.
          Positioning shell (no Framer transforms) → animated child inside. */}
      <div
        className="fixed z-[85] bottom-28 left-1/2 -translate-x-1/2 sm:bottom-3 sm:left-auto sm:right-6 sm:translate-x-0 w-[420px] max-w-[94vw]"
        data-testid="self-guided-hud"
      >
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
        >
        <div
          className="rounded-3xl border-4 shadow-lift overflow-hidden"
          style={{ background: "#FCF6E5", borderColor: themeHex }}
        >
          {/* Header strip */}
          <div className="px-4 py-2.5 flex items-center justify-between gap-2 text-sand-100" style={{ background: themeHex }}>
            <div className="flex items-center gap-2 min-w-0">
              <Footprints className="w-4 h-4 shrink-0" />
              <div className="text-[10px] tracking-[0.3em] uppercase font-bold truncate">On the trail · {journey.title}</div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => { playClick(); setHandsFree((v) => !v); if (!handsFree) toast.info("Hands-free mode on — audio plays as you approach each stop"); }}
                aria-label="Toggle hands-free mode"
                data-testid="self-guided-handsfree"
                title={handsFree ? "Hands-free ON — auto-plays narration near each stop" : "Turn on hands-free narration"}
                className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors ${handsFree ? "bg-sand-100 text-jungle-700" : "bg-sand-100/15 hover:bg-sand-100/30"}`}
              >
                <Headphones className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={stopJourney}
                aria-label="Pause trail"
                data-testid="self-guided-pause"
                className="w-7 h-7 rounded-full bg-sand-100/15 hover:bg-sand-100/30 flex items-center justify-center transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="px-4 py-3">
            <div className="text-[10px] tracking-[0.3em] uppercase text-ink-700 font-bold mb-1">Next stop</div>
            <div className="font-display text-lg italic leading-tight text-ink-900" data-testid="self-guided-next-stop">{nextStop.name}</div>

            <div className="mt-2 flex items-center gap-2 text-xs text-ink-700">
              <Crosshair className="w-3.5 h-3.5" />
              {gpsReady ? (
                <span data-testid="self-guided-distance">
                  ≈ <strong>{distanceM > 1000 ? `${(distanceM / 1000).toFixed(1)} km` : `${Math.round(distanceM)} m`}</strong> away
                </span>
              ) : (
                <span className="italic opacity-80">GPS off — manual check-in below</span>
              )}
              {closeEnough && (
                <span className="ml-auto inline-flex items-center gap-1 text-jungle-700 font-bold text-[11px] uppercase tracking-wider">
                  <Sparkles className="w-3 h-3" /> in range
                </span>
              )}
            </div>

            {/* Progress mini-bar */}
            <div className="mt-2.5 flex items-center gap-2">
              <div className="flex-1 h-1.5 rounded-full bg-sand-300 overflow-hidden">
                <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${journey.progress.percent}%`, background: themeHex }} />
              </div>
              <div className="text-[10px] tracking-[0.25em] uppercase text-ink-700 font-bold tabular-nums">
                {journey.progress.completed}/{journey.progress.total}
              </div>
            </div>

            {/* CTAs */}
            <div className="mt-3 flex gap-2">
              <Button
                onClick={() => checkIn(true)}
                disabled={busy || !gpsReady}
                data-testid="self-guided-checkin-gps"
                className="rounded-full flex-1 text-white font-bold tracking-wider"
                style={{ background: closeEnough ? themeHex : "rgba(0,0,0,0.25)" }}
              >
                <MapPin className="w-4 h-4 mr-1" /> {closeEnough ? "Check in (GPS)" : (gpsReady ? "Too far for GPS" : "GPS off")}
              </Button>
              <Button
                onClick={() => checkIn(false)}
                disabled={busy}
                variant="outline"
                data-testid="self-guided-checkin-manual"
                className="rounded-full"
                title="I&apos;m here — check me in"
              >
                <Check className="w-4 h-4 mr-1" /> I&apos;m here
              </Button>
            </div>

            {/* Listen toggle — preview narration on demand (works even before check-in) */}
            <button
              onClick={togglePlay}
              data-testid="self-guided-listen"
              className="mt-2 w-full inline-flex items-center justify-center gap-2 text-[11px] tracking-[0.25em] uppercase font-bold py-2 rounded-full border-2 border-dashed transition-colors"
              style={{ borderColor: themeHex, color: themeHex }}
            >
              {playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              {playing ? "Pause Ti Dodo" : (<>Preview Ti Dodo&apos;s tale</>)}
            </button>
          </div>
        </div>
        </motion.div>
      </div>

      {/* Lore reveal — fired right after a successful check-in */}
      <AnimatePresence>
        {unlockedStop && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[110] flex items-center justify-center p-5"
            onClick={() => setUnlockedStop(null)}
            data-testid="self-guided-reveal"
          >
            <div className="absolute inset-0 bg-jungle-700/75 backdrop-blur-sm" />
            <motion.div
              initial={{ scale: 0.85, opacity: 0, y: 16 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.5, ease: "backOut" }}
              onClick={(e) => e.stopPropagation()}
              className="relative max-w-md w-full bg-sand-100 border-4 border-jungle-700 rounded-3xl shadow-lift overflow-hidden"
            >
              <div className="px-5 py-3 text-sand-100 text-center" style={{ background: themeHex }}>
                <div className="text-[10px] tracking-[0.4em] uppercase font-bold opacity-85">Stop unlocked</div>
                <div className="font-display text-xl italic mt-0.5">{unlockedStop.name}</div>
                {unlockedStop.gps_distance_m != null && (
                  <div className="text-[10px] tracking-[0.25em] uppercase opacity-80 mt-1">
                    GPS verified · {Math.round(unlockedStop.gps_distance_m)} m
                  </div>
                )}
              </div>
              <div className="p-5">
                <p className="italic text-ink-900 leading-relaxed text-sm lg:text-base">&ldquo;{unlockedStop.lore}&rdquo;</p>

                {/* Audio narration controls — auto-plays on mount thanks to checkIn */}
                <div className="mt-4 flex items-center gap-2 text-xs text-ink-700">
                  <button
                    onClick={() => {
                      if (audioRef.current && !audioRef.current.paused) {
                        audioRef.current.pause();
                      } else {
                        playStopAudio(unlockedStop);
                      }
                    }}
                    data-testid="self-guided-reveal-listen"
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full font-bold tracking-wider uppercase text-[11px] text-white"
                    style={{ background: themeHex }}
                  >
                    {playing ? <Pause className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                    {playing ? "Pause" : "Listen again"}
                  </button>
                  {playing && (
                    <span className="inline-flex items-center gap-1 opacity-80 italic">
                      Ti Dodo is narrating…
                    </span>
                  )}
                </div>

                <div className="mt-5 flex justify-end">
                  <Button onClick={() => setUnlockedStop(null)} data-testid="self-guided-reveal-close" className="rounded-full bg-jungle-700 hover:bg-jungle-600 text-sand-100 tracking-wider">
                    Continue on the trail
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
