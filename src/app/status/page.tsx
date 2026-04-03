'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeftIcon, ZapIcon } from '@/components/icons';

// --- Main page ----------------------------------------------------------------

export default function StatusPage() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    setTheme(mq.matches ? 'dark' : 'light');
    const handler = (e: MediaQueryListEvent) => setTheme(e.matches ? 'dark' : 'light');
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const bg = theme === 'dark' ? 'bg-zinc-900' : 'bg-white';

  return (
    <div className="min-h-screen bg-background text-foreground">

      {/* -- Header -- */}
      <header className="border-b border-border/50 bg-background/80 sticky top-0 z-10">
        <div className="mx-auto max-w-4xl px-4 py-3 flex items-center">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeftIcon size={16} />
            </Link>
            <div className="h-4 w-px bg-border" />
            <div className="flex items-center gap-2">
              <ZapIcon size={18} className="text-primary" />
              <span className="font-semibold text-sm">AlfyChat Status</span>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-10 space-y-8">

        {/* -- Hero -- */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">�tat des services</h1>
          <p className="text-muted-foreground text-sm">
            Surveillance en temps r�el de l&apos;infrastructure AlfyChat
          </p>
        </div>

        {/* -- External monitoring (status.alfychat.app) -- */}
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Monitoring externe
          </h2>
          <div className={`rounded-xl border border-border/50 overflow-hidden ${bg}`}>
            <iframe src={`https://status.alfychat.app/embed/monitor-eu?theme=${theme}&days=60`} width="100%" height="70" frameBorder="0" allowFullScreen />
            <iframe src={`https://status.alfychat.app/embed/monitor-su1?theme=${theme}&days=60`} width="100%" height="70" frameBorder="0" allowFullScreen />
            <iframe src={`https://status.alfychat.app/embed/monitor-sm1?theme=${theme}&days=60`} width="100%" height="70" frameBorder="0" allowFullScreen />
            <iframe src={`https://status.alfychat.app/embed/monitor-sf1?theme=${theme}&days=60`} width="100%" height="70" frameBorder="0" allowFullScreen />
            <iframe src={`https://status.alfychat.app/embed/monitor-sc1?theme=${theme}&days=60`} width="100%" height="70" frameBorder="0" allowFullScreen />
            <iframe src={`https://status.alfychat.app/embed/monitor-sb1?theme=${theme}&days=60`} width="100%" height="70" frameBorder="0" allowFullScreen />
            <iframe src={`https://status.alfychat.app/embed/monitor-ss1?theme=${theme}&days=60`} width="100%" height="70" frameBorder="0" allowFullScreen />
            <iframe src={`https://status.alfychat.app/embed/monitor-ws?theme=${theme}&days=60`} width="100%" height="70" frameBorder="0" allowFullScreen />
            <iframe src={`https://status.alfychat.app/embed/monitor-media3to?theme=${theme}&days=60`} width="100%" height="70" frameBorder="0" allowFullScreen />
          </div>
          <div className={`rounded-xl border border-border/50 overflow-hidden ${bg}`}>
            <iframe src={`https://status.alfychat.app/embed/events/live?theme=${theme}&incidents=1&maintenance=1`} width="100%" height="300" frameBorder="0" allowFullScreen />
          </div>
          <p className="text-xs text-muted-foreground/40 text-center">
            Donn�es issues de status.alfychat.app � 60 derniers jours
          </p>
        </section>

      </main>

      {/* -- Footer -- */}
      <footer className="border-t border-border/30 mt-16">
        <div className="mx-auto max-w-4xl px-4 py-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground/50">
          <div className="flex items-center gap-3">
            <span>AlfyChat � Messagerie s�curis�e</span>
            <span>�</span>
            <span className="inline-flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-violet-500/70 inline-block" /> Hostinger
            </span>
            <span>�</span>
            <span className="inline-flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-sky-500/70 inline-block" /> AlfyCore
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/" className="hover:text-muted-foreground transition-colors">Accueil</Link>
            <Link href="/app" className="hover:text-muted-foreground transition-colors">Application</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

