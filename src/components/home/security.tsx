'use client';

import { motion, useReducedMotion } from 'motion/react';
import { LockIcon, ShieldCheckIcon, GlobeIcon, CodeIcon } from '@/components/icons';

const POINTS = [
  {
    icon: LockIcon,
    label: 'Protocole Signal',
    desc: 'Standard de référence pour la messagerie chiffrée, audité en indépendance.',
    accent: 'bg-[#EDF3EC] dark:bg-[#14532d]/30',
    iconColor: 'text-[#346538] dark:text-[#4ade80]',
  },
  {
    icon: ShieldCheckIcon,
    label: 'Zéro tracking',
    desc: 'Aucune publicité, aucun suivi comportemental, aucune revente de données.',
    accent: 'bg-[#EDF3EC] dark:bg-[#14532d]/30',
    iconColor: 'text-[#346538] dark:text-[#4ade80]',
  },
  {
    icon: GlobeIcon,
    label: 'Données en France',
    desc: 'Serveurs hébergés sur le territoire français, soumis au droit européen.',
    accent: 'bg-[#E1F3FE] dark:bg-[#1e3a5f]/30',
    iconColor: 'text-[#1F6C9F] dark:text-[#60a5fa]',
  },
  {
    icon: CodeIcon,
    label: 'Code auditable',
    desc: 'Source ouverte, vérifiable et contribuable par toute la communauté.',
    accent: 'bg-[#FBF3DB] dark:bg-[#78350f]/30',
    iconColor: 'text-[#956400] dark:text-[#fbbf24]',
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
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}

export function HomeSecurity() {
  return (
    <section id="security" className="py-28 bg-[#F7F6F3] dark:bg-[#0a0a0a] border-t border-[#EAEAEA] dark:border-[#27272a]">
      <div className="mx-auto max-w-6xl px-8">
        <div className="grid grid-cols-1 gap-16 md:grid-cols-2 md:items-center">

          {/* Left: photo */}
          <Reveal delay={0.04} className="relative rounded-[12px] overflow-hidden min-h-[380px] order-2 md:order-1 border border-[#EAEAEA] dark:border-[#27272a]">
            <img
              src="https://picsum.photos/seed/alfychat-privacy-security/800/600"
              alt="Sécurité et confidentialité AlfyChat"
              className="absolute inset-0 w-full h-full object-cover"
              style={{ filter: 'saturate(0.45) sepia(0.1)' }}
            />
            <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, rgba(240,238,232,0.35) 0%, rgba(250,248,244,0.75) 100%)' }} />

            {/* Audit badge */}
            <div className="absolute bottom-5 left-5 right-5 z-10">
              <div
                className="rounded-[12px] bg-white dark:bg-[#18181b] border border-[#EAEAEA] dark:border-[#27272a] p-4"
                style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <ShieldCheckIcon size={12} className="text-[#346538] dark:text-[#4ade80]" />
                  <span className="text-[11.5px] font-semibold text-[#111111] dark:text-[#fafafa]">
                    Audit de sécurité indépendant
                  </span>
                </div>
                <p className="text-[11px] text-[#787774] dark:text-[#71717a] leading-relaxed">
                  Notre code est ouvert et vérifiable par n'importe qui. La transparence est notre seule garantie.
                </p>
              </div>
            </div>
          </Reveal>

          {/* Right: content */}
          <div className="order-1 md:order-2">
            <Reveal>
              <h2
                className="text-[2.2rem] leading-[1.1] tracking-[-0.02em] text-[#111111] dark:text-[#fafafa] font-bold"
                style={{ fontFamily: 'var(--font-krona), sans-serif' }}
              >
                La vie privée n'est
                <br />
                <em className="not-italic text-[#787774] dark:text-[#71717a]">pas une option.</em>
              </h2>
              <p className="mt-4 text-[15px] text-[#787774] dark:text-[#71717a] leading-relaxed max-w-md">
                AlfyChat est construit autour d'une conviction: vos conversations vous appartiennent. Chaque choix technique garantit cette promesse.
              </p>
            </Reveal>

            {/* Divider-style list — protocol §5 Accordions */}
            <div className="mt-10">
              {POINTS.map(({ icon: Icon, label, desc, accent, iconColor }, i) => (
                <Reveal key={label} delay={0.06 + i * 0.07}>
                  <div
                    className={`flex items-start gap-4 py-5 ${i < POINTS.length - 1 ? 'border-b border-[#EAEAEA] dark:border-[#27272a]' : ''}`}
                  >
                    <div className={`flex size-9 shrink-0 items-center justify-center rounded-[8px] ${accent}`}>
                      <Icon size={14} className={iconColor} />
                    </div>
                    <div className="space-y-0.5 min-w-0">
                      <p className="text-[13.5px] font-semibold text-[#111111] dark:text-[#fafafa]">{label}</p>
                      <p className="text-[12px] text-[#787774] dark:text-[#71717a] leading-relaxed">{desc}</p>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
