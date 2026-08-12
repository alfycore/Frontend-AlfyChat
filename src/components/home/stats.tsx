'use client';

import { motion, useReducedMotion } from 'motion/react';
import { Separator, Typography } from '@heroui/react';

const KRONA = { fontFamily: 'var(--font-krona), sans-serif' } as const;

const STATS = [
  { value: '< 30s', label: 'Inscription', desc: 'Créer un compte, sans carte bancaire' },
  { value: 'E2E', label: 'Chiffrement', desc: 'Bout en bout, toujours actif' },
  { value: 'P2P', label: 'Appels HD', desc: 'Pair-à-pair, aucun serveur relais' },
  { value: '0', label: 'Publicité', desc: 'Ni tracking, ni revente de données' },
];

export function HomeStats() {
  const reduce = useReducedMotion();

  return (
    <section className="bg-surface">
      <div className="mx-auto max-w-6xl px-6 lg:px-12">
        <div className="grid grid-cols-2 sm:grid-cols-4">
          {STATS.map(({ value, label, desc }, i) => (
            <motion.div
              key={label}
              initial={reduce ? false : { opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.55, delay: i * 0.07, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="relative flex flex-col gap-1.5 px-4 py-14 sm:px-8"
            >
              {/* Vertical divider between columns (desktop) */}
              {i > 0 && (
                <Separator orientation="vertical" className="absolute left-0 top-1/2 hidden h-16 -translate-y-1/2 sm:block" />
              )}
              <Typography
                weight="bold"
                style={{ ...KRONA, color: 'var(--accent)', fontSize: 'clamp(2rem, 3vw, 2.6rem)', lineHeight: 1 }}
              >
                {value}
              </Typography>
              <Typography type="body-sm" weight="semibold" className="text-foreground">{label}</Typography>
              <Typography type="body-xs" color="muted">{desc}</Typography>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
