'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  FileTextIcon,
  ShieldIcon,
  LockIcon,
  ArrowLeftIcon,
  ScaleIcon,
} from '@/components/icons';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const NAV = [
  { href: '/legal/cgu',      icon: FileTextIcon, label: "Conditions d'utilisation", desc: "CGU" },
  { href: '/legal/privacy',  icon: ShieldIcon,   label: 'Confidentialité',          desc: "RGPD" },
  { href: '/legal/mentions', icon: ScaleIcon,    label: 'Mentions légales',         desc: "Légal" },
  { href: '/legal/cookies',  icon: LockIcon,     label: 'Cookies',                  desc: "Cookies" },
];

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router   = useRouter();

  return (
    <div className="flex h-dvh flex-col bg-background">

      {/* Header */}
      <header className="flex h-12 shrink-0 items-center gap-3 border-b bg-background/80 px-3 backdrop-blur-sm">
        <Button
          variant="ghost" size="icon"
          className="size-7 shrink-0 text-muted-foreground hover:text-foreground"
          onClick={() => router.back()}
        >
          <ArrowLeftIcon size={15} />
        </Button>
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <div className="flex size-5 items-center justify-center rounded-md bg-accent/10">
            <ScaleIcon size={12} className="text-accent" />
          </div>
          <span className="truncate text-[13px] font-semibold">Informations légales</span>
        </div>
        <Link href="/" className="hidden items-center gap-1.5 md:flex">
          <img src="/logo/Alfychat.svg" alt="" className="size-4" />
          <span className="font-(family-name:--font-krona) text-[10px] text-muted-foreground hover:text-foreground transition-colors">
            ALFYCHAT
          </span>
        </Link>
      </header>

      <div className="flex min-h-0 flex-1">

        {/* Sidebar */}
        <aside className="hidden w-56 shrink-0 flex-col border-r bg-background px-2 py-4 md:flex">
          <p className="mb-2 px-2.5 text-[9px] font-bold uppercase tracking-widest text-muted-foreground/40">
            Documents
          </p>
          <nav className="space-y-0.5">
            {NAV.map(({ href, icon: Icon, label, desc }) => {
              const active = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    'flex items-center gap-2.5 rounded-xl px-2.5 py-2.5 text-[13px] font-medium no-underline transition-all',
                    active
                      ? 'bg-accent/10 text-accent'
                      : 'text-muted-foreground hover:bg-muted/40 hover:text-foreground',
                  )}
                >
                  <div className={cn(
                    'flex size-6 shrink-0 items-center justify-center rounded-lg transition-colors',
                    active ? 'bg-accent/15 text-accent' : 'bg-muted/40 text-muted-foreground',
                  )}>
                    <Icon size={13} />
                  </div>
                  <span className="truncate">{label}</span>
                  {active && (
                    <span className="ml-auto rounded-full bg-accent/15 px-1.5 py-0.5 text-[9px] font-bold text-accent">
                      {desc}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Footer sidebar */}
          <div className="mt-auto px-2">
            <div className="rounded-xl border border-border/30 bg-muted/20 p-3 text-[11px] text-muted-foreground/60">
              <p className="font-medium text-muted-foreground">AlfyCore</p>
              <p className="mt-0.5">Association loi 1901 · France 🇫🇷</p>
            </div>
          </div>
        </aside>

        {/* Contenu */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">

          {/* Tabs mobile */}
          <div className="flex gap-1 overflow-x-auto border-b px-2 py-1.5 md:hidden">
            {NAV.map(({ href, icon: Icon, desc }) => {
              const active = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    'flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-1.5 text-[12px] font-medium no-underline transition-all',
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
    </div>
  );
}
