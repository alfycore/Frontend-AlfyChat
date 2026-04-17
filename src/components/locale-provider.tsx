'use client';

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  type Locale,
  type Translations,
  translations,
  DEFAULT_LOCALE,
  LOCALE_STORAGE_KEY,
  resolveSystemLocale,
} from '@/i18n';

// ─────────────────────────────────────────────────────────────
// Deep-merge locale with English so any missing key falls back.
// Keeps types happy (`as Translations`) AND avoids `undefined` in UI
// when a locale hasn't been fully translated yet.
// ─────────────────────────────────────────────────────────────
function mergeWithFallback<T>(base: T, override: any): T {
  if (base === null || typeof base !== 'object') return (override ?? base) as T;
  if (Array.isArray(base)) return (override ?? base) as T;
  const out: any = {};
  for (const key in base) {
    out[key] = mergeWithFallback((base as any)[key], override?.[key]);
  }
  // Preserve keys that exist only in override (shouldn't happen in practice)
  if (override && typeof override === 'object') {
    for (const key in override) if (!(key in out)) out[key] = override[key];
  }
  return out as T;
}

// ─── Context ──────────────────────────────────────────────────
interface LocaleContextValue {
  locale: Locale;
  /** 'system' | Locale — the raw stored preference */
  localePreference: Locale | 'system';
  setLocale: (l: Locale | 'system') => void;
  t: Translations;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────
export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [localePreference, setLocalePreference] = useState<Locale | 'system'>('system');
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);

  // Hydrate from localStorage once on mount
  useEffect(() => {
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY) as Locale | 'system' | null;
    if (stored === 'system') {
      setLocalePreference('system');
      setLocaleState(resolveSystemLocale());
    } else if (stored && stored in translations) {
      setLocalePreference(stored as Locale);
      setLocaleState(stored as Locale);
    } else {
      // Default: use system language
      setLocalePreference('system');
      setLocaleState(resolveSystemLocale());
    }
  }, []);

  const setLocale = (l: Locale | 'system') => {
    setLocalePreference(l);
    localStorage.setItem(LOCALE_STORAGE_KEY, l);
    const resolved = l === 'system' ? resolveSystemLocale() : l;
    setLocaleState(resolved);
    document.documentElement.lang = resolved;
  };

  const t = useMemo<Translations>(
    () => mergeWithFallback<Translations>(translations.en as Translations, translations[locale]),
    [locale],
  );

  return (
    <LocaleContext.Provider value={{ locale, localePreference, setLocale, t }}>
      {children}
    </LocaleContext.Provider>
  );
}

// ─── Hooks ────────────────────────────────────────────────────
export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error('useLocale must be used inside <LocaleProvider>');
  return ctx;
}

/** Returns the translation object `t` and a helper `tx` for interpolation. */
export function useTranslation() {
  const { t, locale, setLocale } = useLocale();

  /**
   * Interpolates `{variable}` placeholders in a string.
   * Example: tx('Hello {name}!', { name: 'Alice' }) → 'Hello Alice!'
   */
  const tx = (str: string, vars?: Record<string, string | number>): string => {
    if (!vars) return str;
    return Object.entries(vars).reduce<string>(
      (acc, [key, val]) => acc.replaceAll(`{${key}}`, String(val)),
      str,
    );
  };

  return { t, tx, locale, setLocale };
}
