'use client';

import NextLink from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useInView, useReducedMotionConfig } from 'motion/react';
import { Avatar, Button, ToggleButton, ToggleButtonGroup, buttonVariants } from '@heroui/react';
import { ArrowDown, Hash, Lock, SendHorizontal } from 'lucide-react';

import { useAuth } from '@/hooks/use-auth';
import { useTranslation } from '@/components/locale-provider';
import { cn } from '@/lib/utils';
import { CONTAINER, Display, EASE, cipherOf, useCipherText } from './shared';

type View = 'you' | 'server';

export function HomeHero() {
  const { t } = useTranslation();
  const h = t.landing.home.hero;
  const { user } = useAuth();
  const reduce = useReducedMotionConfig();
  const [view, setView] = useState<View>('you');
  const [touched, setTouched] = useState(false);

  const fade = (delay: number) => ({
    initial: reduce ? false : { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.8, delay, ease: EASE },
  });

  const showServer = () => {
    setTouched(true);
    setView('server');
    document.getElementById('deux-lectures')?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
  };

  return (
    <section className="relative bg-background">
      <div
        className={cn(
          CONTAINER,
          'grid min-h-svh items-center gap-16 pt-32 pb-20',
          'lg:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)] lg:gap-10 lg:pt-28',
        )}
      >
        <div className="flex flex-col">
          <motion.p {...fade(0)} className="mb-8 flex items-center gap-2 text-sm text-muted">
            <Lock className="size-3.5 text-accent" aria-hidden />
            {h.eyebrow}
          </motion.p>

          <Display
            as="h1"
            size="hero"
            immediate
            delay={0.05}
            lines={h.lines}
            tones={{ [h.lines.length - 1]: 'text-accent' }}
          />

          <motion.p {...fade(0.35)} className="mt-8 max-w-[34ch] text-lg leading-relaxed text-muted">
            {h.subtitle}
          </motion.p>

          <motion.div {...fade(0.45)} className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-4">
            {user ? (
              <NextLink href="/channels/me" className={buttonVariants({ size: 'lg' })}>
                {t.landing.home.nav.openApp}
              </NextLink>
            ) : (
              <NextLink href="/register" className={buttonVariants({ size: 'lg' })}>
                {h.ctaPrimary}
              </NextLink>
            )}
            <Button variant="ghost" size="lg" onPress={showServer} className="group">
              {h.ctaSecondary}
              <ArrowDown
                className="size-4 transition-transform duration-(--dur-2) group-hover:translate-y-0.5 lg:-rotate-90 lg:group-hover:translate-x-0.5 lg:group-hover:translate-y-0"
                aria-hidden
              />
            </Button>
          </motion.div>

          <motion.ul {...fade(0.55)} className="mt-12 flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] text-muted">
            {h.facts.map((fact, i) => (
              <li key={fact} className="flex items-center gap-5">
                {i > 0 && <span className="size-1 rounded-full bg-muted/40" aria-hidden />}
                {fact}
              </li>
            ))}
          </motion.ul>
        </div>

        <motion.div
          initial={reduce ? false : { opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.25, ease: EASE }}
          className="w-full justify-self-center lg:max-w-[540px] lg:justify-self-end"
        >
          <TwoReadings
            view={view}
            autoplay={!touched && !reduce}
            onChange={(v) => {
              setTouched(true);
              setView(v);
            }}
            onAuto={setView}
          />
        </motion.div>
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════════════
 * Deux lectures — la même conversation, vue par vous puis par nos serveurs.
 * ════════════════════════════════════════════════════════════════════════ */

const AUTOPLAY_MS = 4200;

function TwoReadings({
  view, autoplay, onChange, onAuto,
}: {
  view: View;
  autoplay: boolean;
  onChange: (v: View) => void;
  onAuto: (v: View) => void;
}) {
  const r = useTranslation().t.landing.home.readings;
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.5 });
  const server = view === 'server';

  // Bascule d'elle-même tant que personne n'y a touché et qu'elle est visible.
  useEffect(() => {
    if (!autoplay || !inView) return;
    const id = window.setTimeout(() => onAuto(server ? 'you' : 'server'), AUTOPLAY_MS);
    return () => window.clearTimeout(id);
  }, [autoplay, inView, server, onAuto]);

  const name = useCipherText(server ? 'usr_4f9a2c81e0' : r.contact, 520);

  return (
    <div id="deux-lectures" ref={ref} className="flex flex-col gap-4">
      <ToggleButtonGroup
        aria-label={r.label}
        selectionMode="single"
        disallowEmptySelection
        selectedKeys={[view]}
        onSelectionChange={(keys) => {
          const next = [...keys][0] as View | undefined;
          if (next) onChange(next);
        }}
        className="self-start"
      >
        <ToggleButton id="you">{r.you}</ToggleButton>
        <ToggleButton id="server">
          <ToggleButtonGroup.Separator />
          {r.server}
        </ToggleButton>
      </ToggleButtonGroup>

      <div className="at-elev-2 overflow-hidden rounded-3xl bg-surface">
        {/* En-tête de conversation */}
        <div className="flex items-center gap-3 px-5 pt-5 pb-4">
          <Avatar size="sm" color="accent" variant="soft">
            <Avatar.Fallback>
              {server ? <Hash className="size-3.5" aria-hidden /> : 'LM'}
            </Avatar.Fallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className={cn('truncate text-sm font-semibold text-foreground', server && 'font-mono font-normal')}>
              {name}
            </p>
            <p className="text-xs text-muted">{server ? 'AES-256-GCM' : r.online}</p>
          </div>
          <Lock className="size-4 text-muted" aria-hidden />
        </div>

        {/* Fil */}
        <ol className="flex flex-col gap-2.5 px-5 pb-5" aria-live="polite">
          {r.messages.map((m, i) => (
            <Bubble key={i} index={i} mine={m.mine} text={m.text} server={server} />
          ))}
        </ol>

        {/* Saisie */}
        <div className="flex items-center gap-3 bg-surface-secondary px-5 py-3.5">
          <span className="flex-1 truncate text-sm text-field-ph">{r.composer}</span>
          <SendHorizontal className="size-4 text-muted" aria-hidden />
        </div>
      </div>

      <div className="relative h-5 overflow-hidden text-sm text-muted">
        <AnimatePresence mode="wait" initial={false}>
          <motion.p
            key={view}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: EASE }}
            className="absolute inset-0 truncate"
          >
            {server ? r.serverCaption : r.youCaption}
          </motion.p>
        </AnimatePresence>
      </div>
    </div>
  );
}

function Bubble({ index, mine, text, server }: { index: number; mine: boolean; text: string; server: boolean }) {
  const reduce = useReducedMotionConfig();
  const shown = useCipherText(server ? cipherOf(text) : text);

  return (
    <motion.li
      initial={reduce ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.7 + index * 0.18, ease: EASE }}
      className={cn('flex', mine ? 'justify-end' : 'justify-start')}
    >
      <p
        className={cn(
          'max-w-[82%] rounded-2xl px-4 py-2.5 text-[15px] leading-snug',
          'transition-colors duration-(--dur-4)',
          mine ? 'rounded-br-md' : 'rounded-bl-md',
          server
            ? 'bg-surface-secondary font-mono text-[12px] leading-relaxed break-all text-muted'
            : mine
              ? 'bg-accent text-accent-foreground'
              : 'bg-surface-secondary text-foreground',
        )}
      >
        {shown}
      </p>
    </motion.li>
  );
}
