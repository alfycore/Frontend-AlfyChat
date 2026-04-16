'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';

const NAV_ITEMS = [
  {
    href: '/channels/hosting',
    label: 'Marketplace',
    icon: 'shop',
    description: 'Parcourir les offres',
    exact: true,
  },
  {
    href: '/channels/hosting/panel',
    label: 'Mon panel',
    icon: 'server',
    description: 'Gérer mes nœuds & offres',
    exact: false,
  },
  {
    href: '/channels/hosting/panel/register',
    label: 'Devenir hébergeur',
    icon: 'person-plus-fill',
    description: "S'inscrire comme partenaire",
    exact: true,
  },
  {
    href: '/channels/hosting/subscriptions',
    label: 'Mes abonnements',
    icon: 'receipt',
    description: 'Abonnements & historique',
    exact: true,
  },
];

function HostingSidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col border-r border-border bg-card">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border px-4 py-4">
        <div className="flex size-9 items-center justify-center rounded-xl bg-indigo-600/20">
          <i className="bi bi-server text-indigo-400 text-base" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">Hébergement</p>
          <p className="text-[11px] text-muted-foreground">Stockage partenaire</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {NAV_ITEMS.map((item) => {
          const isActive = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors group ${
                isActive
                  ? 'bg-indigo-600/15 text-indigo-300'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              }`}
            >
              <i
                className={`bi bi-${item.icon} text-base shrink-0 ${
                  isActive ? 'text-indigo-400' : 'text-muted-foreground group-hover:text-foreground'
                }`}
              />
              <div className="min-w-0">
                <p className="text-[13px] font-medium leading-tight truncate">{item.label}</p>
                <p className="text-[11px] text-muted-foreground truncate">{item.description}</p>
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Quick actions footer */}
      <div className="border-t border-border p-3 space-y-1.5">
        <p className="px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
          Accès rapide
        </p>
        <Link
          href="/channels/hosting/panel/register"
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-[12px] font-medium text-indigo-300 hover:bg-indigo-600/10 transition-colors"
        >
          <i className="bi bi-person-plus-fill shrink-0" />
          S'inscrire hébergeur
        </Link>
        <Link
          href="/channels/hosting/panel"
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-[12px] font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        >
          <i className="bi bi-layout-sidebar shrink-0" />
          Ouvrir le panel
        </Link>
        <Link
          href="/channels/hosting/subscriptions"
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-[12px] font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        >
          <i className="bi bi-receipt shrink-0" />
          Voir mes abonnements
        </Link>
      </div>
    </aside>
  );
}

export default function HostingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      {/* Sidebar desktop */}
      <div className="hidden md:flex">
        <HostingSidebar />
      </div>

      {/* Contenu principal */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Barre de nav mobile */}
        <div className="flex gap-1 overflow-x-auto border-b border-border bg-card px-3 py-2 md:hidden">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors whitespace-nowrap"
            >
              <i className={`bi bi-${item.icon}`} />
              {item.label}
            </Link>
          ))}
        </div>

        {/* Page */}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
}
