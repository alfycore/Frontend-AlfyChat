'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  FileTextIcon,
  ShieldIcon,
  LockIcon,
  ScaleIcon,
} from '@/components/icons';
import { cn } from '@/lib/utils';
import { LandingNavbar } from '@/components/site-navbar';
import { SiteFooter } from '@/components/site-footer';

const NAV = [
  { href: '/legal/cgu',      icon: FileTextIcon, label: "Conditions d'utilisation", desc: 'CGU' },
  { href: '/legal/privacy',  icon: ShieldIcon,   label: 'Confidentialité',          desc: 'RGPD' },
  { href: '/legal/mentions', icon: ScaleIcon,    label: 'Mentions légales',         desc: 'Légal' },
  { href: '/legal/cookies',  icon: LockIcon,     label: 'Cookies',                  desc: 'Cookies' },
];

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <LandingNavbar />

      <div className="flex min-h-0 flex-1 pt-20">

        {/* ── Sidebar ── */}
        <aside className="hidden w-60 shrink-0 flex-col border-r border-border/60 px-3 py-6 md:flex">
          <p className="mb-3 px-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/40">
            Documents légaux
          </p>
          <nav className="space-y-1">
            {NAV.map(({ href, icon: Icon, label, desc }) => {
              const active = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium no-underline transition-colors',
                    active
                      ? 'bg-accent/10 text-accent'
                      : 'text-muted-foreground hover:bg-muted/40 hover:text-foreground',
                  )}
                >
                  {/* Barre active */}
                  {active && (
                    <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-accent" />
                  )}
                  <Icon size={15} className={active ? 'text-accent' : 'text-muted-foreground/70'} />
                  <span className="truncate">{label}</span>
                  <span
                    className={cn(
                      'ml-auto text-[10px] font-semibold tabular-nums',
                      active ? 'text-accent/70' : 'text-muted-foreground/30',
                    )}
                  >
                    {desc}
                  </span>
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto rounded-xl border border-border/40 bg-card/40 p-3 text-[11px] leading-relaxed text-muted-foreground/70">
            <p className="font-semibold text-foreground/80">AlfyCore</p>
            <p className="mt-0.5">Association loi 1901 · France 🇫🇷</p>
          </div>
        </aside>

        {/* ── Contenu ── */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">

          {/* Tabs mobile */}
          <div className="flex gap-1.5 overflow-x-auto border-b border-border/60 px-3 py-2 md:hidden">
            {NAV.map(({ href, icon: Icon, desc }) => {
              const active = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-medium no-underline transition-colors',
                    active
                      ? 'bg-accent/10 text-accent'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  <Icon size={12} />
                  {desc}
                </Link>
              );
            })}
          </div>

          {children}
        </div>
      </div>

      <SiteFooter />
    </div>
  );
}
