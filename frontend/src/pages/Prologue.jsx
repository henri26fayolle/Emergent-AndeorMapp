import { useEffect, useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { api, formatErr } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { AVATARS } from "@/lib/avatars";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ChevronRight, Map, Sparkles, Trophy, Compass, Footprints } from "lucide-react";

const BG = [
  "https://images.pexels.com/photos/7415730/pexels-photo-7415730.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=900&w=1600",
  "https://images.pexels.com/photos/36731927/pexels-photo-36731927.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=900&w=1600",
  "https://images.pexels.com/photos/15018959/pexels-photo-15018959.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=900&w=1600",
  "https://images.pexels.com/photos/8387277/pexels-photo-8387277.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=900&w=1600",
];

// Typewriter hook
function useTypewriter(text, speed = 22, deps = []) {
  const [out, setOut] = useState("");
  const [done, setDone] = useState(false);
  useEffect(() => {
    queueMicrotask(() => { setOut(""); setDone(false); });
    let i = 0;
    const id = setInterval(() => {
      i++;
      setOut(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(id);
        setDone(true);
      }
    }, speed);
    return () => clearInterval(id);
  }, [text, speed, ...deps]);
  return { out, done, finish: () => setOut(text) };
}

const DIALOG = [
  { speaker: "Ti Dodo", line: "Eh, bonzour, traveler... mo finn pe atann ou. (I've been waiting for you.)", bg: 0 },
  { speaker: "Ti Dodo", line: "Welcome to Mauritius — not the postcard. The real one. Lagoons, ridges, sega rhythm, Creole spice.", bg: 1 },
  { speaker: "Ti Dodo", line: "An Deor has charted this island into five regions. Each one is locked... until you earn the right to step in.", bg: 2 },
  { speaker: "Ti Dodo", line: "Book a tour with one of our guides — or walk a free trail with me whispering the stories straight in your ear.", bg: 3 },
  { speaker: "Ti Dodo", line: "Every step earns cards, titles and real-world rewards: tour discounts, partner goodies, shareable trail postcards.", bg: 1 },
  { speaker: "Ti Dodo", line: "But first, mo bizin koné ou nom. (I need to know your name.)", bg: 0 },
];

const TUTORIAL = [
  { icon: Map,        title: "Travel the island",       body: "Five regions to unlock. Book real outdoor & cultural tours from An Deor's marketplace — each one ties to a Mauritian region and a real local guide.",            color: "bg-jungle-500" },
  { icon: Footprints, title: "Or walk a free trail",     body: "Tap a free pin on any region map. Your phone's GPS guides you stop-to-stop while Ti Dodo narrates the lore live (and you earn a shareable postcard at the end).", color: "bg-ocean-500" },
  { icon: Compass,    title: "Quest & earn",             body: "Every tour and every trail awards XP, region cards, badges — and the rarest of all: titles that carry your reputation across the island.",                       color: "bg-sunset-500" },
  { icon: Sparkles,   title: "Chase the Sagas",          body: "Main Quests are multi-tour sagas. Complete one and you claim a unique title, a 50% bundle voucher, plus partner goodies if the saga is rich enough.",            color: "bg-sun-500" },
  { icon: Trophy,     title: "Climb the leaderboard",    body: "Become the Top Explorer of Mauritius. Mo le wer toi la-haut! (I want to see you up there!)",                                                                       color: "bg-jungle-700" },
];

// Step layout (kept dynamic so we can grow DIALOG / TUTORIAL without combing for literals)
const NAME_STEP      = DIALOG.length;
const AVATAR_STEP    = NAME_STEP + 1;
const REGISTER_STEP  = AVATAR_STEP + 1;
const TUTORIAL_START = REGISTER_STEP + 1;
const TUTORIAL_END   = TUTORIAL_START + TUTORIAL.length - 1;

export default function Prologue() {
  const navigate = useNavigate();
  const { user, register, refresh } = useAuth();
  const [step, setStep] = useState(0);
  // steps: 0..4 dialog | 5 name | 6 avatar | 7 register | 8..11 tutorial | 12 finish
  const dialogIndex = step;
  const isDialog = step < DIALOG.length;
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState(null);
  const [form, setForm] = useState({ email: "", password: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const finishingRef = useRef(false);

  // If user already logged in and tutorial completed, send them home.
  useEffect(() => {
    if (finishingRef.current) return; // don't redirect mid-cinematic handoff
    if (user && user.tutorial_completed) { navigate("/dashboard", { replace: true }); return; }
    if (user && user.avatar) {
      queueMicrotask(() => {
        setName(user.name || "");
        setAvatar(user.avatar);
        setStep(TUTORIAL_START); // jump directly to tutorial
      });
    } else if (user && !user.avatar) {
      // Google fresh user — prefill name, jump to name confirmation
      queueMicrotask(() => {
        setName(user.name || "");
        setStep(NAME_STEP);
      });
    }
  }, [user, navigate]);

  const current = isDialog ? DIALOG[dialogIndex] : null;
  const { out, done, finish } = useTypewriter(current?.line || "", 22, [step]);

  const advanceDialog = () => {
    if (!done) { finish(); return; }
    setStep((s) => s + 1);
  };

  // Key + click handlers for dialog
  useEffect(() => {
    if (!isDialog) return;
    const onKey = (e) => {
      if (e.key === " " || e.key === "Enter" || e.key === "ArrowRight") {
        e.preventDefault();
        advanceDialog();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isDialog, done]);

  const bgIndex = isDialog ? current.bg : step === NAME_STEP ? 1 : step === AVATAR_STEP ? 2 : step === REGISTER_STEP ? 3 : 0;

  const submitRegister = async (e) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await register(form.email, form.password, name);
      // After register, persist avatar & tutorial pending
      await api.patch("/me", { avatar, tutorial_completed: false });
      await refresh();
      setStep(TUTORIAL_START); // tutorial
      toast.success(`Welcome, ${name}!`);
    } catch (e) {
      setError(formatErr(e.response?.data?.detail) || e.message);
    } finally {
      setBusy(false);
    }
  };

  const finishTutorial = async () => {
    finishingRef.current = true;
    try {
      await api.patch("/me", { tutorial_completed: true });
      await refresh();
      navigate("/dashboard", { state: { cinematic: true } });
    } catch {
      navigate("/dashboard", { state: { cinematic: true } });
    }
  };

  return (
    <div className="fixed inset-0 overflow-hidden bg-jungle-700">
      {/* Backgrounds (motion crossfade with subtle Ken Burns) */}
      <AnimatePresence mode="sync">
        <motion.img
          key={bgIndex}
          src={BG[bgIndex]}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          initial={{ opacity: 0, scale: 1.08 }}
          animate={{ opacity: 1, scale: 1.0 }}
          exit={{ opacity: 0 }}
          transition={{ opacity: { duration: 1.1, ease: "easeOut" }, scale: { duration: 8, ease: "easeOut" } }}
        />
      </AnimatePresence>
      <div className="absolute inset-0 bg-gradient-to-b from-jungle-700/30 via-jungle-700/20 to-jungle-700/85" />

      {/* Top bar */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        className="absolute top-0 inset-x-0 z-20 flex items-center justify-between p-6 lg:px-10 text-white"
      >
        <Link to="/" data-testid="prologue-brand" className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-2xl bg-sunset-500 flex items-center justify-center font-display font-bold">A</div>
          <div className="font-display text-lg">An Deor · Quest</div>
        </Link>
        <Link to="/login" data-testid="prologue-signin-link" className="text-sm font-semibold hover:underline">
          I already have an account →
        </Link>
      </motion.div>

      {/* CONTENT */}
      <div className="absolute inset-0 z-10 flex flex-col">
        <div className="flex-1" />

        <AnimatePresence mode="wait">
          {/* Dialogue beats (Pokemon-style box) */}
          {isDialog && (
            <motion.button
              key={`dialog-${step}`}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              onClick={advanceDialog}
              data-testid={`prologue-dialog-${step}`}
              className="group w-full text-left"
            >
              <div className="max-w-4xl mx-auto mb-8 mx-6 lg:mx-auto bg-sand-100/95 border-4 border-jungle-700 rounded-3xl shadow-lift p-6 lg:p-8 relative">
                <div className="absolute -top-4 left-6 bg-jungle-700 text-sand-100 px-4 py-1 rounded-full font-display text-sm tracking-wider">
                  {current.speaker}
                </div>
                <p className="font-display text-2xl lg:text-3xl leading-snug text-ink-900 min-h-[4rem]">
                {out}
                <span className={`inline-block w-3 h-7 ml-1 align-middle bg-ink-900 ${done ? "opacity-0" : "animate-pulse"}`} />
              </p>
              <div className="mt-4 flex items-center justify-between text-xs tracking-[0.25em] uppercase text-ink-700">
                <span>{step + 1} / {DIALOG.length}</span>
                <span className="flex items-center gap-1">
                  {done ? "Press" : "Skip"} <kbd className="px-2 py-0.5 rounded bg-jungle-700 text-sand-100 text-[10px]">Space</kbd>
                  <ChevronRight className={`w-4 h-4 ${done ? "animate-pulse" : ""}`} />
                </span>
              </div>
            </div>
          </motion.button>
        )}

        {/* Step NAME_STEP: name input */}
        {step === NAME_STEP && (
          <motion.div
            key="scene-name"
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.98 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="max-w-xl mx-auto w-full px-6 pb-12"
          >
            <div className="bg-sand-100/95 border-4 border-jungle-700 rounded-3xl shadow-lift p-8">
              <div className="font-display text-xs tracking-[0.3em] uppercase text-sunset-500 mb-2">Step 1 of 3</div>
              <h2 className="font-display text-3xl mb-2">What shall I call you?</h2>
              <p className="text-ink-700 mb-6 text-sm">This is how guides will greet you on tour.</p>
              <Label htmlFor="prologue-name">Explorer name</Label>
              <Input
                id="prologue-name"
                data-testid="prologue-name-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Ravi, Léa, Sanjay…"
                className="rounded-2xl mt-2 mb-6"
                autoFocus
              />
              <div className="flex gap-3 justify-end">
                <Button variant="outline" onClick={() => setStep(DIALOG.length - 1)} className="rounded-full">Back</Button>
                <Button
                  disabled={!name.trim()}
                  onClick={() => setStep(AVATAR_STEP)}
                  data-testid="prologue-name-next"
                  className="rounded-full bg-jungle-500 hover:bg-jungle-600 text-white"
                >
                  Continue <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Step AVATAR_STEP: avatar pick */}
        {step === AVATAR_STEP && (
          <motion.div
            key="scene-avatar"
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.98 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="max-w-5xl mx-auto w-full px-6 pb-12"
          >
            <div className="bg-sand-100/95 border-4 border-jungle-700 rounded-3xl shadow-lift p-8">
              <div className="font-display text-xs tracking-[0.3em] uppercase text-sunset-500 mb-2">Step 2 of 3</div>
              <h2 className="font-display text-3xl mb-2">Choose your starter explorer</h2>
              <p className="text-ink-700 mb-6 text-sm">Don&rsquo;t stress — you can always swap later.</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {AVATARS.map((a, i) => {
                  const Icon = a.icon;
                  const selected = avatar === a.id;
                  return (
                    <motion.button
                      key={a.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: 0.1 + i * 0.06, ease: "easeOut" }}
                      whileHover={{ y: -4 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => setAvatar(a.id)}
                      data-testid={`prologue-avatar-${a.id}`}
                      className={`group text-left rounded-3xl p-5 border-2 transition-colors ${selected ? "border-sunset-500 bg-white shadow-lift" : "border-transparent bg-white/70 hover:bg-white"}`}
                    >
                      <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${a.gradient} text-white flex items-center justify-center mb-3`}>
                        <Icon className="w-7 h-7" />
                      </div>
                      <div className="font-display text-lg">{a.name}</div>
                      <div className="text-xs text-ink-700 mt-1">{a.bio}</div>
                      {selected && <div className="mt-3 text-xs font-bold uppercase tracking-[0.2em] text-sunset-500">Selected</div>}
                    </motion.button>
                  );
                })}
              </div>
              <div className="flex gap-3 justify-end mt-6">
                <Button variant="outline" onClick={() => setStep(NAME_STEP)} className="rounded-full">Back</Button>
                <Button
                  disabled={!avatar}
                  onClick={async () => {
                    if (user) {
                      // Already authenticated (e.g., Google OAuth) — persist avatar + name, jump to tutorial
                      try {
                        await api.patch("/me", { name: name || user.name, avatar });
                        await refresh();
                        setStep(TUTORIAL_START);
                      } catch (e) {
                        toast.error(formatErr(e.response?.data?.detail) || e.message);
                      }
                    } else {
                      setStep(REGISTER_STEP);
                    }
                  }}
                  data-testid="prologue-avatar-next"
                  className="rounded-full bg-jungle-500 hover:bg-jungle-600 text-white"
                >
                  Continue <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Step REGISTER_STEP: register */}
        {step === REGISTER_STEP && (
          <motion.div
            key="scene-register"
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.98 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="max-w-md mx-auto w-full px-6 pb-12"
          >
            <form onSubmit={submitRegister} className="bg-sand-100/95 border-4 border-jungle-700 rounded-3xl shadow-lift p-8" data-testid="prologue-register-form">
              <div className="font-display text-xs tracking-[0.3em] uppercase text-sunset-500 mb-2">Step 3 of 3</div>
              <h2 className="font-display text-3xl mb-2">Save your quest</h2>
              <p className="text-ink-700 mb-6 text-sm">So you don&rsquo;t lose your progress, {name}.</p>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="prologue-email">Email</Label>
                  <Input id="prologue-email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} data-testid="prologue-email-input" className="rounded-2xl mt-2" />
                </div>
                <div>
                  <Label htmlFor="prologue-password">Password</Label>
                  <Input id="prologue-password" type="password" minLength={6} required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} data-testid="prologue-password-input" className="rounded-2xl mt-2" />
                </div>
                {error && <div className="text-sunset-600 text-sm" data-testid="prologue-error">{error}</div>}
              </div>
              <div className="flex gap-3 justify-end mt-6">
                <Button type="button" variant="outline" onClick={() => setStep(AVATAR_STEP)} className="rounded-full">Back</Button>
                <Button type="submit" disabled={busy} data-testid="prologue-register-btn" className="rounded-full bg-sunset-500 hover:bg-sunset-600 text-white">
                  {busy ? "Embarking…" : "Begin the quest"}
                </Button>
              </div>
            </form>
          </motion.div>
        )}

        {/* Step TUTORIAL_START..TUTORIAL_END: tutorial */}
        {step >= TUTORIAL_START && step <= TUTORIAL_END && (
          <motion.div
            key={`scene-tutorial-${step}`}
            initial={{ opacity: 0, x: 36 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -36 }}
            transition={{ duration: 0.32, ease: "easeOut" }}
            className="max-w-3xl mx-auto w-full px-6 pb-12"
          >
            <div className="bg-sand-100/95 border-4 border-jungle-700 rounded-3xl shadow-lift p-8" data-testid={`prologue-tutorial-${step - TUTORIAL_START}`}>
              <div className="font-display text-xs tracking-[0.3em] uppercase text-sunset-500 mb-2">How to play · {step - TUTORIAL_START + 1} / {TUTORIAL.length}</div>
              {(() => {
                const t = TUTORIAL[step - TUTORIAL_START];
                const Icon = t.icon;
                return (
                  <>
                    <div className="flex items-start gap-5 mb-6">
                      <motion.div
                        initial={{ scale: 0.6, rotate: -8, opacity: 0 }}
                        animate={{ scale: 1, rotate: 0, opacity: 1 }}
                        transition={{ duration: 0.45, ease: "backOut" }}
                        className={`w-16 h-16 rounded-3xl ${t.color} text-white flex items-center justify-center shrink-0`}
                      >
                        <Icon className="w-8 h-8" />
                      </motion.div>
                      <div>
                        <h2 className="font-display text-3xl">{t.title}</h2>
                        <p className="text-ink-700 mt-2 leading-relaxed">{t.body}</p>
                      </div>
                    </div>
                    <div className="flex gap-1 mb-4">
                      {TUTORIAL.map((_, i) => (
                        <motion.span
                          key={i}
                          initial={false}
                          animate={{ backgroundColor: i <= step - TUTORIAL_START ? "#265448" : "#E5DFD3" }}
                          transition={{ duration: 0.4 }}
                          className="h-1.5 flex-1 rounded-full"
                        />
                      ))}
                    </div>
                  </>
                );
              })()}
              <div className="flex gap-3 justify-end">
                {step > TUTORIAL_START && (
                  <Button variant="outline" onClick={() => setStep(step - 1)} className="rounded-full">Back</Button>
                )}
                {step < TUTORIAL_END ? (
                  <Button onClick={() => setStep(step + 1)} data-testid="prologue-tutorial-next" className="rounded-full bg-jungle-500 hover:bg-jungle-600 text-white">
                    Next <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                ) : (
                  <Button onClick={finishTutorial} data-testid="prologue-enter-world" className="rounded-full bg-sunset-500 hover:bg-sunset-600 text-white">
                    <Sparkles className="w-4 h-4 mr-1" /> Enter Mauritius
                  </Button>
                )}
              </div>
            </div>
          </motion.div>
        )}
        </AnimatePresence>
      </div>
    </div>
  );
}
