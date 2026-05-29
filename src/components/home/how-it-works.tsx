'use client';

import { motion, useReducedMotion } from 'motion/react';

  const STEPS = [
  {
    number: '01',
    title: "Créer un compte",
    desc: "Inscription en 30 secondes. Sans numéro de téléphone, sans carte bancaire, sans vérification d'identité.",
    tag: "Gratuit",
    tagColor: "bg-[#EDF3EC] dark:bg-[#14532d]/30 text-[#346538] dark:text-[#4ade80]",
  },
  {
    number: '02',
    title: "Inviter vos contacts",
    desc: "Partagez un lien ou cherchez directement par nom d'utilisateur. Aucune importation de carnet d'adresses.",
    tag: "Aucune donnée collectée",
    tagColor: "bg-[#E1F3FE] dark:bg-[#1e3a5f]/30 text-[#1F6C9F] dark:text-[#60a5fa]",
  },
  {
    number: '03',
    title: "Discuter en privé",
    desc: "Chaque message est chiffré sur votre appareil avant d'être envoyé. Même nos serveurs ne peuvent pas lire vos échanges.",
    tag: "Chiffrement E2E",
    tagColor: "bg-[#FBF3DB] dark:bg-[#78350f]/30 text-[#956400] dark:text-[#fbbf24]",
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
      initial={reduce ? false : { opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.12 }}
      transition={{ duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}

export function HomeHowItWorks() {
  return (
    <section
      className="py-28 bg-[#FBFBFA] dark:bg-[#09090b] border-t border-[#EAEAEA] dark:border-[#27272a] relative overflow-hidden"
    >
      {/* Ambient radial depth — protocol §6 */}
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden
        style={{
          background:
            'radial-gradient(ellipse 60% 50% at 50% 100%, rgba(160,150,130,0.05) 0%, transparent 70%)',
        }}
      />

      <div className="relative mx-auto max-w-6xl px-8">
        {/* Header */}
        <Reveal className="mb-16 max-w-xl">
          <span
            className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#787774] dark:text-[#71717a]"
            style={{ fontFamily: 'var(--font-geist-mono, monospace)' }}
          >
            Processus
          </span>
          <h2
            className="mt-3 text-[2.2rem] leading-[1.1] tracking-[-0.02em] text-[#111111] dark:text-[#fafafa] font-bold"
            style={{ fontFamily: 'var(--font-krona), sans-serif' }}
          >
            Simple à utiliser,
            <br />
            impossible à espionner.
          </h2>
        </Reveal>

        {/* Steps — 3-col grid with dividers */}
        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-[#EAEAEA] dark:divide-[#27272a]">
          {STEPS.map(({ number, title, desc, tag, tagColor }, i) => (
            <Reveal key={number} delay={i * 0.1} className="px-0 md:px-10 py-10 md:py-0 first:pl-0 last:pr-0">
              {/* Step number */}
              <p
                className="text-[3.5rem] leading-none font-bold text-[#EAEAEA] dark:text-[#27272a] select-none mb-6"
                style={{ fontFamily: 'var(--font-krona), sans-serif' }}
                aria-hidden
              >
                {number}
              </p>

              {/* Tag */}
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.06em] ${tagColor}`}
              >
                {tag}
              </span>

              {/* Content */}
              <h3
                className="mt-3 text-[17px] font-semibold text-[#111111] dark:text-[#fafafa] leading-snug"
                style={{ fontFamily: 'var(--font-krona), sans-serif' }}
              >
                {title}
              </h3>
              <p className="mt-2 text-[13.5px] text-[#787774] dark:text-[#71717a] leading-relaxed">
                {desc}
              </p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
