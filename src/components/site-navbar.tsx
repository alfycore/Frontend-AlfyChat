'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useTheme } from 'next-themes';
import { useAuth } from '@/hooks/use-auth';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MenuIcon, XIcon, MessageCircleIcon, SunIcon, MoonIcon } from '@/components/icons';

const NAV_LINKS = [
  { label: 'Fonctionnalités', href: '/#features' },
  { label: 'Sécurité',        href: '/#security'  },
  { label: 'Développeurs',    href: '/developers'  },
  { label: 'À propos',        href: '/about'       },
];

export function LandingNavbar() {
  const { user, isLoading } = useAuth();
  const [open, setOpen] = useState(false);
  const reduce = useReducedMotion();
  const { theme, setTheme } = useTheme();

  return (
    <>
      {/* ── Floating island pill ──────────────────────────────── */}
      <nav className="fixed top-5 left-1/2 -translate-x-1/2 z-50 max-w-[calc(100vw-2rem)]">
        <div
          className="flex items-center gap-1 rounded-[12px] px-2 py-[5px]"
          style={{
            background: 'rgba(10,10,10,0.88)',
            backdropFilter: 'blur(28px)',
            WebkitBackdropFilter: 'blur(28px)',
            border: '1px solid rgba(255,255,255,0.09)',
            boxShadow: '0 8px 40px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.06)',
          }}
        >
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-2 px-3 py-1.5 rounded-[12px] transition-all duration-300 hover:bg-white/[0.05] shrink-0"
          >
            <img src="/logo/Alfychatlogowihte.svg" alt="AlfyChat" className="size-5" />
            <span
              className="text-[12.5px] font-bold text-white/90 tracking-widest hidden sm:block"
              style={{ fontFamily: 'var(--font-krona)' }}
            >
              ALFYCHAT
            </span>
          </Link>

          {/* Separator */}
          <div className="w-px h-4 bg-white/[0.08] mx-0.5 hidden md:block" />

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center">
            {NAV_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="px-3 py-1.5 rounded-[12px] text-[12.5px] font-medium text-white/45 hover:text-white/90 hover:bg-white/[0.06] transition-all duration-300"
              >
                {l.label}
              </Link>
            ))}
          </div>

          {/* Separator */}
          <div className="w-px h-4 bg-white/[0.08] mx-0.5 hidden md:block" />

          {/* Theme toggle */}
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="relative size-7 flex items-center justify-center rounded-[12px] text-white/45 hover:text-white/90 hover:bg-white/[0.06] transition-all duration-300"
            aria-label="Changer le thème"
          >
            <AnimatePresence mode="wait" initial={false}>
              {theme === 'dark' ? (
                <motion.span
                  key="sun"
                  initial={reduce ? false : { opacity: 0, rotate: -30, scale: 0.8 }}
                  animate={{ opacity: 1, rotate: 0, scale: 1 }}
                  exit={{ opacity: 0, rotate: 30, scale: 0.8 }}
                  transition={{ duration: 0.2 }}
                  className="absolute"
                >
                  <SunIcon size={13} />
                </motion.span>
              ) : (
                <motion.span
                  key="moon"
                  initial={reduce ? false : { opacity: 0, rotate: 30, scale: 0.8 }}
                  animate={{ opacity: 1, rotate: 0, scale: 1 }}
                  exit={{ opacity: 0, rotate: -30, scale: 0.8 }}
                  transition={{ duration: 0.2 }}
                  className="absolute"
                >
                  <MoonIcon size={13} />
                </motion.span>
              )}
            </AnimatePresence>
          </button>

          {/* Separator */}
          <div className="w-px h-4 bg-white/[0.08] mx-0.5 hidden md:block" />

          {/* Auth */}
          <div className="flex items-center gap-1 pr-[3px]">
            {isLoading ? (
              <div className="size-7 rounded-[12px] bg-white/[0.06] animate-pulse" />
            ) : user ? (
              <Link
                href="/channels/me"
                className="flex items-center gap-2 px-3 py-1.5 rounded-[12px] hover:bg-white/[0.06] transition-all duration-300 group"
              >
                <Avatar size="sm" className="size-6">
                  {user.avatarUrl && <AvatarImage src={user.avatarUrl} alt={user.displayName || user.username} />}
                  <AvatarFallback className="text-[9px] font-bold bg-white/10 text-white/80">
                    {(user.displayName || user.username || '?').slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <MessageCircleIcon size={11} className="text-white/30 group-hover:text-white/60 transition-colors hidden sm:block" />
              </Link>
            ) : (
              <>
                <Link href="/login" className="hidden sm:block">
                  <button className="px-3 py-1.5 rounded-[12px] text-[12.5px] text-white/45 hover:text-white/80 hover:bg-white/[0.06] transition-all duration-300">
                    Connexion
                  </button>
                </Link>
                <Link href="/register">
                  <button
                    className="px-4 py-1.5 rounded-[12px] text-[12.5px] font-semibold bg-white text-[#0a0a0a] transition-all duration-500 hover:bg-white/90 active:scale-[0.97]"
                    style={{ transitionTimingFunction: 'cubic-bezier(0.32, 0.72, 0, 1)' }}
                  >
                    Créer un compte
                  </button>
                </Link>
              </>
            )}

            {/* Mobile toggle */}
            <button
              onClick={() => setOpen((v) => !v)}
              className="md:hidden relative size-7 flex items-center justify-center rounded-[12px] text-white/45 hover:text-white/90 hover:bg-white/[0.06] transition-all duration-300 ml-1"
              aria-label={open ? 'Fermer' : 'Menu'}
            >
              {/* Morphing hamburger lines */}
              <span
                className="absolute block w-3.5 h-px bg-current transition-all duration-300"
                style={{ transform: open ? 'translateY(0) rotate(45deg)' : 'translateY(-3px)', transitionTimingFunction: 'cubic-bezier(0.32,0.72,0,1)' }}
              />
              <span
                className="absolute block w-3.5 h-px bg-current transition-all duration-300"
                style={{ transform: open ? 'translateY(0) rotate(-45deg)' : 'translateY(3px)', transitionTimingFunction: 'cubic-bezier(0.32,0.72,0,1)' }}
              />
            </button>
          </div>
        </div>
      </nav>

      {/* ── Mobile full-screen overlay ────────────────────────── */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="overlay"
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="fixed inset-0 z-40 md:hidden flex flex-col items-center justify-center"
            style={{ background: 'rgba(5,5,5,0.96)', backdropFilter: 'blur(40px)', WebkitBackdropFilter: 'blur(40px)' }}
          >
            {NAV_LINKS.map((l, i) => (
              <motion.div
                key={l.href}
                initial={reduce ? false : { opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                transition={{ delay: 0.04 + i * 0.06, duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
              >
                <Link
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="block py-3 text-[2rem] font-bold text-white/60 hover:text-white transition-colors duration-200 text-center"
                  style={{ fontFamily: 'var(--font-krona)' }}
                >
                  {l.label}
                </Link>
              </motion.div>
            ))}

            <motion.div
              initial={reduce ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ delay: 0.3, duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
              className="flex gap-3 mt-10"
            >
              <Link href="/login" onClick={() => setOpen(false)}>
                <button className="px-6 py-3 rounded-[12px] border border-white/15 text-white/60 hover:text-white hover:border-white/30 transition-all duration-300 text-[14px]">
                  Connexion
                </button>
              </Link>
              <Link href="/register" onClick={() => setOpen(false)}>
                <button className="px-6 py-3 rounded-[12px] bg-white text-[#0a0a0a] font-semibold text-[14px] hover:bg-white/90 transition-all duration-300">
                  Créer un compte
                </button>
              </Link>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
