'use client';

import { motion, useReducedMotion } from 'motion/react';
import { Chip, Separator, Typography } from '@heroui/react';

const KRONA = { fontFamily: 'var(--font-krona), sans-serif' } as const;

const STEPS = [
  {
    number: '01',
    title: 'Créer un compte',
    desc: "Inscription en 30 secondes. Sans numéro de téléphone, sans carte bancaire, sans vérification d'identité.",
    tag: 'Gratuit',
    tone: 'success' as const,
  },
  {
    number: '02',
    title: 'Inviter vos contacts',
    desc: "Partagez un lien ou cherchez directement par nom d'utilisateur. Aucune importation de carnet d'adresses.",
    tag: 'Zéro donnée collectée',
    tone: 'accent' as const,
  },
  {
    number: '03',
    title: 'Discuter en privé',
    desc: "Chaque message est chiffré sur votre appareil avant l'envoi. Même nos serveurs ne peuvent pas lire vos échanges.",
    tag: 'Chiffrement E2E',
    tone: 'warning' as const,
  },
];

function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.12 }}
      transition={{ duration: 0.6, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      {children}
    </motion.div>
  );
}

export function HomeHowItWorks() {
  return (
    <section className="border-t border-border bg-background py-28">
      <div className="mx-auto max-w-6xl px-6 lg:px-12">

        <Reveal className="mb-16 flex max-w-xl flex-col gap-4">
          <Chip color="accent" variant="soft" size="sm" className="w-fit">
            <Chip.Label>Processus</Chip.Label>
          </Chip>
          <Typography
            type="h2"
            weight="bold"
            className="text-foreground"
            style={{ ...KRONA, fontSize: 'clamp(1.9rem, 3vw, 2.6rem)', lineHeight: 1.1, letterSpacing: '-0.025em' }}
          >
            Simple à utiliser, impossible à espionner.
          </Typography>
        </Reveal>

        <div className="grid grid-cols-1 md:grid-cols-3">
          {STEPS.map(({ number, title, desc, tag, tone }, i) => (
            <Reveal key={number} delay={i * 0.1} className="relative px-0 py-8 md:px-10 md:py-0">
              {i > 0 && (
                <Separator orientation="vertical" className="absolute left-0 top-0 hidden h-full md:block" />
              )}

              <Typography
                weight="bold"
                aria-hidden
                style={{ ...KRONA, color: 'color-mix(in oklch, var(--foreground) 12%, transparent)', fontSize: '3.5rem', lineHeight: 1 }}
                className="mb-6 select-none"
              >
                {number}
              </Typography>

              <Chip color={tone} variant="soft" size="sm" className="mb-3">
                <Chip.Label>{tag}</Chip.Label>
              </Chip>

              <Typography type="h5" weight="bold" className="mt-1 text-foreground" style={KRONA}>
                {title}
              </Typography>
              <Typography type="body-sm" color="muted" className="mt-2 block">
                {desc}
              </Typography>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
