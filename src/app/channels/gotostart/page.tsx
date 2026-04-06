'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import {
  MessageCircleIcon,
  UsersIcon,
  ServerIcon,
  ShieldCheckIcon,
  SmileIcon,
  MicIcon,
  SearchIcon,
  CheckIcon,
  ZapIcon,
  LockIcon,
} from '@/components/icons';

// ─── Data ─────────────────────────────────────────────────────────────────────

const FAKE_MESSAGES = [
  { id: '1', author: 'Léa',    initials: 'LÉ', color: '#5865F2', time: '14:32', content: 'Salut tout le monde ! 👋' },
  { id: '2', author: 'Marcus', initials: 'MA', color: '#3ba55c', time: '14:33', content: 'Hey ! Vous avez vu la nouvelle mise à jour ?' },
  { id: '3', author: 'Sophie', initials: 'SO', color: '#f0a732', time: '14:33', content: 'Oui ! Les canaux vocaux sont géniaux 🎙️' },
  { id: '4', author: 'Léa',    initials: 'LÉ', color: '#5865F2', time: '14:34', content: 'Et les réactions aux messages c\'est top 🔥' },
];

const FAKE_SERVERS = [
  { id: '1', name: 'AlfyCore HQ',  initials: 'AQ', color: '#5865F2', members: '1 248' },
  { id: '2', name: 'Dev Zone',     initials: 'DZ', color: '#3ba55c', members: '842'   },
  { id: '3', name: 'Design Hub',   initials: 'DH', color: '#f0a732', members: '503'   },
  { id: '4', name: 'Gaming Crew',  initials: 'GC', color: '#ed4245', members: '2 101' },
];

const FAKE_FRIENDS = [
  { id: '1', name: 'Léa',    initials: 'LÉ', color: '#5865F2', status: 'online',  label: 'En ligne'          },
  { id: '2', name: 'Marcus', initials: 'MA', color: '#3ba55c', status: 'idle',    label: 'Inactif'           },
  { id: '3', name: 'Sophie', initials: 'SO', color: '#f0a732', status: 'dnd',     label: 'Ne pas déranger'   },
  { id: '4', name: 'Tom',    initials: 'TO', color: '#eb459e', status: 'offline', label: 'Hors ligne'        },
];

const STATUS_COLOR: Record<string, string> = {
  online:  'bg-green-500',
  idle:    'bg-yellow-500',
  dnd:     'bg-red-500',
  offline: 'bg-gray-500',
};

const FEATURES = [
  { icon: MessageCircleIcon, title: 'Messages en temps réel',    desc: 'Discutez en privé ou en groupe avec une expérience fluide et instantanée.'               },
  { icon: ServerIcon,        title: 'Serveurs communautaires',   desc: 'Créez ou rejoignez des serveurs avec des canaux thématiques, rôles et permissions.'       },
  { icon: MicIcon,           title: 'Canaux vocaux',             desc: 'Rejoignez des salons vocaux pour parler en direct avec vos amis.'                         },
  { icon: UsersIcon,         title: 'Gestion des amis',          desc: 'Ajoutez des amis, gérez vos demandes et voyez qui est en ligne.'                          },
  { icon: SmileIcon,         title: 'Réactions & emojis',        desc: 'Exprimez-vous avec des réactions, emojis personnalisés et GIFs.'                          },
  { icon: ShieldCheckIcon,   title: 'Sécurisé & privé',          desc: 'Chiffrement de bout en bout. Modération avancée et contrôle total sur vos données.'       },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function CheckItem({ text }: { text: string }) {
  return (
    <li className="flex items-center gap-2 text-sm text-[var(--foreground)]">
      <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-[var(--accent)]/15 text-[var(--accent)]">
        <CheckIcon size={12} />
      </span>
      {text}
    </li>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function GotoStartPage() {
  const router     = useRouter();
  const { user, isLoading } = useAuth();

  // Phase 1 : hero seul — visible dès le chargement
  const [heroVisible,    setHeroVisible]    = useState(false);
  const [greetVisible,   setGreetVisible]   = useState(false);
  const [titleVisible,   setTitleVisible]   = useState(false);
  const [btnsVisible,    setBtnsVisible]    = useState(false);

  // Phase 2 : contenu complet — après 2 s
  const [contentVisible, setContentVisible] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) router.replace('/login');
  }, [isLoading, user, router]);

  useEffect(() => {
    // Phase 1 — stagger rapide du hero
    const t1 = setTimeout(() => setHeroVisible(true),  80);
    const t2 = setTimeout(() => setGreetVisible(true), 400);
    const t3 = setTimeout(() => setTitleVisible(true), 700);
    const t4 = setTimeout(() => setBtnsVisible(true),  1000);
    // Phase 2 — tout le reste apparaît 2 s après l'arrivée sur la page
    const t5 = setTimeout(() => setContentVisible(true), 2200);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); clearTimeout(t5); };
  }, []);

  if (isLoading || !user) return null;

  const name = user?.displayName || user?.username || '';

  return (
    <div className="min-h-screen overflow-y-auto bg-[var(--background)]">

      {/* ══════════════════════════════════════════════════════════
          PHASE 1 — Hero bienvenue (toujours visible)
      ══════════════════════════════════════════════════════════ */}
      <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 py-24 text-center">

        {/* Ambient glows */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
          <div className="absolute left-1/2 top-1/3 h-[700px] w-[700px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--accent)]/8 blur-[140px]" />
          <div className="absolute right-1/4 top-2/3 h-[350px] w-[350px] rounded-full bg-purple-500/6 blur-[100px]" />
          <div className="absolute left-1/4 bottom-1/4 h-[250px] w-[250px] rounded-full bg-[var(--accent)]/5 blur-[80px]" />
        </div>

        <div className="relative z-10 flex flex-col items-center gap-5">

          {/* Logo */}
          <div
            className={`flex size-24 items-center justify-center rounded-[32px] bg-[var(--accent)] shadow-[0_24px_80px_color-mix(in_oklch,var(--accent)_50%,transparent)] transition-all duration-700 ${
              heroVisible ? 'scale-100 opacity-100' : 'scale-75 opacity-0'
            }`}
          >
            <span className="text-5xl font-black text-white">A</span>
          </div>

          {/* Greeting pill */}
          <div
            className={`transition-all duration-600 ${
              greetVisible ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'
            }`}
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border)]/60 bg-[var(--surface)]/60 px-4 py-1.5">
              <span className="text-sm font-medium text-[var(--muted)]">Bonjour,</span>
              <span className="text-sm font-bold text-[var(--foreground)]">{name}</span>
              <span className="text-base">👋</span>
            </div>
          </div>

          {/* Headline */}
          <div
            className={`transition-all duration-700 ${
              titleVisible ? 'translate-y-0 opacity-100' : 'translate-y-5 opacity-0'
            }`}
          >
            <h1 className="max-w-2xl text-5xl font-extrabold leading-tight tracking-tight sm:text-6xl lg:text-7xl">
              <span className="text-[var(--foreground)]">Bienvenue sur </span>
              <span className="bg-gradient-to-r from-[var(--accent)] via-violet-500 to-purple-500 bg-clip-text text-transparent">
                AlfyChat
              </span>
            </h1>
            <p className="mt-3 text-sm font-medium text-[var(--muted)]">
              créé avec ❤️ par <span className="font-semibold text-[var(--foreground)]">AlfyCore</span>
            </p>
          </div>

          {/* CTA buttons */}
          <div
            className={`mt-2 transition-all duration-700 ${
              btnsVisible ? 'translate-y-0 opacity-100' : 'translate-y-5 opacity-0'
            }`}
          >
            <p className="mb-6 max-w-md text-base text-[var(--muted)]">
              Votre compte est prêt. Découvrez tout ce que vous pouvez faire dès maintenant.
            </p>
            <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Button
                size="lg"
                className="w-full rounded-2xl bg-[var(--accent)] px-10 font-semibold text-white shadow-[0_8px_30px_color-mix(in_oklch,var(--accent)_40%,transparent)] transition-opacity hover:opacity-90 sm:w-auto"
                onClick={() => router.push('/channels/me')}
              >
                Commencer →
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="w-full rounded-2xl px-10 font-semibold sm:w-auto"
                onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
              >
                Découvrir les fonctionnalités
              </Button>
            </div>
          </div>

          {/* Scroll hint — apparaît uniquement si le contenu est déjà chargé */}
          <div
            className={`mt-6 flex flex-col items-center gap-1.5 transition-all duration-700 ${
              contentVisible ? 'opacity-50' : 'opacity-0'
            }`}
          >
            <p className="text-xs text-[var(--muted)]">Faites défiler</p>
            <div className="h-9 w-5 rounded-full border-2 border-[var(--border)] p-1">
              <div className="mx-auto h-1.5 w-1 animate-bounce rounded-full bg-[var(--muted)]" />
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          PHASE 2 — Contenu complet (révélé après 2 s)
          Enveloppe avec transition opacity + translate globale
      ══════════════════════════════════════════════════════════ */}
      <div
        className={`transition-all duration-1000 ${
          contentVisible ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0'
        }`}
      >

        {/* ── Stats rapides ── */}
        <section className="border-y border-[var(--border)]/40 bg-[var(--surface)]/30 px-6 py-10">
          <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-center gap-10">
            {[
              { icon: UsersIcon,   value: '10 000+', label: 'Utilisateurs actifs'    },
              { icon: ServerIcon,  value: '500+',    label: 'Serveurs créés'         },
              { icon: ZapIcon,     value: '< 2 ms',  label: 'Latence des messages'   },
              { icon: LockIcon,    value: 'E2EE',    label: 'Chiffrement de bout en bout' },
            ].map((s) => (
              <div key={s.label} className="flex flex-col items-center gap-1 text-center">
                <s.icon size={20} className="text-[var(--accent)] mb-1" />
                <p className="text-2xl font-extrabold text-[var(--foreground)]">{s.value}</p>
                <p className="text-xs text-[var(--muted)]">{s.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Features ── */}
        <section id="features" className="px-6 py-24">
          <div className="mx-auto max-w-5xl">
            <div className="mb-14 text-center">
              <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-[var(--accent)]">Fonctionnalités</p>
              <h2 className="text-3xl font-extrabold text-[var(--foreground)] sm:text-4xl">
                Tout ce dont vous avez besoin
              </h2>
              <p className="mt-3 text-[var(--muted)]">Une plateforme complète, pensée pour la communauté.</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((feat, i) => (
                <div
                  key={feat.title}
                  className="group border border-[var(--border)] bg-[var(--surface)] p-0 rounded-xl transition-all hover:-translate-y-1 hover:border-[var(--accent)]/30 hover:shadow-xl"
                  style={{ animationDelay: `${i * 80}ms` }}
                >
                  <div className="p-6">
                    <div className="mb-4 flex size-11 items-center justify-center rounded-2xl bg-[var(--accent)]/10 text-[var(--accent)] transition-colors group-hover:bg-[var(--accent)]/20">
                      <feat.icon size={22} />
                    </div>
                    <h3 className="mb-2 font-semibold text-[var(--foreground)]">{feat.title}</h3>
                    <p className="text-sm leading-relaxed text-[var(--muted)]">{feat.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Chat demo ── */}
        <section className="bg-[var(--surface)]/40 px-6 py-24">
          <div className="mx-auto max-w-5xl">
            <div className="grid gap-14 lg:grid-cols-2 lg:items-center">
              <div>
                <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-[var(--accent)]">Messages</p>
                <h2 className="mb-4 text-3xl font-extrabold leading-tight text-[var(--foreground)]">
                  Discutez comme jamais
                </h2>
                <p className="mb-6 text-[var(--muted)]">
                  DMs privés, groupes, canaux de serveur — tous en temps réel avec réactions, réponses, éditions et partage de médias.
                </p>
                <ul className="space-y-3">
                  {['Messages en temps réel', 'Réponses et réactions', 'Partage de fichiers et médias', 'Historique complet'].map((t) => (
                    <CheckItem key={t} text={t} />
                  ))}
                </ul>
              </div>

              <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] p-0 shadow-2xl">
                <div className="flex items-center gap-2 border-b border-[var(--border)] px-4 py-3">
                  <span className="text-[var(--muted)]">#</span>
                  <span className="text-sm font-semibold text-[var(--foreground)]">général</span>
                  <span className="ml-auto text-xs text-[var(--muted)]">• AlfyCore HQ</span>
                </div>
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
                          <span className="text-sm font-semibold" style={{ color: msg.color }}>{msg.author}</span>
                          <span className="text-[10px] text-[var(--muted)]">{msg.time}</span>
                        </div>
                        <p className="text-sm text-[var(--foreground)]">{msg.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="border-t border-[var(--border)] px-4 py-3">
                  <div className="flex items-center gap-2 rounded-xl bg-[var(--background)] px-3 py-2">
                    <span className="flex-1 text-sm text-[var(--muted)]">Message #général…</span>
                    <SmileIcon size={16} className="text-[var(--muted)]" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Servers demo ── */}
        <section className="px-6 py-24">
          <div className="mx-auto max-w-5xl">
            <div className="grid gap-14 lg:grid-cols-2 lg:items-center">
              <div className="order-last overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] p-0 shadow-2xl lg:order-first">
                <div className="border-b border-[var(--border)] px-4 py-3">
                  <div className="flex items-center gap-2 rounded-lg bg-[var(--background)] px-3 py-2">
                    <SearchIcon size={14} className="text-[var(--muted)]" />
                    <span className="text-sm text-[var(--muted)]">Rechercher des serveurs…</span>
                  </div>
                </div>
                <div className="divide-y divide-[var(--border)]">
                  {FAKE_SERVERS.map((srv) => (
                    <div key={srv.id} className="flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors hover:bg-[var(--background)]">
                      <div
                        className="flex size-10 shrink-0 items-center justify-center rounded-2xl text-sm font-bold text-white"
                        style={{ background: srv.color }}
                      >
                        {srv.initials}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-[var(--foreground)]">{srv.name}</p>
                        <p className="text-xs text-[var(--muted)]">{srv.members} membres</p>
                      </div>
                      <Button size="sm" variant="outline" className="h-7 shrink-0 rounded-xl px-3 text-xs">
                        Rejoindre
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-[var(--accent)]">Serveurs</p>
                <h2 className="mb-4 text-3xl font-extrabold leading-tight text-[var(--foreground)]">
                  Votre communauté, vos règles
                </h2>
                <p className="mb-6 text-[var(--muted)]">
                  Créez votre propre serveur, organisez vos espaces avec des canaux, attribuez des rôles et modérez votre communauté facilement.
                </p>
                <ul className="space-y-3">
                  {['Canaux texte et vocaux', 'Rôles et permissions', 'Invitation par lien', 'Modération intégrée'].map((t) => (
                    <CheckItem key={t} text={t} />
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* ── Friends demo ── */}
        <section className="bg-[var(--surface)]/40 px-6 py-24">
          <div className="mx-auto max-w-5xl">
            <div className="grid gap-14 lg:grid-cols-2 lg:items-center">
              <div>
                <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-[var(--accent)]">Amis</p>
                <h2 className="mb-4 text-3xl font-extrabold leading-tight text-[var(--foreground)]">
                  Restez connecté avec vos proches
                </h2>
                <p className="mb-6 text-[var(--muted)]">
                  Ajoutez des amis, voyez leur statut en temps réel, envoyez des messages privés ou invitez-les sur vos serveurs.
                </p>
                <ul className="space-y-3">
                  {['Statut personnalisé', 'Messages privés', 'Groupes jusqu\'à 10 personnes', 'Appels vocal & vidéo'].map((t) => (
                    <CheckItem key={t} text={t} />
                  ))}
                </ul>
              </div>

              <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] p-0 shadow-2xl">
                <div className="border-b border-[var(--border)] px-4 py-3">
                  <p className="text-sm font-semibold text-[var(--foreground)]">
                    Amis en ligne — {FAKE_FRIENDS.filter((f) => f.status !== 'offline').length}
                  </p>
                </div>
                <div className="divide-y divide-[var(--border)]">
                  {FAKE_FRIENDS.map((f) => (
                    <div key={f.id} className="flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors hover:bg-[var(--background)]">
                      <div className="relative shrink-0">
                        <div
                          className="flex size-9 items-center justify-center rounded-full text-xs font-bold text-white"
                          style={{ background: f.color }}
                        >
                          {f.initials}
                        </div>
                        <span className={`absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-[var(--surface)] ${STATUS_COLOR[f.status]}`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-[var(--foreground)]">{f.name}</p>
                        <p className="text-xs text-[var(--muted)]">{f.label}</p>
                      </div>
                      <button className="rounded-lg p-2 text-[var(--muted)] transition-colors hover:bg-[var(--background)] hover:text-[var(--foreground)]">
                        <MessageCircleIcon size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Final CTA ── */}
        <section className="relative overflow-hidden px-6 py-32 text-center">
          <div className="pointer-events-none absolute inset-0" aria-hidden>
            <div className="absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--accent)]/8 blur-[120px]" />
          </div>
          <div className="relative z-10 mx-auto max-w-md">
            <div className="mb-6 flex justify-center">
              <div className="flex size-16 items-center justify-center rounded-[22px] bg-[var(--accent)] shadow-[0_16px_50px_color-mix(in_oklch,var(--accent)_50%,transparent)]">
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
              className="rounded-2xl bg-[var(--accent)] px-10 font-semibold text-white shadow-[0_8px_30px_color-mix(in_oklch,var(--accent)_40%,transparent)] hover:opacity-90"
              onClick={() => router.push('/channels/me')}
            >
              Ouvrir AlfyChat →
            </Button>
            <p className="mt-6 text-xs text-[var(--muted)]">
              AlfyChat — créé avec ❤️ par{' '}
              <span className="font-semibold text-[var(--foreground)]">AlfyCore</span>
            </p>
          </div>
        </section>

      </div>{/* fin phase 2 */}
    </div>
  );
}
