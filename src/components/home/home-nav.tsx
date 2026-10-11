'use client';

import NextLink from 'next/link';
import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { AnimatePresence, motion, useReducedMotionConfig } from 'motion/react';
import { Button, Drawer, buttonVariants } from '@heroui/react';
import { Menu, Moon, Sun } from 'lucide-react';

import { AlfyMark } from '@/components/alfy/primitives/alfy-mark';
import { useAuth } from '@/hooks/use-auth';
import { useTranslation } from '@/components/locale-provider';
import { cn } from '@/lib/utils';
import { EASE } from './shared';

export function HomeNav() {
  const { t } = useTranslation();
  const n = t.landing.home.nav;
  const { user, isLoading } = useAuth();
  const reduce = useReducedMotionConfig();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const links = [
    { href: '/#features', label: n.features },
    { href: '/#security', label: n.security },
    { href: '/#self-hosting', label: n.selfHosting },
    { href: '/developers', label: n.developers },
  ];

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <motion.header
      initial={reduce ? false : { opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: EASE }}
      className={cn(
        'fixed inset-x-0 top-0 z-50 transition-[background-color,backdrop-filter] duration-(--dur-4)',
        scrolled ? 'bg-background/80 backdrop-blur-xl backdrop-saturate-150' : 'bg-transparent',
      )}
    >
      <div className="mx-auto flex h-16 max-w-screen-2xl items-center gap-8 px-6 lg:px-12">
        <NextLink
          href="/"
          aria-label={n.home}
          className="flex shrink-0 items-center gap-2.5 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-focus"
        >
          <AlfyMark className="size-6" />
          <span className="font-heading text-[15px] tracking-[-0.03em] text-foreground">AlfyChat</span>
        </NextLink>

        <nav className="hidden flex-1 items-center gap-1 md:flex">
          {links.map((l) => (
            <NextLink
              key={l.href}
              href={l.href}
              className={buttonVariants({ variant: 'ghost', size: 'sm', className: 'text-muted hover:text-foreground' })}
            >
              {l.label}
            </NextLink>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle label={n.theme} />

          {!isLoading && (
            user ? (
              <NextLink href="/channels/me" className={buttonVariants({ size: 'sm', className: 'hidden sm:inline-flex' })}>
                {n.openApp}
              </NextLink>
            ) : (
              <>
                <NextLink
                  href="/login"
                  className={buttonVariants({ variant: 'ghost', size: 'sm', className: 'hidden sm:inline-flex' })}
                >
                  {n.login}
                </NextLink>
                <NextLink href="/register" className={buttonVariants({ size: 'sm', className: 'hidden sm:inline-flex' })}>
                  {n.register}
                </NextLink>
              </>
            )
          )}

          <div className="md:hidden">
            <Drawer isOpen={menuOpen} onOpenChange={setMenuOpen}>
              <Button isIconOnly variant="ghost" size="sm" aria-label={n.menu}>
                <Menu className="size-4" aria-hidden />
              </Button>
              <Drawer.Backdrop variant="blur">
                <Drawer.Content placement="top">
                  <Drawer.Dialog>
                    <Drawer.CloseTrigger />
                    <Drawer.Header>
                      <Drawer.Heading className="flex items-center gap-2.5">
                        <AlfyMark className="size-5" />
                        <span className="font-heading text-sm">AlfyChat</span>
                      </Drawer.Heading>
                    </Drawer.Header>
                    <Drawer.Body>
                      <nav className="flex flex-col">
                        {links.map((l) => (
                          <NextLink
                            key={l.href}
                            href={l.href}
                            onClick={() => setMenuOpen(false)}
                            className={buttonVariants({ variant: 'ghost', fullWidth: true, className: 'justify-start text-base' })}
                          >
                            {l.label}
                          </NextLink>
                        ))}
                      </nav>
                    </Drawer.Body>
                    <Drawer.Footer className="flex-col gap-2">
                      {user ? (
                        <NextLink href="/channels/me" className={buttonVariants({ fullWidth: true })}>
                          {n.openApp}
                        </NextLink>
                      ) : (
                        <>
                          <NextLink href="/register" className={buttonVariants({ fullWidth: true })}>
                            {n.register}
                          </NextLink>
                          <NextLink href="/login" className={buttonVariants({ variant: 'tertiary', fullWidth: true })}>
                            {n.login}
                          </NextLink>
                        </>
                      )}
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

/** Bascule clair/sombre : les deux icônes se croisent en rotation douce. */
export function ThemeToggle({ label }: { label: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const dark = mounted && resolvedTheme === 'dark';

  return (
    <Button isIconOnly variant="ghost" size="sm" aria-label={label} onPress={() => setTheme(dark ? 'light' : 'dark')}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={dark ? 'moon' : 'sun'}
          initial={{ opacity: 0, rotate: -45, scale: 0.8 }}
          animate={{ opacity: 1, rotate: 0, scale: 1 }}
          exit={{ opacity: 0, rotate: 45, scale: 0.8 }}
          transition={{ duration: 0.2, ease: EASE }}
          className="flex"
        >
          {dark ? <Moon className="size-4" aria-hidden /> : <Sun className="size-4" aria-hidden />}
        </motion.span>
      </AnimatePresence>
    </Button>
  );
}
