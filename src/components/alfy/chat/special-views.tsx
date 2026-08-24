'use client';

import { Button, Chip, Input, TextField, toast } from '@heroui/react';
import {
  ArrowBigUp,
  Bell,
  Clock,
  Dices,
  FileText,
  Gamepad2,
  Heart,
  MessageSquare,
  Pin,
  Play,
  Plus,
  Sparkles,
  Trophy,
  Users2,
} from 'lucide-react';
import { useMemo, useState } from 'react';

import { MESSAGES } from '@/components/alfy/mock/data';
import { useUserById } from '@/components/alfy/user-directory';
import { useAlfyServerMessages } from '@/components/alfy/live/use-alfy-server-messages';
import { AlfyAvatar } from '@/components/alfy/primitives/alfy-avatar';
import { useTranslation } from '@/components/locale-provider';
import { cn } from '@/lib/utils';

const img = (seed: string, w = 400, h = 300) => `https://picsum.photos/seed/${seed}/${w}/${h}`;

/**
 * Contexte réel optionnel. Sans lui, la vue s'affiche avec des données de
 * démonstration (atelier /uitest) ; avec lui, elle lit le vrai salon.
 */
export interface SpecialViewProps {
  serverId?: string;
  channelId?: string;
}

/** Conteneur de contenu — largeur de lecture confortable. */
function Page({ children, wide }: { children: React.ReactNode; wide?: boolean }) {
  return <div className={cn('mx-auto w-full px-6 py-8', wide ? 'max-w-4xl' : 'max-w-2xl')}>{children}</div>;
}

/** En-tête de vue — icône colorée + titre + action optionnelle. */
function Head({ icon: Icon, title, sub, action }: { icon: typeof Bell; title: string; sub?: string; action?: React.ReactNode }) {
  return (
    <header className="mb-6 flex items-start justify-between gap-4">
      <div className="flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-2xl bg-accent/12 text-accent">
          <Icon className="size-5" aria-hidden />
        </span>
        <div>
          <h2 className="text-lg leading-tight font-bold">{title}</h2>
          {sub && <p className="text-sm text-muted">{sub}</p>}
        </div>
      </div>
      {action}
    </header>
  );
}

/* ── 1. Annonces ─────────────────────────────────────────────── */
export function AnnouncementView({ serverId, channelId }: SpecialViewProps = {}) {
  const { t, intlLocale } = useTranslation();
  const dayFmt = useMemo(() => new Intl.DateTimeFormat(intlLocale, { day: 'numeric', month: 'short' }), [intlLocale]);
  const userById = useUserById();
  const live = useAlfyServerMessages(serverId ?? null, channelId ?? null);

  // Réel : chaque message = une annonce (la plus récente en tête).
  const posts = live.messages.length
    ? [...live.messages].reverse().map((m, i) => ({
        pinned: Boolean(m.pinned) || i === 0,
        author: m.authorId,
        title: m.content.split('\n')[0].slice(0, 80),
        at: dayFmt.format(new Date(m.createdAt)),
        body: m.content,
        reactions: m.reactions.map((r) => `${r.emoji} ${r.count}`),
      }))
    : [
        { pinned: true, author: 'u-me', title: 'Lancement de la refonte « alfy »', at: '17 juil.', body: MESSAGES[9].content, reactions: ['🚀 24', '🎉 12'] },
        { pinned: false, author: 'u-nadia', title: 'Audit sécurité : conclusions', at: '16 juil.', body: MESSAGES[6].content, reactions: ['🔐 31'] },
      ];
  return (
    <Page>
      <Head icon={Bell} title={t.chatUI.specialViews.announcement.title} sub={t.chatUI.specialViews.announcement.sub} action={<Button size="sm" variant="secondary">{t.chatUI.specialViews.announcement.subscribe}</Button>} />
      <div className="flex flex-col gap-4">
        {posts.map((p) => {
          const a = userById(p.author);
          return (
            <article key={p.title} className={cn('rounded-2xl border bg-surface p-5', p.pinned ? 'border-accent/40' : 'border-border/70')}>
              {p.pinned && (
                <p className="mb-2 flex items-center gap-1 text-[11px] font-semibold tracking-wide text-accent uppercase">
                  <Pin className="size-3" /> {t.chatUI.specialViews.announcement.pinned}
                </p>
              )}
              <h3 className="text-base font-bold">{p.title}</h3>
              <div className="mt-1 flex items-center gap-2 text-xs text-muted">
                <AlfyAvatar name={a.displayName} avatarUrl={a.avatarUrl} size="sm" />
                {a.displayName} · {p.at}
              </div>
              <p className="mt-3 text-sm leading-relaxed text-foreground/85">{p.body}</p>
              <div className="mt-4 flex gap-1.5">
                {p.reactions.map((r) => (
                  <span key={r} className="rounded-full border border-border bg-surface-secondary px-2.5 py-0.5 text-xs">{r}</span>
                ))}
              </div>
            </article>
          );
        })}
      </div>
    </Page>
  );
}

/* ── 2. Forum ────────────────────────────────────────────────── */
export function ForumView(_props: SpecialViewProps = {}) {
  const { t, tx } = useTranslation();
  const userById = useUserById();
  const topics = [
    { title: 'Comment migrer mon node sur un VPS ?', author: 'u-sam', replies: 12, last: '5 min', tags: ['aide', 'node'], hot: true },
    { title: 'Retour sur le nouveau composer', author: 'u-lea', replies: 8, last: '1 h', tags: ['feedback'] },
    { title: 'Bug : les threads ne scrollent pas', author: 'u-chloe', replies: 3, last: '3 h', tags: ['bug'] },
    { title: 'Idées de thèmes communautaires', author: 'u-theo', replies: 21, last: 'hier', tags: ['idée'], hot: true },
  ];
  return (
    <Page>
      <Head icon={MessageSquare} title={t.chatUI.specialViews.forum.title} sub={tx(t.chatUI.specialViews.forum.activeTopics, { n: topics.length })} action={<Button size="sm"><Plus className="size-3.5" /> {t.chatUI.specialViews.forum.newTopic}</Button>} />
      <div className="divide-y divide-separator overflow-hidden rounded-2xl border border-border/70 bg-surface">
        {topics.map((t) => {
          const a = userById(t.author);
          return (
            <button key={t.title} type="button" className="flex w-full cursor-pointer items-center gap-4 px-4 py-3.5 text-left transition-colors hover:bg-surface-secondary">
              <AlfyAvatar name={a.displayName} avatarUrl={a.avatarUrl} size="md" />
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 truncate text-sm font-semibold">
                  {t.hot && <Sparkles className="size-3.5 shrink-0 text-warning" aria-hidden />}
                  {t.title}
                </p>
                <div className="mt-1 flex items-center gap-2 text-xs text-muted">
                  <span>{a.displayName}</span>
                  {t.tags.map((tag) => <span key={tag} className="rounded bg-surface-secondary px-1.5 py-0.5 text-[10px] text-foreground/70">#{tag}</span>)}
                </div>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-0.5 text-xs text-muted">
                <span className="flex items-center gap-1 font-medium text-foreground/80"><MessageSquare className="size-3.5" /> {t.replies}</span>
                <span className="flex items-center gap-1"><Clock className="size-3" /> {t.last}</span>
              </div>
            </button>
          );
        })}
      </div>
    </Page>
  );
}

/* ── 3. Galerie ──────────────────────────────────────────────── */
export function GalleryView(_props: SpecialViewProps = {}) {
  const { t } = useTranslation();
  const userById = useUserById();
  const authors = ['u-lea', 'u-marc', 'u-chloe', 'u-theo', 'u-me', 'u-ines', 'u-nadia', 'u-sam', 'u-julie'];
  return (
    <Page wide>
      <Head icon={Sparkles} title={t.chatUI.specialViews.gallery.title} sub={t.chatUI.specialViews.gallery.sub} action={<Button size="sm" variant="secondary"><Plus className="size-3.5" /> {t.chatUI.specialViews.gallery.publish}</Button>} />
      <div className="columns-2 gap-3 sm:columns-3">
        {authors.map((au, i) => {
          const a = userById(au);
          return (
            <div key={i} className="group/img relative mb-3 overflow-hidden rounded-xl">
              <img src={img(`gal-${i}`, 400, 260 + (i % 3) * 90)} alt="" loading="lazy" className="w-full transition-transform duration-300 group-hover/img:scale-105" />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center gap-2 bg-linear-to-t from-black/70 to-transparent p-3 opacity-0 transition-opacity group-hover/img:opacity-100">
                <AlfyAvatar name={a.displayName} avatarUrl={a.avatarUrl} size="sm" />
                <span className="text-xs font-medium text-white">{a.displayName}</span>
              </div>
            </div>
          );
        })}
      </div>
    </Page>
  );
}

/* ── 4. Médiathèque ──────────────────────────────────────────── */
export function MediaView(_props: SpecialViewProps = {}) {
  const { t, tx } = useTranslation();
  const userById = useUserById();
  const items = [
    { title: 'Stream — build en live #4', dur: '1:12:04', views: '842' },
    { title: 'Démo du redesign HeroUI', dur: '18:32', views: '1.2k' },
    { title: 'Héberger son node en 10 min', dur: '9:47', views: '3.4k' },
  ];
  return (
    <Page>
      <Head icon={Play} title={t.chatUI.specialViews.media.title} sub={t.chatUI.specialViews.media.sub} />
      <div className="flex flex-col gap-3">
        {items.map((m, i) => (
          <button key={m.title} type="button" className="group/med flex cursor-pointer gap-4 rounded-2xl border border-border/70 bg-surface p-3 text-left transition-colors hover:bg-surface-secondary">
            <div className="relative w-44 shrink-0 overflow-hidden rounded-xl">
              <img src={img(`med-${i}`, 320, 180)} alt="" className="aspect-video w-full object-cover transition-transform duration-300 group-hover/med:scale-105" />
              <span className="absolute right-1.5 bottom-1.5 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-medium text-white tabular-nums">{m.dur}</span>
              <span className="absolute inset-0 flex items-center justify-center">
                <span className="flex size-10 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm transition-transform group-hover/med:scale-110"><Play className="size-4" /></span>
              </span>
            </div>
            <div className="min-w-0 flex-1 py-1">
              <p className="text-sm font-semibold">{m.title}</p>
              <p className="mt-1 text-xs text-muted">{userById('u-me').displayName} · {tx(t.chatUI.specialViews.media.views, { n: m.views })}</p>
            </div>
          </button>
        ))}
      </div>
    </Page>
  );
}

/* ── 5. Doc ──────────────────────────────────────────────────── */
export function DocView(_props: SpecialViewProps = {}) {
  const { t, tx } = useTranslation();
  const userById = useUserById();
  const contributors = ['u-me', 'u-lea', 'u-nadia'];
  return (
    <Page>
      <div className="mb-6 flex items-center justify-between border-b border-separator pb-4">
        <div className="flex items-center gap-2 text-xs text-muted">
          <FileText className="size-4" /> {tx(t.chatUI.specialViews.doc.editedAgo, { n: 5 })}
        </div>
        <div className="flex -space-x-2">
          {contributors.map((c) => (
            <AlfyAvatar key={c} name={userById(c).displayName} avatarUrl={userById(c).avatarUrl} size="sm" statusRingClass="ring-surface" className="ring-2 ring-surface" />
          ))}
        </div>
      </div>
      <article className="flex flex-col gap-4">
        <h1 className="font-heading text-3xl font-bold">Charte de la communauté</h1>
        <p className="text-[15px] leading-relaxed text-foreground/85">Bienvenue ! Ce document collaboratif pose les règles qui permettent à chacun·e de se sentir bien ici. Vous pouvez le modifier si vous avez le rôle Contributeur.</p>
        <h2 className="mt-2 text-xl font-semibold">1. Respect</h2>
        <p className="text-[15px] leading-relaxed text-foreground/85">Pas d’insultes, pas de harcèlement. Le désaccord est permis, le mépris ne l’est pas.</p>
        <h2 className="mt-2 text-xl font-semibold">2. Sécurité</h2>
        <p className="text-[15px] leading-relaxed text-foreground/85">Ne partagez jamais vos clés privées. Vérifiez les empreintes de vos contacts avant les échanges sensibles.</p>
        <blockquote className="border-l-2 border-accent pl-4 text-[15px] text-foreground/70 italic">« La confidentialité n’est pas une option, c’est le point de départ. »</blockquote>
      </article>
    </Page>
  );
}

/* ── 6. Sondage ──────────────────────────────────────────────── */
export function PollView(_props: SpecialViewProps = {}) {
  const { t } = useTranslation();
  const userById = useUserById();
  const [voted, setVoted] = useState<number | null>(null);
  const options = [{ label: 'Mode sombre par défaut', pct: 62 }, { label: 'Mode clair par défaut', pct: 23 }, { label: 'Suivre le système', pct: 15 }];
  return (
    <Page>
      <Head icon={Trophy} title={t.chatUI.specialViews.poll.title} />
      <div className="rounded-2xl border border-border/70 bg-surface p-6">
        <div className="flex items-center gap-2">
          <AlfyAvatar name={userById('u-me').displayName} avatarUrl={userById('u-me').avatarUrl} size="sm" />
          <span className="text-xs text-muted">Karlo · 128 votes</span>
        </div>
        <h3 className="mt-3 text-lg font-bold">Quel thème par défaut préférez-vous ?</h3>
        <div className="mt-4 flex flex-col gap-2">
          {options.map((o, i) => (
            <button key={o.label} type="button" onClick={() => setVoted(i)} className={cn('relative cursor-pointer overflow-hidden rounded-xl border px-3.5 py-2.5 text-left transition-colors', voted === i ? 'border-accent' : 'border-border hover:bg-surface-secondary')}>
              <span aria-hidden className="absolute inset-y-0 left-0 w-full origin-left bg-accent/12 transition-transform duration-500 ease-linear" style={{ transform: `scaleX(${voted === null ? 0 : o.pct / 100})` }} />
              <span className="relative flex items-center justify-between text-sm font-medium">
                {o.label}
                {voted !== null && <span className="text-xs text-muted tabular-nums">{o.pct}%</span>}
              </span>
            </button>
          ))}
        </div>
        {voted !== null && <p className="mt-3 text-xs text-muted">{t.chatUI.specialViews.poll.voted}</p>}
      </div>
    </Page>
  );
}

/* ── 7. Comptage ─────────────────────────────────────────────── */
export function CountingView({ serverId, channelId }: SpecialViewProps = {}) {
  const { t } = useTranslation();
  const userById = useUserById();
  const live = useAlfyServerMessages(serverId ?? null, channelId ?? null);
  const [localCount, setLocalCount] = useState(347);
  const [val, setVal] = useState('');

  // Réel : le compteur est le dernier nombre valide posté dans le salon.
  const isLive = Boolean(serverId && channelId);
  const last = live.messages.length ? live.messages[live.messages.length - 1] : null;
  const parsed = last ? Number.parseInt(last.content.trim(), 10) : NaN;
  const count = isLive ? (Number.isFinite(parsed) ? parsed : 0) : localCount;
  const lastCounter = last ? userById(last.authorId).displayName : userById('u-theo').displayName;

  return (
    <Page>
      <div className="flex flex-col items-center gap-4 py-14 text-center">
        <span className="rounded-full border border-border bg-surface px-3 py-1 text-[11px] tracking-wider text-muted uppercase">{t.chatUI.specialViews.counting.title}</span>
        <p className="font-heading text-7xl leading-none font-bold text-accent tabular-nums">{count}</p>
        <p className="text-sm text-muted">
          {t.chatUI.specialViews.counting.next} <strong className="text-foreground">{count + 1}</strong> — {t.chatUI.specialViews.counting.lastBy}{' '}
          <span className="font-medium text-foreground">{lastCounter}</span>
        </p>
        <form
          className="mt-2 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (Number(val) !== count + 1) {
              toast(t.chatUI.specialViews.counting.wrongNumber);
              return;
            }
            if (isLive) live.send(String(count + 1));
            else setLocalCount((c) => c + 1);
            setVal('');
          }}
        >
          <TextField value={val} onChange={setVal} aria-label={t.chatUI.specialViews.counting.yourNumber}>
            <Input placeholder={String(count + 1)} className="w-28 text-center text-lg tabular-nums" />
          </TextField>
          <Button type="submit" size="lg">{t.chatUI.specialViews.counting.submit}</Button>
        </form>
      </div>
    </Page>
  );
}

/* ── 8. Mini-jeu ─────────────────────────────────────────────── */
export function MinigameView(_props: SpecialViewProps = {}) {
  const { t, tx } = useTranslation();
  const games = [
    { name: 'Puissance 4', players: '2', icon: Gamepad2, live: 3 },
    { name: 'Morpion', players: '2', icon: Gamepad2, live: 0 },
    { name: 'Pendu', players: '2–8', icon: Gamepad2, live: 1 },
    { name: 'Blackjack', players: '1–5', icon: Dices, live: 0 },
  ];
  return (
    <Page>
      <Head icon={Gamepad2} title={t.chatUI.specialViews.minigame.title} sub={t.chatUI.specialViews.minigame.sub} />
      {/* Jeu à la une */}
      <div className="mb-4 flex items-center gap-4 overflow-hidden rounded-2xl bg-linear-to-br from-accent/20 to-accent/5 p-5">
        <span className="flex size-14 items-center justify-center rounded-2xl bg-accent text-(--accent-foreground)"><Dices className="size-7" /></span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold tracking-wider text-accent uppercase">{t.chatUI.specialViews.minigame.featured}</p>
          <p className="text-base font-bold">Blackjack — table ouverte</p>
          <p className="text-xs text-muted">3 joueurs attendent · mise en jetons virtuels</p>
        </div>
        <Button onPress={() => toast(t.chatUI.specialViews.minigame.joined, { description: 'Blackjack' })}>{t.chatUI.specialViews.minigame.join}</Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {games.map((g) => (
          <div key={g.name} className="flex items-center gap-3 rounded-2xl border border-border/70 bg-surface p-4">
            <span className="flex size-10 items-center justify-center rounded-xl bg-surface-secondary text-foreground/70"><g.icon className="size-5" /></span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">{g.name}</p>
              <p className="text-xs text-muted">{tx(t.chatUI.specialViews.minigame.players, { n: g.players })}{g.live > 0 && <span className="ml-1 text-success">· {tx(t.chatUI.specialViews.minigame.liveCount, { n: g.live })}</span>}</p>
            </div>
            <Button size="sm" variant="secondary" onPress={() => toast(t.chatUI.specialViews.minigame.started, { description: g.name })}>{t.chatUI.specialViews.minigame.play}</Button>
          </div>
        ))}
      </div>
    </Page>
  );
}

/* ── 9. Trivia ───────────────────────────────────────────────── */
export function TriviaView(_props: SpecialViewProps = {}) {
  const { t, tx } = useTranslation();
  const [answered, setAnswered] = useState<string | null>(null);
  const answers = ['Signal', 'PGP', 'TLS', 'Kerberos'];
  return (
    <Page>
      <div className="rounded-2xl border border-border/70 bg-surface p-6">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted">{tx(t.chatUI.specialViews.trivia.question, { n: 4, total: 10 })}</span>
          <span className="flex items-center gap-1 text-sm font-bold text-accent"><Trophy className="size-4" /> {tx(t.chatUI.specialViews.trivia.points, { n: 30 })}</span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-secondary">
          <div className="h-full rounded-full bg-accent" style={{ width: '40%' }} />
        </div>
        <h3 className="mt-5 text-xl font-bold">Quel protocole AlfyChat utilise-t-il pour le chiffrement de bout en bout ?</h3>
        <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
          {answers.map((a) => {
            const correct = a === 'Signal';
            const state = answered == null ? 'idle' : correct ? 'good' : answered === a ? 'bad' : 'idle';
            return (
              <button
                key={a}
                type="button"
                disabled={answered != null}
                onClick={() => setAnswered(a)}
                className={cn(
                  'flex items-center justify-between rounded-xl border px-4 py-3 text-sm font-medium transition-colors',
                  state === 'idle' && 'border-border hover:border-accent/50 hover:bg-surface-secondary',
                  state === 'good' && 'border-success bg-success/12 text-success',
                  state === 'bad' && 'border-danger bg-danger/12 text-danger',
                  answered == null ? 'cursor-pointer' : 'cursor-default',
                )}
              >
                {a}
                {state === 'good' && <Trophy className="size-4" />}
              </button>
            );
          })}
        </div>
      </div>
    </Page>
  );
}

/* ── 10. Suggestions ─────────────────────────────────────────── */
export function SuggestionView(_props: SpecialViewProps = {}) {
  const { t } = useTranslation();
  const userById = useUserById();
  const [votes, setVotes] = useState<Record<string, number>>({});
  const items = [
    { id: 's1', title: 'Réactions personnalisées par serveur', votes: 84, status: 'Prévu' as const, author: 'u-lea' },
    { id: 's2', title: 'Export des messages en Markdown', votes: 52, status: 'À l’étude' as const, author: 'u-marc' },
    { id: 's3', title: 'Thèmes communautaires partageables', votes: 31, status: 'Nouveau' as const, author: 'u-chloe' },
  ];
  const color = { Prévu: 'success', 'À l’étude': 'warning', Nouveau: 'default' } as const;
  return (
    <Page>
      <Head icon={ArrowBigUp} title={t.chatUI.specialViews.suggestion.title} sub={t.chatUI.specialViews.suggestion.sub} action={<Button size="sm"><Plus className="size-3.5" /> {t.chatUI.specialViews.suggestion.propose}</Button>} />
      <div className="flex flex-col gap-3">
        {items.map((s) => {
          const bump = votes[s.id] ?? 0;
          const a = userById(s.author);
          return (
            <div key={s.id} className="flex items-center gap-4 rounded-2xl border border-border/70 bg-surface p-3.5">
              <button
                type="button"
                onClick={() => setVotes((v) => ({ ...v, [s.id]: v[s.id] ? 0 : 1 }))}
                className={cn('flex w-12 shrink-0 cursor-pointer flex-col items-center rounded-xl border py-2 transition-colors', bump ? 'border-accent bg-accent/12 text-accent' : 'border-border text-muted hover:border-accent/50 hover:text-accent')}
              >
                <ArrowBigUp className={cn('size-5', bump && 'fill-current')} />
                <span className="text-xs font-bold tabular-nums">{s.votes + bump}</span>
              </button>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{s.title}</p>
                <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted">
                  <AlfyAvatar name={a.displayName} avatarUrl={a.avatarUrl} size="sm" /> {t.chatUI.specialViews.suggestion.proposedBy} {a.displayName}
                </p>
              </div>
              <Chip size="sm" color={color[s.status]} variant="soft">{s.status}</Chip>
            </div>
          );
        })}
      </div>
    </Page>
  );
}

/* ── 11. Vent — espace bienveillant ──────────────────────────── */
export function VentView(_props: SpecialViewProps = {}) {
  const { t, tx } = useTranslation();
  const entries = [
    { mood: '😔', text: 'Grosse journée, j’avais juste besoin de le poser quelque part.', support: 7, at: '1 h' },
    { mood: '😮‍💨', text: 'Merci à cette communauté, ça aide de se sentir moins seul·e.', support: 14, at: '3 h' },
  ];
  return (
    <Page>
      <div className="mb-6 flex items-start gap-3 rounded-2xl border border-(--alfy-e2e)/25 bg-(--alfy-e2e-soft) p-4">
        <Heart className="mt-0.5 size-5 shrink-0 text-(--alfy-e2e)" aria-hidden />
        <div>
          <p className="text-sm font-semibold">{t.chatUI.specialViews.vent.title}</p>
          <p className="mt-0.5 text-xs leading-relaxed text-foreground/75">{t.chatUI.specialViews.vent.desc}</p>
        </div>
      </div>
      <div className="flex flex-col gap-3">
        {entries.map((v, i) => (
          <div key={i} className="rounded-2xl border border-border/60 bg-surface p-4">
            <p className="text-sm leading-relaxed"><span className="mr-2 text-lg">{v.mood}</span>{v.text}</p>
            <div className="mt-3 flex items-center gap-3 text-xs text-muted">
              <button type="button" className="flex cursor-pointer items-center gap-1.5 rounded-full border border-border px-2.5 py-1 transition-colors hover:border-(--alfy-e2e)/50 hover:text-(--alfy-e2e)">
                <Heart className="size-3" /> {t.chatUI.specialViews.vent.support} · {v.support}
              </button>
              <span className="flex items-center gap-1"><Users2 className="size-3" /> {t.chatUI.specialViews.vent.anonymous}</span>
              <span>· {tx(t.chatUI.specialViews.vent.timeAgo, { time: v.at })}</span>
            </div>
          </div>
        ))}
      </div>
    </Page>
  );
}

export const SPECIAL_VIEWS = {
  announcement: { label: 'Annonces', Component: AnnouncementView },
  forum: { label: 'Forum', Component: ForumView },
  gallery: { label: 'Galerie', Component: GalleryView },
  media: { label: 'Média', Component: MediaView },
  doc: { label: 'Doc', Component: DocView },
  poll: { label: 'Sondage', Component: PollView },
  counting: { label: 'Comptage', Component: CountingView },
  minigame: { label: 'Mini-jeu', Component: MinigameView },
  trivia: { label: 'Trivia', Component: TriviaView },
  suggestion: { label: 'Suggestions', Component: SuggestionView },
  vent: { label: 'Vent', Component: VentView },
} as const;

export type SpecialViewType = keyof typeof SPECIAL_VIEWS;

/** Localized label for a special channel type — prefer this over `SPECIAL_VIEWS[type].label` (French only). */
export function specialViewLabel(t: import('@/i18n').Translations, type: SpecialViewType): string {
  const titles = t.chatUI.specialViews;
  const map: Record<SpecialViewType, string> = {
    announcement: titles.announcement.title,
    forum: titles.forum.title,
    gallery: titles.gallery.title,
    media: titles.media.title,
    doc: titles.doc.title,
    poll: titles.poll.title,
    counting: titles.counting.title,
    minigame: titles.minigame.title,
    trivia: titles.trivia.title,
    suggestion: titles.suggestion.title,
    vent: titles.vent.title,
  };
  return map[type];
}
