'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { LogInIcon, MenuIcon, XIcon, MessageCircleIcon } from '@/components/icons';
import { cn } from '@/lib/utils';

const NAV_LINKS = [
  { label: 'Fonctionnalités', href: '/#features' },
  { label: 'Sécurité',        href: '/#security' },
  { label: 'Développeurs',    href: '/developers' },
  { label: 'À propos',        href: '/about' },
];

export function SiteNavbar({ links = NAV_LINKS }: { links?: { label: string; href: string }[] }) {
  const { user, isLoading } = useAuth();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const isActive = (href: string) =>
    href.startsWith('/#') ? pathname === '/' : pathname.startsWith(href.split('#')[0]);

  const AuthArea = () => {
    if (isLoading) return <div className="size-7 rounded-full bg-muted/40 animate-pulse" />;

    if (user) {
      const initials = (user.displayName || user.username || '?')
        .split(' ')
        .map((w) => w[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();

      return (
        <Link
          href="/channels/me"
          className="flex items-center gap-2 rounded-xl px-2 py-1 hover:bg-muted/60 transition-colors group"
          title="Ouvrir AlfyChat"
        >
          <Avatar size="sm" className="size-7 ring-2 ring-primary/30 group-hover:ring-primary/60 transition-all">
            {user.avatarUrl && <AvatarImage src={user.avatarUrl} alt={user.displayName || user.username} />}
            <AvatarFallback className="text-[10px] font-bold bg-primary/20 text-primary">
              {initials}
            </AvatarFallback>
          </Avatar>
          <span className="hidden sm:block text-[13px] font-medium text-foreground/90 max-w-30 truncate group-hover:text-foreground transition-colors">
            {user.displayName || user.username}
          </span>
          <MessageCircleIcon size={12} className="hidden sm:block text-muted-foreground/60 group-hover:text-primary transition-colors" />
        </Link>
      );
    }

    return (
      <div className="flex items-center gap-1.5">
        <Link href="/login">
          <Button variant="ghost" size="sm" className="text-[13px]">Connexion</Button>
        </Link>
        <Link href="/register">
          <Button size="sm" className="text-[13px]">Créer un compte</Button>
        </Link>
      </div>
    );
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 font-heading text-sm shrink-0">
          <img src="/logo/Alfychat.svg" alt="AlfyChat" className="size-5" />
          ALFYCHAT
        </Link>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-0.5">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm transition-colors',
                isActive(l.href)
                  ? 'text-foreground font-medium'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/40',
              )}
            >
              {l.label}
            </Link>
          ))}
        </div>

        {/* Auth + mobile toggle */}
        <div className="flex items-center gap-2">
          <AuthArea />
          <button
            className="md:hidden ml-1 grid place-items-center size-8 rounded-lg hover:bg-muted/50 transition-colors text-muted-foreground"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Menu"
          >
            {menuOpen ? <XIcon size={16} /> : <MenuIcon size={16} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-border/40 bg-background/95 backdrop-blur-xl px-6 pb-4 pt-3 space-y-1">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setMenuOpen(false)}
              className={cn(
                'block rounded-lg px-3 py-2 text-sm transition-colors',
                isActive(l.href)
                  ? 'bg-muted text-foreground font-medium'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/40',
              )}
            >
              {l.label}
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
}
