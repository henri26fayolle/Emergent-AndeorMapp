import { useEffect, useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import LanguagePicker from "@/components/LanguagePicker";
import { startAndeorAuthPopup } from "@/lib/andeorAuthPopup";
import { AVATARS } from "@/lib/avatars";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ChevronRight, LogIn, Map, Sparkles, Trophy, Compass, Footprints } from "lucide-react";

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

// Dialog beats are keyed (copy lives in /src/lib/i18n.js so it can be swapped
// to English / Français / Kreol Morisien per the user's pick).
const DIALOG_KEYS = ["dialog.0", "dialog.1", "dialog.2", "dialog.3", "dialog.4", "dialog.5"];
const DIALOG_BGS  = [0, 1, 2, 3, 1, 0];

// Tutorial cards: visuals/icons in code, strings in i18n.
const TUTORIAL = [
  { icon: Map,        color: "bg-jungle-500", titleKey: "tutorial.0.title", bodyKey: "tutorial.0.body" },
  { icon: Footprints, color: "bg-ocean-500",  titleKey: "tutorial.1.title", bodyKey: "tutorial.1.body" },
  { icon: Compass,    color: "bg-sunset-500", titleKey: "tutorial.2.title", bodyKey: "tutorial.2.body" },
  { icon: Sparkles,   color: "bg-sun-500",    titleKey: "tutorial.3.title", bodyKey: "tutorial.3.body" },
  { icon: Trophy,     color: "bg-jungle-700", titleKey: "tutorial.4.title", bodyKey: "tutorial.4.body" },
];

const NAME_STEP      = DIALOG_KEYS.length;
const AVATAR_STEP    = NAME_STEP + 1;
const REGISTER_STEP  = AVATAR_STEP + 1;
const TUTORIAL_START = REGISTER_STEP + 1;
const TUTORIAL_END   = TUTORIAL_START + TUTORIAL.length - 1;
const PROLOGUE_DRAFT_KEY = "andeor_game_prologue_draft";

function savePrologueDraft(draft) {
  try {
    window.localStorage.setItem(PROLOGUE_DRAFT_KEY, JSON.stringify(draft));
  } catch {
    // If storage is unavailable, the user can still finish onboarding after auth.
  }
}

function readPrologueDraft() {
  try {
    const raw = window.localStorage.getItem(PROLOGUE_DRAFT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function clearPrologueDraft() {
  try {
    window.localStorage.removeItem(PROLOGUE_DRAFT_KEY);
  } catch {
    // Ignore storage cleanup failures.
  }
}

export default function Prologue() {
  const navigate = useNavigate();
  const { user, refresh } = useAuth();
  const { t, lang } = useLanguage();
  const [step, setStep] = useState(0);
  const dialogIndex = step;
  const isDialog = step < DIALOG_KEYS.length;
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState(null);
  const [connectingAuth, setConnectingAuth] = useState(false);
  const finishingRef = useRef(false);
  const applyingDraftRef = useRef(false);

  useEffect(() => {
    if (finishingRef.current) return;
    if (user && !applyingDraftRef.current) {
      const draft = readPrologueDraft();
      if (draft?.avatar) {
        applyingDraftRef.current = true;
        api.patch("/me", {
          name: draft.name || user.name || "",
          avatar: draft.avatar,
          language: draft.lang || lang,
          tutorial_completed: true
        })
          .then(() => {
            clearPrologueDraft();
            return refresh();
          })
          .then(() => {
            navigate("/dashboard", { replace: true, state: { cinematic: true } });
          })
          .finally(() => {
            applyingDraftRef.current = false;
          });
        return;
      }
    }
    if (user && user.tutorial_completed) { navigate("/dashboard", { replace: true }); return; }
    if (user && user.avatar) {
      queueMicrotask(() => {
        setName(user.name || "");
        setAvatar(user.avatar);
        setStep(TUTORIAL_START);
      });
    } else if (user && !user.avatar) {
      queueMicrotask(() => {
        setName(user.name || "");
      });
    }
  }, [user, navigate, refresh, lang]);

  const currentLine = isDialog ? t(DIALOG_KEYS[dialogIndex]) : "";
  const { out, done, finish } = useTypewriter(currentLine, 22, [step, lang]);

  const advanceDialog = () => {
    if (!done) { finish(); return; }
    setStep((s) => s + 1);
  };

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

  const bgIndex = isDialog ? DIALOG_BGS[dialogIndex] : step === NAME_STEP ? 1 : step === AVATAR_STEP ? 2 : step === REGISTER_STEP ? 3 : 0;

  const continueToAndeorAuth = (mode, provider) => {
    savePrologueDraft({ name: name.trim(), avatar, lang });
    setConnectingAuth(true);
    startAndeorAuthPopup({
      mode,
      provider,
      onSuccess: async () => {
        try {
          await refresh();
        } finally {
          setConnectingAuth(false);
        }
      },
      onError: () => setConnectingAuth(false),
      onCancel: () => setConnectingAuth(false),
    });
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
        className="absolute top-0 inset-x-0 z-20 flex items-center justify-between p-6 lg:px-10 text-white gap-4 flex-wrap"
      >
        <Link to="/" data-testid="prologue-brand" className="flex items-center gap-2 shrink-0">
          <div className="w-9 h-9 rounded-2xl bg-sunset-500 flex items-center justify-center font-display font-bold">A</div>
          <div className="font-display text-lg">{t("topbar.brand")}</div>
        </Link>
        <div className="flex items-center gap-3 sm:gap-4">
          <LanguagePicker variant="compact" />
          <Link to="/login" data-testid="prologue-signin-link" className="text-sm font-semibold hover:underline shrink-0">
            {t("topbar.signin")}
          </Link>
        </div>
      </motion.div>

      {/* Big hero language picker — only on the very first dialog beat. */}
      <AnimatePresence>
        {step === 0 && (
          <motion.div
            key="lang-pick-hero"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.45, ease: "easeOut", delay: 0.25 }}
            className="absolute z-20 top-24 sm:top-28 left-1/2 -translate-x-1/2 w-[calc(100%-3rem)] max-w-md text-center"
          >
            <LanguagePicker />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="absolute inset-0 z-10 flex flex-col">
        <div className="flex-1" />

        <AnimatePresence mode="wait">
          {isDialog && (
            <motion.button
              key={`dialog-${step}-${lang}`}
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
                  Ti Dodo
                </div>
                <p className="font-display text-2xl lg:text-3xl leading-snug text-ink-900 min-h-[4rem]">
                  {out}
                  <span className={`inline-block w-3 h-7 ml-1 align-middle bg-ink-900 ${done ? "opacity-0" : "animate-pulse"}`} />
                </p>
                <div className="mt-4 flex items-center justify-between text-xs tracking-[0.25em] uppercase text-ink-700">
                  <span>{step + 1} / {DIALOG_KEYS.length}</span>
                  <span className="flex items-center gap-1">
                    {done ? t("dialog.footer.press") : t("dialog.footer.skip")} <kbd className="px-2 py-0.5 rounded bg-jungle-700 text-sand-100 text-[10px]">Space</kbd>
                    <ChevronRight className={`w-4 h-4 ${done ? "animate-pulse" : ""}`} />
                  </span>
                </div>
              </div>
            </motion.button>
          )}

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
                <div className="font-display text-xs tracking-[0.3em] uppercase text-sunset-500 mb-2">{t("step1.label")}</div>
                <h2 className="font-display text-3xl mb-2">{t("name.heading")}</h2>
                <p className="text-ink-700 mb-6 text-sm">{t("name.subhead")}</p>
                <Label htmlFor="prologue-name">{t("name.label")}</Label>
                <Input
                  id="prologue-name"
                  data-testid="prologue-name-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t("name.placeholder")}
                  className="rounded-2xl mt-2 mb-6"
                  autoFocus
                />
                <div className="flex gap-3 justify-end">
                  <Button variant="outline" onClick={() => setStep(DIALOG_KEYS.length - 1)} className="rounded-full">{t("btn.back")}</Button>
                  <Button
                    disabled={!name.trim()}
                    onClick={() => setStep(AVATAR_STEP)}
                    data-testid="prologue-name-next"
                    className="rounded-full bg-jungle-500 hover:bg-jungle-600 text-white"
                  >
                    {t("btn.continue")} <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

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
                <div className="font-display text-xs tracking-[0.3em] uppercase text-sunset-500 mb-2">{t("step2.label")}</div>
                <h2 className="font-display text-3xl mb-2">{t("avatar.heading")}</h2>
                <p className="text-ink-700 mb-6 text-sm">{t("avatar.subhead")}</p>
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
                        {selected && <div className="mt-3 text-xs font-bold uppercase tracking-[0.2em] text-sunset-500">{t("avatar.selected")}</div>}
                      </motion.button>
                    );
                  })}
                </div>
                <div className="flex gap-3 justify-end mt-6">
                  <Button variant="outline" onClick={() => setStep(NAME_STEP)} className="rounded-full">{t("btn.back")}</Button>
                  <Button
                    disabled={!avatar}
                    onClick={async () => {
                      if (user) {
                        try {
                          await api.patch("/me", { name: name || user.name, avatar, language: lang });
                          await refresh();
                          setStep(TUTORIAL_START);
                        } catch (e) {
                          toast.error(e.response?.data?.detail || e.message || "Unable to save your explorer.");
                        }
                      } else {
                        setStep(REGISTER_STEP);
                      }
                    }}
                    data-testid="prologue-avatar-next"
                    className="rounded-full bg-jungle-500 hover:bg-jungle-600 text-white"
                  >
                    {t("btn.continue")} <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

          {step === REGISTER_STEP && (
            <motion.div
              key="scene-register"
              initial={{ opacity: 0, y: 24, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -16, scale: 0.98 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="max-w-xl mx-auto w-full px-6 pb-12"
            >
              <div className="bg-sand-100/95 border-4 border-jungle-700 rounded-3xl shadow-lift p-8" data-testid="prologue-auth-options">
                <div className="font-display text-xs tracking-[0.3em] uppercase text-sunset-500 mb-2">{t("step3.label")}</div>
                <h2 className="font-display text-3xl mb-2">{t("register.heading")}</h2>
                <p className="text-ink-700 mb-6 text-sm">{t("register.subhead", { name })}</p>
                <div className="space-y-3">
                  <Button
                    type="button"
                    disabled={connectingAuth}
                    onClick={() => continueToAndeorAuth("login", "google")}
                    data-testid="prologue-google-auth"
                    className="w-full rounded-2xl bg-white text-ink-900 border border-ink-900/10 hover:bg-sand-50 justify-start h-auto py-4 disabled:opacity-70"
                  >
                    <span className="mr-3 grid h-10 w-10 place-items-center rounded-full bg-white shadow-sm border border-ink-900/10">
                      <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
                        <path fill="#4285F4" d="M22.6 12.2c0-.8-.1-1.6-.2-2.3H12v4.4h5.9c-.3 1.4-1.1 2.5-2.2 3.3v2.7h3.6c2.1-1.9 3.3-4.7 3.3-8.1Z" />
                        <path fill="#34A853" d="M12 23c3 0 5.5-1 7.3-2.7l-3.6-2.7c-1 .7-2.2 1-3.7 1-2.8 0-5.2-1.9-6.1-4.5H2.2v2.8C4 20.5 7.7 23 12 23Z" />
                        <path fill="#FBBC05" d="M5.9 14.1c-.2-.7-.4-1.4-.4-2.1s.1-1.4.4-2.1V7.1H2.2A11 11 0 0 0 1 12c0 1.8.4 3.5 1.2 4.9l3.7-2.8Z" />
                        <path fill="#EA4335" d="M12 5.4c1.6 0 3.1.6 4.2 1.7l3.2-3.2A10.8 10.8 0 0 0 12 1C7.7 1 4 3.5 2.2 7.1l3.7 2.8c.9-2.6 3.3-4.5 6.1-4.5Z" />
                      </svg>
                    </span>
                    <span className="text-left">
                      <span className="block font-display text-lg">{connectingAuth ? "Connecting Google..." : t("register.google")}</span>
                      <span className="block text-xs font-normal text-ink-700">Connect without leaving the adventure map.</span>
                    </span>
                  </Button>
                  <Button
                    type="button"
                    disabled={connectingAuth}
                    onClick={() => continueToAndeorAuth("signup", "google")}
                    data-testid="prologue-signup-auth"
                    className="w-full rounded-2xl bg-jungle-500 hover:bg-jungle-600 text-white justify-start h-auto py-4 disabled:opacity-70"
                  >
                    <Sparkles className="mr-3 h-5 w-5" />
                    <span className="text-left">
                      <span className="block font-display text-lg">Sign up with Google</span>
                      <span className="block text-xs font-normal text-sand-100/80">{t("register.signup.subhead")}</span>
                    </span>
                  </Button>
                  <Button
                    type="button"
                    disabled={connectingAuth}
                    onClick={() => continueToAndeorAuth("login", "google")}
                    data-testid="prologue-login-auth"
                    variant="outline"
                    className="w-full rounded-2xl justify-start h-auto py-4 disabled:opacity-70"
                  >
                    <LogIn className="mr-3 h-5 w-5" />
                    <span className="text-left">
                      <span className="block font-display text-lg">Log in with Google</span>
                      <span className="block text-xs font-normal text-ink-700">{t("register.login.subhead")}</span>
                    </span>
                  </Button>
                </div>
                <div className="flex gap-3 justify-end mt-6">
                  <Button type="button" variant="outline" onClick={() => setStep(AVATAR_STEP)} className="rounded-full">{t("btn.back")}</Button>
                </div>
              </div>
            </motion.div>
          )}

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
                <div className="font-display text-xs tracking-[0.3em] uppercase text-sunset-500 mb-2">
                  {t("tutorial.header", { n: step - TUTORIAL_START + 1, total: TUTORIAL.length })}
                </div>
                {(() => {
                  const tu = TUTORIAL[step - TUTORIAL_START];
                  const Icon = tu.icon;
                  return (
                    <>
                      <div className="flex items-start gap-5 mb-6">
                        <motion.div
                          initial={{ scale: 0.6, rotate: -8, opacity: 0 }}
                          animate={{ scale: 1, rotate: 0, opacity: 1 }}
                          transition={{ duration: 0.45, ease: "backOut" }}
                          className={`w-16 h-16 rounded-3xl ${tu.color} text-white flex items-center justify-center shrink-0`}
                        >
                          <Icon className="w-8 h-8" />
                        </motion.div>
                        <div>
                          <h2 className="font-display text-3xl">{t(tu.titleKey)}</h2>
                          <p className="text-ink-700 mt-2 leading-relaxed">{t(tu.bodyKey)}</p>
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
                    <Button variant="outline" onClick={() => setStep(step - 1)} className="rounded-full">{t("btn.back")}</Button>
                  )}
                  {step < TUTORIAL_END ? (
                    <Button onClick={() => setStep(step + 1)} data-testid="prologue-tutorial-next" className="rounded-full bg-jungle-500 hover:bg-jungle-600 text-white">
                      {t("btn.next")} <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  ) : (
                    <Button onClick={finishTutorial} data-testid="prologue-enter-world" className="rounded-full bg-sunset-500 hover:bg-sunset-600 text-white">
                      <Sparkles className="w-4 h-4 mr-1" /> {t("btn.enterWorld")}
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
