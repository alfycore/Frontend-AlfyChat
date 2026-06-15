'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { useAuth } from '@/hooks/use-auth';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { SunIcon, MoonIcon, MessageCircleIcon, ArrowRightIcon } from '@/components/icons';

const NAV_LINKS = [
  { label: 'Fonctionnalités', href: '/#features' },
  { label: 'Sécurité',        href: '/#security'  },
  { label: 'Développeurs',    href: '/developers' },
  { label: 'À propos',        href: '/about'      },
];

const EASE = [0.32, 0.72, 0, 1] as const;

function isActive(pathname: string, href: string) {
  const path = href.split('#')[0] || '/';
  if (path === '/') return false; // ancres sur la home — pas d'état actif
  return pathname === path || pathname.startsWith(path + '/');
}

/**
 * Île de navigation flottante, entièrement pilotée par les variables de thème
 * (globals.css) → s'adapte automatiquement clair / sombre.
 *
 * variant="flow"  → dans le flux (pousse le contenu), pour la home.
 * variant="fixed" → flotte au-dessus du contenu, pour les pages statiques.
 */
export function NavbarIsland({ variant = 'flow' }: { variant?: 'flow' | 'fixed' }) {
  const { user, isLoading } = useAuth();
  const { resolvedTheme, setTheme } = useTheme();
  const pathname = usePathname();
  const reduce = useReducedMotion();

  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);

  // Évite tout mismatch d'hydratation : le thème/l'auth ne sont connus
  // qu'après montage côté client.
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Verrouille le scroll du body quand le menu mobile est ouvert.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  const isDark = resolvedTheme === 'dark';
  const toggleTheme = () => setTheme(isDark ? 'light' : 'dark');

  const Shell = variant === 'fixed' ? 'div' : 'header';
  const shellClass = variant === 'fixed'
    ? 'pointer-events-none fixed inset-x-0 top-4 z-50 flex justify-center px-4'
    : 'relative z-50 flex justify-center px-4 pt-5 pb-2';

  return (
    <>
      <Shell className={shellClass}>
        <motion.nav
          layout
          initial={reduce ? false : { y: -18, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{
            duration: 0.6,
            ease: EASE,
            layout: reduce ? { duration: 0 } : { duration: 0.55, ease: EASE },
          }}
          className={cn(
            'pointer-events-auto',
            // En haut : pleine largeur (barre). Au scroll : se rétracte en pilule.
            scrolled ? 'w-fit max-w-[calc(100vw-2rem)]' : 'w-full max-w-6xl',
          )}
        >
          <motion.div
            layout
            className={cn(
              'relative flex items-center rounded-2xl backdrop-blur-2xl',
              'transition-[box-shadow,background-color,border-color,padding] duration-500 ease-out',
              // léger reflet en haut de l'île
              "before:pointer-events-none before:absolute before:inset-0 before:rounded-[inherit] before:bg-gradient-to-b before:from-foreground/[0.05] before:to-transparent before:content-['']",
              scrolled
                ? 'gap-3 border border-border bg-background/85 px-4 py-2.5 shadow-[0_12px_44px_-12px_rgba(0,0,0,0.35)] dark:shadow-[0_14px_48px_rgba(0,0,0,0.6)]'
                : 'w-full gap-2 border border-transparent bg-background/40 px-5 py-2.5 shadow-none',
            )}
          >
            {/* Logo */}
            <Link
              href="/"
              className="group flex shrink-0 items-center gap-2 rounded-xl px-2.5 py-1.5 transition-colors hover:bg-foreground/[0.06]"
            >
              <img
                src="/logo/Alfychat.svg"
                alt="AlfyChat"
                className="size-7 transition-transform duration-500 ease-out group-hover:rotate-[10deg]"
                style={{ transitionTimingFunction: 'cubic-bezier(0.32,0.72,0,1)' }}
              />
              <span
                className="hidden text-[12.5px] font-bold tracking-[0.2em] text-foreground/90 sm:block"
                style={{ fontFamily: 'var(--font-krona)' }}
              >
                ALFYCHAT
              </span>
            </Link>

            <div className={cn('mx-1.5 hidden h-4 w-px bg-border', scrolled && 'md:block')} />

            {/* Liens desktop — surlignage glissant */}
            <div
              className={cn(
                'relative hidden items-center md:flex',
                // En pleine largeur, les liens occupent le centre.
                !scrolled && 'flex-1 justify-center',
              )}
              onMouseLeave={() => setHovered(null)}
            >
              {NAV_LINKS.map((l) => {
                const active = mounted && isActive(pathname, l.href);
                return (
                  <Link
                    key={l.href}
                    href={l.href}
                    onMouseEnter={() => setHovered(l.href)}
                    className={cn(
                      'relative rounded-xl px-3 py-1.5 text-[12.5px] font-medium transition-colors duration-200',
                      active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {hovered === l.href && (
                      <motion.span
                        layoutId="nav-hover"
                        className="absolute inset-0 rounded-xl bg-foreground/[0.07]"
                        transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                      />
                    )}
                    <span className="relative z-10">{l.label}</span>
                    {active && (
                      <span className="absolute inset-x-3 -bottom-px h-px rounded-full bg-primary/70" />
                    )}
                  </Link>
                );
              })}
            </div>

            <div className={cn('mx-1.5 hidden h-4 w-px bg-border', scrolled && 'md:block')} />

            {/* Toggle thème */}
            <button
              onClick={toggleTheme}
              className={cn(
                'relative flex size-7 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-foreground/[0.06] hover:text-foreground',
                // pousse le groupe de droite quand les liens sont masqués (mobile, pleine largeur)
                !scrolled && 'ml-auto md:ml-0',
              )}
              aria-label="Changer le thème"
            >
              <AnimatePresence mode="wait" initial={false}>
                {mounted && (
                  <motion.span
                    key={isDark ? 'sun' : 'moon'}
                    initial={reduce ? false : { opacity: 0, rotate: -40, scale: 0.6 }}
                    animate={{ opacity: 1, rotate: 0, scale: 1 }}
                    exit={reduce ? { opacity: 0 } : { opacity: 0, rotate: 40, scale: 0.6 }}
                    transition={{ duration: 0.22, ease: EASE }}
                    className="absolute"
                  >
                    {isDark ? <SunIcon size={13} /> : <MoonIcon size={13} />}
                  </motion.span>
                )}
              </AnimatePresence>
            </button>

            <div className="mx-0.5 hidden h-4 w-px bg-border md:block" />

            {/* Auth */}
            <div className="flex items-center gap-1 px-0.5">
              {!mounted || isLoading ? (
                <div className="size-7 animate-pulse rounded-xl bg-foreground/[0.06]" />
              ) : user ? (
                <Link
                  href="/channels/me"
                  className="group flex items-center gap-2 rounded-xl px-2.5 py-1.5 transition-colors hover:bg-foreground/[0.06]"
                >
                  <Avatar size="sm" className="size-6">
                    {user.avatarUrl && (
                      <AvatarImage src={user.avatarUrl} alt={user.displayName || user.username} />
                    )}
                    <AvatarFallback className="bg-primary/15 text-[9px] font-bold text-primary">
                      {(user.displayName || user.username || '?').slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <MessageCircleIcon
                    size={11}
                    className="hidden text-muted-foreground transition-colors group-hover:text-foreground sm:block"
                  />
                </Link>
              ) : (
                <>
                  <Link href="/login" className="hidden sm:block">
                    <span className="block rounded-xl px-3 py-1.5 text-[12.5px] font-medium text-muted-foreground transition-colors hover:bg-foreground/[0.06] hover:text-foreground">
                      Connexion
                    </span>
                  </Link>
                  <Link
                    href="/register"
                    className="group flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-1.5 text-[12.5px] font-semibold text-primary-foreground shadow-sm shadow-primary/25 transition-all duration-300 hover:bg-primary/90 active:scale-[0.97]"
                    style={{ transitionTimingFunction: 'cubic-bezier(0.32,0.72,0,1)' }}
                  >
                    Créer un compte
                    <ArrowRightIcon
                      size={12}
                      className="transition-transform duration-300 group-hover:translate-x-0.5"
                    />
                  </Link>
                </>
              )}

              {/* Hamburger mobile (morphing) */}
              <button
                onClick={() => setOpen((v) => !v)}
                className="relative ml-0.5 flex size-7 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-foreground/[0.06] hover:text-foreground md:hidden"
                aria-label={open ? 'Fermer le menu' : 'Ouvrir le menu'}
                aria-expanded={open}
              >
                <span
                  className="absolute block h-px w-3.5 bg-current transition-transform duration-300"
                  style={{ transform: open ? 'rotate(45deg)' : 'translateY(-3px)', transitionTimingFunction: 'cubic-bezier(0.32,0.72,0,1)' }}
                />
                <span
                  className="absolute block h-px w-3.5 bg-current transition-transform duration-300"
                  style={{ transform: open ? 'rotate(-45deg)' : 'translateY(3px)', transitionTimingFunction: 'cubic-bezier(0.32,0.72,0,1)' }}
                />
              </button>
            </div>
          </motion.div>
        </motion.nav>
      </Shell>

      {/* Overlay mobile plein écran */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="overlay"
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="fixed inset-0 z-40 flex flex-col items-center justify-center bg-background/95 backdrop-blur-2xl md:hidden"
          >
            {NAV_LINKS.map((l, i) => (
              <motion.div
                key={l.href}
                initial={reduce ? false : { opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                transition={{ delay: 0.04 + i * 0.06, duration: 0.5, ease: EASE }}
              >
                <Link
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="block py-3 text-center text-[2rem] font-bold text-foreground/60 transition-colors duration-200 hover:text-foreground"
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
              transition={{ delay: 0.3, duration: 0.5, ease: EASE }}
              className="mt-10 flex gap-3"
            >
              <Link href="/login" onClick={() => setOpen(false)}>
                <span className="block rounded-xl border border-border px-6 py-3 text-[14px] text-foreground/70 transition-colors duration-300 hover:border-foreground/30 hover:text-foreground">
                  Connexion
                </span>
              </Link>
              <Link href="/register" onClick={() => setOpen(false)}>
                <span className="block rounded-xl bg-primary px-6 py-3 text-[14px] font-semibold text-primary-foreground transition-colors duration-300 hover:bg-primary/90">
                  Créer un compte
                </span>
              </Link>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export function LandingNavbar() {
  return <NavbarIsland variant="fixed" />;
}
