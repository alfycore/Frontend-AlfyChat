'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';

export type Lang = 'js' | 'ts' | 'python' | 'java';

export const LANGS: { id: Lang; label: string; ext: string; color: string }[] = [
  { id: 'js',     label: 'JavaScript', ext: 'js',   color: '#f0db4f' },
  { id: 'ts',     label: 'TypeScript', ext: 'ts',   color: '#3178c6' },
  { id: 'python', label: 'Python',     ext: 'py',   color: '#3572A5' },
  { id: 'java',   label: 'Java',       ext: 'java', color: '#b07219' },
];

interface LangCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
}

const LangContext = createContext<LangCtx>({ lang: 'js', setLang: () => {} });

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>('js');

  useEffect(() => {
    const stored = localStorage.getItem('alfychat-docs-lang') as Lang | null;
    if (stored && LANGS.some((l) => l.id === stored)) setLangState(stored);
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    localStorage.setItem('alfychat-docs-lang', l);
  }, []);

  return <LangContext.Provider value={{ lang, setLang }}>{children}</LangContext.Provider>;
}

export const useLang = () => useContext(LangContext);
