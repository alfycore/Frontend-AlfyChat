'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  BarChart3Icon, UsersIcon, AwardIcon, ServerIcon, CompassIcon,
  CheckCircle2Icon, ShieldAlertIcon, FileTextIcon, SettingsIcon,
  ShieldIcon, XIcon, MenuIcon, ShieldCheckIcon,
} from '@/components/icons';
import { useAuth } from '@/hooks/use-auth';

const NAV_GROUPS = [
  {
    label: 'Général',
    items: [
      { href: '/admin',               label: "Vue d'ensemble",  icon: BarChart3Icon,   exact: true  },
      { href: '/admin/users',         label: 'Utilisateurs',    icon: UsersIcon,       exact: false },
      { href: '/admin/badges',        label: 'Badges',          icon: AwardIcon,       exact: false },
      { href: '/admin/server-badges', label: 'Badges serveurs', icon: ServerIcon,      exact: false },
      { href: '/admin/discovery',     label: 'Découverte',      icon: CompassIcon,     exact: false },
    ],
  },
  {
    label: 'Infrastructure',
    items: [
      { href: '/admin/monitoring',     label: 'Monitoring',     icon: BarChart3Icon,   exact: false },
      { href: '/admin/services',       label: 'Services',       icon: ServerIcon,      exact: false },
      { href: '/admin/infrastructure', label: 'Load Balancer',  icon: ServerIcon,      exact: false },
    ],
  },
  {
    label: 'Plateforme',
    items: [
      { href: '/admin/status',    label: 'Status public', icon: CheckCircle2Icon, exact: false },
      { href: '/admin/security',  label: 'Sécurité',      icon: ShieldAlertIcon,  exact: false },
      { href: '/admin/changelogs',label: 'Changelogs',    icon: FileTextIcon,     exact: false },
    ],
  },
  {
    label: 'Support',
    items: [
      { href: '/admin/helpdesk', label: 'Helpdesk',     icon: ShieldCheckIcon, exact: false },
      { href: '/admin/support',  label: "Centre d'aide", icon: FileTextIcon,   exact: false },
    ],
  },
  {
    label: 'Configuration',
    items: [
      { href: '/admin/settings', label: 'Paramètres', icon: SettingsIcon, exact: false },
    ],
  },
] as const;

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (user && user.role !== 'admin') router.push('/channels/me');
  }, [user]);

  if (!user) return (
    <div className="flex h-screen items-center justify-center bg-background">
      <div className="size-7 animate-spin rounded-full border-[3px] border-primary border-t-transparent" />
    </div>
  );
  if (user.role !== 'admin') return null;

  const allItems = NAV_GROUPS.flatMap(g => g.items);
  const activeItem = allItems.find(n =>
    n.exact ? pathname === n.href : pathname.startsWith(n.href)
  );

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      {open && (
        <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={() => setOpen(false)} />
      )}

      {/* ── Sidebar ── */}
      <aside className={[
        'fixed inset-y-0 left-0 z-40 flex h-screen w-56 shrink-0 flex-col',
        'border-r border-border bg-background',
        'transition-transform duration-200 ease-out lg:static lg:translate-x-0',
        open ? 'translate-x-0' : '-translate-x-full',
      ].join(' ')}>

        {/* Brand */}
        <div className="flex h-14 shrink-0 items-center gap-3 border-b border-border px-4">
          <div className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <ShieldIcon className="size-3.5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold leading-none">AlfyChat</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Administration</p>
          </div>
          <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground lg:hidden">
            <XIcon className="size-4" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3">
          {NAV_GROUPS.map(group => (
            <div key={group.label} className="mb-1 px-2">
              <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                {group.label}
              </p>
              {group.items.map(({ href, label, icon: Icon, exact }) => {
                const active = exact ? pathname === href : pathname.startsWith(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setOpen(false)}
                    className={[
                      'group relative flex items-center gap-2.5 rounded-md px-3 py-2 text-sm',
                      'transition-all duration-100',
                      active
                        ? 'bg-primary/10 font-medium text-foreground'
                        : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                    ].join(' ')}
                  >
                    {active && (
                      <span className="absolute inset-y-1.5 left-0 w-0.75 rounded-r-full bg-primary" />
                    )}
                    <Icon className={[
                      'size-4 shrink-0 transition-colors',
                      active ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground',
                    ].join(' ')} />
                    <span className="truncate">{label}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* User footer */}
        <div className="flex items-center gap-2.5 border-t border-border px-3 py-3">
          <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-[11px] font-bold text-primary">
            {user.displayName?.[0]?.toUpperCase() ?? '?'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium">{user.displayName}</p>
            <p className="text-[10px] text-muted-foreground">Administrateur</p>
          </div>
          <button
            onClick={() => router.push('/channels/me')}
            title="Quitter"
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            <XIcon className="size-3.5" />
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="flex flex-1 min-w-0 flex-col overflow-hidden">
        <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur sm:px-6">
          <button onClick={() => setOpen(true)} className="text-muted-foreground hover:text-foreground lg:hidden">
            <MenuIcon className="size-5" />
          </button>
          <div className="flex items-center gap-1.5 text-sm">
            <span className="text-muted-foreground">Admin</span>
            {activeItem && activeItem.href !== '/admin' && (
              <>
                <span className="text-border">/</span>
                <span className="font-medium text-foreground">{activeItem.label}</span>
              </>
            )}
          </div>
        </header>
        <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
