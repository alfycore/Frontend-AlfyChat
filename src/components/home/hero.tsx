'use client';

import Link from 'next/link';
import { motion, useReducedMotion } from 'motion/react';
import { ArrowRightIcon, CheckCircleIcon } from '@/components/icons';

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
      style={{ minHeight: '90dvh' }}
    >
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden
        style={{
          background: 'radial-gradient(ellipse 70% 60% at 60% 40%, rgba(118,39,255,0.05) 0%, transparent 70%)',
        }}
      />

      <div className="mx-auto grid max-w-7xl w-full grid-cols-1 items-center gap-10 px-8 pb-20 pt-16 md:grid-cols-[1fr_1.3fr] md:gap-8 lg:gap-12">

        {/* Left: editorial copy ─────────────────────────────── */}
        <div className="flex flex-col gap-8">

          {/* Badge */}
          <motion.div {...f(0)}>
            <div
              className="inline-flex items-center gap-2 rounded-full border border-[#EAEAEA] dark:border-[#27272a] bg-white dark:bg-[#18181b] px-3.5 py-1.5"
              style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
            >
              <span className="text-[13px]" aria-hidden>🇪🇺</span>
              <span
                className="text-[11px] font-medium uppercase tracking-[0.06em] text-[#787774] dark:text-[#71717a]"
                style={{ fontFamily: 'var(--font-geist-mono), monospace' }}
              >
                Conforme RGPD · Données en Europe
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
            La messagerie
            <br />
            qui respecte
            <br />
            <span
              style={{
                background: 'linear-gradient(135deg, #a855f7 0%, #7627FF 60%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              votre vie
              <br />
              privée.
            </span>
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
                className="inline-flex items-center gap-2 rounded-[6px] bg-[#7627FF] px-6 py-3 text-[14px] font-medium text-white transition-all duration-200 hover:bg-[#6020dd] active:scale-[0.98]"
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
            {['Auto-hébergeable', 'Open source', 'Sans numéro de tél.'].map((tag) => (
              <span key={tag} className="flex items-center gap-1.5 text-[12px] text-[#787774] dark:text-[#71717a]">
                <CheckCircleIcon size={10} className="text-[#7627FF] shrink-0" />
                {tag}
              </span>
            ))}
          </motion.div>
        </div>

        {/* Right: hero image ───────────────────── */}
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 20, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.75, delay: 0.16, ease: [0.16, 1, 0.3, 1] }}
          className="relative hidden md:block"
        >
          <img
            src="/heroimg.png"
            alt="AlfyChat aperçu"
            className="w-full select-none"
            draggable={false}
          />
        </motion.div>
      </div>
    </section>
  );
}
