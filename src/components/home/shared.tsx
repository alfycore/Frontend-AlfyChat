'use client';

/**
 * Homepage — briques partagées.
 *
 * Le fil rouge visuel de la page est le chiffrement : du texte lisible qui
 * se brouille en chiffré (et inversement). `useCipherText` porte cet effet ;
 * le reste (titres Krona, révélations au scroll, liens fléchés) garde toutes
 * les sections dans la même grammaire.
 */

import NextLink from 'next/link';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { motion, useReducedMotionConfig } from 'motion/react';
import { ArrowRight } from 'lucide-react';

import { cn } from '@/lib/utils';

/** --ease-out-quint, en tableau pour motion. */
export const EASE = [0.23, 1, 0.32, 1] as const;

/** Largeur commune à toutes les sections — aligne la page sur la navbar. */
export const CONTAINER = 'mx-auto w-full max-w-screen-2xl px-6 lg:px-12';

const DISPLAY_SIZES = {
  hero: 'clamp(2.9rem, 6.4vw, 6.6rem)',
  section: 'clamp(2rem, 3.9vw, 3.9rem)',
  statement: 'clamp(2.1rem, 5.2vw, 5.2rem)',
} as const;

/* ── Titre display (Krona) ───────────────────────────────────────────── */

interface DisplayProps {
  as?: 'h1' | 'h2' | 'p';
  size?: keyof typeof DISPLAY_SIZES;
  /** Une entrée par ligne : chaque ligne glisse hors de son masque. */
  lines: ReactNode[];
  /** Index → classe de couleur, ex. { 1: 'text-muted' }. */
  tones?: Record<number, string>;
  /** Anime au montage (hero) plutôt qu'à l'entrée dans le viewport. */
  immediate?: boolean;
  delay?: number;
  className?: string;
}

export function Display({
  as: Tag = 'h2', size = 'section', lines, tones = {}, immediate, delay = 0, className,
}: DisplayProps) {
  const reduce = useReducedMotionConfig();
  const MotionTag = motion[Tag];
  // Le déclencheur vit sur le titre, jamais sur les lignes : une ligne
  // repoussée sous son masque est rognée par `overflow-hidden`, donc
  // invisible pour l'IntersectionObserver — elle n'entrerait jamais.
  const trigger = immediate ? { animate: 'shown' } : { whileInView: 'shown' };

  return (
    <MotionTag
      className={cn('font-heading text-foreground', className)}
      style={{ fontSize: DISPLAY_SIZES[size], lineHeight: 1.02, letterSpacing: '-0.04em' }}
      initial={reduce ? false : 'hidden'}
      {...trigger}
      viewport={{ once: true, amount: 0.4 }}
    >
      {lines.map((line, i) => (
        // Le padding bas + marge négative laisse respirer les jambages
        // sans que le masque ne les coupe.
        <span key={i} className="-mb-[0.12em] block overflow-hidden pb-[0.12em]">
          <motion.span
            className={cn('block', tones[i])}
            variants={{
              hidden: { y: '105%' },
              shown: { y: '0%', transition: { duration: 0.9, delay: delay + i * 0.08, ease: EASE } },
            }}
          >
            {line}
          </motion.span>
        </span>
      ))}
    </MotionTag>
  );
}

/* ── Surtitre ────────────────────────────────────────────────────────── */

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={cn('text-[13px] font-medium tracking-wide text-accent', className)}>{children}</p>
  );
}

/* ── Révélation au scroll ────────────────────────────────────────────── */

export function Reveal({
  children, delay = 0, className, as = 'div',
}: { children: ReactNode; delay?: number; className?: string; as?: 'div' | 'li' }) {
  const reduce = useReducedMotionConfig();
  const Comp = as === 'li' ? motion.li : motion.div;
  return (
    <Comp
      initial={reduce ? false : { opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.7, delay, ease: EASE }}
      className={className}
    >
      {children}
    </Comp>
  );
}

/* ── Lien texte fléché ───────────────────────────────────────────────── */

export function ArrowLink({ href, children, className }: { href: string; children: ReactNode; className?: string }) {
  return (
    <NextLink
      href={href}
      className={cn(
        'group inline-flex items-center gap-1.5 rounded-sm text-[15px] font-medium text-foreground outline-none',
        'transition-colors duration-(--dur-2) hover:text-accent focus-visible:ring-2 focus-visible:ring-focus',
        className,
      )}
    >
      {children}
      <ArrowRight
        className="size-4 transition-transform duration-(--dur-2) group-hover:translate-x-0.5"
        aria-hidden
      />
    </NextLink>
  );
}

/* ── Chiffré déterministe ────────────────────────────────────────────── */

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function seedOf(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

/**
 * Faux chiffré base64 stable pour un texte donné : même entrée, même sortie,
 * côté serveur comme côté client — pas d'écart d'hydratation.
 */
export function cipherOf(text: string): string {
  let s = seedOf(text);
  const len = Math.ceil((new TextEncoder().encode(text).length + 28) / 3) * 4;
  let out = '';
  for (let i = 0; i < len; i++) {
    s = (Math.imul(s ^ (s >>> 15), 1 | s) + 0x6d2b79f5) >>> 0;
    out += B64[s % 64];
  }
  return out;
}

/**
 * Bascule animée entre deux chaînes : les caractères se fixent de gauche à
 * droite, ceux qui ne sont pas encore posés défilent au hasard.
 * Sans animation (reduced motion), la bascule est instantanée.
 */
export function useCipherText(target: string, duration = 720): string {
  const reduce = useReducedMotionConfig();
  const [shown, setShown] = useState(target);
  const current = useRef(target);

  useEffect(() => {
    const from = current.current;
    if (reduce || from === target) {
      current.current = target;
      setShown(target);
      return;
    }

    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - p) ** 3;
      const length = Math.round(from.length + (target.length - from.length) * eased);
      const fixed = Math.floor(eased * length);
      let next = '';
      for (let i = 0; i < length; i++) {
        next += i < fixed ? (target[i] ?? '') : B64[(Math.random() * 64) | 0];
      }
      current.current = next;
      setShown(next);
      if (p < 1) raf = requestAnimationFrame(tick);
      else {
        current.current = target;
        setShown(target);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, reduce]);

  return shown;
}
