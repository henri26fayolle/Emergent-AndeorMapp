// Procedural Web Audio — no external files. Tiny ambient + sfx.
let ctx = null;
let masterGain = null;
let muted = typeof window !== "undefined" && window.localStorage.getItem("andeor.mute") === "1";
let ambient = null;
const listeners = new Set();

function notify() { listeners.forEach((fn) => fn(muted)); }

function ensureCtx() {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    masterGain = ctx.createGain();
    masterGain.gain.value = muted ? 0 : 1;
    masterGain.connect(ctx.destination);
  }
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  return ctx;
}

export function isMuted() { return muted; }
export function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }

export function setMuted(m) {
  muted = !!m;
  if (typeof window !== "undefined") window.localStorage.setItem("andeor.mute", muted ? "1" : "0");
  if (masterGain && ctx) {
    masterGain.gain.cancelScheduledValues(ctx.currentTime);
    masterGain.gain.linearRampToValueAtTime(muted ? 0 : 1, ctx.currentTime + 0.18);
  }
  notify();
}

export function toggleMuted() { setMuted(!muted); }

function tone({ freq, type = "sine", attack = 0.02, hold = 0.0, release = 0.4, peak = 0.22, startAt = 0, slideTo = null, slideTime = 0.1 }) {
  const c = ensureCtx();
  if (!c) return;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  const start = c.currentTime + startAt;
  o.frequency.setValueAtTime(freq, start);
  if (slideTo != null) o.frequency.exponentialRampToValueAtTime(slideTo, start + slideTime);
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(peak, start + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, start + attack + hold + release);
  o.connect(g).connect(masterGain);
  o.start(start);
  o.stop(start + attack + hold + release + 0.05);
}

export function playClick() {
  tone({ freq: 880, slideTo: 520, slideTime: 0.08, type: "triangle", attack: 0.005, release: 0.12, peak: 0.18 });
}

export function playSelect() {
  tone({ freq: 660, slideTo: 990, slideTime: 0.08, type: "triangle", attack: 0.005, release: 0.12, peak: 0.18 });
}

export function playChime() {
  // ascending E5 G5 C6
  [659.25, 783.99, 1046.5].forEach((f, i) => tone({ freq: f, type: "sine", startAt: i * 0.09, attack: 0.02, release: 0.5, peak: 0.22 }));
}

export function playUnlock() {
  [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone({ freq: f, type: "triangle", startAt: i * 0.1, attack: 0.03, release: 0.65, peak: 0.28 }));
}

export function playOpenScene() {
  // soft swell
  tone({ freq: 220, type: "sine", attack: 0.15, release: 0.6, peak: 0.18 });
  tone({ freq: 330, type: "sine", attack: 0.18, release: 0.6, peak: 0.14, startAt: 0.05 });
}

// Ambient music — a warm, slow Mauritian-dusk vibe built procedurally so we
// don't have to ship any audio asset. Three layers:
//   • a low, slowly-breathing bass drone (C2)
//   • a chord pad that swells in/out every ~8s, alternating two chords
//   • a hang-drum / kalimba-flavoured pentatonic arpeggio (random walk on
//     C major pentatonic) with long ringing tails — evokes lagoon at sunset
//
// API kept compatible with the previous wind sound: startAmbient / stopAmbient.
const PENTATONIC_HZ = [
  261.63, // C4
  293.66, // D4
  329.63, // E4
  392.00, // G4
  440.00, // A4
  523.25, // C5
  587.33, // D5
  659.25, // E5
];

// Two warm chords the pad alternates between (Cmaj7 → Am7).
const CHORDS = [
  [130.81, 164.81, 196.00, 246.94], // C3 E3 G3 B3
  [110.00, 130.81, 164.81, 196.00], // A2 C3 E3 G3
];

export function startAmbient() {
  const c = ensureCtx();
  if (!c || ambient) return;

  const now = c.currentTime;

  // ---------- Bass drone ----------
  const bassOsc = c.createOscillator();
  bassOsc.type = "sine";
  bassOsc.frequency.value = 65.41; // C2
  const bassGain = c.createGain();
  bassGain.gain.setValueAtTime(0.0001, now);
  bassGain.gain.exponentialRampToValueAtTime(0.045, now + 3.5);
  bassOsc.connect(bassGain).connect(masterGain);
  bassOsc.start();

  // Slow LFO for warm bass breathing
  const lfo = c.createOscillator();
  lfo.frequency.value = 0.08;
  const lfoGain = c.createGain();
  lfoGain.gain.value = 0.018;
  lfo.connect(lfoGain).connect(bassGain.gain);
  lfo.start();

  // ---------- Melody scheduler (kalimba-like pentatonic) ----------
  const melodyLp = c.createBiquadFilter();
  melodyLp.type = "lowpass";
  melodyLp.frequency.value = 2400;
  melodyLp.Q.value = 0.4;
  melodyLp.connect(masterGain);

  function playMelodyNote(freq, when, peak = 0.06) {
    // Two oscillators blended: sine fundamental + triangle octave for bell-like timbre.
    const o1 = c.createOscillator();
    o1.type = "sine";
    o1.frequency.value = freq;
    const o2 = c.createOscillator();
    o2.type = "triangle";
    o2.frequency.value = freq * 2.0;
    o2.detune.value = (Math.random() - 0.5) * 8;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, when);
    g.gain.exponentialRampToValueAtTime(peak, when + 0.035);
    g.gain.exponentialRampToValueAtTime(0.0001, when + 3.6);
    o1.connect(g);
    o2.connect(g);
    g.connect(melodyLp);
    o1.start(when);
    o2.start(when);
    o1.stop(when + 3.7);
    o2.stop(when + 3.7);
  }

  // Light random-walk so consecutive notes feel coherent.
  let walkIdx = 2;
  let beat = 0;

  function scheduleMelody() {
    if (!ambient) return; // stopped
    // ±1 step on the pentatonic ladder, clamped
    const step = Math.random() < 0.55 ? (Math.random() < 0.5 ? -1 : 1) : (Math.random() < 0.5 ? -2 : 2);
    walkIdx = Math.max(0, Math.min(PENTATONIC_HZ.length - 1, walkIdx + step));
    const freq = PENTATONIC_HZ[walkIdx];
    const when = c.currentTime + 0.04;
    playMelodyNote(freq, when, 0.058 + Math.random() * 0.015);
    // Every 8th note, ring a higher "bell" on top for shape
    if (beat % 8 === 7) {
      const bellFreq = PENTATONIC_HZ[Math.min(PENTATONIC_HZ.length - 1, walkIdx + 3)] * 2;
      playMelodyNote(bellFreq, when + 0.18, 0.03);
    }
    beat++;
    // Gentle, irregular spacing 1.6–2.4s
    const nextMs = 1600 + Math.random() * 800;
    ambient.melodyTimer = setTimeout(scheduleMelody, nextMs);
  }

  // ---------- Chord pad scheduler ----------
  const padLp = c.createBiquadFilter();
  padLp.type = "lowpass";
  padLp.frequency.value = 1100;
  padLp.Q.value = 0.5;
  padLp.connect(masterGain);

  function playChord(notes, when) {
    notes.forEach((f) => {
      const o = c.createOscillator();
      o.type = "sine";
      o.frequency.value = f;
      o.detune.value = (Math.random() - 0.5) * 6;
      const g = c.createGain();
      g.gain.setValueAtTime(0.0001, when);
      g.gain.exponentialRampToValueAtTime(0.012, when + 2.2);
      g.gain.exponentialRampToValueAtTime(0.0001, when + 7.5);
      o.connect(g).connect(padLp);
      o.start(when);
      o.stop(when + 7.8);
    });
  }

  let chordIdx = 0;
  function scheduleChord() {
    if (!ambient) return;
    playChord(CHORDS[chordIdx % CHORDS.length], c.currentTime + 0.05);
    chordIdx++;
    ambient.chordTimer = setTimeout(scheduleChord, 8000);
  }

  ambient = {
    bassOsc, lfo, bassGain,
    melodyLp, padLp,
    melodyTimer: null,
    chordTimer: null,
  };
  // Start melody after a short delay so the bass settles in first
  ambient.melodyTimer = setTimeout(scheduleMelody, 1600);
  ambient.chordTimer = setTimeout(scheduleChord, 600);
}

export function stopAmbient() {
  if (!ambient || !ctx) return;
  const { bassOsc, lfo, bassGain, melodyTimer, chordTimer } = ambient;
  if (melodyTimer) clearTimeout(melodyTimer);
  if (chordTimer) clearTimeout(chordTimer);
  try {
    bassGain.gain.cancelScheduledValues(ctx.currentTime);
    bassGain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.8);
    setTimeout(() => { try { bassOsc.stop(); lfo.stop(); } catch { /* noop */ } }, 900);
  } catch { /* noop */ }
  ambient = null;
}
