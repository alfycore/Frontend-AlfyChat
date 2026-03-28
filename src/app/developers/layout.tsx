'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  BotIcon, BookOpenIcon, KeyIcon, ZapIcon, CodeIcon, ServerIcon,
  TerminalIcon, ShieldCheckIcon, TagIcon, ArrowLeftIcon,
  GlobeIcon, WifiIcon, AlertTriangleIcon, LockIcon,
  MessageCircleIcon, UserPlusIcon, PlusIcon,
} from '@/components/icons';
import { useAuth } from '@/hooks/use-auth';
import { Button, Separator } from '@heroui/react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

type NavItem = { href: string; icon: React.ComponentType<{ size?: number; className?: string }>; label: string };
type NavSection = { label: string; items: NavItem[] };

const NAV_SECTIONS: NavSection[] = [
  {
    label: 'BOTS ALFYCHAT',
    items: [
      { href: '/developers/docs/bots-introduction',   icon: BotIcon,          label: 'Introduction' },
      { href: '/developers/docs/bots-creation',       icon: PlusIcon,         label: 'Créer un Bot' },
      { href: '/developers/docs/bots-auth',           icon: KeyIcon,          label: 'Authentification' },
      { href: '/developers/docs/bots-messages',       icon: MessageCircleIcon,label: 'Envoyer des messages' },
      { href: '/developers/docs/bots-commands',       icon: TerminalIcon,     label: 'Commandes' },
      { href: '/developers/docs/bots-permissions',    icon: ShieldCheckIcon,  label: 'Permissions' },
      { href: '/developers/docs/bots-certification',  icon: TagIcon,          label: 'Certification' },
    ],
  },
  {
    label: 'GATEWAY API',
    items: [
      { href: '/developers/docs/gateway-overview',    icon: GlobeIcon,        label: 'Vue d\'ensemble' },
      { href: '/developers/docs/gateway-auth',        icon: LockIcon,         label: 'Authentification' },
      { href: '/developers/docs/gateway-rest',        icon: CodeIcon,         label: 'Référence REST' },
      { href: '/developers/docs/gateway-websocket',   icon: WifiIcon,         label: 'WebSocket' },
      { href: '/developers/docs/gateway-events',      icon: ZapIcon,          label: 'Événements' },
      { href: '/developers/docs/gateway-limits',      icon: AlertTriangleIcon,label: 'Limites & Erreurs' },
    ],
  },
  {
    label: 'DÉVELOPPEMENT',
    items: [
      { href: '/developers/bots', icon: BotIcon, label: 'Mes Bots' },
    ],
  },
];

export default function DevelopersLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoading: authLoading } = useAuth();

  useEffect(() => {
    if (authLoading) return;
    if (!user) router.push('/login');
  }, [user, authLoading, router]);

  if (authLoading || !user) return null;

  return (
    <div data-no-wallpaper className="flex min-h-screen text-foreground">
      {/* ── Sidebar ── */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-border/40 bg-[var(--bg-solid)] md:flex overflow-y-auto">
        {/* Logo */}
        <div className="flex items-center gap-2 border-b border-border/60 px-4 py-4 shrink-0">
          <Link href="/" className="flex items-center gap-2 no-underline">
            <img src="/logo/Alfychat.svg" alt="AlfyChat" width={20} height={20} />
            <span className="font-[family-name:var(--font-krona)] text-xs text-foreground">AlfyChat</span>
          </Link>
          <Separator orientation="vertical" className="mx-1 h-4" />
          <span className="text-[11px] font-bold text-accent">Devs</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-3">
          {NAV_SECTIONS.map((section, si) => (
            <div key={section.label} className={cn('mb-5', si > 0 && 'mt-1')}>
              <p className="mb-1.5 px-2 text-[9px] font-bold uppercase tracking-widest text-muted/40">
                {section.label}
              </p>
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const active = pathname === item.href || pathname.startsWith(item.href + '/');
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        'flex items-center gap-2 rounded-xl px-2.5 py-2 text-[13px] font-medium transition-all no-underline',
                        active
                          ? 'bg-accent/12 text-accent'
                          : 'text-muted/80 hover:bg-surface hover:text-foreground',
                      )}
                    >
                      <item.icon size={14} className="shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="border-t border-border/60 p-2 shrink-0">
          <Button
            size="sm"
            variant="ghost"
            className="w-full justify-start gap-2 text-xs text-muted"
            onPress={() => router.push('/channels/me')}
          >
            <ArrowLeftIcon size={13} />
            Retour à l&apos;app
          </Button>
        </div>
      </aside>

      {/* ── Mobile header ── */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex items-center gap-3 border-b border-border/40 bg-[var(--bg-solid)] px-4 py-3 md:hidden">
          <Link href="/" className="flex items-center gap-1.5 no-underline">
            <img src="/logo/Alfychat.svg" alt="AlfyChat" width={18} height={18} />
          </Link>
          <div className="flex flex-1 gap-1 overflow-x-auto">
            {NAV_SECTIONS.flatMap((s) => s.items).map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex shrink-0 items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-medium no-underline',
                  pathname === item.href || pathname.startsWith(item.href)
                    ? 'bg-accent/12 text-accent'
                    : 'text-muted hover:text-foreground',
                )}
              >
                <item.icon size={12} />
                {item.label}
              </Link>
            ))}
          </div>
          <Button size="sm" variant="ghost" isIconOnly onPress={() => router.push('/channels/me')}>
            <ArrowLeftIcon size={14} />
          </Button>
        </header>

        {/* ── Main content ── */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
