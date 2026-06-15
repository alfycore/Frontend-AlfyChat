'use client';

import { motion, useReducedMotion } from 'motion/react';
import { EASE } from './section';

const STATS = [
  { value: '< 30s', label: 'Inscription', desc: 'Créer un compte, sans carte bancaire' },
  { value: 'E2E', label: 'Chiffrement', desc: 'Bout en bout, toujours actif' },
  { value: 'P2P', label: 'Appels HD', desc: 'Pair-à-pair, aucun serveur relais' },
  { value: '0', label: 'Publicité', desc: 'Ni tracking, ni revente de données' },
];

export function HomeStats() {
  const reduce = useReducedMotion();

  return (
    <section className="border-t border-border bg-background">
      <div className="mx-auto max-w-6xl px-8">
        <div className="grid grid-cols-2 divide-x divide-y divide-border sm:grid-cols-4 sm:divide-y-0">
          {STATS.map(({ value, label, desc }, i) => (
            <motion.div
              key={label}
              initial={reduce ? false : { opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.55, delay: i * 0.07, ease: EASE }}
              className="flex flex-col gap-1.5 px-8 py-12"
            >
              <p className="font-heading text-[2.4rem] leading-none font-bold tracking-[-0.02em] text-primary">
                {value}
              </p>
              <p className="text-[13px] font-semibold text-foreground">{label}</p>
              <p className="text-[11.5px] text-muted-foreground">{desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
