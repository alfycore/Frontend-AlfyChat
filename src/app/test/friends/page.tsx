'use client';

import { useState } from 'react';
import {
  Avatar, Badge, Button, Card, Chip, InputGroup, Modal, ScrollShadow,
  Separator, Surface, Tabs, TextArea, Tooltip,
} from '@heroui/react';
import {
  Search, UserPlus, MessageSquare, MoreHorizontal, Check, X, Clock,
  UserCheck, UserX, Ban, Users, Inbox, Gamepad2, Wifi,
} from 'lucide-react';

// ─── Fake Data ───────────────────────────────────────────────────────────────

type FriendStatus = 'online' | 'idle' | 'dnd' | 'offline';

interface Friend {
  id: string;
  name: string;
  username: string;
  avatar: string;
  status: FriendStatus;
  activity?: string;
  mutualServers?: number;
}

const FRIENDS: Friend[] = [
  { id: '1', name: 'Alice Martin', username: 'alice', avatar: 'https://i.pravatar.cc/150?u=alice', status: 'online', activity: 'Visual Studio Code', mutualServers: 3 },
  { id: '2', name: 'Bob Dupont', username: 'bob_d', avatar: 'https://i.pravatar.cc/150?u=bob', status: 'idle', mutualServers: 2 },
  { id: '3', name: 'Clara Petit', username: 'clara_p', avatar: 'https://i.pravatar.cc/150?u=clara', status: 'online', activity: 'Spotify — Daft Punk', mutualServers: 1 },
  { id: '4', name: 'David Moreau', username: 'david.m', avatar: 'https://i.pravatar.cc/150?u=david', status: 'offline', mutualServers: 4 },
  { id: '5', name: 'Emma Leroy', username: 'emma_l', avatar: 'https://i.pravatar.cc/150?u=emma', status: 'online', activity: 'Figma', mutualServers: 3 },
  { id: '6', name: 'François Roux', username: 'franky', avatar: 'https://i.pravatar.cc/150?u=francois', status: 'dnd', mutualServers: 1 },
  { id: '7', name: 'Gabrielle Blanc', username: 'gab_b', avatar: 'https://i.pravatar.cc/150?u=gabrielle', status: 'online', mutualServers: 2 },
  { id: '8', name: 'Hugo Fabre', username: 'hugo.f', avatar: 'https://i.pravatar.cc/150?u=hugo', status: 'offline', mutualServers: 1 },
  { id: '9', name: 'Inès Vidal', username: 'ines_v', avatar: 'https://i.pravatar.cc/150?u=ines', status: 'online', activity: 'League of Legends', mutualServers: 2 },
  { id: '10', name: 'Julien Garnier', username: 'jul_g', avatar: 'https://i.pravatar.cc/150?u=julien', status: 'idle', mutualServers: 1 },
];

const PENDING_INCOMING = [
  { id: 'p1', name: 'Lucas Bernard', username: 'lucas_b', avatar: 'https://i.pravatar.cc/150?u=lucas', mutualServers: 1 },
  { id: 'p2', name: 'Marie Dubois', username: 'marie.d', avatar: 'https://i.pravatar.cc/150?u=marie', mutualServers: 3 },
];

const PENDING_OUTGOING = [
  { id: 'o1', name: 'Nathan Costa', username: 'nat_costa', avatar: 'https://i.pravatar.cc/150?u=nathan', mutualServers: 0 },
];

const STATUS_MAP: Record<FriendStatus, { color: string; label: string }> = {
  online: { color: 'bg-green-500', label: 'En ligne' },
  idle: { color: 'bg-yellow-500', label: 'Absent' },
  dnd: { color: 'bg-red-500', label: 'Ne pas déranger' },
  offline: { color: 'bg-gray-400', label: 'Hors ligne' },
};

// ─── Friend Row ──────────────────────────────────────────────────────────────

function FriendRow({ friend, actions }: { friend: Friend; actions: React.ReactNode }) {
  return (
    <div className="group flex items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-surface-secondary/40">
      <div className="relative">
        <Avatar>
          <Avatar.Image src={friend.avatar} />
          <Avatar.Fallback>{friend.name[0]}</Avatar.Fallback>
        </Avatar>
        <span className={`absolute -bottom-0.5 -right-0.5 size-3 rounded-full ring-2 ring-surface ${STATUS_MAP[friend.status].color}`} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <p className="truncate text-sm font-semibold">{friend.name}</p>
          <span className="text-[11px] text-muted">@{friend.username}</span>
        </div>
        {friend.activity ? (
          <p className="truncate text-xs text-muted">{friend.activity}</p>
        ) : (
          <p className="text-xs text-muted">{STATUS_MAP[friend.status].label}</p>
        )}
      </div>
      <div className="flex gap-1">
        {actions}
      </div>
    </div>
  );
}

// ─── Add Friend Modal ────────────────────────────────────────────────────────

function AddFriendSection() {
  const [username, setUsername] = useState('');

  return (
    <Surface variant="secondary" className="rounded-xl p-5">
      <h3 className="text-sm font-bold uppercase">Ajouter un ami</h3>
      <p className="mt-1 text-xs text-muted">
        Tu peux ajouter des amis avec leur nom d&apos;utilisateur AlfyChat.
      </p>
      <div className="mt-4 flex gap-2">
        <InputGroup className="flex-1">
          <InputGroup.Input
            placeholder="Entrer un nom d'utilisateur"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </InputGroup>
        <Button size="sm" isDisabled={!username.trim()}>
          Envoyer une demande
        </Button>
      </div>
    </Surface>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function TestFriendsPage() {
  const [search, setSearch] = useState('');

  const onlineFriends = FRIENDS.filter(f => f.status !== 'offline');
  const allFriends = FRIENDS;
  const filteredFriends = (friends: Friend[]) =>
    search ? friends.filter(f => f.name.toLowerCase().includes(search.toLowerCase()) || f.username.toLowerCase().includes(search.toLowerCase())) : friends;

  return (
    <div className="flex h-[calc(100vh-49px)]">
      {/* Sidebar — Quick Actions */}
      <div className="flex w-60 shrink-0 flex-col border-r border-border/20 bg-surface-secondary/40">
        <div className="border-b border-border/20 px-3 py-3">
          <InputGroup variant="secondary">
            <InputGroup.Input placeholder="Chercher une conversation" className="text-xs" />
          </InputGroup>
        </div>

        <ScrollShadow className="flex-1 p-2">
          <Button fullWidth variant="secondary" size="sm">
            <Users className="size-4" /> Amis
          </Button>
          <Button fullWidth variant="ghost" size="sm">
            <Inbox className="size-4" /> Nitro
          </Button>

          <Separator className="my-2" />

          <p className="mb-1 px-2 text-[10px] font-bold uppercase tracking-widest text-muted">
            Messages privés
          </p>
          {FRIENDS.slice(0, 5).map(f => (
            <Button key={f.id} fullWidth variant="ghost" size="sm">
              <div className="relative">
                <Avatar size="sm">
                  <Avatar.Image src={f.avatar} />
                  <Avatar.Fallback>{f.name[0]}</Avatar.Fallback>
                </Avatar>
                <span className={`absolute -bottom-0.5 -right-0.5 size-2 rounded-full ring-[1.5px] ring-surface-secondary ${STATUS_MAP[f.status].color}`} />
              </div>
              <div className="min-w-0 flex-1 text-left">
                <p className="truncate text-xs">{f.name}</p>
                {f.activity && <p className="truncate text-[10px] text-muted">{f.activity}</p>}
              </div>
            </Button>
          ))}
        </ScrollShadow>
      </div>

      {/* Main content */}
      <div className="flex flex-1 flex-col">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-border/20 px-4 py-2">
          <Users className="size-5 text-muted" />
          <span className="font-bold">Amis</span>
          <Separator orientation="vertical" className="h-5" />

          <Tabs defaultSelectedKey="online">
            <Tabs.ListContainer>
              <Tabs.List aria-label="Filtres amis">
                <Tabs.Tab id="online">En ligne<Tabs.Indicator /></Tabs.Tab>
                <Tabs.Tab id="all">Tous<Tabs.Indicator /></Tabs.Tab>
                <Tabs.Tab id="pending">
                  En attente
                  {(PENDING_INCOMING.length + PENDING_OUTGOING.length) > 0 && (
                    <Chip size="sm" color="danger" className="ml-1">{PENDING_INCOMING.length + PENDING_OUTGOING.length}</Chip>
                  )}
                  <Tabs.Indicator />
                </Tabs.Tab>
                <Tabs.Tab id="blocked">Bloqués<Tabs.Indicator /></Tabs.Tab>
                <Tabs.Tab id="add">
                  <span className="text-green-500 font-semibold">Ajouter un ami</span>
                  <Tabs.Indicator />
                </Tabs.Tab>
              </Tabs.List>
            </Tabs.ListContainer>

            {/* Search */}
            <div className="ml-auto">
              <InputGroup variant="secondary" className="w-52">
                <InputGroup.Input
                  placeholder="Rechercher"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="text-xs"
                />
                <InputGroup.Suffix><Search className="size-3.5 text-muted" /></InputGroup.Suffix>
              </InputGroup>
            </div>

            {/* Tab panels */}
            <div className="contents">
              {/* Online tab */}
              <Tabs.Panel id="online" className="flex-1 overflow-hidden">
                <ScrollShadow className="h-[calc(100vh-110px)] px-6 py-4">
                  <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-muted">
                    En ligne — {filteredFriends(onlineFriends).length}
                  </p>
                  <div className="space-y-0.5">
                    {filteredFriends(onlineFriends).map(f => (
                      <FriendRow
                        key={f.id}
                        friend={f}
                        actions={
                          <>
                            <Tooltip delay={0}><Button isIconOnly size="sm" variant="ghost"><MessageSquare className="size-4" /></Button><Tooltip.Content>Message</Tooltip.Content></Tooltip>
                            <Tooltip delay={0}><Button isIconOnly size="sm" variant="ghost"><MoreHorizontal className="size-4" /></Button><Tooltip.Content>Plus</Tooltip.Content></Tooltip>
                          </>
                        }
                      />
                    ))}
                  </div>
                </ScrollShadow>
              </Tabs.Panel>

              {/* All tab */}
              <Tabs.Panel id="all" className="flex-1 overflow-hidden">
                <ScrollShadow className="h-[calc(100vh-110px)] px-6 py-4">
                  <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-muted">
                    Tous les amis — {filteredFriends(allFriends).length}
                  </p>
                  <div className="space-y-0.5">
                    {filteredFriends(allFriends).map(f => (
                      <FriendRow
                        key={f.id}
                        friend={f}
                        actions={
                          <>
                            <Tooltip delay={0}><Button isIconOnly size="sm" variant="ghost"><MessageSquare className="size-4" /></Button><Tooltip.Content>Message</Tooltip.Content></Tooltip>
                            <Tooltip delay={0}><Button isIconOnly size="sm" variant="ghost"><MoreHorizontal className="size-4" /></Button><Tooltip.Content>Plus</Tooltip.Content></Tooltip>
                          </>
                        }
                      />
                    ))}
                  </div>
                </ScrollShadow>
              </Tabs.Panel>

              {/* Pending tab */}
              <Tabs.Panel id="pending" className="flex-1 overflow-hidden">
                <ScrollShadow className="h-[calc(100vh-110px)] px-6 py-4">
                  {PENDING_INCOMING.length > 0 && (
                    <>
                      <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-muted">
                        Entrantes — {PENDING_INCOMING.length}
                      </p>
                      <div className="space-y-0.5">
                        {PENDING_INCOMING.map(p => (
                          <div key={p.id} className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-surface-secondary/40">
                            <Avatar>
                              <Avatar.Image src={p.avatar} />
                              <Avatar.Fallback>{p.name[0]}</Avatar.Fallback>
                            </Avatar>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold">{p.name}</p>
                              <p className="text-xs text-muted">Demande d&apos;ami entrante</p>
                            </div>
                            <div className="flex gap-1">
                              <Tooltip delay={0}>
                                <Button isIconOnly size="sm" variant="ghost"><Check className="size-4 text-green-500" /></Button>
                                <Tooltip.Content>Accepter</Tooltip.Content>
                              </Tooltip>
                              <Tooltip delay={0}>
                                <Button isIconOnly size="sm" variant="ghost"><X className="size-4 text-red-400" /></Button>
                                <Tooltip.Content>Refuser</Tooltip.Content>
                              </Tooltip>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                  {PENDING_OUTGOING.length > 0 && (
                    <>
                      <p className="mb-2 mt-4 text-[11px] font-bold uppercase tracking-widest text-muted">
                        Sortantes — {PENDING_OUTGOING.length}
                      </p>
                      <div className="space-y-0.5">
                        {PENDING_OUTGOING.map(p => (
                          <div key={p.id} className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-surface-secondary/40">
                            <Avatar>
                              <Avatar.Image src={p.avatar} />
                              <Avatar.Fallback>{p.name[0]}</Avatar.Fallback>
                            </Avatar>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold">{p.name}</p>
                              <p className="text-xs text-muted">Demande d&apos;ami envoyée</p>
                            </div>
                            <Tooltip delay={0}>
                              <Button isIconOnly size="sm" variant="ghost"><X className="size-4 text-red-400" /></Button>
                              <Tooltip.Content>Annuler</Tooltip.Content>
                            </Tooltip>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </ScrollShadow>
              </Tabs.Panel>

              {/* Blocked tab */}
              <Tabs.Panel id="blocked" className="flex-1 overflow-hidden">
                <div className="flex h-[calc(100vh-110px)] flex-col items-center justify-center text-center">
                  <Ban className="mb-3 size-12 text-muted/30" />
                  <p className="text-sm font-semibold">Aucun utilisateur bloqué</p>
                  <p className="text-xs text-muted">Tu n&apos;as bloqué personne. Tant mieux !</p>
                </div>
              </Tabs.Panel>

              {/* Add friend tab */}
              <Tabs.Panel id="add" className="flex-1 overflow-hidden">
                <div className="px-6 py-6">
                  <AddFriendSection />
                </div>
              </Tabs.Panel>
            </div>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
