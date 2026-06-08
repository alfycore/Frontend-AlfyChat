'use client';

import NextLink from 'next/link';
import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { useAuth } from '@/hooks/use-auth';
import { motion, useReducedMotion } from 'motion/react';
import {
  Avatar,
  Button,
  Drawer,
  Separator,
  Skeleton,
  Switch,
} from '@heroui/react';
import { SunIcon, MoonIcon, MenuIcon, MessageCircleIcon } from '@/components/icons';

const NAV_LINKS = [
  { label: 'Fonctionnalités', href: '/#features' },
  { label: 'Sécurité',        href: '/#security'  },
  { label: 'Développeurs',    href: '/developers' },
  { label: 'À propos',        href: '/about'      },
];

export function LandingNavbar() {
  const { user, isLoading } = useAuth();
  const { theme, setTheme } = useTheme();
  const [scrolled, setScrolled] = useState(false);
  const [mounted, setMounted] = useState(false);
  const reduce = useReducedMotion();

  useEffect(() => {
    setMounted(true);
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const isDark = mounted && theme === 'dark';

  return (
    <motion.header
      initial={reduce ? false : { opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="fixed inset-x-0 top-0 z-50 transition-all duration-300"
      style={{
        background: scrolled
          ? 'color-mix(in oklch, var(--background) 80%, transparent)'
          : 'transparent',
        backdropFilter: scrolled ? 'blur(20px)' : 'none',
        WebkitBackdropFilter: scrolled ? 'blur(20px)' : 'none',
        borderBottom: `1px solid ${scrolled ? 'var(--border)' : 'transparent'}`,
      }}
    >
      <div className="mx-auto flex h-18 max-w-screen-2xl items-center justify-between px-6 lg:px-12">

        {/* Logo — pas d'équivalent HeroUI */}
        <NextLink href="/" className="flex shrink-0 items-center gap-3">
          <img
            src="/logo/Alfychatlogowihte.svg"
            alt="AlfyChat"
            className="size-6 invert dark:invert-0"
          />
          <span
            className="hidden text-[13px] font-bold tracking-[0.18em] text-foreground sm:block"
            style={{ fontFamily: 'var(--font-krona)' }}
          >
            ALFYCHAT
          </span>
        </NextLink>

        {/* Desktop nav — Button ghost rendant NextLink */}
        <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-1 md:flex">
          {NAV_LINKS.map((l) => (
            <Button
              key={l.href}
              variant="ghost"
              size="md"
              render={(props) => <NextLink {...props} href={l.href} />}
            >
              {l.label}
            </Button>
          ))}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-2">

          {/* Theme toggle — Switch sun/moon */}
          <Switch
            size="md"
            isSelected={isDark}
            onChange={(v) => setTheme(v ? 'dark' : 'light')}
            aria-label="Changer le thème"
          >
            <Switch.Control>
              <Switch.Thumb>
                <Switch.Icon>
                  {isDark ? <MoonIcon size={11} /> : <SunIcon size={11} />}
                </Switch.Icon>
              </Switch.Thumb>
            </Switch.Control>
          </Switch>

          <Separator orientation="vertical" className="" />

          {/* Auth */}
          {!mounted || isLoading ? (
            <Skeleton className="h-10 w-32" />
          ) : user ? (
            <NextLink
              href="/channels/me"
              className="flex items-center gap-2 rounded-lg px-1.5 py-1 transition-colors hover:bg-surface"
            >
              <Avatar size="sm">
                {user.avatarUrl && (
                  <Avatar.Image src={user.avatarUrl} alt={user.displayName || user.username} />
                )}
                <Avatar.Fallback>
                  {(user.displayName || user.username || '?').slice(0, 2).toUpperCase()}
                </Avatar.Fallback>
              </Avatar>
              <MessageCircleIcon size={11} className="hidden text-muted sm:block" />
            </NextLink>
          ) : (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="hidden sm:inline-flex"
                render={(props) => <NextLink {...props} href="/login" />}
              >
                Connexion
              </Button>
              <Button
                size="sm"
                className="hidden sm:inline-flex"
                render={(props) => <NextLink {...props} href="/register" />}
              >
                Créer un compte
              </Button>
            </>
          )}

          {/* Mobile — Drawer HeroUI */}
          <div className="md:hidden">
            <Drawer>
              <Button isIconOnly variant="ghost" size="sm" aria-label="Menu">
                <MenuIcon size={16} />
              </Button>
              <Drawer.Backdrop variant="blur">
                <Drawer.Content placement="top">
                  <Drawer.Dialog>
                    <Drawer.CloseTrigger />
                    <Drawer.Header>
                      <Drawer.Heading>
                        <span style={{ fontFamily: 'var(--font-krona)' }} className="text-sm tracking-[0.18em]">
                          ALFYCHAT
                        </span>
                      </Drawer.Heading>
                    </Drawer.Header>
                    <Drawer.Body>
                      <nav className="flex flex-col gap-1">
                        {NAV_LINKS.map((l, i) => (
                          <motion.div
                            key={l.href}
                            initial={reduce ? false : { opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.05 + i * 0.05, duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
                          >
                            <Button
                              variant="ghost"
                              fullWidth
                              className="justify-start text-lg"
                              render={(props) => <NextLink {...props} href={l.href} />}
                            >
                              {l.label}
                            </Button>
                          </motion.div>
                        ))}
                      </nav>
                    </Drawer.Body>
                    <Drawer.Footer>
                      <Button
                        variant="tertiary"
                        fullWidth
                        render={(props) => <NextLink {...props} href="/login" />}
                      >
                        Connexion
                      </Button>
                      <Button
                        fullWidth
                        render={(props) => <NextLink {...props} href="/register" />}
                      >
                        Créer un compte
                      </Button>
                    </Drawer.Footer>
                  </Drawer.Dialog>
                </Drawer.Content>
              </Drawer.Backdrop>
            </Drawer>
          </div>
        </div>
      </div>
    </motion.header>
  );
}
