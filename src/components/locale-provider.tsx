'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  type Locale,
  type Translations,
  translations,
  DEFAULT_LOCALE,
  LOCALE_STORAGE_KEY,
  resolveSystemLocale,
} from '@/i18n';

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

  return (
    <LocaleContext.Provider value={{ locale, localePreference, setLocale, t: translations[locale] as Translations }}>
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
