'use client';

import { Button, Chip, Input, SearchField, Tabs, TextField, Tooltip, toast } from '@heroui/react';
import { Ban, Check, MessageCircle, Phone, UserPlus, Users, X } from 'lucide-react';
import { useMemo, useState } from 'react';

import { BLOCKED_USER_IDS, PENDING_FRIENDS, USERS, userById } from '@/components/alfy/mock/data';
import type { AlfyUser } from '@/components/alfy/mock/types';
import { AlfyAvatar } from '@/components/alfy/primitives/alfy-avatar';
import { PRESENCE_LABELS } from '@/components/alfy/primitives/status-dot';
import { EmptyState } from '@/components/alfy/primitives/empty-state';
import { SectionLabel } from '@/components/alfy/primitives/section-label';

/** Mock : tout le monde sauf soi, le bot et les bloqués est un ami. */
const MOCK_FRIENDS = USERS.filter(
  (u) => u.id !== 'u-me' && u.id !== 'u-alfybot' && !BLOCKED_USER_IDS.includes(u.id),
);
const MOCK_PENDING = PENDING_FRIENDS.map((p) => ({
  requestId: p.userId,
  user: userById(p.userId),
  direction: p.direction,
}));
const MOCK_BLOCKED = BLOCKED_USER_IDS.map(userById);

const isOnline = (u: AlfyUser) => u.status !== 'offline' && u.status !== 'invisible';

export interface FriendsPendingEntry {
  requestId: string;
  user: AlfyUser;
  direction: 'incoming' | 'outgoing';
}

interface FriendsViewProps {
  onMessage?: (userId: string) => void;
  onOpenNav?: () => void;
  /** Données réelles ; sans elles, jeu de démonstration. */
  friends?: AlfyUser[];
  pending?: FriendsPendingEntry[];
  blocked?: AlfyUser[];
  onAccept?: (requestId: string) => void;
  onDecline?: (requestId: string) => void;
  onAddFriend?: (username: string) => void;
  onUnblock?: (userId: string) => void;
}

function FriendRow({ user, onMessage }: { user: AlfyUser; onMessage?: (id: string) => void }) {
  return (
    <div className="group flex items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-surface-secondary">
      <AlfyAvatar
        name={user.displayName}
        avatarUrl={user.avatarUrl}
        size="sm"
        status={isOnline(user) ? user.status : undefined}
        statusRingClass="ring-surface"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{user.displayName}</p>
        <p className="truncate text-xs text-muted">
          {user.customStatus ?? PRESENCE_LABELS[user.status]}
        </p>
      </div>
      <div className="flex items-center gap-1 opacity-0 transition-opacity duration-100 group-hover:opacity-100 group-focus-within:opacity-100">
        <Tooltip delay={300}>
          <Button
            isIconOnly
            size="sm"
            variant="ghost"
            aria-label={`Envoyer un message à ${user.displayName}`}
            className="rounded-full bg-surface-tertiary text-muted hover:text-foreground"
            onPress={() => onMessage?.(user.id)}
          >
            <MessageCircle className="size-4" />
          </Button>
          <Tooltip.Content>
            <p>Message</p>
          </Tooltip.Content>
        </Tooltip>
        <Tooltip delay={300}>
          <Button
            isIconOnly
            size="sm"
            variant="ghost"
            aria-label={`Appeler ${user.displayName}`}
            className="rounded-full bg-surface-tertiary text-muted hover:text-foreground"
          >
            <Phone className="size-4" />
          </Button>
          <Tooltip.Content>
            <p>Appeler</p>
          </Tooltip.Content>
        </Tooltip>
      </div>
    </div>
  );
}

export function FriendsView({
  onMessage,
  friends,
  pending,
  blocked,
  onAccept,
  onDecline,
  onAddFriend,
  onUnblock,
}: FriendsViewProps) {
  const [query, setQuery] = useState('');

  const FRIENDS = friends ?? MOCK_FRIENDS;
  const PENDING = pending ?? MOCK_PENDING;
  const BLOCKED = blocked ?? MOCK_BLOCKED;

  const filtered = useMemo(
    () =>
      FRIENDS.filter(
        (u) =>
          (u.displayName ?? '').toLowerCase().includes(query.toLowerCase()) ||
          (u.username ?? '').toLowerCase().includes(query.toLowerCase()),
      ),
    [query, FRIENDS],
  );
  const online = filtered.filter(isOnline);
  const offline = filtered.filter((u) => !isOnline(u));

  const [tab, setTab] = useState('online');
  const [addName, setAddName] = useState('');

  return (
    <div className="flex h-full min-w-0 flex-1 flex-col bg-surface">
      <Tabs selectedKey={tab} onSelectionChange={(k) => setTab(String(k))} className="flex h-full flex-col">
        {/* En-tête */}
        <header className="flex h-12 shrink-0 items-center gap-3 border-b border-separator bg-surface/85 px-4 backdrop-blur-sm">
          <div className="flex shrink-0 items-center gap-2">
            <Users className="size-4.5 text-muted" aria-hidden />
            <h2 className="hidden text-sm font-semibold sm:block">Amis</h2>
          </div>
          <div className="hidden h-5 w-px bg-separator sm:block" aria-hidden />
          <Tabs.ListContainer className="min-w-0">
            <Tabs.List aria-label="Filtres d'amis" className="gap-1">
              <Tabs.Tab id="online" className="px-2.5 py-1 text-sm whitespace-nowrap">
                En ligne
                <Tabs.Indicator />
              </Tabs.Tab>
              <Tabs.Tab id="all" className="px-2.5 py-1 text-sm whitespace-nowrap">
                Tous
                <Tabs.Indicator />
              </Tabs.Tab>
              <Tabs.Tab id="pending" className="px-2.5 py-1 text-sm whitespace-nowrap">
                En attente
                {PENDING.length > 0 && (
                  <Chip size="sm" color="danger" variant="soft" className="ml-1 text-[10px]">
                    {PENDING.length}
                  </Chip>
                )}
                <Tabs.Indicator />
              </Tabs.Tab>
              <Tabs.Tab id="blocked" className="px-2.5 py-1 text-sm whitespace-nowrap">
                Bloqués
                <Tabs.Indicator />
              </Tabs.Tab>
            </Tabs.List>
          </Tabs.ListContainer>
          <div className="ml-auto shrink-0">
            <Button size="sm" variant={tab === 'add' ? 'primary' : 'secondary'} onPress={() => setTab('add')}>
              <UserPlus className="size-3.5" />
              <span className="hidden sm:inline">Ajouter un ami</span>
              <span className="sm:hidden">Ajouter</span>
            </Button>
          </div>
        </header>

        {/* Recherche */}
        <div className="shrink-0 px-4 pt-3">
          <SearchField value={query} onChange={setQuery} aria-label="Chercher un ami">
            <SearchField.Group>
              <SearchField.SearchIcon />
              <SearchField.Input placeholder="Chercher un ami…" />
              <SearchField.ClearButton />
            </SearchField.Group>
          </SearchField>
        </div>

        <Tabs.Panel id="online" className="min-h-0 flex-1 overflow-y-auto px-2 py-3">
          <SectionLabel className="mb-1.5 px-3">En ligne — {online.length}</SectionLabel>
          <div className="flex flex-col gap-0.5">
            {online.map((u) => (
              <FriendRow key={u.id} user={u} onMessage={onMessage} />
            ))}
          </div>
          {online.length === 0 && (
            <EmptyState icon={Users} title="Personne en ligne" description="Vos amis apparaîtront ici dès qu'ils se connecteront." />
          )}
        </Tabs.Panel>

        <Tabs.Panel id="all" className="min-h-0 flex-1 overflow-y-auto px-2 py-3">
          <SectionLabel className="mb-1.5 px-3">En ligne — {online.length}</SectionLabel>
          <div className="flex flex-col gap-0.5">
            {online.map((u) => (
              <FriendRow key={u.id} user={u} onMessage={onMessage} />
            ))}
          </div>
          {offline.length > 0 && (
            <>
              <SectionLabel className="mt-4 mb-1.5 px-3">Hors ligne — {offline.length}</SectionLabel>
              <div className="flex flex-col gap-0.5 opacity-60">
                {offline.map((u) => (
                  <FriendRow key={u.id} user={u} onMessage={onMessage} />
                ))}
              </div>
            </>
          )}
        </Tabs.Panel>

        <Tabs.Panel id="pending" className="min-h-0 flex-1 overflow-y-auto px-2 py-3">
          <SectionLabel className="mb-1.5 px-3">En attente — {PENDING.length}</SectionLabel>
          <div className="flex flex-col gap-0.5">
            {PENDING.map(({ requestId, user, direction }) => (
              <div
                key={requestId || user.id}
                className="group flex items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-surface-secondary"
              >
                <AlfyAvatar name={user.displayName} avatarUrl={user.avatarUrl} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{user.displayName}</p>
                  <p className="text-xs text-muted">
                    {direction === 'incoming' ? 'Demande reçue' : 'Demande envoyée'}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  {direction === 'incoming' && (
                    <Tooltip delay={300}>
                      <Button
                        isIconOnly
                        size="sm"
                        variant="ghost"
                        aria-label={`Accepter la demande de ${user.displayName}`}
                        className="rounded-full bg-surface-tertiary text-success"
                        onPress={() => onAccept?.(requestId)}
                      >
                        <Check className="size-4" />
                      </Button>
                      <Tooltip.Content>
                        <p>Accepter</p>
                      </Tooltip.Content>
                    </Tooltip>
                  )}
                  <Tooltip delay={300}>
                    <Button
                      isIconOnly
                      size="sm"
                      variant="ghost"
                      aria-label={
                        direction === 'incoming'
                          ? `Refuser la demande de ${user.displayName}`
                          : `Annuler la demande à ${user.displayName}`
                      }
                      className="rounded-full bg-surface-tertiary text-muted hover:text-danger"
                      onPress={() => onDecline?.(requestId)}
                    >
                      <X className="size-4" />
                    </Button>
                    <Tooltip.Content>
                      <p>{direction === 'incoming' ? 'Refuser' : 'Annuler'}</p>
                    </Tooltip.Content>
                  </Tooltip>
                </div>
              </div>
            ))}
          </div>
        </Tabs.Panel>

        <Tabs.Panel id="blocked" className="min-h-0 flex-1 overflow-y-auto px-2 py-3">
          <SectionLabel className="mb-1.5 px-3">Bloqués — {BLOCKED.length}</SectionLabel>
          {BLOCKED.length === 0 ? (
            <EmptyState icon={Ban} title="Personne de bloqué" description="Les personnes que vous bloquez apparaîtront ici." />
          ) : (
            <div className="flex flex-col gap-0.5">
              {BLOCKED.map((u) => (
                <div key={u.id} className="group flex items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-surface-secondary">
                  <AlfyAvatar name={u.displayName} avatarUrl={u.avatarUrl} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{u.displayName}</p>
                    <p className="text-xs text-muted">@{u.username}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    onPress={() => {
                      onUnblock?.(u.id);
                      toast('Débloqué·e', { description: u.displayName });
                    }}
                  >
                    Débloquer
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Tabs.Panel>

        <Tabs.Panel id="add" className="min-h-0 flex-1 overflow-y-auto px-4 py-6">
          <div className="mx-auto max-w-md">
            <h3 className="text-base font-bold">Ajouter un ami</h3>
            <p className="mt-1 text-sm text-muted">
              Saisissez le nom d&apos;utilisateur exact de la personne. Aucun numéro de téléphone requis.
            </p>
            <form
              className="mt-4 flex items-start gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (!addName.trim()) return;
                onAddFriend?.(addName);
                toast('Demande envoyée', { description: `@${addName.replace(/^@/, '')}` });
                setAddName('');
              }}
            >
              <TextField value={addName} onChange={setAddName} className="flex-1">
                <Input placeholder="pseudo" autoComplete="off" />
              </TextField>
              <Button type="submit" isDisabled={!addName.trim()}>
                <UserPlus className="size-3.5" />
                Envoyer
              </Button>
            </form>
          </div>
        </Tabs.Panel>
      </Tabs>
    </div>
  );
}
