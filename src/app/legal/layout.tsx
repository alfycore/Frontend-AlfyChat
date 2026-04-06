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
  { href: '/legal/cgu',      icon: FileTextIcon, label: "Conditions d\u2019utilisation" },
  { href: '/legal/privacy',  icon: ShieldIcon,   label: 'Confidentialit\u00e9' },
  { href: '/legal/mentions', icon: ScaleIcon,    label: 'Mentions l\u00e9gales' },
  { href: '/legal/cookies',  icon: LockIcon,     label: 'Cookies' },
];

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router   = useRouter();

  return (
    <div className="flex h-dvh flex-col bg-background">

      {/* Header — identique changelogs */}
      <header className="flex h-12 shrink-0 items-center gap-3 border-b border-border bg-background px-3">
        <Button
          variant="ghost" size="icon"
          className="size-7 shrink-0 text-muted-foreground hover:text-foreground"
          onClick={() => router.back()}
        >
          <ArrowLeftIcon size={15} />
        </Button>
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <ScaleIcon size={14} className="shrink-0 text-muted-foreground" />
          <span className="truncate text-[13px] font-semibold">Informations l\u00e9gales</span>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">

        {/* Sidebar — style nav developers */}
        <aside className="hidden w-52 shrink-0 flex-col border-r border-border bg-background px-2 py-3 md:flex">
          <p className="mb-1.5 px-2 text-[9px] font-bold uppercase tracking-widest text-muted-foreground/40">
            Documents
          </p>
          <nav className="space-y-0.5">
            {NAV.map(({ href, icon: Icon, label }) => {
              const active = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    'flex items-center gap-2 rounded-xl px-2.5 py-2 text-[13px] font-medium no-underline transition-all',
                    active
                      ? 'bg-accent/12 text-accent'
                      : 'text-muted-foreground/80 hover:bg-(--surface-secondary)/40 hover:text-foreground',
                  )}
                >
                  <Icon size={14} className="shrink-0" />
                  <span className="truncate">{label}</span>
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Contenu — prend toute la hauteur restante */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">

          {/* Tabs mobile */}
          <div className="flex gap-1 overflow-x-auto border-b border-border px-2 py-1.5 md:hidden">
            {NAV.map(({ href, icon: Icon, label }) => {
              const active = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    'flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-1.5 text-[12px] font-medium no-underline transition-all',
                    active
                      ? 'bg-accent/12 text-accent'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  <Icon size={12} />
                  {label}
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


