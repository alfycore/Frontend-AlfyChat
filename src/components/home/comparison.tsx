'use client';

import { motion, useReducedMotion } from 'motion/react';

const APPS = [
  { name: 'AlfyChat',  highlight: true  },
  { name: 'Stoat',     highlight: false },
  { name: 'Signal',    highlight: false },
  { name: 'Telegram',  highlight: false },
  { name: 'Discord',   highlight: false },
  { name: 'WhatsApp',  highlight: false },
];

const FEATURES: { label: string; values: boolean[] }[] = [
  // label                              Alfy   Stoat  Signal  Telegram Discord WhatsApp
  { label: 'Chiffrement E2E par défaut',  values: [true,  false, true,  false, false, true]  },
  { label: 'Code source ouvert',          values: [true,  true,  true,  true,  false, false] },
  { label: 'Données hébergées en Europe', values: [true,  true,  false, false, false, false] },
  { label: 'Zéro tracking publicitaire',  values: [true,  true,  true,  false, false, false] },
  { label: 'Auto-hébergement possible',   values: [true,  true,  false, false, false, false] },
  { label: 'Sans numéro de téléphone',    values: [true,  true,  false, false, true,  false] },
  { label: 'Serveurs communautaires',     values: [true,  true,  false, false, true,  false] },
  { label: 'API ouverte pour bots',       values: [true,  true,  false, true,  true,  false] },
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
      initial={reduce ? false : { opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.08 }}
      transition={{ duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}

function Check({ highlight }: { highlight: boolean }) {
  return (
    <div
      className={`inline-flex size-6 items-center justify-center rounded-full`}
      style={highlight
        ? { background: 'rgba(118,39,255,0.12)' }
        : { background: 'var(--check-bg, #F5F5F3)' }
      }
    >
      <svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden>
        <path
          d="M2 5.5L4.5 8L9 3"
          stroke={highlight ? '#7627FF' : '#AAAAAA'}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

function Cross() {
  return (
    <div className="inline-flex size-6 items-center justify-center rounded-full bg-[#F5F5F3] dark:bg-[#27272a]">
      <svg width="9" height="9" viewBox="0 0 9 9" fill="none" aria-hidden>
        <path
          d="M2 2L7 7M7 2L2 7"
          stroke="#CCCCCC"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}

export function HomeComparison() {
  /* column template: feature label + 6 app columns */
  const cols = `minmax(200px, 1fr) repeat(${APPS.length}, 110px)`;

  return (
    <section className="py-28 bg-[#F7F6F3] dark:bg-[#0a0a0a] border-t border-[#EAEAEA] dark:border-[#27272a]">
      <div className="mx-auto max-w-6xl px-8">

        {/* Header */}
        <Reveal className="mb-14 max-w-xl">
          <span
            className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#787774] dark:text-[#71717a]"
            style={{ fontFamily: 'var(--font-geist-mono, monospace)' }}
          >
            Comparaison
          </span>
          <h2
            className="mt-3 text-[2.2rem] leading-[1.1] tracking-[-0.02em] text-[#111111] dark:text-[#fafafa] font-bold"
            style={{ fontFamily: 'var(--font-krona), sans-serif' }}
          >
            Pourquoi choisir
            <br />
            AlfyChat plutôt qu'une autre ?
          </h2>
          <p className="mt-4 text-[15px] text-[#787774] dark:text-[#71717a] leading-relaxed">
            La plupart des messageries populaires font des compromis sur votre vie privée. AlfyChat n'en fait aucun.
          </p>
        </Reveal>

        {/* Scrollable table wrapper */}
        <Reveal delay={0.06}>
          <div className="overflow-x-auto -mx-2 px-2">
            <div
              className="rounded-[12px] bg-white dark:bg-[#18181b] border border-[#EAEAEA] dark:border-[#27272a] overflow-hidden"
              style={{ minWidth: 780, boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}
            >
              {/* Column headers */}
              <div className="grid border-b border-[#EAEAEA] dark:border-[#27272a]" style={{ gridTemplateColumns: cols }}>
                <div className="px-6 py-5" />
                {APPS.map(({ name, highlight }) => (
                  <div
                    key={name}
                    className={`px-2 py-5 text-center border-l border-[#EAEAEA] dark:border-[#27272a] ${
                      highlight ? 'bg-[#FBFBFA] dark:bg-[#1a1a1e]' : ''
                    }`}
                  >
                    <p
                      className={`text-[12px] font-semibold leading-tight ${
                        highlight ? 'text-[#111111] dark:text-[#fafafa]' : 'text-[#787774] dark:text-[#71717a]'
                      }`}
                      style={{ fontFamily: 'var(--font-krona), sans-serif' }}
                    >
                      {name}
                    </p>
                    {highlight && (
                      <span className="mt-1 inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-medium uppercase tracking-[0.06em]" style={{ background: 'rgba(118,39,255,0.12)', color: '#7627FF' }}>
                        Recommandé
                      </span>
                    )}
                  </div>
                ))}
              </div>

              {/* Feature rows */}
              {FEATURES.map(({ label, values }, rowIdx) => (
                <motion.div
                  key={label}
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ duration: 0.35, delay: rowIdx * 0.04, ease: 'easeOut' }}
                  className={`grid border-b border-[#EAEAEA] dark:border-[#27272a] last:border-b-0 ${
                    rowIdx % 2 === 1 ? 'bg-[#FBFBFA] dark:bg-[#0f0f11]' : 'bg-white dark:bg-[#18181b]'
                  }`}
                  style={{ gridTemplateColumns: cols }}
                >
                  <div className="px-6 py-4 flex items-center">
                    <span className="text-[13px] text-[#111111] dark:text-[#e4e4e7]">{label}</span>
                  </div>
                  {values.map((val, colIdx) => (
                    <div
                      key={colIdx}
                      className={`px-2 py-4 flex items-center justify-center border-l border-[#EAEAEA] dark:border-[#27272a] ${
                        colIdx === 0 ? 'bg-[#FBFBFA] dark:bg-[#0f0f11]' : ''
                      }`}
                    >
                      {val ? <Check highlight={colIdx === 0} /> : <Cross />}
                    </div>
                  ))}
                </motion.div>
              ))}
            </div>
          </div>
        </Reveal>

        {/* Bottom note */}
        <Reveal delay={0.1}>
          <p
            className="mt-5 text-[11px] text-[#AAAAAA] dark:text-[#52525b]"
            style={{ fontFamily: 'var(--font-geist-mono, monospace)' }}
          >
            Comparaison basée sur les politiques de confidentialité publiques — mai 2026.
          </p>
        </Reveal>

      </div>
    </section>
  );
}
