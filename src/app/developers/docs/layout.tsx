'use client';

import { LangProvider, useLang, LANGS } from './lang-context';
import { cn } from '@/lib/utils';

function LangBar() {
  const { lang, setLang } = useLang();
  return (
    <div className="sticky top-0 z-30 flex items-center gap-1.5 border-b border-border/60 bg-background/95 px-6 py-2.5">
      <span className="mr-2 text-[11px] font-semibold text-muted-foreground/70">Langage&nbsp;:</span>
      {LANGS.map((l) => (
        <button
          key={l.id}
          onClick={() => setLang(l.id)}
          className={cn(
            'flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-semibold transition-all',
            lang === l.id
              ? 'bg-surface text-foreground shadow-sm ring-1 ring-border/60'
              : 'text-muted-foreground hover:bg-surface/50 hover:text-foreground',
          )}
        >
          <span
            className="size-2 shrink-0 rounded-full"
            style={{ backgroundColor: l.color }}
          />
          {l.label}
        </button>
      ))}
    </div>
  );
}

function Inner({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-col">
      <LangBar />
      <div className="flex-1">{children}</div>
    </div>
  );
}

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <LangProvider>
      <Inner>{children}</Inner>
    </LangProvider>
  );
}
