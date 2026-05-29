'use client';

import { motion, useReducedMotion } from 'motion/react';
import { LockIcon, ShieldCheckIcon } from '@/components/icons';

const ease = [0.32, 0.72, 0, 1] as const;

/* ── Mini chat card ─────────────────────────────────────────── */
function MiniChat() {
  return (
    <div
      className="w-[300px] rounded-[16px] overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.02) 100%)',
        border: '1px solid rgba(255,255,255,0.09)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.07), 0 24px 56px rgba(0,0,0,0.5)',
      }}
    >
      {/* Chrome */}
      <div className="flex items-center gap-2 px-4 py-2.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.2)' }}>
        <div className="flex gap-1.5">
          {['rgba(255,95,86,0.45)', 'rgba(255,189,46,0.45)', 'rgba(39,201,63,0.45)'].map((c, i) => (
            <div key={i} className="size-2 rounded-full" style={{ background: c }} />
          ))}
        </div>
        <div className="flex-1 flex justify-center">
          <div className="rounded px-6 py-[2px]" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <span className="text-[8px] text-white/25" style={{ fontFamily: 'var(--font-geist-mono,monospace)' }}>alfychat.app</span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="p-4 space-y-2.5">
        {[
          { init: 'S', bg: 'rgba(139,92,246,0.2)', fg: 'rgba(196,181,253,0.85)', name: 'Sophie', msg: 'Super idée pour samedi !' },
          { init: 'A', bg: 'rgba(52,211,153,0.15)', fg: 'rgba(110,231,183,0.85)', name: 'Alex', msg: 'Compte sur moi' },
          { init: 'S', bg: 'rgba(139,92,246,0.2)', fg: 'rgba(196,181,253,0.85)', name: 'Sophie', msg: '🔒 Chiffré E2E' },
        ].map(({ init, bg, fg, name, msg }) => (
          <div key={msg} className="flex items-start gap-2">
            <div className="size-5 shrink-0 rounded-full flex items-center justify-center text-[7px] font-bold mt-0.5"
              style={{ background: bg, color: fg }}>
              {init}
            </div>
            <div>
              <span className="text-[7.5px] font-semibold" style={{ color: fg }}>{name} </span>
              <p className="text-[9px] text-white/60 leading-snug">{msg}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Input bar */}
      <div className="px-4 pb-4">
        <div className="flex items-center gap-2 rounded-lg px-3 py-2" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <span className="text-[9px] flex-1 text-white/20">Message chiffré...</span>
          <div className="size-5 rounded-md flex items-center justify-center"
            style={{ background: 'rgba(109,40,217,0.4)' }}>
            <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M1 4H7M7 4L4.5 1.5M7 4L4.5 6.5" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── E2E indicator card ──────────────────────────────────────── */
function E2ECard() {
  return (
    <div
      className="flex items-center gap-3 rounded-[12px] px-4 py-3"
      style={{
        background: 'rgba(52,211,153,0.07)',
        border: '1px solid rgba(52,211,153,0.15)',
        boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
      }}
    >
      <div className="size-7 shrink-0 rounded-lg flex items-center justify-center"
        style={{ background: 'rgba(52,211,153,0.12)', border: '1px solid rgba(52,211,153,0.2)' }}>
        <ShieldCheckIcon size={12} className="text-emerald-400" />
      </div>
      <div>
        <p className="text-[10.5px] font-semibold text-white/80">Chiffrement de bout en bout</p>
        <p className="text-[9px] text-white/35">Protocole Signal · Clés sur votre appareil</p>
      </div>
    </div>
  );
}

/* ── Main branded panel ──────────────────────────────────────── */
export function AuthBrandPanel() {
  const reduce = useReducedMotion();

  return (
    <div className="relative flex flex-col items-center justify-center h-full min-h-svh px-12 py-16 overflow-hidden"
      style={{ background: '#050505' }}>

      {/* Mesh gradient orbs */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(109,40,217,0.18) 0%, transparent 65%)' }} />
        <div className="absolute bottom-0 left-0 w-[350px] h-[350px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.08) 0%, transparent 65%)' }} />
      </div>

      {/* Content */}
      <div className="relative flex flex-col items-center gap-8 text-center max-w-sm">

        {/* Floating chat card */}
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 24, rotate: -2 }}
          animate={{ opacity: 1, y: 0, rotate: -1.5 }}
          transition={{ duration: 0.9, delay: 0.1, ease }}
        >
          <MiniChat />
        </motion.div>

        {/* E2E badge */}
        <motion.div
          className="w-full"
          initial={reduce ? false : { opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7, delay: 0.35, ease }}
        >
          <E2ECard />
        </motion.div>

        {/* Tagline */}
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.55, ease }}
          className="space-y-2"
        >
          <p
            className="text-[1.4rem] font-bold leading-[1.15] tracking-[-0.02em] text-white"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            Vos conversations
            <br />
            n'appartiennent qu'à vous.
          </p>
          <p className="text-[13px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.38)' }}>
            Open source · Hébergé en France · Conforme RGPD
          </p>
        </motion.div>

        {/* Trust dots */}
        <motion.div
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.7 }}
          className="flex items-center gap-5"
        >
          {['Open source', 'Aucun tracking', 'E2E activé'].map((tag) => (
            <span key={tag} className="flex items-center gap-1.5 text-[11px]" style={{ color: 'rgba(255,255,255,0.3)' }}>
              <div className="size-1 rounded-full bg-emerald-400/60" />
              {tag}
            </span>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
