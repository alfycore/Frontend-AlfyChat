'use client';

/**
 * Barre de navigation dev de l'atelier /uitest : bascule entre les écrans
 * mock + toggle dark/light. Retirée au rebranchage sur /channels.
 */

import { Button, Tooltip } from '@heroui/react';
import { Moon, Sun } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

import { cn } from '@/lib/utils';

const SCREENS = [
  { href: '/uitest', label: 'Index' },
  { href: '/uitest/app', label: 'App' },
  { href: '/uitest/views', label: 'Salons+' },
  { href: '/uitest/discover', label: 'Découvrir' },
  { href: '/uitest/call', label: 'Appels' },
  { href: '/uitest/settings/server', label: 'Serveur' },
  { href: '/uitest/settings/user', label: 'Compte' },
  { href: '/uitest/node', label: 'Node' },
  { href: '/uitest/dev', label: 'Dev' },
  { href: '/uitest/auth/login', label: 'Auth' },
  { href: '/uitest/onboarding', label: 'Onboarding' },
  { href: '/uitest/landing', label: 'Landing' },
  { href: '/uitest/status', label: 'Statut' },
  { href: '/uitest/changelogs', label: 'Changelog' },
];

export function UitestSwitcher() {
  const pathname = usePathname();
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <nav
      aria-label="Écrans de l'atelier"
      className="flex h-9 shrink-0 items-center gap-0.5 overflow-x-auto border-b border-separator bg-surface px-2"
    >
      <span className="mr-2 text-[11px] font-semibold tracking-wider text-muted uppercase select-none">
        uitest
      </span>
      {SCREENS.map((s) => {
        const active = pathname === s.href;
        return (
          <Link
            key={s.href}
            href={s.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'rounded-sm px-2 py-1 text-xs whitespace-nowrap transition-colors',
              active
                ? 'bg-surface-tertiary font-medium text-foreground'
                : 'text-muted hover:bg-surface-secondary hover:text-foreground',
            )}
          >
            {s.label}
          </Link>
        );
      })}
      <div className="ml-auto">
        <Tooltip delay={300}>
          <Button
            isIconOnly
            size="sm"
            variant="ghost"
            aria-label="Basculer le thème"
            onPress={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
          >
            {mounted && resolvedTheme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </Button>
          <Tooltip.Content>
            <p>Basculer clair / sombre</p>
          </Tooltip.Content>
        </Tooltip>
      </div>
    </nav>
  );
}
