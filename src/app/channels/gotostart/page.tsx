'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Avatar, Button, Card } from '@heroui/react';
import {
  MessageCircleIcon,
  UsersIcon,
  ServerIcon,
  ShieldCheckIcon,
  SmileIcon,
  MicIcon,
  SearchIcon,
  CheckIcon,
} from '@/components/icons';

// ─── Fake demo data ───────────────────────────────────────────────────────────

const FAKE_MESSAGES = [
  {
    id: '1',
    author: 'Léa',
    avatar: null,
    initials: 'LÉ',
    color: '#5865F2',
    time: '14:32',
    content: 'Salut tout le monde ! 👋',
  },
  {
    id: '2',
    author: 'Marcus',
    avatar: null,
    initials: 'MA',
    color: '#3ba55c',
    time: '14:33',
    content: 'Hey ! Vous avez vu la nouvelle mise à jour ?',
  },
  {
    id: '3',
    author: 'Sophie',
    avatar: null,
    initials: 'SO',
    color: '#f0a732',
    time: '14:33',
    content: 'Oui ! Les canaux vocaux sont géniaux 🎙️',
  },
  {
    id: '4',
    author: 'Léa',
    avatar: null,
    initials: 'LÉ',
    color: '#5865F2',
    time: '14:34',
    content: 'Et les réactions aux messages c\'est top 🔥',
  },
];

const FAKE_SERVERS = [
  { id: '1', name: 'AlfyCore HQ', initials: 'AQ', color: '#5865F2', members: '1 248' },
  { id: '2', name: 'Dev Zone', initials: 'DZ', color: '#3ba55c', members: '842' },
  { id: '3', name: 'Design Hub', initials: 'DH', color: '#f0a732', members: '503' },
  { id: '4', name: 'Gaming Crew', initials: 'GC', color: '#ed4245', members: '2 101' },
];

const FAKE_FRIENDS = [
  { id: '1', name: 'Léa', initials: 'LÉ', color: '#5865F2', status: 'online', statusLabel: 'En ligne' },
  { id: '2', name: 'Marcus', initials: 'MA', color: '#3ba55c', status: 'idle', statusLabel: 'Inactif' },
  { id: '3', name: 'Sophie', initials: 'SO', color: '#f0a732', status: 'dnd', statusLabel: 'Ne pas déranger' },
  { id: '4', name: 'Tom', initials: 'TO', color: '#eb459e', status: 'offline', statusLabel: 'Hors ligne' },
];

const STATUS_COLOR: Record<string, string> = {
  online: 'bg-green-500',
  idle: 'bg-yellow-500',
  dnd: 'bg-red-500',
  offline: 'bg-gray-500',
};

const FEATURES = [
  {
    icon: MessageCircleIcon,
    title: 'Messages en temps réel',
    desc: 'Discutez en privé ou en groupe avec une expérience fluide et instantanée.',
  },
  {
    icon: ServerIcon,
    title: 'Serveurs communautaires',
    desc: 'Créez ou rejoignez des serveurs avec des canaux thématiques, des rôles et des permissions.',
  },
  {
    icon: MicIcon,
    title: 'Canaux vocaux',
    desc: 'Rejoignez des salons vocaux pour parler en direct avec vos amis.',
  },
  {
    icon: UsersIcon,
    title: 'Gestion des amis',
    desc: 'Ajoutez des amis, gérez vos demandes et voyez qui est en ligne.',
  },
  {
    icon: SmileIcon,
    title: 'Réactions & emojis',
    desc: 'Exprimez-vous avec des réactions, des emojis personnalisés et des GIFs.',
  },
  {
    icon: ShieldCheckIcon,
    title: 'Sécurisé & privé',
    desc: 'Vos données restent protégées. Modération avancée et contrôle total.',
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function GotoStartPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/login');
    }
  }, [isLoading, user, router]);

  useEffect(() => {
    // Staggered entrance animation trigger
    const t1 = setTimeout(() => setVisible(true), 80);
    const t2 = setTimeout(() => setStep(1), 600);
    const t3 = setTimeout(() => setStep(2), 1100);
    const t4 = setTimeout(() => setStep(3), 1600);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, []);

  if (isLoading || !user) return null;

  const displayName = user?.displayName || user?.username || 'there';

  return (
    <div className="min-h-screen overflow-y-auto bg-[var(--background)]">

      {/* ── Hero ── */}
      <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 py-24 text-center">
        {/* Background glow */}
        <div
          className="pointer-events-none absolute inset-0 overflow-hidden"
          aria-hidden
        >
          <div className="absolute left-1/2 top-1/3 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--accent)]/10 blur-[120px]" />
          <div className="absolute right-1/4 top-2/3 h-[300px] w-[300px] rounded-full bg-purple-500/8 blur-[80px]" />
        </div>

        <div className="relative z-10 flex flex-col items-center gap-6">
          {/* App logo placeholder */}
          <div
            className={`flex size-20 items-center justify-center rounded-[28px] bg-[var(--accent)] shadow-[0_20px_60px_var(--accent)] transition-all duration-700 ${
              visible ? 'scale-100 opacity-100' : 'scale-75 opacity-0'
            }`}
            style={{ transitionDelay: '0ms' }}
          >
            <span className="text-4xl font-black text-white">A</span>
          </div>

          {/* Greeting */}
          <div
            className={`transition-all duration-700 ${
              step >= 1 ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
            }`}
          >
            <p className="text-base font-medium tracking-wide text-[var(--muted)]">
              Bonjour, {displayName} 👋
            </p>
          </div>

          {/* Main headline */}
          <div
            className={`transition-all duration-700 ${
              step >= 2 ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'
            }`}
          >
            <h1 className="max-w-xl text-4xl font-extrabold leading-tight tracking-tight text-[var(--foreground)] sm:text-5xl lg:text-6xl">
              Bienvenue sur{' '}
              <span
                className="bg-gradient-to-r from-[var(--accent)] to-purple-500 bg-clip-text text-transparent"
              >
                AlfyChat
              </span>
            </h1>
            <p className="mt-3 text-sm font-medium text-[var(--muted)]">
              créé par <span className="font-semibold text-[var(--foreground)]">AlfyCore</span>
            </p>
          </div>

          {/* Thank-you message */}
          <div
            className={`max-w-md transition-all duration-700 ${
              step >= 3 ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'
            }`}
          >
            <p className="text-base text-[var(--muted)] sm:text-lg">
              Merci de vous être inscrit. Découvrez tout ce que vous pouvez faire dès maintenant.
            </p>

            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Button
                size="lg"
                className="w-full rounded-2xl bg-[var(--accent)] font-semibold text-white shadow-[0_8px_30px_var(--accent)/40] hover:opacity-90 sm:w-auto px-8"
                onPress={() => router.push('/channels/me')}
              >
                Commencer →
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="w-full rounded-2xl sm:w-auto px-8 font-semibold"
                onPress={() => {
                  document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                Découvrir
              </Button>
            </div>
          </div>

          {/* Scroll hint */}
          <div
            className={`mt-8 flex flex-col items-center gap-1 transition-all duration-700 delay-[2s] ${
              step >= 3 ? 'opacity-50' : 'opacity-0'
            }`}
          >
            <p className="text-xs text-[var(--muted)]">Faites défiler</p>
            <div className="h-8 w-5 rounded-full border-2 border-[var(--border)] p-1">
              <div className="h-1.5 w-1 animate-bounce rounded-full bg-[var(--muted)] mx-auto" />
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="px-6 py-24">
        <div className="mx-auto max-w-5xl">
          <div className="mb-16 text-center">
            <p className="mb-2 text-sm font-semibold tracking-widest text-[var(--accent)] uppercase">Fonctionnalités</p>
            <h2 className="text-3xl font-extrabold text-[var(--foreground)] sm:text-4xl">
              Tout ce dont vous avez besoin
            </h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feat) => (
              <Card
                key={feat.title}
                className="group border border-[var(--border)] bg-[var(--surface)] p-0 transition-all hover:-translate-y-1 hover:border-[var(--accent)]/30 hover:shadow-lg"
              >
                <div className="p-6">
                  <div className="mb-4 flex size-11 items-center justify-center rounded-2xl bg-[var(--accent)]/10 text-[var(--accent)] transition-colors group-hover:bg-[var(--accent)]/20">
                    <feat.icon size={22} />
                  </div>
                  <h3 className="mb-2 font-semibold text-[var(--foreground)]">{feat.title}</h3>
                  <p className="text-sm leading-relaxed text-[var(--muted)]">{feat.desc}</p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── Chat demo ── */}
      <section className="px-6 py-24 bg-[var(--surface)]/40">
        <div className="mx-auto max-w-5xl">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="mb-2 text-sm font-semibold tracking-widest text-[var(--accent)] uppercase">Messages</p>
              <h2 className="mb-4 text-3xl font-extrabold leading-tight text-[var(--foreground)]">
                Discutez comme jamais
              </h2>
              <p className="mb-6 text-[var(--muted)]">
                DMs privés, groupes, canaux de serveur — tous en temps réel avec réactions, réponses, éditions et bien plus.
              </p>
              <ul className="space-y-3">
                {['Messages en temps réel', 'Réponses et réactions', 'Partage de fichiers et médias', 'Historique complet'].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm text-[var(--foreground)]">
                    <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-[var(--accent)]/15 text-[var(--accent)]">
                      <CheckIcon size={12} />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Fake chat preview */}
            <Card className="overflow-hidden border border-[var(--border)] bg-[var(--surface)] p-0 shadow-2xl">
              {/* Channel header */}
              <div className="flex items-center gap-2 border-b border-[var(--border)] px-4 py-3">
                <span className="text-[var(--muted)]">#</span>
                <span className="font-semibold text-[var(--foreground)] text-sm">général</span>
                <span className="ml-auto text-xs text-[var(--muted)]">• AlfyCore HQ</span>
              </div>

              {/* Messages */}
              <div className="space-y-3 px-4 py-4">
                {FAKE_MESSAGES.map((msg) => (
                  <div key={msg.id} className="flex gap-3">
                    <div
                      className="flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                      style={{ background: msg.color }}
                    >
                      {msg.initials}
                    </div>
                    <div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-sm font-semibold" style={{ color: msg.color }}>
                          {msg.author}
                        </span>
                        <span className="text-[10px] text-[var(--muted)]">{msg.time}</span>
                      </div>
                      <p className="text-sm text-[var(--foreground)]">{msg.content}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Input bar */}
              <div className="border-t border-[var(--border)] px-4 py-3">
                <div className="flex items-center gap-2 rounded-xl bg-[var(--background)] px-3 py-2">
                  <span className="flex-1 text-sm text-[var(--muted)]">Message #général…</span>
                  <SmileIcon size={16} className="text-[var(--muted)]" />
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* ── Servers demo ── */}
      <section className="px-6 py-24">
        <div className="mx-auto max-w-5xl">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            {/* Fake server list */}
            <Card className="overflow-hidden border border-[var(--border)] bg-[var(--surface)] p-0 shadow-2xl order-last lg:order-first">
              <div className="border-b border-[var(--border)] px-4 py-3">
                <div className="flex items-center gap-2 rounded-lg bg-[var(--background)] px-3 py-2">
                  <SearchIcon size={14} className="text-[var(--muted)]" />
                  <span className="text-sm text-[var(--muted)]">Rechercher des serveurs…</span>
                </div>
              </div>
              <div className="divide-y divide-[var(--border)]">
                {FAKE_SERVERS.map((srv) => (
                  <div key={srv.id} className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--background)] transition-colors cursor-pointer">
                    <div
                      className="flex size-10 shrink-0 items-center justify-center rounded-2xl text-sm font-bold text-white"
                      style={{ background: srv.color }}
                    >
                      {srv.initials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm text-[var(--foreground)] truncate">{srv.name}</p>
                      <p className="text-xs text-[var(--muted)]">{srv.members} membres</p>
                    </div>
                    <Button size="sm" variant="outline" className="shrink-0 rounded-xl text-xs h-7 px-3">
                      Rejoindre
                    </Button>
                  </div>
                ))}
              </div>
            </Card>

            <div>
              <p className="mb-2 text-sm font-semibold tracking-widest text-[var(--accent)] uppercase">Serveurs</p>
              <h2 className="mb-4 text-3xl font-extrabold leading-tight text-[var(--foreground)]">
                Votre communauté, vos règles
              </h2>
              <p className="mb-6 text-[var(--muted)]">
                Créez votre propre serveur, organisez vos espaces avec des canaux, attribuez des rôles et modérez votre communauté facilement.
              </p>
              <ul className="space-y-3">
                {['Canaux texte et vocaux', 'Rôles et permissions', 'Invitation par lien', 'Modération intégrée'].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm text-[var(--foreground)]">
                    <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-[var(--accent)]/15 text-[var(--accent)]">
                      <CheckIcon size={12} />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── Friends demo ── */}
      <section className="px-6 py-24 bg-[var(--surface)]/40">
        <div className="mx-auto max-w-5xl">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="mb-2 text-sm font-semibold tracking-widest text-[var(--accent)] uppercase">Amis</p>
              <h2 className="mb-4 text-3xl font-extrabold leading-tight text-[var(--foreground)]">
                Restez connecté avec vos proches
              </h2>
              <p className="mb-6 text-[var(--muted)]">
                Ajoutez des amis, voyez leur statut en temps réel, envoyez-leur des messages privés ou invitez-les sur vos serveurs.
              </p>
              <ul className="space-y-3">
                {['Statut personnalisé', 'Messages privés', 'Groupes jusqu\'à 10 personnes', 'Appels vocal & vidéo'].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm text-[var(--foreground)]">
                    <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-[var(--accent)]/15 text-[var(--accent)]">
                      <CheckIcon size={12} />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Fake friends list */}
            <Card className="overflow-hidden border border-[var(--border)] bg-[var(--surface)] p-0 shadow-2xl">
              <div className="border-b border-[var(--border)] px-4 py-3">
                <p className="text-sm font-semibold text-[var(--foreground)]">Amis en ligne — {FAKE_FRIENDS.filter(f => f.status !== 'offline').length}</p>
              </div>
              <div className="divide-y divide-[var(--border)]">
                {FAKE_FRIENDS.map((f) => (
                  <div key={f.id} className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--background)] transition-colors cursor-pointer">
                    <div className="relative shrink-0">
                      <div
                        className="flex size-9 items-center justify-center rounded-full text-xs font-bold text-white"
                        style={{ background: f.color }}
                      >
                        {f.initials}
                      </div>
                      <span
                        className={`absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-[var(--surface)] ${STATUS_COLOR[f.status]}`}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm text-[var(--foreground)] truncate">{f.name}</p>
                      <p className="text-xs text-[var(--muted)]">{f.statusLabel}</p>
                    </div>
                    <button className="rounded-lg p-2 text-[var(--muted)] hover:bg-[var(--background)] hover:text-[var(--foreground)] transition-colors">
                      <MessageCircleIcon size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="relative overflow-hidden px-6 py-32 text-center">
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <div className="absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--accent)]/8 blur-[100px]" />
        </div>
        <div className="relative z-10 mx-auto max-w-md">
          <div className="mb-6 flex justify-center">
            <div className="flex size-16 items-center justify-center rounded-[22px] bg-[var(--accent)] shadow-[0_16px_50px_var(--accent)/50]">
              <span className="text-3xl font-black text-white">A</span>
            </div>
          </div>
          <h2 className="mb-4 text-3xl font-extrabold text-[var(--foreground)] sm:text-4xl">
            Prêt à commencer ?
          </h2>
          <p className="mb-8 text-[var(--muted)]">
            Votre compte est prêt. Rejoignez des serveurs, ajoutez des amis, et discutez dès maintenant.
          </p>
          <Button
            size="lg"
            className="rounded-2xl bg-[var(--accent)] px-10 font-semibold text-white shadow-[0_8px_30px_rgba(88,101,242,0.4)] hover:opacity-90"
            onPress={() => router.push('/channels/me')}
          >
            Ouvrir AlfyChat →
          </Button>
          <p className="mt-6 text-xs text-[var(--muted)]">
            AlfyChat — créé avec ❤️ par{' '}
            <span className="font-semibold text-[var(--foreground)]">AlfyCore</span>
          </p>
        </div>
      </section>

    </div>
  );
}
