'use client';

import { motion, useReducedMotion } from 'motion/react';
import { LockIcon, ZapIcon, UsersIcon, ServerIcon, BotIcon } from '@/components/icons';

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
      initial={reduce ? false : { opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.12 }}
      transition={{ duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}

/* ── E2E encryption flow diagram ─────────────────────────── */
function E2EDiagram() {
  return (
    <div className="flex items-center gap-3 mt-8 select-none" aria-hidden>
      <div className="flex flex-col items-center gap-2">
        <div
          className="size-10 rounded-full bg-[#F0F0EE] dark:bg-[#27272a] border border-[#E0E0E0] dark:border-[#3f3f46] flex items-center justify-center text-[10px] font-bold text-[#787774] dark:text-[#a1a1aa]"
          style={{ fontFamily: 'var(--font-krona)' }}
        >
          A
        </div>
        <span className="text-[8px] text-[#AAAAAA] dark:text-[#52525b] tracking-wide uppercase" style={{ fontFamily: 'var(--font-geist-mono), monospace' }}>Alice</span>
      </div>

      <div className="flex-1 flex items-center min-w-0">
        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[#DDDDDD] dark:via-[#3f3f46] to-[#DDDDDD] dark:to-[#3f3f46]" />
        <div className="shrink-0 flex items-center gap-1.5 border border-[#D1E8D1] dark:border-[#166534]/50 bg-[#EDF3EC] dark:bg-[#14532d]/20 rounded-full px-3 py-1.5 mx-2">
          <LockIcon size={9} className="text-[#346538] dark:text-[#4ade80]" />
          <span className="text-[7.5px] font-medium text-[#346538] dark:text-[#4ade80] tracking-wide" style={{ fontFamily: 'var(--font-geist-mono), monospace' }}>
            Signal E2E
          </span>
        </div>
        <div className="flex-1 h-px bg-gradient-to-r from-[#DDDDDD] dark:from-[#3f3f46] via-[#DDDDDD] dark:via-[#3f3f46] to-transparent" />
      </div>

      <div className="flex flex-col items-center gap-2">
        <div
          className="size-10 rounded-full bg-[#F0F0EE] dark:bg-[#27272a] border border-[#E0E0E0] dark:border-[#3f3f46] flex items-center justify-center text-[10px] font-bold text-[#787774] dark:text-[#a1a1aa]"
          style={{ fontFamily: 'var(--font-krona)' }}
        >
          B
        </div>
        <span className="text-[8px] text-[#AAAAAA] dark:text-[#52525b] tracking-wide uppercase" style={{ fontFamily: 'var(--font-geist-mono), monospace' }}>Bob</span>
      </div>
    </div>
  );
}

export function HomeFeatures() {
  return (
    <section
      id="features"
      className="py-28 bg-[#FBFBFA] dark:bg-[#09090b] border-t border-[#EAEAEA] dark:border-[#27272a]"
    >
      <div className="mx-auto max-w-6xl px-8">

        {/* Header */}
        <Reveal className="mb-14 max-w-xl">
          <span
            className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#787774] dark:text-[#71717a]"
            style={{ fontFamily: 'var(--font-geist-mono), monospace' }}
          >
            Fonctionnalités
          </span>
          <h2
            className="mt-3 text-[2.2rem] leading-[1.1] tracking-[-0.02em] text-[#111111] dark:text-[#fafafa] font-bold"
            style={{ fontFamily: 'var(--font-krona), sans-serif' }}
          >
            Tout ce qu'il vous faut,
            <br />
            rien de superflu.
          </h2>
          <p className="mt-4 text-[15px] text-[#787774] dark:text-[#71717a] leading-relaxed">
            Messagerie privée, appels HD, communautés et auto-hébergement dans une seule application.
          </p>
        </Reveal>

        {/* Bento grid */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">

          {/* ── Card 1 — E2E · spans 2 cols ── */}
          <Reveal delay={0} className="sm:col-span-2">
            <div className="group relative rounded-[16px] overflow-hidden h-full min-h-[260px] bg-white dark:bg-[#0d0d0f] border border-[#E8E8E8] dark:border-[#1f1f23] p-8 flex flex-col">
              {/* background glow */}
              <div className="pointer-events-none absolute -top-20 -left-20 size-64 rounded-full bg-[#d4edda] dark:bg-[#052e16]/60 blur-[80px] opacity-70 transition-opacity duration-500 group-hover:opacity-100" aria-hidden />
              <div className="pointer-events-none absolute bottom-0 right-0 size-40 rounded-full bg-[#d4edda]/40 dark:bg-[#052e16]/30 blur-[60px]" aria-hidden />

              {/* icon */}
              <div className="relative z-10 flex size-12 items-center justify-center rounded-[12px] bg-[#EDF3EC] dark:bg-[#14532d]/30 border border-[#C9E0CA] dark:border-[#166534]/40 shadow-sm">
                <LockIcon size={20} className="text-[#2d6a31] dark:text-[#4ade80]" />
              </div>

              {/* text */}
              <h3
                className="relative z-10 mt-6 text-[18px] font-bold text-[#111111] dark:text-[#f4f4f5] leading-snug"
                style={{ fontFamily: 'var(--font-krona), sans-serif' }}
              >
                Chiffrement de bout en bout
              </h3>
              <p className="relative z-10 text-[13px] text-[#787774] dark:text-[#71717a] leading-relaxed mt-2.5 max-w-[420px]">
                Chaque message, fichier et appel est chiffré sur votre appareil avant l'envoi.
                Nos serveurs ne voient que des données illisibles. Protocole Signal, audité.
              </p>

              {/* diagram */}
              <E2EDiagram />

              {/* bottom badge */}
              <div className="relative z-10 mt-auto pt-5 flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#EDF3EC] dark:bg-[#14532d]/25 border border-[#C9E0CA] dark:border-[#166534]/40 px-3 py-1 text-[10.5px] font-medium text-[#2d6a31] dark:text-[#4ade80]"
                  style={{ fontFamily: 'var(--font-geist-mono), monospace' }}>
                  <span className="size-1.5 rounded-full bg-[#4ade80] inline-block animate-pulse" />
                  Audité · Open source
                </span>
              </div>
            </div>
          </Reveal>

          {/* ── Card 2 — Appels HD ── */}
          <Reveal delay={0.07}>
            <div className="group relative rounded-[16px] overflow-hidden min-h-[370px] border border-[#E8E8E8] dark:border-[#1f1f23] bg-[#08080c] flex flex-col p-7">
              {/* concentric rings */}
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden>
                <div className="size-[260px] rounded-full border border-white/[0.035] absolute animate-[ping_4s_ease-in-out_infinite] opacity-0" />
                <div className="size-[220px] rounded-full border border-white/[0.04] absolute" />
                <div className="size-[165px] rounded-full border border-white/[0.055] absolute" />
                <div className="size-[110px] rounded-full border border-indigo-500/15 absolute" />
                <div className="size-[62px] rounded-full bg-indigo-950/80 border border-indigo-500/30 absolute flex items-center justify-center shadow-[0_0_24px_rgba(99,102,241,0.3)]">
                  <ZapIcon size={22} className="text-indigo-400" />
                </div>
              </div>
              {/* glow */}
              <div className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(ellipse 70% 55% at 50% 55%, rgba(99,102,241,0.15) 0%, transparent 70%)' }} aria-hidden />

              {/* top */}
              <div className="relative z-10 flex justify-end">
                <span className="rounded-full bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 text-[9.5px] text-indigo-300/80 font-medium"
                  style={{ fontFamily: 'var(--font-geist-mono), monospace' }}>HD · E2E · P2P</span>
              </div>

              {/* bottom */}
              <div className="relative z-10 mt-auto space-y-1.5">
                <h3
                  className="text-[15.5px] font-bold text-white leading-tight"
                  style={{ fontFamily: 'var(--font-krona), sans-serif' }}
                >
                  Appels HD instantanés
                </h3>
                <p className="text-[12px] text-white/40 leading-relaxed">Voix et vidéo haute qualité, chiffrés de bout en bout.</p>
                <div className="flex items-center gap-2 pt-2">
                  {['1080p', '48 kHz', 'E2E', '< 50ms'].map((label) => (
                    <span key={label} className="rounded-md bg-white/5 border border-white/[0.07] px-2 py-0.5 text-[9px] text-white/40"
                      style={{ fontFamily: 'var(--font-geist-mono), monospace' }}>{label}</span>
                  ))}
                </div>
              </div>
            </div>
          </Reveal>

          {/* ── Card 3 — Communautés ── */}
          <Reveal delay={0.1}>
            <div className="group relative rounded-[16px] overflow-hidden bg-white dark:bg-[#0d0d0f] border border-[#E8E8E8] dark:border-[#1f1f23] min-h-[260px] flex flex-col p-7">
              {/* glow */}
              <div className="pointer-events-none absolute -bottom-10 -right-10 size-36 rounded-full bg-[#dbeafe]/60 dark:bg-[#1e3a5f]/30 blur-[50px] opacity-80 group-hover:opacity-100 transition-opacity duration-500" aria-hidden />

              <div className="relative z-10 flex size-12 items-center justify-center rounded-[12px] bg-[#E1F3FE] dark:bg-[#1e3a5f]/30 border border-[#BFE0F5] dark:border-[#1d4ed8]/30 shadow-sm">
                <UsersIcon size={20} className="text-[#1a5e8a] dark:text-[#60a5fa]" />
              </div>

              <div className="relative z-10 mt-5 space-y-2 flex-1">
                <h3
                  className="text-[15.5px] font-bold text-[#111111] dark:text-[#f4f4f5]"
                  style={{ fontFamily: 'var(--font-krona), sans-serif' }}
                >
                  Serveurs communautaires
                </h3>
                <p className="text-[12.5px] text-[#787774] dark:text-[#71717a] leading-relaxed">
                  Salons, rôles et permissions configurables à volonté.
                </p>
              </div>

              {/* avatar row */}
              <div className="relative z-10 mt-5 flex items-center gap-1.5">
                {['#c7d2fe','#bfdbfe','#a7f3d0','#fde68a','#fecaca'].map((c, i) => (
                  <div key={i} className="size-6 rounded-full border-2 border-white dark:border-[#0d0d0f]" style={{ background: c, marginLeft: i > 0 ? '-6px' : 0 }} />
                ))}
                <span className="ml-2 text-[11px] text-[#787774] dark:text-[#52525b]" style={{ fontFamily: 'var(--font-geist-mono), monospace' }}>+2.4k membres</span>
              </div>
            </div>
          </Reveal>

          {/* ── Card 4 — Auto-hébergement ── */}
          <Reveal delay={0.13}>
            <div className="group relative rounded-[16px] overflow-hidden min-h-[200px] bg-white dark:bg-[#0d0d0f] border border-[#E8E8E8] dark:border-[#1f1f23] flex flex-col p-7">
              {/* grid pattern */}
              <div
                className="pointer-events-none absolute inset-0 opacity-[0.045] dark:opacity-[0.06]"
                style={{
                  backgroundImage: 'linear-gradient(#555 1px, transparent 1px), linear-gradient(90deg, #555 1px, transparent 1px)',
                  backgroundSize: '24px 24px',
                }}
                aria-hidden
              />
              {/* amber glow */}
              <div className="pointer-events-none absolute -top-10 -right-10 size-44 rounded-full bg-amber-400/10 dark:bg-amber-500/8 blur-[55px] group-hover:opacity-100 opacity-60 transition-opacity duration-500" aria-hidden />

              {/* top row */}
              <div className="relative z-10 flex items-start justify-between">
                <div className="flex size-12 items-center justify-center rounded-[12px] bg-[#FBF3DB] dark:bg-[#78350f]/30 border border-[#F0DFA0] dark:border-[#92400e]/35 shadow-sm">
                  <ServerIcon size={20} className="text-[#7a5200] dark:text-[#fbbf24]" />
                </div>
                <span className="rounded-full bg-[#FBF3DB] dark:bg-[#78350f]/20 border border-[#F0DFA0] dark:border-[#92400e]/30 px-2.5 py-1 text-[9.5px] font-medium text-[#7a5200] dark:text-[#fbbf24]"
                  style={{ fontFamily: 'var(--font-geist-mono), monospace' }}>Self-hosted</span>
              </div>

              {/* text */}
              <div className="relative z-10 mt-5 space-y-2 flex-1">
                <h3
                  className="text-[15.5px] font-bold text-[#111111] dark:text-[#f4f4f5]"
                  style={{ fontFamily: 'var(--font-krona), sans-serif' }}
                >
                  Auto-hébergement
                </h3>
                <p className="text-[12.5px] text-[#787774] dark:text-[#71717a] leading-relaxed">
                  Déployez votre nœud. Vos données restent chez vous.
                </p>
              </div>

              {/* terminal command */}
              <div className="relative z-10 mt-5 rounded-[8px] bg-[#F7F6F3] dark:bg-[#111113] border border-[#EAEAEA] dark:border-[#27272a] px-3 py-2.5 flex items-center gap-2">
                <span className="text-[#4ade80] text-[11px] select-none" style={{ fontFamily: 'var(--font-geist-mono), monospace' }}>$</span>
                <span className="text-[10.5px] text-[#555] dark:text-[#a1a1aa]" style={{ fontFamily: 'var(--font-geist-mono), monospace' }}>
                  docker compose up -d
                </span>
              </div>
            </div>
          </Reveal>

          {/* ── Card 5 — API ouverte ── */}
          <Reveal delay={0.16}>
            <div className="group relative rounded-[16px] overflow-hidden bg-white dark:bg-[#0d0d0f] border border-[#E8E8E8] dark:border-[#1f1f23] min-h-[200px] flex flex-col p-7">
              {/* glow */}
              <div className="pointer-events-none absolute -bottom-10 -right-10 size-36 rounded-full bg-[#fef3c7]/70 dark:bg-[#78350f]/30 blur-[50px] opacity-80 group-hover:opacity-100 transition-opacity duration-500" aria-hidden />

              <div className="relative z-10 flex size-12 items-center justify-center rounded-[12px] bg-[#FBF3DB] dark:bg-[#78350f]/30 border border-[#F0DFA0] dark:border-[#92400e]/35 shadow-sm">
                <BotIcon size={20} className="text-[#7a5200] dark:text-[#fbbf24]" />
              </div>

              <div className="relative z-10 mt-5 space-y-2 flex-1">
                <h3
                  className="text-[15.5px] font-bold text-[#111111] dark:text-[#f4f4f5]"
                  style={{ fontFamily: 'var(--font-krona), sans-serif' }}
                >
                  API ouverte
                </h3>
                <p className="text-[12.5px] text-[#787774] dark:text-[#71717a] leading-relaxed">
                  Créez des bots et intégrations via notre API documentée.
                </p>
              </div>

              {/* code snippet */}
              <div className="relative z-10 mt-5 rounded-[8px] bg-[#F7F6F3] dark:bg-[#18181b] border border-[#EAEAEA] dark:border-[#27272a] px-3 py-2">
                <span className="text-[10.5px] text-[#956400] dark:text-[#fbbf24]" style={{ fontFamily: 'var(--font-geist-mono), monospace' }}>
                  <span className="text-[#787774] dark:text-[#52525b]">GET </span>/api/v1/bots
                </span>
              </div>
            </div>
          </Reveal>

        </div>
      </div>
    </section>
  );
}
