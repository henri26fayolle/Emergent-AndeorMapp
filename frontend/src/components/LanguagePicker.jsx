import { useLanguage } from "@/contexts/LanguageContext";
import { SUPPORTED_LANGUAGES } from "@/lib/i18n";
import { playClick } from "@/lib/sound";
import { motion } from "framer-motion";

/**
 * Compact pill-row language picker. Used on the Prologue's first screen.
 * Persists to localStorage immediately; if a user is authed, also syncs to the
 * backend (user.language) so it follows them across devices.
 *
 * @prop {('default'|'compact')} variant
 * @prop {string} className
 */
export default function LanguagePicker({ variant = "default", className = "" }) {
  const { lang, setLang, t } = useLanguage();
  const isCompact = variant === "compact";

  return (
    <div className={`${className}`} data-testid="language-picker">
      {!isCompact && (
        <div className="mb-2 text-[10px] tracking-[0.3em] uppercase font-bold text-sand-100/85">
          {t("picker.title")}
        </div>
      )}
      <div
        role="radiogroup"
        aria-label={t("picker.title")}
        className="inline-flex items-center gap-1 p-1 rounded-full bg-ink-900/55 backdrop-blur-md border border-white/10 shadow-clay"
      >
        {SUPPORTED_LANGUAGES.map((opt) => {
          const active = opt.code === lang;
          return (
            <motion.button
              key={opt.code}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => { playClick(); setLang(opt.code); }}
              data-testid={`lang-pick-${opt.code}`}
              whileTap={{ scale: 0.94 }}
              className={`relative inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold tracking-[0.08em] uppercase transition-colors ${
                active
                  ? "bg-sand-100 text-jungle-700 shadow-clay"
                  : "text-sand-100/85 hover:text-sand-100 hover:bg-white/10"
              }`}
            >
              <span aria-hidden className="text-base leading-none">{opt.flag}</span>
              <span>{isCompact ? opt.short : opt.name}</span>
            </motion.button>
          );
        })}
      </div>
      {!isCompact && (
        <div className="mt-1.5 text-[11px] text-sand-100/70 italic">
          {t("picker.hint")}
        </div>
      )}
    </div>
  );
}
