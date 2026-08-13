'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Button, Chip, Spinner, Tooltip } from '@heroui/react';
import {
  Activity, AlertOctagon, Award, BadgeCheck, Boxes, ChartNoAxesColumn, Compass,
  FileClock, FlaskConical, Gauge, Gavel, LifeBuoy, LogOut, Menu, Network, Scale, Server,
  Settings2, ShieldAlert, ShieldCheck, Users, X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { useAuth } from '@/hooks/use-auth';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/components/locale-provider';
import type { Translations } from '@/i18n/types';

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Correspondance stricte — réservé à la racine /admin. */
  exact?: boolean;
}

function buildNavGroups(t: Translations): { label: string; items: NavItem[] }[] {
  return [
    {
      label: t.admin.navGroups.pilotage,
      items: [
        { href: '/admin',            label: t.admin.nav.overview, icon: Gauge, exact: true },
        { href: '/admin/users',      label: t.admin.nav.users,    icon: Users },
        { href: '/admin/moderation', label: t.admin.nav.moderation, icon: Gavel },
      ],
    },
    {
      label: t.admin.navGroups.community,
      items: [
        { href: '/admin/badges',        label: t.admin.nav.badges,       icon: Award },
        { href: '/admin/server-badges', label: t.admin.nav.serverBadges, icon: BadgeCheck },
        { href: '/admin/discovery',     label: t.admin.nav.discovery,    icon: Compass },
      ],
    },
    {
      label: t.admin.navGroups.infrastructure,
      items: [
        { href: '/admin/monitoring',     label: t.admin.nav.monitoring,   icon: Activity },
        { href: '/admin/services',       label: t.admin.nav.services,     icon: Server },
        { href: '/admin/infrastructure', label: t.admin.nav.loadBalancer, icon: Network },
        { href: '/admin/hosting',        label: t.admin.nav.hosting,      icon: Boxes },
      ],
    },
    {
      label: t.admin.navGroups.platform,
      items: [
        { href: '/admin/status',     label: t.admin.nav.status,     icon: ChartNoAxesColumn },
        { href: '/admin/security',   label: t.admin.nav.security,   icon: ShieldAlert },
        { href: '/admin/changelogs', label: t.admin.nav.changelogs, icon: FileClock },
      ],
    },
    {
      label: t.admin.navGroups.support,
      items: [
        { href: '/admin/helpdesk', label: t.admin.nav.helpdesk,      icon: LifeBuoy },
        { href: '/admin/support',  label: t.admin.nav.supportContent, icon: Scale },
      ],
    },
    {
      label: t.admin.navGroups.configuration,
      items: [
        { href: '/admin/settings', label: t.admin.nav.settings, icon: Settings2 },
      ],
    },
    {
      // Outils internes réservés aux devs — pas de clé i18n, pas destiné aux autres rôles.
      label: 'Dev',
      items: [
        { href: '/admin/dev/emails', label: 'Emails', icon: FlaskConical },
      ],
    },
  ];
}

function isActive(item: NavItem, pathname: string): boolean {
  return item.exact ? pathname === item.href : pathname.startsWith(item.href);
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();
  const [navOpen, setNavOpen] = useState(false);
  const NAV_GROUPS = buildNavGroups(t);
  const ALL_ITEMS = NAV_GROUPS.flatMap((g) => g.items);

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
          <p className="font-heading text-base text-foreground">{t.admin.accessDenied.title}</p>
          <p className="mt-1.5 text-sm text-muted">
            {t.admin.accessDenied.desc}
          </p>
          <Button className="mt-5 w-full" variant="secondary" onPress={() => router.push('/channels/me')}>
            {t.admin.accessDenied.btn}
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
          aria-label={t.admin.shell.ariaCloseNav}
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
            <p className="font-heading text-[13px] leading-none text-foreground">{t.admin.sidebar.appName}</p>
            <p className="mt-1 text-[10px] tracking-wide text-muted uppercase">{t.admin.shell.consoleLabel}</p>
          </div>
          <Button
            size="sm"
            variant="ghost"
            isIconOnly
            aria-label={t.common.close}
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
            <p className="text-[10px] text-muted">{t.admin.sidebar.role}</p>
          </div>
          <Tooltip>
            <Button
              size="sm"
              variant="ghost"
              isIconOnly
              aria-label={t.admin.shell.ariaLeaveConsole}
              onPress={() => router.push('/channels/me')}
            >
              <LogOut className="size-3.5" aria-hidden />
            </Button>
            <Tooltip.Content>{t.admin.shell.ariaLeaveConsole}</Tooltip.Content>
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
            aria-label={t.admin.shell.ariaOpenNav}
            className="lg:hidden"
            onPress={() => setNavOpen(true)}
          >
            <Menu className="size-4.5" aria-hidden />
          </Button>

          <nav aria-label={t.admin.shell.ariaBreadcrumb} className="flex min-w-0 items-center gap-1.5 text-sm">
            <span className="text-muted">{t.admin.shell.breadcrumbRoot}</span>
            {current && current.href !== '/admin' && (
              <>
                <span className="text-separator" aria-hidden>/</span>
                <span className="truncate font-medium text-foreground">{current.label}</span>
              </>
            )}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <Chip size="sm" variant="soft" color="success" className="hidden sm:inline-flex">
              <Chip.Label>{t.admin.shell.productionChip}</Chip.Label>
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
