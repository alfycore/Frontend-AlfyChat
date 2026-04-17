'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeftIcon,
  ZapIcon,
  GlobeIcon,
  UserIcon,
  MessageCircleIcon,
  UsersIcon,
  PhoneIcon,
  BotIcon,
  ServerIcon,
  WifiIcon,
  ImageIcon,
} from '@/components/icons';
import { useTranslation } from '@/components/locale-provider';

const monitors = [
  { slug: 'monitor-eu',       name: 'API Gateway',  Icon: GlobeIcon },
  { slug: 'monitor-su1',      name: 'Users',         Icon: UserIcon },
  { slug: 'monitor-sm1',      name: 'Messages',      Icon: MessageCircleIcon },
  { slug: 'monitor-sf1',      name: 'Friends',       Icon: UsersIcon },
  { slug: 'monitor-sc1',      name: 'Calls',         Icon: PhoneIcon },
  { slug: 'monitor-sb1',      name: 'Bots',          Icon: BotIcon },
  { slug: 'monitor-ss1',      name: 'Servers',       Icon: ServerIcon },
  { slug: 'monitor-ws',       name: 'WebSocket',     Icon: WifiIcon,  tall: true },
  { slug: 'monitor-media3to', name: 'Media',         Icon: ImageIcon },
] as const;

export default function StatusPage() {
  const { t } = useTranslation();
  const s = t.static.statusPage;
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    setTheme(mq.matches ? 'dark' : 'light');
    const handler = (e: MediaQueryListEvent) => setTheme(e.matches ? 'dark' : 'light');
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">

      {/* ── Header ── */}
      <header className="border-b border-border/40 bg-background/80 backdrop-blur-md sticky top-0 z-20">
        <div className="mx-auto max-w-5xl px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="grid place-items-center size-8 rounded-lg bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
            >
              <ArrowLeftIcon size={15} />
            </Link>
            <div className="h-5 w-px bg-border/60" />
            <div className="flex items-center gap-2">
              <ZapIcon size={17} className="text-primary" />
              <span className="font-semibold text-sm tracking-tight">AlfyChat Status</span>
            </div>
          </div>
          <a
            href="https://status.alfychat.app"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors hidden sm:block"
          >
            status.alfychat.app &nearr;
          </a>
        </div>
      </header>

      <main className="flex-1 mx-auto w-full max-w-5xl px-6 py-12 space-y-12">

        {/* ── Hero ── */}
        <div className="text-center space-y-3">
          <h1 className="text-4xl font-extrabold tracking-tight bg-linear-to-br from-foreground to-foreground/60 bg-clip-text text-transparent">
            {s.heading}
          </h1>
          <p className="text-muted-foreground text-sm max-w-md mx-auto leading-relaxed">
            {s.subtitle}
          </p>
        </div>

        {/* ── Incidents / maintenance ── */}
        <section className="space-y-3">
          <SectionHeader title={s.sectionIncidents} />
          <div className="rounded-2xl border border-border/40 overflow-hidden bg-card shadow-sm">
            <iframe
              src={`https://status.alfychat.app/embed/events/live?theme=${theme}&incidents=1&maintenance=1`}
              width="100%"
              height="420"
              frameBorder="0"
              allowFullScreen
            />
          </div>
        </section>

        {/* ── Monitors ── */}
        <section className="space-y-4">
          <SectionHeader title={s.sectionMonitors} />
          <div className="grid gap-3">
            {monitors.map(({ slug, name, Icon, ...rest }) => (
              <div
                key={slug}
                className="group rounded-2xl border border-border/40 bg-card shadow-sm hover:shadow-md hover:border-border/70 transition-all overflow-hidden"
              >
                <div className="flex items-center gap-2.5 px-5 pt-3.5 pb-1">
                  <Icon size={14} className="text-muted-foreground" />
                  <span className="text-[13px] font-semibold tracking-tight text-foreground/90">
                    {name}
                  </span>
                </div>
                <iframe
                  src={`https://status.alfychat.app/embed/${slug}?theme=${theme}&days=60`}
                  width="100%"
                  height={'tall' in rest ? '110' : '90'}
                  frameBorder="0"
                  allowFullScreen
                />
              </div>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground/40 text-center pt-1">
            {s.attribution}
          </p>
        </section>

      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-border/30">
        <div className="mx-auto max-w-5xl px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground/50">
          <div className="flex items-center gap-2 flex-wrap justify-center">
            <span>{s.footerBrand}</span>
            <span className="hidden sm:inline">&middot;</span>
            <span className="inline-flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-violet-500/70" /> Hostinger
            </span>
            <span className="hidden sm:inline">&middot;</span>
            <span className="inline-flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-sky-500/70" /> AlfyCore
            </span>
          </div>
          <div className="flex items-center gap-5">
            <Link href="/" className="hover:text-muted-foreground transition-colors">{s.navHome}</Link>
            <Link href="/app" className="hover:text-muted-foreground transition-colors">{s.navApp}</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-3">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground whitespace-nowrap">
        {title}
      </h2>
      <div className="h-px flex-1 bg-border/30" />
    </div>
  );
}

