'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  MessageCircleIcon,
  UsersIcon,
  ServerIcon,
  PlusIcon,
  CompassIcon,
  ArrowUpRightIcon,
  Loader2Icon,
} from '@/components/icons';
import { useAuth } from '@/hooks/use-auth';

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 5) return 'Bonne nuit';
  if (h < 12) return 'Bonjour';
  if (h < 18) return 'Bon après-midi';
  return 'Bonsoir';
};

export default function ChannelsPage() {
  const router = useRouter();
  const { user, isLoading, isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.push('/login');
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return (
      <div className="relative flex h-screen items-center justify-center overflow-hidden bg-[var(--background)]">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,oklch(0.5_0_280/3%)_1px,transparent_1px),linear-gradient(to_bottom,oklch(0.5_0_280/3%)_1px,transparent_1px)] bg-size-[72px_72px]" />
        <HugeiconsIcon icon={Loader2Icon} size={24} className="relative z-10 animate-spin text-[var(--accent)]/50" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  const name = user?.displayName || user?.username || '';

  return (
    <div className="relative flex h-screen flex-col overflow-hidden bg-[var(--background)]">
      {/* Background grid + orbs */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,oklch(0.5_0_280/3%)_1px,transparent_1px),linear-gradient(to_bottom,oklch(0.5_0_280/3%)_1px,transparent_1px)] bg-size-[72px_72px]" />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-linear-to-b from-transparent to-background/60" />

      {/* Slim top bar */}
      <header className="relative z-10 flex items-center gap-3 border-b border-[var(--border)]/40 px-8 py-4">
        <div className="flex size-7 items-center justify-center rounded-lg bg-[var(--accent)]">
          <HugeiconsIcon icon={MessageCircleIcon} size={14} className="text-[var(--accent-foreground)]" />
        </div>
        <span className="text-sm font-bold tracking-tight">AlfyChat</span>
      </header>

      {/* Main content — vertically centered */}
      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 pb-12">

        {/* Greeting */}
        <div className="mb-14 text-center animate-fade-in-up">
          <p className="mb-1 text-sm font-medium text-[var(--muted)]">
            {getGreeting()}
          </p>
          <h1 className="text-5xl font-extrabold tracking-tight md:text-6xl">
            <span className="bg-linear-to-br from-foreground via-foreground to-foreground/50 bg-clip-text text-transparent">
              {name}
            </span>
            <span className="ml-3 inline-block animate-pop-in" style={{ animationDelay: '200ms' }}>
              👋
            </span>
          </h1>
          <p className="mt-3 text-base text-[var(--muted)]/70">
            Que souhaitez-vous faire aujourd&apos;hui ?
          </p>
        </div>

        {/* Bento grid */}
        <div className="grid w-full max-w-md grid-cols-2 gap-3">

          {/* Primary — full width */}
          <button
            onClick={() => router.push('/channels/me')}
            className="group col-span-2 flex items-center gap-4 rounded-2xl border border-primary/25 bg-[var(--accent)]/8 px-5 py-4 text-left transition-all duration-200 hover:border-primary/50 hover:bg-[var(--accent)]/12 animate-fade-in-up"
            style={{ animationDelay: '60ms' }}
          >
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[var(--accent)]/15 transition-all duration-200 group-hover:scale-105 group-hover:bg-[var(--accent)]/20">
              <HugeiconsIcon icon={MessageCircleIcon} size={20} className="text-[var(--accent)]" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">Messages privés</p>
              <p className="text-xs text-[var(--muted)]">Reprendre vos conversations</p>
            </div>
            <HugeiconsIcon icon={ArrowUpRightIcon} size={16} className="text-[var(--muted)]/40 transition-all duration-200 group-hover:text-[var(--accent)] group-hover:-translate-y-px group-hover:translate-x-px" />
          </button>

          {/* Amis */}
          <button
            onClick={() => router.push('/channels/@me')}
            className="group flex flex-col gap-3 rounded-2xl border border-[var(--border)]/40 bg-[var(--surface)]/30 p-4 text-left transition-all duration-200 hover:border-blue-500/30 hover:bg-blue-500/6 animate-fade-in-up"
            style={{ animationDelay: '120ms' }}
          >
            <div className="flex size-9 items-center justify-center rounded-xl bg-blue-500/10 transition-all duration-200 group-hover:scale-105">
              <HugeiconsIcon icon={UsersIcon} size={16} className="text-blue-400" />
            </div>
            <div>
              <p className="text-sm font-semibold">Amis</p>
              <p className="text-[11px] text-[var(--muted)]">Gérer vos contacts</p>
            </div>
          </button>

          {/* Découvrir */}
          <button
            onClick={() => router.push('/channels/discover-server')}
            className="group flex flex-col gap-3 rounded-2xl border border-[var(--border)]/40 bg-[var(--surface)]/30 p-4 text-left transition-all duration-200 hover:border-violet-500/30 hover:bg-violet-500/6 animate-fade-in-up"
            style={{ animationDelay: '160ms' }}
          >
            <div className="flex size-9 items-center justify-center rounded-xl bg-violet-500/10 transition-all duration-200 group-hover:scale-105">
              <HugeiconsIcon icon={CompassIcon} size={16} className="text-violet-400" />
            </div>
            <div>
              <p className="text-sm font-semibold">Découvrir</p>
              <p className="text-[11px] text-[var(--muted)]">Explorer des serveurs</p>
            </div>
          </button>

          {/* Rejoindre */}
          <button
            className="group flex flex-col gap-3 rounded-2xl border border-[var(--border)]/40 bg-[var(--surface)]/30 p-4 text-left transition-all duration-200 hover:border-green-500/30 hover:bg-green-500/6 animate-fade-in-up"
            style={{ animationDelay: '200ms' }}
          >
            <div className="flex size-9 items-center justify-center rounded-xl bg-green-500/10 transition-all duration-200 group-hover:scale-105">
              <HugeiconsIcon icon={PlusIcon} size={16} className="text-green-400" />
            </div>
            <div>
              <p className="text-sm font-semibold">Rejoindre</p>
              <p className="text-[11px] text-[var(--muted)]">Via un lien d&apos;invite</p>
            </div>
          </button>

          {/* Créer */}
          <button
            className="group flex flex-col gap-3 rounded-2xl border border-[var(--border)]/40 bg-[var(--surface)]/30 p-4 text-left transition-all duration-200 hover:border-orange-500/30 hover:bg-orange-500/6 animate-fade-in-up"
            style={{ animationDelay: '240ms' }}
          >
            <div className="flex size-9 items-center justify-center rounded-xl bg-orange-500/10 transition-all duration-200 group-hover:scale-105">
              <HugeiconsIcon icon={ServerIcon} size={16} className="text-orange-400" />
            </div>
            <div>
              <p className="text-sm font-semibold">Créer</p>
              <p className="text-[11px] text-[var(--muted)]">Votre propre serveur</p>
            </div>
          </button>

        </div>
      </main>
    </div>
  );
}
