'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Button, Chip, Spinner, Tooltip } from '@heroui/react';
import {
  Activity, AlertOctagon, Award, BadgeCheck, Boxes, ChartNoAxesColumn, Compass,
  FileClock, Gauge, Gavel, LifeBuoy, LogOut, Menu, Network, Scale, Server,
  Settings2, ShieldAlert, ShieldCheck, Users, X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { useAuth } from '@/hooks/use-auth';
import { cn } from '@/lib/utils';

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Correspondance stricte — réservé à la racine /admin. */
  exact?: boolean;
}

const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: 'Pilotage',
    items: [
      { href: '/admin',            label: "Vue d'ensemble", icon: Gauge, exact: true },
      { href: '/admin/users',      label: 'Utilisateurs',   icon: Users },
      { href: '/admin/moderation', label: 'Modération',     icon: Gavel },
    ],
  },
  {
    label: 'Communauté',
    items: [
      { href: '/admin/badges',        label: 'Badges',          icon: Award },
      { href: '/admin/server-badges', label: 'Badges serveurs', icon: BadgeCheck },
      { href: '/admin/discovery',     label: 'Découverte',      icon: Compass },
    ],
  },
  {
    label: 'Infrastructure',
    items: [
      { href: '/admin/monitoring',     label: 'Monitoring',    icon: Activity },
      { href: '/admin/services',       label: 'Services',      icon: Server },
      { href: '/admin/infrastructure', label: 'Load balancer', icon: Network },
      { href: '/admin/hosting',        label: 'Hébergement',   icon: Boxes },
    ],
  },
  {
    label: 'Plateforme',
    items: [
      { href: '/admin/status',     label: 'Status public', icon: ChartNoAxesColumn },
      { href: '/admin/security',   label: 'Sécurité',      icon: ShieldAlert },
      { href: '/admin/changelogs', label: 'Changelogs',    icon: FileClock },
    ],
  },
  {
    label: 'Assistance',
    items: [
      { href: '/admin/helpdesk', label: 'Helpdesk',      icon: LifeBuoy },
      { href: '/admin/support',  label: "Centre d'aide", icon: Scale },
    ],
  },
  {
    label: 'Configuration',
    items: [
      { href: '/admin/settings', label: 'Paramètres', icon: Settings2 },
    ],
  },
];

const ALL_ITEMS = NAV_GROUPS.flatMap((g) => g.items);

function isActive(item: NavItem, pathname: string): boolean {
  return item.exact ? pathname === item.href : pathname.startsWith(item.href);
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();
  const [navOpen, setNavOpen] = useState(false);

  // Le rail mobile ne doit pas rester ouvert après une navigation
  useEffect(() => setNavOpen(false), [pathname]);

  // Renvoi hors de la console dès que le rôle n'est plus administrateur
  useEffect(() => {
    if (user && user.role !== 'admin') router.replace('/channels/me');
  }, [user, router]);

  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Spinner size="lg" />
      </div>
    );
  }

  if (user.role !== 'admin') {
    return (
      <div className="flex h-screen items-center justify-center bg-background px-6">
        <div className="max-w-sm rounded-lg border border-border bg-surface p-6 text-center">
          <span className="mx-auto mb-3 flex size-11 items-center justify-center rounded-full bg-danger/12">
            <AlertOctagon className="size-5 text-danger" aria-hidden />
          </span>
          <p className="font-heading text-base text-foreground">Accès refusé</p>
          <p className="mt-1.5 text-sm text-muted">
            La console d&apos;administration est réservée aux administrateurs.
          </p>
          <Button className="mt-5 w-full" variant="secondary" onPress={() => router.push('/channels/me')}>
            Retour à l&apos;application
          </Button>
        </div>
      </div>
    );
  }

  const current = ALL_ITEMS.filter((i) => isActive(i, pathname)).sort(
    (a, b) => b.href.length - a.href.length,
  )[0];

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      {/* Voile mobile */}
      {navOpen && (
        <button
          type="button"
          aria-label="Fermer la navigation"
          onClick={() => setNavOpen(false)}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-[2px] lg:hidden"
        />
      )}

      {/* ── Rail de navigation ── */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-60 shrink-0 flex-col border-r border-separator bg-surface',
          'transition-transform duration-300 ease-out lg:static lg:translate-x-0',
          navOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {/* Marque */}
        <div className="flex h-14 shrink-0 items-center gap-2.5 border-b border-separator px-4">
          <span className="flex size-7 items-center justify-center rounded-md bg-accent text-accent-foreground">
            <ShieldCheck className="size-4" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-heading text-[13px] leading-none text-foreground">AlfyChat</p>
            <p className="mt-1 text-[10px] tracking-wide text-muted uppercase">Console admin</p>
          </div>
          <Button
            size="sm"
            variant="ghost"
            isIconOnly
            aria-label="Fermer"
            className="lg:hidden"
            onPress={() => setNavOpen(false)}
          >
            <X className="size-4" aria-hidden />
          </Button>
        </div>

        {/* Sections */}
        <nav className="flex-1 overflow-y-auto py-3">
          {NAV_GROUPS.map((group) => (
            <div key={group.label} className="mb-3 px-2 last:mb-0">
              <p className="mb-1 px-3 text-[10px] font-semibold tracking-[0.08em] text-muted/70 uppercase">
                {group.label}
              </p>
              {group.items.map((item) => {
                const active = isActive(item, pathname);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'group relative flex items-center gap-2.5 rounded-md px-3 py-2 text-sm',
                      'transition-colors duration-150',
                      active
                        ? 'bg-accent/10 font-medium text-foreground'
                        : 'text-muted hover:bg-surface-secondary hover:text-foreground',
                    )}
                  >
                    {/* Repère d'onglet actif */}
                    <span
                      className={cn(
                        'absolute inset-y-1.5 left-0 w-[2px] rounded-r-full bg-accent',
                        'origin-center transition-transform duration-200',
                        active ? 'scale-y-100' : 'scale-y-0',
                      )}
                      aria-hidden
                    />
                    <Icon
                      className={cn(
                        'size-4 shrink-0 transition-colors',
                        active ? 'text-accent' : 'text-muted group-hover:text-foreground',
                      )}
                      aria-hidden
                    />
                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Compte */}
        <div className="flex shrink-0 items-center gap-2.5 border-t border-separator px-3 py-3">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-accent/15 text-[11px] font-bold text-accent">
            {user.displayName?.[0]?.toUpperCase() ?? '?'}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium">{user.displayName}</p>
            <p className="text-[10px] text-muted">Administrateur</p>
          </div>
          <Tooltip>
            <Button
              size="sm"
              variant="ghost"
              isIconOnly
              aria-label="Quitter la console"
              onPress={() => router.push('/channels/me')}
            >
              <LogOut className="size-3.5" aria-hidden />
            </Button>
            <Tooltip.Content>Quitter la console</Tooltip.Content>
          </Tooltip>
        </div>
      </aside>

      {/* ── Zone principale ── */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-separator bg-surface/80 px-4 backdrop-blur-md sm:px-6">
          <Button
            size="sm"
            variant="ghost"
            isIconOnly
            aria-label="Ouvrir la navigation"
            className="lg:hidden"
            onPress={() => setNavOpen(true)}
          >
            <Menu className="size-4.5" aria-hidden />
          </Button>

          <nav aria-label="Fil d'ariane" className="flex min-w-0 items-center gap-1.5 text-sm">
            <span className="text-muted">Admin</span>
            {current && current.href !== '/admin' && (
              <>
                <span className="text-separator" aria-hidden>/</span>
                <span className="truncate font-medium text-foreground">{current.label}</span>
              </>
            )}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <Chip size="sm" variant="soft" color="success" className="hidden sm:inline-flex">
              <Chip.Label>Production</Chip.Label>
            </Chip>
          </div>
        </header>

        {/* La clé sur la route rejoue l'apparition à chaque changement de section */}
        <main
          key={pathname}
          className="admin-fade-in flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8"
        >
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
