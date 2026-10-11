'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useInView, useReducedMotionConfig } from 'motion/react';

import { useTranslation } from '@/components/locale-provider';
import { cn } from '@/lib/utils';
import { CONTAINER, Display, Eyebrow, Reveal } from './shared';

interface Line {
  kind: 'cmd' | 'ok';
  text: string;
}

const TYPE_MS = 26;
const PAUSE_MS = 320;

/**
 * Révèle les lignes une à une : les commandes se tapent caractère par
 * caractère, les sorties tombent d'un bloc. Démarre à l'entrée dans l'écran.
 */
function useTypedLines(lines: Line[], start: boolean) {
  const reduce = useReducedMotionConfig();
  const [state, setState] = useState({ line: 0, char: 0 });

  useEffect(() => {
    if (!start) return;
    if (reduce) {
      setState({ line: lines.length, char: 0 });
      return;
    }
    const current = lines[state.line];
    if (!current) return;

    const typing = current.kind === 'cmd' && state.char < current.text.length;
    const id = window.setTimeout(
      () => setState((s) => (typing ? { ...s, char: s.char + 1 } : { line: s.line + 1, char: 0 })),
      typing ? TYPE_MS : PAUSE_MS,
    );
    return () => window.clearTimeout(id);
  }, [start, reduce, lines, state]);

  return state;
}

export function HomeSelfHost() {
  const { t } = useTranslation();
  const s = t.landing.home.selfHost;
  const legacy = t.landing.selfHosting;
  const steps = [legacy.steps.install, legacy.steps.link, legacy.steps.start];

  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });

  const lines = useMemo<Line[]>(() => [
    { kind: 'cmd', text: 'npm install -g @alfychat/server-node' },
    { kind: 'cmd', text: 'alfychat-server start' },
    { kind: 'ok', text: s.registered },
    { kind: 'ok', text: s.data },
    { kind: 'ok', text: s.online },
  ], [s.registered, s.data, s.online]);
  const { line, char } = useTypedLines(lines, inView);

  return (
    <section id="self-hosting" className="scroll-mt-16 bg-surface">
      <div className={cn(CONTAINER, 'grid gap-16 py-28 lg:grid-cols-2 lg:items-center lg:gap-20 lg:py-40')}>
        <div className="flex flex-col gap-6">
          <Reveal>
            <Eyebrow>{legacy.badge}</Eyebrow>
          </Reveal>
          <Display lines={[s.title1, s.title2]} tones={{ 1: 'text-muted' }} />
          <Reveal delay={0.1}>
            <p className="max-w-[44ch] text-[17px] leading-relaxed text-muted">{legacy.body}</p>
          </Reveal>

          <ol className="mt-6 flex flex-col gap-7">
            {steps.map((step, i) => (
              <Reveal as="li" key={step.num} delay={0.15 + i * 0.06} className="flex gap-5">
                <span className="w-6 shrink-0 pt-0.5 font-mono text-sm text-accent">{step.num}</span>
                <div className="flex flex-col gap-1">
                  <p className="font-semibold text-foreground">{step.title}</p>
                  <p className="text-sm leading-relaxed text-muted">{step.desc}</p>
                </div>
              </Reveal>
            ))}
          </ol>
        </div>

        <Reveal delay={0.1}>
          <div ref={ref} className="overflow-hidden rounded-3xl bg-background">
            <p className="px-6 pt-5 font-mono text-xs text-muted">{s.terminalTitle}</p>
            <pre className="min-h-62 overflow-x-auto px-6 pt-4 pb-7 font-mono text-[13px] leading-8 whitespace-pre-wrap">
              <span className="sr-only">{lines.map((l) => l.text).join('\n')}</span>
              {lines.map((l, i) => {
                if (i > line) return null;
                const text = i === line && l.kind === 'cmd' ? l.text.slice(0, char) : l.text;
                if (i === line && l.kind === 'ok') return null;
                return (
                  <span key={i} className="block" aria-hidden>
                    {l.kind === 'cmd' ? (
                      <span className="text-muted">$ </span>
                    ) : (
                      <span className="text-success">✓ </span>
                    )}
                    <span className={l.kind === 'cmd' ? 'text-foreground' : 'text-muted'}>{text}</span>
                    {i === line && <Caret />}
                  </span>
                );
              })}
              {line >= lines.length && (
                <span className="block" aria-hidden>
                  <span className="text-muted">$ </span>
                  <Caret />
                </span>
              )}
            </pre>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function Caret() {
  return <span className="err-caret ml-px inline-block h-4 w-2 translate-y-0.5 bg-accent" />;
}
