'use client';

/**
 * Accueil des MP — page Amis (/channels/me), au gabarit Discord.
 *
 *  ┌ Amis │ En ligne · Tous · En attente · Bloqués │        [Ajouter un ami] ┐
 *  ├ recherche                                      │ Activité en cours      │
 *  ├ EN LIGNE — 4                                   │  amis en salon vocal   │
 *  │  avatar·statut  Nom  statut perso   [💬] [⋯]   │  (rejoindre)           │
 *  └────────────────────────────────────────────────┴────────────────────────┘
 *
 * Une ligne = un ami : clic → MP. Les actions (message, appels, retirer,
 * bloquer) sont au survol ; les confirmations passent par la fenêtre commune.
 */

import { Button, Chip, Dropdown, Input, Label, ScrollShadow, SearchField, Tabs, TextField, Tooltip } from '@heroui/react';
import { Ban, Check, Copy, Headphones, Menu, MessageCircle, MoreVertical, Phone, UserMinus, UserPlus, Users, Video, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useMemo, useState, useSyncExternalStore, type ReactNode } from 'react';

import { useAuth } from '@/hooks/use-auth';
import { serverListStore } from '@/lib/server-list-store';
import { resolveMediaUrl } from '@/lib/api';
import type { AlfyUser } from '@/components/alfy/mock/types';
import { AlfyAvatar } from '@/components/alfy/primitives/alfy-avatar';
import { usePresenceLabels } from '@/components/alfy/primitives/status-dot';
import { useGuildStore } from '@/components/alfy/guild/store';
import { guildUi } from '@/components/alfy/guild/ui';
import { copyText } from '@/components/alfy/guild/actions';
import { joinVoice } from '@/components/alfy/guild/voice/use-guild-voice';
import { callActions } from '@/components/alfy/guild/voice/call-mirror';
import { useTranslation } from '@/components/locale-provider';
import { cn } from '@/lib/utils';
import type { FriendsPendingEntry } from '@/components/alfy/people/friends-view';

type Tab = 'online' | 'all' | 'pending' | 'blocked' | 'add';
const isOnline = (u: AlfyUser) => u.status !== 'offline' && u.status !== 'invisible';
const byName = (a: AlfyUser, b: AlfyUser) => a.displayName.localeCompare(b.displayName, undefined, { sensitivity: 'base' });

/* Styles d'onglet : soulignement plutôt que pastille (voir friends-view pour le pourquoi). */
const TAB_CLASS = 'h-full rounded-none px-2 whitespace-nowrap text-muted data-[selected=true]:text-foreground';
const TAB_INDICATOR_CLASS = 'top-auto bottom-0 h-0.5 rounded-none bg-accent shadow-none';

export interface FriendsHomeProps {
  friends: AlfyUser[];
  pending: FriendsPendingEntry[];
  blocked: AlfyUser[];
  onOpenNav?: () => void;
  onAccept: (requestId: string) => void;
  onDecline: (requestId: string) => void;
  onAddFriend: (username: string) => Promise<boolean> | boolean | void;
  onUnblock: (userId: string) => void;
  onRemove: (userId: string) => void;
  onBlock: (userId: string) => void;
}

export function FriendsHome(p: FriendsHomeProps) {
  const { t, tx } = useTranslation();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('online');
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();

  const match = (u: AlfyUser) => !q || u.displayName.toLowerCase().includes(q) || u.username.toLowerCase().includes(q);
  const friends = useMemo(() => [...p.friends].sort(byName), [p.friends]);
  const online = friends.filter(isOnline);
  const visible = (tab === 'online' ? online : friends).filter(match);
  const incoming = p.pending.filter((e) => e.direction === 'incoming');
  const outgoing = p.pending.filter((e) => e.direction === 'outgoing');
  const incomingCount = incoming.length;

  const openDm = (id: string) => router.push(`/channels/me/${id}`);

  const confirmRemove = async (u: AlfyUser) => {
    const ok = await guildUi.confirm({
      title: tx(t.home.removeTitle, { name: u.displayName }),
      body: tx(t.home.removeBody, { name: u.displayName }),
      confirmLabel: t.home.removeConfirm,
      danger: true,
    });
    if (ok) p.onRemove(u.id);
  };
  const confirmBlock = async (u: AlfyUser) => {
    const ok = await guildUi.confirm({
      title: tx(t.home.blockTitle, { name: u.displayName }),
      body: tx(t.home.blockBody, { name: u.displayName }),
      confirmLabel: t.home.blockConfirm,
      danger: true,
    });
    if (ok) p.onBlock(u.id);
  };

  return (
    <div className="flex h-full min-w-0 flex-1 bg-surface">
      <Tabs selectedKey={tab} onSelectionChange={(k) => setTab(String(k) as Tab)} className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-12 shrink-0 items-center gap-3 border-b border-separator px-4">
          {p.onOpenNav && (
            <Button isIconOnly size="sm" variant="ghost" aria-label={t.chat.openNav} className="-ml-1 shrink-0 text-muted md:hidden" onPress={p.onOpenNav}>
              <Menu className="size-4.5" aria-hidden />
            </Button>
          )}
          <span className="flex shrink-0 items-center gap-2 text-[15px] font-semibold text-foreground">
            <Users className="size-5 text-muted" aria-hidden />
            <span className="hidden sm:inline">{t.home.title}</span>
          </span>
          <span className="hidden h-6 w-px bg-separator sm:block" aria-hidden />
          <Tabs.ListContainer className="h-full min-w-0 rounded-none bg-transparent [&>[data-orientation]]:h-full">
            <Tabs.List aria-label={t.home.tabsAria} className="h-full gap-2 p-0">
              {(['online', 'all', 'pending', 'blocked'] as const).map((id) => (
                <Tabs.Tab key={id} id={id} className={TAB_CLASS}>
                  {t.home.tabs[id]}
                  {id === 'pending' && incomingCount > 0 && (
                    <Chip size="sm" color="danger" variant="primary" className="ml-1.5 min-w-5 justify-center px-1 text-[11px] font-bold tabular-nums">
                      {incomingCount}
                    </Chip>
                  )}
                  <Tabs.Indicator className={TAB_INDICATOR_CLASS} />
                </Tabs.Tab>
              ))}
              <Tabs.Tab id="add" className="sr-only">
                {t.home.addFriend}
              </Tabs.Tab>
            </Tabs.List>
          </Tabs.ListContainer>
          <Button size="sm" variant={tab === 'add' ? 'secondary' : 'primary'} className="ml-auto shrink-0" onPress={() => setTab('add')}>
            <UserPlus className="size-4" aria-hidden />
            <span className="hidden sm:inline">{t.home.addFriend}</span>
          </Button>
        </header>

        <div className="flex min-h-0 flex-1">
          <div className="flex min-w-0 flex-1 flex-col">
            {tab !== 'add' && (
              <div className="shrink-0 px-6 pt-4 pb-2">
                <SearchField value={query} onChange={setQuery} aria-label={t.home.search}>
                  <SearchField.Group>
                    <SearchField.SearchIcon />
                    <SearchField.Input placeholder={t.home.search} />
                    <SearchField.ClearButton />
                  </SearchField.Group>
                </SearchField>
              </div>
            )}

            {(['online', 'all'] as const).map((id) => (
              <Tabs.Panel key={id} id={id} className="min-h-0 flex-1">
                <ScrollShadow className="alfy-thin-scroll h-full overflow-y-auto px-4 pb-6">
                  <SectionTitle>{tx(id === 'online' ? t.home.sectionOnline : t.home.sectionAll, { n: visible.length })}</SectionTitle>
                  {visible.length === 0 ? (
                    <Empty
                      icon={<Users className="size-7" aria-hidden />}
                      title={q ? tx(t.home.empty.search, { q: query.trim() }) : id === 'online' ? t.home.empty.online : t.home.empty.all}
                      hint={q ? undefined : id === 'online' ? t.home.empty.onlineHint : t.home.empty.allHint}
                      action={!q && id === 'all' ? { label: t.home.addFriend, onPress: () => setTab('add') } : undefined}
                    />
                  ) : (
                    <div role="list">
                      {visible.map((u) => (
                        <FriendRow key={u.id} user={u} onOpen={() => openDm(u.id)} onRemove={() => void confirmRemove(u)} onBlock={() => void confirmBlock(u)} />
                      ))}
                    </div>
                  )}
                </ScrollShadow>
              </Tabs.Panel>
            ))}

            <Tabs.Panel id="pending" className="min-h-0 flex-1">
              <ScrollShadow className="alfy-thin-scroll h-full overflow-y-auto px-4 pb-6">
                {p.pending.length === 0 ? (
                  <Empty icon={<UserPlus className="size-7" aria-hidden />} title={t.home.empty.pending} hint={t.home.empty.pendingHint} />
                ) : (
                  <>
                    {incoming.filter((e) => match(e.user)).length > 0 && (
                      <>
                        <SectionTitle>{tx(t.home.sectionIncoming, { n: incoming.length })}</SectionTitle>
                        {incoming.filter((e) => match(e.user)).map((e) => (
                          <PendingRow key={e.requestId || e.user.id} entry={e} onAccept={() => p.onAccept(e.requestId)} onDecline={() => p.onDecline(e.requestId)} />
                        ))}
                      </>
                    )}
                    {outgoing.filter((e) => match(e.user)).length > 0 && (
                      <>
                        <SectionTitle>{tx(t.home.sectionOutgoing, { n: outgoing.length })}</SectionTitle>
                        {outgoing.filter((e) => match(e.user)).map((e) => (
                          <PendingRow key={e.requestId || e.user.id} entry={e} onDecline={() => p.onDecline(e.requestId)} />
                        ))}
                      </>
                    )}
                  </>
                )}
              </ScrollShadow>
            </Tabs.Panel>

            <Tabs.Panel id="blocked" className="min-h-0 flex-1">
              <ScrollShadow className="alfy-thin-scroll h-full overflow-y-auto px-4 pb-6">
                {p.blocked.length === 0 ? (
                  <Empty icon={<Ban className="size-7" aria-hidden />} title={t.home.empty.blocked} hint={t.home.empty.blockedHint} />
                ) : (
                  <>
                    <SectionTitle>{tx(t.home.sectionBlocked, { n: p.blocked.length })}</SectionTitle>
                    {p.blocked.filter(match).map((u) => (
                      <Row key={u.id} user={u} subtitle={`@${u.username}`} dimmed>
                        <Button size="sm" variant="secondary" onPress={() => p.onUnblock(u.id)}>
                          {t.home.unblock}
                        </Button>
                      </Row>
                    ))}
                  </>
                )}
              </ScrollShadow>
            </Tabs.Panel>

            <Tabs.Panel id="add" className="min-h-0 flex-1">
              <AddFriend onAdd={p.onAddFriend} />
            </Tabs.Panel>
          </div>

          <ActiveNow friends={p.friends} />
        </div>
      </Tabs>
    </div>
  );
}

/* ── Briques ───────────────────────────────────────────────────────────────── */

function SectionTitle({ children }: { children: ReactNode }) {
  return <h3 className="px-2 pt-4 pb-2 text-[11px] font-semibold tracking-[0.05em] text-muted uppercase">{children}</h3>;
}

function Empty({ icon, title, hint, action }: { icon: ReactNode; title: string; hint?: string; action?: { label: string; onPress: () => void } }) {
  return (
    <div className="at-fade-up flex flex-col items-center px-6 py-16 text-center">
      <span className="flex size-16 items-center justify-center rounded-2xl bg-surface-secondary text-muted">{icon}</span>
      <p className="mt-4 text-sm font-medium text-foreground">{title}</p>
      {hint && <p className="mt-1 max-w-sm text-sm text-muted">{hint}</p>}
      {action && (
        <Button size="sm" variant="primary" className="mt-4" onPress={action.onPress}>
          <UserPlus className="size-4" aria-hidden />
          {action.label}
        </Button>
      )}
    </div>
  );
}

/** Ligne générique : séparateur fin entre les lignes, effacé au survol (gabarit Discord). */
function Row({
  user,
  subtitle,
  dimmed,
  onOpen,
  children,
}: {
  user: AlfyUser;
  subtitle: ReactNode;
  dimmed?: boolean;
  onOpen?: () => void;
  children?: ReactNode;
}) {
  return (
    <div
      role="listitem"
      onClick={onOpen}
      className={cn(
        'group/row relative flex h-15 items-center gap-3 rounded-lg px-2.5 transition-colors duration-(--dur-1)',
        "before:absolute before:inset-x-2.5 before:top-0 before:h-px before:bg-separator before:content-[''] first:before:hidden hover:before:opacity-0 [&:hover+*]:before:opacity-0",
        onOpen && 'cursor-pointer hover:bg-foreground/5',
      )}
    >
      <AlfyAvatar
        name={user.displayName}
        avatarUrl={user.avatarUrl}
        size="sm"
        status={dimmed ? undefined : user.status}
        statusRingClass="ring-(--surface)"
        className={dimmed ? 'opacity-60' : undefined}
      />
      <div className="min-w-0 flex-1 leading-tight">
        <p className="flex min-w-0 items-baseline gap-1.5">
          <span className="truncate text-[15px] font-semibold text-foreground">{user.displayName}</span>
          <span className="hidden truncate text-sm text-muted group-hover/row:inline">@{user.username}</span>
        </p>
        <p className="mt-0.5 truncate text-[13px] text-muted">{subtitle}</p>
      </div>
      {/* Actions : ne déclenchent pas l'ouverture du MP. */}
      <div className="flex shrink-0 items-center gap-2" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

function FriendRow({ user, onOpen, onRemove, onBlock }: { user: AlfyUser; onOpen: () => void; onRemove: () => void; onBlock: () => void }) {
  const { t, tx } = useTranslation();
  const labels = usePresenceLabels();
  const emoji = (user as AlfyUser & { statusEmoji?: string }).statusEmoji;
  const subtitle = user.customStatus ? (
    <>
      {emoji && <span className="mr-1">{emoji}</span>}
      {user.customStatus}
    </>
  ) : (
    labels[user.status]
  );
  return (
    <Row user={user} subtitle={subtitle} onOpen={onOpen}>
      <Tooltip delay={300} closeDelay={0}>
        <Button isIconOnly size="sm" variant="secondary" aria-label={tx(t.friends.people.sendMessageTo, { name: user.displayName })} onPress={onOpen}>
          <MessageCircle className="size-4.5" aria-hidden />
        </Button>
        <Tooltip.Content>
          <p>{t.home.message}</p>
        </Tooltip.Content>
      </Tooltip>
      <Dropdown>
        <Dropdown.Trigger
          aria-label={t.home.more}
          className="flex size-8 cursor-pointer items-center justify-center rounded-md bg-surface-secondary text-muted outline-none transition-colors duration-(--dur-1) hover:text-foreground focus-visible:ring-2 focus-visible:ring-focus"
        >
          <MoreVertical className="size-4.5" aria-hidden />
        </Dropdown.Trigger>
        <Dropdown.Popover placement="bottom end" className="min-w-52">
          <Dropdown.Menu
            aria-label={t.home.more}
            onAction={(k) => {
              if (k === 'voice') void callActions.current?.initiateCall(user.id, 'voice', undefined, user.displayName);
              else if (k === 'video') void callActions.current?.initiateCall(user.id, 'video', undefined, user.displayName);
              else if (k === 'remove') onRemove();
              else if (k === 'block') onBlock();
            }}
          >
            <Dropdown.Item id="voice" textValue={t.home.voiceCall}>
              <Phone className="size-4" aria-hidden />
              <Label>{t.home.voiceCall}</Label>
            </Dropdown.Item>
            <Dropdown.Item id="video" textValue={t.home.videoCall}>
              <Video className="size-4" aria-hidden />
              <Label>{t.home.videoCall}</Label>
            </Dropdown.Item>
            <Dropdown.Item id="remove" textValue={t.home.removeFriend} variant="danger">
              <UserMinus className="size-4" aria-hidden />
              <Label>{t.home.removeFriend}</Label>
            </Dropdown.Item>
            <Dropdown.Item id="block" textValue={t.home.block} variant="danger">
              <Ban className="size-4" aria-hidden />
              <Label>{t.home.block}</Label>
            </Dropdown.Item>
          </Dropdown.Menu>
        </Dropdown.Popover>
      </Dropdown>
    </Row>
  );
}

function PendingRow({ entry, onAccept, onDecline }: { entry: FriendsPendingEntry; onAccept?: () => void; onDecline: () => void }) {
  const { t } = useTranslation();
  const incoming = entry.direction === 'incoming';
  return (
    <Row user={entry.user} subtitle={incoming ? t.home.incoming : t.home.outgoing} dimmed={!incoming}>
      {incoming && onAccept && (
        <Tooltip delay={300} closeDelay={0}>
          <Button isIconOnly size="sm" variant="secondary" className="text-success" aria-label={t.home.accept} onPress={onAccept}>
            <Check className="size-4.5" aria-hidden />
          </Button>
          <Tooltip.Content>
            <p>{t.home.accept}</p>
          </Tooltip.Content>
        </Tooltip>
      )}
      <Tooltip delay={300} closeDelay={0}>
        <Button isIconOnly size="sm" variant="secondary" className="text-muted hover:text-danger" aria-label={incoming ? t.home.decline : t.home.cancelRequest} onPress={onDecline}>
          <X className="size-4.5" aria-hidden />
        </Button>
        <Tooltip.Content>
          <p>{incoming ? t.home.decline : t.home.cancelRequest}</p>
        </Tooltip.Content>
      </Tooltip>
    </Row>
  );
}

/* ── Ajouter un ami ────────────────────────────────────────────────────────── */

function AddFriend({ onAdd }: { onAdd: FriendsHomeProps['onAddFriend'] }) {
  const { t, tx } = useTranslation();
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; username: string } | null>(null);

  const submit = async () => {
    const username = name.trim().replace(/^@/, '');
    if (!username || sending) return;
    setSending(true);
    try {
      const ok = (await onAdd(username)) !== false;
      setResult({ ok, username });
      if (ok) setName('');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="px-6 py-6">
      <h2 className="text-base font-semibold text-foreground">{t.home.add.title}</h2>
      <p className="mt-1 text-sm text-muted">{t.home.add.desc}</p>
      <form
        className={cn(
          'mt-4 flex items-center gap-2 rounded-xl border bg-field p-1.5 pl-3 transition-[border-color,box-shadow] duration-(--dur-2) focus-within:ring-2 focus-within:ring-focus/40',
          result ? (result.ok ? 'border-success' : 'border-danger') : 'border-border',
        )}
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <TextField
          value={name}
          onChange={(v) => {
            setName(v);
            setResult(null);
          }}
          aria-label={t.home.add.placeholder}
          className="flex-1"
        >
          <Input placeholder={t.home.add.placeholder} autoComplete="off" autoFocus className="border-0 bg-transparent px-0 shadow-none focus:ring-0" />
        </TextField>
        <Button type="submit" size="sm" variant="primary" isDisabled={!name.trim()} isPending={sending}>
          {sending ? t.home.add.sending : t.home.add.send}
        </Button>
      </form>
      {result && (
        <p role="status" className={cn('at-fade-up mt-2 text-sm', result.ok ? 'text-success' : 'text-danger')}>
          {tx(result.ok ? t.home.add.success : t.home.add.failure, { username: result.username })}
        </p>
      )}

      {user && (
        <div className="mt-8 flex items-center gap-3 rounded-xl border border-border bg-surface-secondary p-3">
          <AlfyAvatar name={user.displayName || user.username} avatarUrl={resolveMediaUrl(user.avatarUrl ?? undefined)} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted">{t.home.add.yourName}</p>
            <p className="truncate font-mono text-sm text-foreground">@{user.username}</p>
          </div>
          <Button size="sm" variant="secondary" onPress={() => void copyText(user.username, t.home.add.copied)}>
            <Copy className="size-4" aria-hidden />
            {t.home.add.copy}
          </Button>
        </div>
      )}
    </div>
  );
}

/* ── Activité en cours ─────────────────────────────────────────────────────── */

function ActiveNow({ friends }: { friends: AlfyUser[] }) {
  const { t, tx } = useTranslation();
  const router = useRouter();
  const voice = useGuildStore((s) => s.voice);
  const channels = useGuildStore((s) => s.channels);
  const servers = useSyncExternalStore(serverListStore.subscribe, serverListStore.getSnapshot, serverListStore.getServerSnapshot);

  const activities = useMemo(() => {
    const byId = new Map(friends.map((f) => [f.id, f]));
    const out: { channelId: string; serverId: string; channelName: string; serverName: string; friends: AlfyUser[]; total: number }[] = [];
    for (const [channelId, state] of Object.entries(voice)) {
      const inside = state.participants.map((m) => byId.get(m.userId)).filter((u): u is AlfyUser => Boolean(u));
      if (inside.length === 0) continue;
      const channel = channels[state.serverId]?.find((c) => c.id === channelId);
      out.push({
        channelId,
        serverId: state.serverId,
        channelName: channel?.name ?? '',
        serverName: servers.find((s) => s.id === state.serverId)?.name ?? '',
        friends: inside,
        total: state.participants.length,
      });
    }
    return out;
  }, [friends, voice, channels, servers]);

  return (
    <aside className="hidden w-[360px] shrink-0 flex-col border-l border-separator xl:flex">
      <h2 className="px-4 pt-5 pb-3 text-xl font-bold text-foreground">{t.home.activity.title}</h2>
      <ScrollShadow className="alfy-thin-scroll min-h-0 flex-1 overflow-y-auto px-4 pb-6">
        {activities.length === 0 ? (
          <div className="at-fade-up rounded-xl border border-border bg-surface-secondary/60 p-5 text-center">
            <p className="text-base font-semibold text-foreground">{t.home.activity.emptyTitle}</p>
            <p className="mt-1 text-sm text-muted">{t.home.activity.emptyHint}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {activities.map((a) => (
              <article key={a.channelId} className="at-fade-up rounded-xl border border-border bg-surface-secondary/60 p-3">
                <div className="flex items-center gap-2">
                  <div className="flex -space-x-2">
                    {a.friends.slice(0, 3).map((u) => (
                      <span key={u.id} className="rounded-full ring-2 ring-(--surface-secondary)">
                        <AlfyAvatar name={u.displayName} avatarUrl={u.avatarUrl} size="sm" />
                      </span>
                    ))}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">{a.friends.map((u) => u.displayName).join(', ')}</p>
                    <p className="truncate text-xs text-muted">{a.serverName}</p>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-2 rounded-lg bg-surface px-3 py-2">
                  <Headphones className="size-4 shrink-0 text-success" aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{a.channelName}</p>
                    <p className="text-xs text-muted">{tx(t.home.activity.inChannel, { n: a.total })}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    onPress={() => {
                      void joinVoice(a.serverId, { id: a.channelId, name: a.channelName });
                      router.push(`/channels/server/${a.serverId}/${a.channelId}`);
                    }}
                  >
                    {t.home.activity.join}
                  </Button>
                </div>
              </article>
            ))}
          </div>
        )}
      </ScrollShadow>
    </aside>
  );
}
