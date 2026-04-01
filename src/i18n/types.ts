// ─────────────────────────────────────────────────────────────
// i18n — Types & locale list
// ─────────────────────────────────────────────────────────────

export type Locale = 'fr' | 'en' | 'de' | 'es' | 'it' | 'pt' | 'nl' | 'pl' | 'sv' | 'da' | 'no' | 'ja';

export const LOCALES: { value: Locale; label: string; flag: string }[] = [
  { value: 'fr', label: 'Français',   flag: '🇫🇷' },
  { value: 'en', label: 'English',    flag: '🇬🇧' },
  { value: 'de', label: 'Deutsch',    flag: '🇩🇪' },
  { value: 'es', label: 'Español',    flag: '🇪🇸' },
  { value: 'it', label: 'Italiano',   flag: '🇮🇹' },
  { value: 'pt', label: 'Português',  flag: '🇵🇹' },
  { value: 'nl', label: 'Nederlands', flag: '🇳🇱' },
  { value: 'pl', label: 'Polski',     flag: '🇵🇱' },
  { value: 'sv', label: 'Svenska',    flag: '🇸🇪' },
  { value: 'da', label: 'Dansk',      flag: '🇩🇰' },
  { value: 'no', label: 'Norsk',      flag: '🇳🇴' },
  { value: 'ja', label: '日本語',      flag: '🇯🇵' },
];

/** Resolve a browser language tag (e.g. "fr-FR", "en-US") to the nearest supported Locale. */
export function resolveSystemLocale(): Locale {
  if (typeof window === 'undefined') return DEFAULT_LOCALE;
  const supported = LOCALES.map((l) => l.value);
  const candidates = navigator.languages?.length ? navigator.languages : [navigator.language];
  for (const lang of candidates) {
    const base = lang.split('-')[0].toLowerCase() as Locale;
    if (supported.includes(base)) return base;
  }
  return DEFAULT_LOCALE;
}

export const DEFAULT_LOCALE: Locale = 'fr';
export const LOCALE_STORAGE_KEY = 'alfychat_locale';

// ─────────────────────────────────────────────────────────────
// Translation shape — English is the source of truth
// ─────────────────────────────────────────────────────────────
export type Translations = typeof import('./en').en;
