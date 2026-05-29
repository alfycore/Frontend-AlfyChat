'use client';

import { motion, useReducedMotion } from 'motion/react';

const STATS = [
  { value: '100%', label: 'Open source', desc: 'Code public sur GitHub' },
  { value: 'E2E', label: 'Chiffrement', desc: 'Bout en bout, toujours actif' },
  { value: 'France', label: 'Hébergement', desc: 'Données sur serveurs français' },
  { value: '0', label: 'Publicité', desc: 'Ni tracking, ni revente' },
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
                className="text-[2.4rem] leading-none tracking-[-0.02em] text-[#111111] dark:text-[#fafafa] font-bold"
                style={{ fontFamily: 'var(--font-krona), sans-serif' }}
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
