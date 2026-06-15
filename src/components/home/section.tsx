'use client';

import type { ReactNode } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { cn } from '@/lib/utils';

/** Easing « Apple » partagé par toutes les sections de la home. */
export const EASE = [0.16, 1, 0.3, 1] as const;

/** Révélation au scroll (fade + slide), respecte prefers-reduced-motion. */
export function Reveal({
  children,
  delay = 0,
  y = 14,
  amount = 0.15,
  className,
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  amount?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount }}
      transition={{ duration: 0.6, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

/** Petit label mono en capitales (« eyebrow ») au-dessus des titres de section. */
export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        'font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground',
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Titre de section éditorial (police Krona via font-heading). */
export function SectionTitle({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <h2
      className={cn(
        'mt-3 font-heading text-[2rem] leading-[1.1] font-bold tracking-[-0.02em] text-foreground sm:text-[2.2rem]',
        className,
      )}
    >
      {children}
    </h2>
  );
}
