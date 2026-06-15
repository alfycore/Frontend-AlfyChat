'use client';

import Link from 'next/link';
import { motion, useReducedMotion } from 'motion/react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowRightIcon, CheckCircleIcon } from '@/components/icons';
import { EASE } from './section';

/* ── Hero ───────────────────────────────────────────────────── */
export function HomeHero() {
  const reduce = useReducedMotion();

  const f = (delay = 0) => ({
    initial: reduce ? (false as const) : ({ opacity: 0, y: 12 } as const),
    animate: { opacity: 1, y: 0 } as const,
    transition: { duration: 0.6, delay, ease: EASE },
  });

  return (
    <section
      className="relative flex items-center overflow-hidden bg-background"
      style={{ minHeight: '90dvh' }}
    >
      {/* Halo radial dérivé de la couleur de marque */}
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden
        style={{
          background:
            'radial-gradient(ellipse 70% 60% at 60% 40%, color-mix(in oklch, var(--primary) 10%, transparent), transparent 70%)',
        }}
      />

      <div className="mx-auto grid w-full max-w-7xl grid-cols-1 items-center gap-10 px-8 pt-16 pb-20 md:grid-cols-[1fr_1.3fr] md:gap-8 lg:gap-12">

        {/* Colonne gauche — copie éditoriale */}
        <div className="flex flex-col gap-8">

          <motion.div {...f(0)}>
            <Badge
              variant="outline"
              className="h-auto gap-2 rounded-full border-border bg-card px-3.5 py-1.5 shadow-sm"
            >
              <span className="text-[13px]" aria-hidden>🇪🇺</span>
              <span className="font-mono text-[11px] font-medium tracking-[0.06em] text-muted-foreground normal-case">
                Conforme RGPD · Données en Europe
              </span>
            </Badge>
          </motion.div>

          <motion.h1
            {...f(0.06)}
            className="font-heading font-bold leading-[1.08] tracking-[-0.025em] text-foreground"
            style={{ fontSize: 'clamp(1.6rem, 3.5vw, 3.2rem)' }}
          >
            La messagerie
            <br />
            qui respecte
            <br />
            <span className="bg-linear-to-br from-primary to-fuchsia-500 bg-clip-text text-transparent">
              votre vie
              <br />
              privée.
            </span>
          </motion.h1>

          <motion.p
            {...f(0.13)}
            className="max-w-[400px] text-[16px] leading-relaxed text-muted-foreground"
          >
            Chiffrement de bout en bout, aucun suivi, serveurs en France. Vos conversations n&apos;appartiennent qu&apos;à vous.
          </motion.p>

          <motion.div {...f(0.2)} className="flex flex-wrap gap-3">
            <Button asChild className="h-11 rounded-lg px-6 text-[14px]">
              <Link href="/register">Créer un compte gratuit</Link>
            </Button>
            <Button asChild variant="outline" className="group h-11 rounded-lg px-5 text-[14px]">
              <Link href="#features">
                Découvrir les fonctions
                <ArrowRightIcon size={12} className="transition-transform duration-300 group-hover:translate-x-0.5" />
              </Link>
            </Button>
          </motion.div>

          <motion.div {...f(0.27)} className="flex flex-wrap items-center gap-x-5 gap-y-2">
            {['Auto-hébergeable', 'Open source', 'Sans numéro de tél.'].map((tag) => (
              <span key={tag} className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
                <CheckCircleIcon size={10} className="shrink-0 text-primary" />
                {tag}
              </span>
            ))}
          </motion.div>
        </div>

        {/* Colonne droite — visuel */}
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 20, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.75, delay: 0.16, ease: EASE }}
          className="relative hidden md:block"
        >
          <img
            src="/heroimg.png"
            alt="AlfyChat aperçu"
            className="w-full select-none"
            draggable={false}
          />
        </motion.div>
      </div>
    </section>
  );
}
