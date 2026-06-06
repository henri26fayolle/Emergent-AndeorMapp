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

export function startAmbient() {
  const c = ensureCtx();
  if (!c || ambient) return;

  // Brown-noise buffer (4s loop)
  const bufferSize = c.sampleRate * 4;
  const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
  const data = buffer.getChannelData(0);
  let lastOut = 0;
  for (let i = 0; i < bufferSize; i++) {
    const white = Math.random() * 2 - 1;
    lastOut = (lastOut + 0.02 * white) / 1.02;
    data[i] = lastOut * 3.5;
  }
  const noise = c.createBufferSource();
  noise.buffer = buffer;
  noise.loop = true;

  const lp = c.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 520;
  lp.Q.value = 0.7;

  const gain = c.createGain();
  gain.gain.value = 0.0001;
  // Fade in
  gain.gain.exponentialRampToValueAtTime(0.085, c.currentTime + 2.0);

  // LFO for wave swell
  const lfo = c.createOscillator();
  const lfoGain = c.createGain();
  lfo.frequency.value = 0.12;
  lfoGain.gain.value = 0.06;
  lfo.connect(lfoGain).connect(gain.gain);

  noise.connect(lp).connect(gain).connect(masterGain);
  noise.start();
  lfo.start();
  ambient = { noise, lp, gain, lfo };
}

export function stopAmbient() {
  if (!ambient || !ctx) return;
  const { noise, lfo, gain } = ambient;
  try {
    gain.gain.cancelScheduledValues(ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.6);
    setTimeout(() => { try { noise.stop(); lfo.stop(); } catch {} }, 700);
  } catch {}
  ambient = null;
}
