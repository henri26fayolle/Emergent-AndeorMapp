import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { translate, SUPPORTED_LANGUAGES } from "@/lib/i18n";
import { useAuth } from "@/contexts/AuthContext";

const LS_KEY = "andeor.lang";
const DEFAULT = "en";
const VALID = new Set(SUPPORTED_LANGUAGES.map((l) => l.code));

const LanguageContext = createContext({
  lang: DEFAULT,
  setLang: () => {},
  t: (k) => k,
});

function readStoredLang() {
  try {
    const v = localStorage.getItem(LS_KEY);
    return VALID.has(v) ? v : DEFAULT;
  } catch {
    return DEFAULT;
  }
}

export function LanguageProvider({ children }) {
  const { user, refresh } = useAuth();
  const [lang, setLangState] = useState(readStoredLang);

  // If the authed user has a server-side language preference, adopt it on load.
  // (We intentionally listen on user.user_id only — re-syncing on every state
  // change of `lang` would create a loop with the server.)
  const userId = user?.user_id;
  useEffect(() => {
    if (!user) return;
    const server = user.language;
    if (VALID.has(server) && server !== lang) {
      setLangState(server);
      try { localStorage.setItem(LS_KEY, server); } catch { /* noop */ }
    }
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  const setLang = useCallback(async (next) => {
    if (!VALID.has(next) || next === lang) return;
    setLangState(next);
    try { localStorage.setItem(LS_KEY, next); } catch { /* noop */ }
    if (user) {
      try {
        await api.patch("/me", { language: next });
        await refresh();
      } catch { /* silent — non-blocking */ }
    }
  }, [lang, user, refresh]);

  const t = useCallback((key, vars) => translate(key, lang, vars), [lang]);

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
