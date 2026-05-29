'use client';

import Link from 'next/link';
import { motion, useReducedMotion } from 'motion/react';
import { ArrowRightIcon, CheckCircleIcon, ShieldCheckIcon, LockIcon } from '@/components/icons';

/* ── Chat card ─────────────────────────────────────────────── */
function ChatCard() {
  const MESSAGES = [
    { init: 'M', color: '#c7d2fe', name: 'Marie', msg: 'Réunion à 15h confirmée !' },
    { init: 'T', color: '#bbf7d0', name: 'Thomas', msg: 'Parfait, je serai là 👍' },
    { init: 'L', color: '#fde68a', name: 'Lucas', msg: 'On peut décaler à 15h30 ?' },
    { init: 'M', color: '#c7d2fe', name: 'Marie', msg: 'Oui, pas de problème !' },
  ] as const;

  const CHANNELS = [
    { name: 'général', active: true },
    { name: 'annonces', active: false },
    { name: 'dev', active: false },
    { name: 'support', active: false },
  ] as const;

  return (
    <div
      className="w-[348px] rounded-[14px] overflow-hidden border border-[#E4E4E4] dark:border-[#222224] bg-white dark:bg-[#111113] select-none"
      style={{ boxShadow: '0 4px 32px rgba(0,0,0,0.07), 0 1px 4px rgba(0,0,0,0.04)' }}
      aria-hidden
    >
      {/* titlebar */}
      <div className="flex items-center gap-3 bg-[#F7F7F6] dark:bg-[#18181a] border-b border-[#E4E4E4] dark:border-[#222224] px-4 py-2.5">
        <div className="flex gap-[5px]">
          <div className="size-[9px] rounded-full bg-[#FF5F56]" />
          <div className="size-[9px] rounded-full bg-[#FFBD2E]" />
          <div className="size-[9px] rounded-full bg-[#27C93F]" />
        </div>
        <div className="flex-1 flex justify-center">
          <div className="bg-white dark:bg-[#222224] border border-[#E4E4E4] dark:border-[#2e2e31] rounded-[5px] px-7 py-[3px] flex items-center gap-1.5">
            <div className="size-1.5 rounded-full bg-[#27C93F]" />
            <span className="text-[8.5px] text-[#787774] dark:text-[#71717a]" style={{ fontFamily: 'var(--font-geist-mono), monospace' }}>alfychat.app</span>
          </div>
        </div>
      </div>

      {/* app shell */}
      <div className="flex h-[230px]">
        {/* sidebar */}
        <div className="w-[138px] shrink-0 border-r border-[#E4E4E4] dark:border-[#222224] bg-[#F7F7F6] dark:bg-[#0e0e10] flex flex-col p-2.5 gap-1">
          {/* server header */}
          <div className="flex items-center gap-1.5 px-1.5 py-1 mb-1">
            <div className="size-6 rounded-[7px] bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center text-[7.5px] font-bold text-white shadow-sm">
              AF
            </div>
            <span className="text-[8.5px] font-semibold text-[#111111] dark:text-[#e4e4e7] truncate">AlfyCore</span>
          </div>
          <div className="text-[6.5px] font-semibold text-[#AAAAAA] dark:text-[#52525b] uppercase tracking-[0.08em] px-1.5 mb-0.5"
            style={{ fontFamily: 'var(--font-geist-mono), monospace' }}>Salons texte</div>
          {CHANNELS.map(({ name, active }) => (
            <div
              key={name}
              className={`flex items-center gap-1.5 px-2 py-[4px] rounded-[5px] transition-colors ${
                active ? 'bg-[#EAEAEA] dark:bg-[#27272a]' : 'hover:bg-[#EBEBEA] dark:hover:bg-[#1e1e20]'
              }`}
            >
              <span className="text-[9px] text-[#BBBBBB] dark:text-[#3f3f46]">#</span>
              <span className={`text-[8.5px] truncate ${
                active ? 'text-[#111111] dark:text-[#fafafa] font-semibold' : 'text-[#787774] dark:text-[#71717a]'
              }`}>{name}</span>
            </div>
          ))}
        </div>

        {/* messages pane */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* channel header */}
          <div className="flex items-center gap-1.5 px-3 py-2 border-b border-[#E4E4E4] dark:border-[#222224] shrink-0">
            <span className="text-[9px] text-[#BBBBBB] dark:text-[#3f3f46]">#</span>
            <span className="text-[8.5px] font-semibold text-[#111111] dark:text-[#fafafa] flex-1 truncate">général</span>
            <div className="flex items-center gap-1 bg-[#EDF3EC] dark:bg-[#14532d]/30 border border-[#C9E0CA] dark:border-[#166534]/30 rounded-full px-1.5 py-[2px]">
              <LockIcon size={6} className="text-[#2d6a31] dark:text-[#4ade80]" />
              <span className="text-[6px] font-medium text-[#2d6a31] dark:text-[#4ade80]" style={{ fontFamily: 'var(--font-geist-mono), monospace' }}>E2E</span>
            </div>
          </div>

          {/* messages */}
          <div className="flex-1 overflow-hidden flex flex-col justify-end px-3 py-2.5 gap-2.5">
            {MESSAGES.map(({ init, color, name, msg }) => (
              <div key={msg} className="flex items-start gap-2">
                <div
                  className="size-[18px] shrink-0 rounded-full flex items-center justify-center text-[6.5px] font-bold text-[#444] mt-0.5 border border-black/5"
                  style={{ background: color }}
                >
                  {init}
                </div>
                <div className="min-w-0">
                  <span className="text-[7px] font-semibold text-[#555] dark:text-[#a1a1aa]">{name} </span>
                  <p className="text-[8.5px] text-[#111111] dark:text-[#e4e4e7] leading-snug truncate">{msg}</p>
                </div>
              </div>
            ))}
          </div>

          {/* input */}
          <div className="px-2.5 pb-2.5 shrink-0">
            <div className="rounded-[6px] bg-[#F0F0EE] dark:bg-[#1e1e20] border border-[#E4E4E4] dark:border-[#2e2e31] px-2.5 py-1.5 flex items-center gap-1.5">
              <span className="text-[8px] text-[#BBBBBB] dark:text-[#3f3f46] flex-1">Message #général…</span>
              <div className="size-3.5 rounded-full bg-indigo-400/20 border border-indigo-400/30 flex items-center justify-center">
                <div className="size-1 rounded-full bg-indigo-400" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Encryption card ───────────────────────────────────────── */
function EncryptionCard() {
  return (
    <div
      className="w-[214px] rounded-[14px] bg-white dark:bg-[#111113] border border-[#E4E4E4] dark:border-[#222224] p-4 select-none"
      style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04)' }}
      aria-hidden
    >
      {/* header */}
      <div className="flex items-center gap-2.5 mb-3.5">
        <div className="size-9 shrink-0 rounded-[10px] bg-[#EDF3EC] dark:bg-[#14532d]/30 border border-[#C9E0CA] dark:border-[#166534]/30 flex items-center justify-center shadow-sm">
          <ShieldCheckIcon size={15} className="text-[#2d6a31] dark:text-[#4ade80]" />
        </div>
        <div className="min-w-0">
          <p className="text-[10.5px] font-bold text-[#111111] dark:text-[#f4f4f5] leading-tight">Chiffrement actif</p>
          <div className="flex items-center gap-1 mt-0.5">
            <span className="size-1.5 rounded-full bg-[#4ade80] inline-block" />
            <p className="text-[8.5px] text-[#787774] dark:text-[#71717a]" style={{ fontFamily: 'var(--font-geist-mono), monospace' }}>Signal Protocol</p>
          </div>
        </div>
      </div>

      {/* items */}
      <div className="space-y-2">
        {[
          { label: "Clés locales sur l'appareil", ok: true },
          { label: 'Zéro connaissance serveur', ok: true },
          { label: 'Audité indépendamment', ok: true },
        ].map(({ label, ok }) => (
          <div key={label} className="flex items-center gap-2">
            <div className={`size-4 shrink-0 rounded-full flex items-center justify-center ${
              ok ? 'bg-[#EDF3EC] dark:bg-[#14532d]/30' : 'bg-[#F5F5F3] dark:bg-[#27272a]'
            }`}>
              <div className={`size-1.5 rounded-full ${ok ? 'bg-[#2d6a31] dark:bg-[#4ade80]' : 'bg-[#CCCCCC]'}`} />
            </div>
            <span className="text-[8.5px] text-[#555] dark:text-[#a1a1aa]">{label}</span>
          </div>
        ))}
      </div>

      {/* footer bar */}
      <div className="mt-3.5 rounded-[6px] bg-[#F7F7F6] dark:bg-[#1a1a1c] border border-[#EAEAEA] dark:border-[#2a2a2c] px-2.5 py-1.5 flex items-center justify-between">
        <span className="text-[8px] text-[#AAAAAA] dark:text-[#52525b]" style={{ fontFamily: 'var(--font-geist-mono), monospace' }}>AES-256-GCM</span>
        <span className="text-[8px] font-medium text-[#2d6a31] dark:text-[#4ade80]" style={{ fontFamily: 'var(--font-geist-mono), monospace' }}>✓ actif</span>
      </div>
    </div>
  );
}

/* ── Community card ─────────────────────────────────────────── */
function CommunityCard() {
  const MEMBERS = ['#c7d2fe', '#bbf7d0', '#fde68a', '#fecaca'] as const;
  return (
    <div
      className="w-[192px] rounded-[14px] bg-white dark:bg-[#111113] border border-[#E4E4E4] dark:border-[#222224] p-3.5 select-none"
      style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04)' }}
      aria-hidden
    >
      {/* server info */}
      <div className="flex items-center gap-2.5 mb-3">
        <div className="size-9 rounded-[10px] bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center text-[9px] font-bold text-white shadow-sm shrink-0">
          AF
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-bold text-[#111111] dark:text-[#f4f4f5] leading-tight truncate">AlfyCore</p>
          <div className="flex items-center gap-1 mt-0.5">
            <span className="size-1.5 rounded-full bg-[#4ade80] inline-block" />
            <span className="text-[8px] text-[#787774] dark:text-[#71717a]">247 en ligne</span>
          </div>
        </div>
      </div>

      {/* member avatars */}
      <div className="flex items-center mb-2.5">
        {MEMBERS.map((c, i) => (
          <div
            key={c}
            className="size-6 rounded-full border-2 border-white dark:border-[#111113] flex items-center justify-center text-[6.5px] font-bold text-[#444]"
            style={{ background: c, marginLeft: i > 0 ? '-6px' : 0 }}
          />
        ))}
        <span className="ml-2 text-[8px] text-[#AAAAAA] dark:text-[#52525b]" style={{ fontFamily: 'var(--font-geist-mono), monospace' }}>+2.4k</span>
      </div>

      {/* channel tags */}
      <div className="flex flex-wrap gap-1">
        {['#général', '#tech', '#bots'].map((tag) => (
          <span
            key={tag}
            className="text-[7.5px] bg-[#F5F5F3] dark:bg-[#1e1e20] text-[#787774] dark:text-[#71717a] rounded-full px-2 py-[3px] border border-[#E4E4E4] dark:border-[#2a2a2c]"
            style={{ fontFamily: 'var(--font-geist-mono), monospace' }}
          >
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ── Hero ───────────────────────────────────────────────────── */
export function HomeHero() {
  const reduce = useReducedMotion();

  const f = (delay = 0) => ({
    initial: reduce ? (false as const) : ({ opacity: 0, y: 12 } as const),
    animate: { opacity: 1, y: 0 } as const,
    transition: { duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] as const },
  });

  return (
    <section
      className="relative overflow-hidden flex items-center bg-[#F7F6F3] dark:bg-[#09090b]"
      style={{ minHeight: 'calc(100dvh - 3.5rem)' }}
    >
      {/* Subtle ambient radial — protocol §7 */}
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden
        style={{
          background: 'radial-gradient(ellipse 70% 60% at 60% 40%, rgba(180,170,155,0.07) 0%, transparent 70%)',
        }}
      />

      <div className="mx-auto grid max-w-6xl w-full grid-cols-1 items-center gap-10 px-8 pb-20 pt-16 md:grid-cols-[1fr_1.05fr] md:gap-10 lg:gap-20">

        {/* Left: editorial copy ─────────────────────────────── */}
        <div className="flex flex-col gap-8">

          {/* Badge */}
          <motion.div {...f(0)}>
            <div
              className="inline-flex items-center gap-2 rounded-full border border-[#EAEAEA] dark:border-[#27272a] bg-white dark:bg-[#18181b] px-3.5 py-1.5"
              style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
            >
              <span
                className="text-[11px] font-medium uppercase tracking-[0.06em] text-[#787774] dark:text-[#71717a]"
                style={{ fontFamily: 'var(--font-geist-mono), monospace' }}
              >
                Open source · Hébergé en France
              </span>
            </div>
          </motion.div>

          {/* Editorial serif headline */}
          <motion.h1
            {...f(0.06)}
            className="leading-[1.08] tracking-[-0.025em] text-[#111111] dark:text-[#fafafa] font-bold"
            style={{
              fontFamily: 'var(--font-krona), sans-serif',
              fontSize: 'clamp(1.6rem, 3.5vw, 3.2rem)',
            }}
          >
            La messagerie privée
            <br />
            pour des échanges
            <br />
            <em className="not-italic text-[#787774] dark:text-[#71717a]">qui vous appartiennent.</em>
          </motion.h1>

          {/* Subtext */}
          <motion.p
            {...f(0.13)}
            className="text-[16px] text-[#787774] dark:text-[#71717a] leading-relaxed max-w-[400px]"
            style={{ fontFamily: 'var(--font-geist-sans), system-ui, sans-serif' }}
          >
            Chiffrement de bout en bout, aucun suivi, serveurs en France. Vos conversations n'appartiennent qu'à vous.
          </motion.p>

          {/* CTAs */}
          <motion.div {...f(0.2)} className="flex flex-wrap gap-3">
            <Link href="/register">
              <button
                className="inline-flex items-center gap-2 rounded-[6px] bg-[#111111] dark:bg-white px-6 py-3 text-[14px] font-medium text-white dark:text-[#0a0a0a] transition-all duration-200 hover:bg-[#333333] dark:hover:bg-white/90 active:scale-[0.98]"
              >
                Créer un compte gratuit
              </button>
            </Link>
            <Link href="#features">
              <button
                className="inline-flex items-center gap-2 rounded-[6px] border border-[#EAEAEA] dark:border-[#27272a] bg-white dark:bg-[#18181b] px-5 py-3 text-[14px] font-medium text-[#111111] dark:text-[#fafafa] transition-all duration-200 hover:bg-[#F7F6F3] dark:hover:bg-[#27272a] active:scale-[0.98]"
              >
                Découvrir les fonctions
                <ArrowRightIcon size={12} />
              </button>
            </Link>
          </motion.div>

          {/* Trust line */}
          <motion.div {...f(0.27)} className="flex flex-wrap items-center gap-x-5 gap-y-2">
            {['Open source', 'Aucun tracking', 'Conforme RGPD'].map((tag) => (
              <span key={tag} className="flex items-center gap-1.5 text-[12px] text-[#787774] dark:text-[#71717a]">
                <CheckCircleIcon size={10} className="text-[#346538] shrink-0" />
                {tag}
              </span>
            ))}
          </motion.div>
        </div>

        {/* Right: floating product cards ───────────────────── */}
        <div className="relative hidden md:flex items-center justify-center h-[520px]">
          {/* ambient glow behind */}
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden>
            <div className="size-72 rounded-full bg-indigo-400/8 dark:bg-indigo-500/6 blur-[80px]" />
          </div>

          {/* Chat card — center-top */}
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 28, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.75, delay: 0.16, ease: [0.16, 1, 0.3, 1] }}
            className="absolute top-0 left-1/2 -translate-x-1/2 z-10"
          >
            <ChatCard />
          </motion.div>

          {/* Encryption card — bottom-left */}
          <motion.div
            initial={reduce ? false : { opacity: 0, x: -16, y: 12 }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            transition={{ duration: 0.65, delay: 0.32, ease: [0.16, 1, 0.3, 1] }}
            className="absolute bottom-6 left-0 z-20"
          >
            <EncryptionCard />
          </motion.div>

          {/* Community card — bottom-right */}
          <motion.div
            initial={reduce ? false : { opacity: 0, x: 16, y: 12 }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            transition={{ duration: 0.65, delay: 0.46, ease: [0.16, 1, 0.3, 1] }}
            className="absolute bottom-6 right-0 z-20"
          >
            <CommunityCard />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
