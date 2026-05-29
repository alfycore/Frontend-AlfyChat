'use client';

import { motion, useReducedMotion } from 'motion/react';

const STATS = [
  { value: '< 30s', label: 'Inscription', desc: "Créer un compte, sans carte bancaire" },
  { value: 'E2E', label: 'Chiffrement', desc: 'Bout en bout, toujours actif' },
  { value: 'P2P', label: 'Appels HD', desc: 'Pair-à-pair, aucun serveur relais' },
  { value: '0', label: 'Publicité', desc: 'Ni tracking, ni revente de données' },
];

export function HomeStats() {
  const reduce = useReducedMotion();

  return (
    <section className="bg-[#FBFBFA] dark:bg-[#09090b] border-t border-[#EAEAEA] dark:border-[#27272a]">
      <div className="mx-auto max-w-6xl px-8">
        <div className="grid grid-cols-2 divide-x divide-y divide-[#EAEAEA] dark:divide-[#27272a] sm:grid-cols-4 sm:divide-y-0">
          {STATS.map(({ value, label, desc }, i) => (
            <motion.div
              key={label}
              initial={reduce ? false : { opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.55, delay: i * 0.07, ease: [0.16, 1, 0.3, 1] }}
              className="px-8 py-12 flex flex-col gap-1.5"
            >
              <p
                className="text-[2.4rem] leading-none tracking-[-0.02em] font-bold"
                style={{ fontFamily: 'var(--font-krona), sans-serif', color: '#7627FF' }}
              >
                {value}
              </p>
              <p className="text-[13px] font-semibold text-[#111111] dark:text-[#fafafa]">{label}</p>
              <p className="text-[11.5px] text-[#787774] dark:text-[#71717a]">{desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
