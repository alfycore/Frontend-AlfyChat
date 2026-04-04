'use client';

import { useState, useRef, useEffect } from 'react';
import {
  Avatar, Badge, Button, Chip, InputGroup, Modal, Popover, ScrollShadow,
  Separator, Surface, TextField, Tooltip,
} from '@heroui/react';
import {
  Hash, Volume2, ChevronDown, ChevronRight, Search, Pin, Users, Bell,
  BellOff, Settings, Smile, Reply, Ellipsis, Paperclip, SendHorizonal,
  SmilePlus, ImageIcon, Plus, Mic, MicOff, Headphones, PhoneOff,
  AtSign, Inbox, HelpCircle, Gift, Sticker, ArrowDown, CalendarDays,
} from 'lucide-react';

// ─── Fake Data ───────────────────────────────────────────────────────────────

const ME = { id: 'me', name: 'Vous', username: 'wiltark', avatar: 'https://i.pravatar.cc/150?u=me', status: 'online' };

const USERS = [
  { id: '1', name: 'Alice Martin', username: 'alice', avatar: 'https://i.pravatar.cc/150?u=alice', banner: 'https://picsum.photos/seed/alice/340/120', status: 'online', role: 'Admin', activity: 'Visual Studio Code', serverInfo: 'AlfyCore Ops/HQ 🤓👌', badges: ['😎', '🎮', '🔧', '🤖'], tags: ['Gaming', 'Musique', 'Tech'], joinDays: 22 },
  { id: '2', name: 'Bob Dupont', username: 'bob_d', avatar: 'https://i.pravatar.cc/150?u=bob', banner: 'https://picsum.photos/seed/bob/340/120', status: 'idle', role: 'Modérateur', activity: '', serverInfo: 'Modération HQ 🛡️', badges: ['🛡️', '⚡'], tags: ['Modération', 'Dev'], joinDays: 145 },
  { id: '3', name: 'Clara Petit', username: 'clara_p', avatar: 'https://i.pravatar.cc/150?u=clara', banner: 'https://picsum.photos/seed/clara/340/120', status: 'online', role: 'Membre', activity: 'Spotify - Daft Punk', serverInfo: 'Music Lounge 🎶🎧', badges: ['🎵', '🎧'], tags: ['Musique', 'Chill'], joinDays: 58 },
  { id: '4', name: 'David Moreau', username: 'david.m', avatar: 'https://i.pravatar.cc/150?u=david', banner: 'https://picsum.photos/seed/david/340/120', status: 'offline', role: 'Membre', activity: '', serverInfo: 'Dev Backend 💻', badges: ['💻'], tags: ['Dev'], joinDays: 200 },
  { id: '5', name: 'Emma Leroy', username: 'emma_l', avatar: 'https://i.pravatar.cc/150?u=emma', banner: 'https://picsum.photos/seed/emma/340/120', status: 'online', role: 'Admin', activity: 'Figma', serverInfo: 'Design Studio ✨🎨', badges: ['🎨', '✨', '👑'], tags: ['Design', 'UI/UX', 'Art'], joinDays: 312 },
  { id: '6', name: 'François Roux', username: 'franky', avatar: 'https://i.pravatar.cc/150?u=francois', banner: 'https://picsum.photos/seed/francois/340/120', status: 'dnd', role: 'Membre', activity: '', serverInfo: 'Gaming Arena 🔥', badges: ['🔥'], tags: ['Gaming'], joinDays: 15 },
  { id: '7', name: 'Gabrielle Blanc', username: 'gab_b', avatar: 'https://i.pravatar.cc/150?u=gabrielle', banner: 'https://picsum.photos/seed/gab/340/120', status: 'online', role: 'Membre', activity: '', serverInfo: 'Book Club 📖🌸', badges: ['🌸', '📚'], tags: ['Lecture', 'Chill'], joinDays: 90 },
  { id: '8', name: 'Hugo Fabre', username: 'hugo.f', avatar: 'https://i.pravatar.cc/150?u=hugo', banner: 'https://picsum.photos/seed/hugo/340/120', status: 'offline', role: 'Membre', activity: '', serverInfo: 'Sport League 🎯⚽', badges: ['🎯'], tags: ['Gaming', 'Sport'], joinDays: 42 },
];

const SERVERS = [
  { id: 's1', name: 'AlfyChat Dev', initial: 'AD', color: 'from-violet-500 to-indigo-600' },
  { id: 's2', name: 'Gaming FR', initial: 'GF', color: 'from-green-500 to-emerald-600' },
  { id: 's3', name: 'Design System', initial: 'DS', color: 'from-pink-500 to-rose-600' },
  { id: 's4', name: 'Music Lounge', initial: 'ML', color: 'from-amber-500 to-orange-600' },
];

const CHANNELS = {
  text: [
    { id: 'c1', name: 'général', unread: 0 },
    { id: 'c2', name: 'annonces', unread: 2 },
    { id: 'c3', name: 'dev-frontend', unread: 0 },
    { id: 'c4', name: 'dev-backend', unread: 5 },
    { id: 'c5', name: 'design', unread: 0 },
    { id: 'c6', name: 'off-topic', unread: 1 },
  ],
  voice: [
    { id: 'v1', name: 'Vocal Général', users: [USERS[0], USERS[2]] },
    { id: 'v2', name: 'Dev Session', users: [] },
    { id: 'v3', name: 'AFK', users: [USERS[5]] },
  ],
};

const MESSAGES = [
  { id: '1', user: USERS[0], content: 'Hey tout le monde ! Je viens de push la nouvelle version du design system.', time: '14:02', date: 'Aujourd\'hui' },
  { id: '2', user: USERS[2], content: 'Super Alice ! J\'ai hâte de voir ça. Les nouveaux composants HeroUI sont magnifiques.', time: '14:05', date: 'Aujourd\'hui' },
  { id: '3', user: USERS[4], content: 'J\'ai mis à jour les maquettes Figma aussi. Le lien est dans #design', time: '14:08', date: 'Aujourd\'hui' },
  { id: '4', user: USERS[0], content: 'Parfait ! On fait un point à 15h en vocal ?', time: '14:10', date: 'Aujourd\'hui' },
  { id: '5', user: USERS[1], content: 'Je serai là 👍', time: '14:11', date: 'Aujourd\'hui' },
  { id: '6', user: USERS[2], content: 'Moi aussi ! En attendant voici un aperçu de ce que j\'ai fait côté animations :', time: '14:12', date: 'Aujourd\'hui' },
  { id: '6b', user: USERS[2], content: '', time: '14:12', date: 'Aujourd\'hui', attachment: { name: 'preview-animations.mp4', size: '12.4 MB', type: 'video' } },
  { id: '7', user: ME, content: 'Trop bien ! Le parallax sur le scroll est incroyable 🔥', time: '14:15', date: 'Aujourd\'hui' },
  { id: '8', user: USERS[4], content: 'Merci ! J\'ai aussi ajouté un système de thème dynamique. On peut changer les couleurs en temps réel maintenant.', time: '14:18', date: 'Aujourd\'hui' },
  { id: '9', user: USERS[0], content: 'Est-ce que quelqu\'un peut review ma PR #247 ? C\'est le refactor du système de notifications.', time: '14:22', date: 'Aujourd\'hui' },
  { id: '10', user: ME, content: 'Je m\'en occupe après le déjeuner !', time: '14:23', date: 'Aujourd\'hui' },
  { id: '11', user: USERS[6], content: 'Bienvenue aux nouveaux membres du serveur ! N\'hésitez pas à vous présenter dans #général 😊', time: '14:30', date: 'Aujourd\'hui' },
];

const STATUS: Record<string, { color: string; label: string }> = {
  online: { color: 'bg-green-500', label: 'En ligne' },
  idle: { color: 'bg-yellow-500', label: 'Absent' },
  dnd: { color: 'bg-red-500', label: 'Ne pas déranger' },
  offline: { color: 'bg-gray-400', label: 'Hors ligne' },
};

// ─── Server List (leftmost bar) ──────────────────────────────────────────────

function ServerList({ active, onSelect }: { active: string; onSelect: (id: string) => void }) {
  return (
    <div className="flex w-[72px] shrink-0 flex-col items-center gap-2 bg-surface/60 py-3">
      {/* DM button */}
      <Tooltip placement="right" delay={0}>
        <Button
          isIconOnly
          variant={active === 'dm' ? 'secondary' : 'ghost'}
          size="lg"
          onPress={() => onSelect('dm')}
        >
          <svg viewBox="0 0 24 24" className="size-6 fill-current"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z" /></svg>
        </Button>
        <Tooltip.Content>Messages privés</Tooltip.Content>
      </Tooltip>

      <Separator className="mx-auto w-8" />

      {/* Servers */}
      {SERVERS.map(server => (
        <Tooltip key={server.id} placement="right" delay={0}>
          <Button
            isIconOnly
            variant={active === server.id ? 'secondary' : 'ghost'}
            size="lg"
            onPress={() => onSelect(server.id)}
          >
            <span className={`flex size-10 items-center justify-center rounded-2xl bg-linear-to-br ${server.color} text-sm font-bold text-white transition-all ${active === server.id ? 'rounded-xl' : 'rounded-2xl hover:rounded-xl'}`}>
              {server.initial}
            </span>
          </Button>
          <Tooltip.Content>{server.name}</Tooltip.Content>
        </Tooltip>
      ))}

      <Separator className="mx-auto w-8" />

      {/* Add server */}
      <Tooltip placement="right" delay={0}>
        <Button isIconOnly variant="ghost" size="lg">
          <Plus className="size-5 text-green-500" />
        </Button>
        <Tooltip.Content>Ajouter un serveur</Tooltip.Content>
      </Tooltip>
    </div>
  );
}

// ─── Channel List ────────────────────────────────────────────────────────────

function ChannelList({
  selectedChannel,
  onSelectChannel,
}: {
  selectedChannel: string;
  onSelectChannel: (id: string) => void;
}) {
  const [textOpen, setTextOpen] = useState(true);
  const [voiceOpen, setVoiceOpen] = useState(true);

  return (
    <div className="flex w-60 shrink-0 flex-col border-r border-border/20 bg-surface-secondary/40">
      {/* Server header */}
      <div className="flex items-center justify-between border-b border-border/20 px-4 py-3">
        <span className="text-sm font-bold">AlfyChat Dev</span>
        <Button isIconOnly variant="ghost" size="sm"><ChevronDown className="size-4" /></Button>
      </div>

      {/* Channels */}
      <ScrollShadow className="flex-1 p-2">
        {/* Text channels */}
        <button
          className="flex w-full items-center gap-1 px-1 py-1 text-[11px] font-bold uppercase tracking-widest text-muted"
          onClick={() => setTextOpen(!textOpen)}
        >
          {textOpen ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
          Salons textuels
        </button>
        {textOpen && CHANNELS.text.map(ch => (
          <Button
            key={ch.id}
            fullWidth
            variant={selectedChannel === ch.id ? 'secondary' : 'ghost'}
            size="sm"
            onPress={() => onSelectChannel(ch.id)}
          >
            <Hash className="size-4 shrink-0 text-muted" />
            <span className="flex-1 text-left text-[13px]">{ch.name}</span>
            {ch.unread > 0 && <Chip size="sm" color="danger">{ch.unread}</Chip>}
          </Button>
        ))}

        <div className="mt-2" />

        {/* Voice channels */}
        <button
          className="flex w-full items-center gap-1 px-1 py-1 text-[11px] font-bold uppercase tracking-widest text-muted"
          onClick={() => setVoiceOpen(!voiceOpen)}
        >
          {voiceOpen ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
          Salons vocaux
        </button>
        {voiceOpen && CHANNELS.voice.map(vc => (
          <div key={vc.id}>
            <Button fullWidth variant="ghost" size="sm">
              <Volume2 className="size-4 shrink-0 text-muted" />
              <span className="flex-1 text-left text-[13px]">{vc.name}</span>
            </Button>
            {/* Connected users */}
            {vc.users.length > 0 && (
              <div className="ml-7 space-y-0.5 pb-1">
                {vc.users.map(u => (
                  <div key={u.id} className="flex items-center gap-2 rounded-md px-2 py-0.5 text-[11px] text-muted">
                    <Avatar size="sm" className="size-5">
                      <Avatar.Image src={u.avatar} />
                      <Avatar.Fallback>{u.name[0]}</Avatar.Fallback>
                    </Avatar>
                    {u.name.split(' ')[0]}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </ScrollShadow>

      {/* User panel bottom */}
      <div className="flex items-center gap-2 border-t border-border/20 bg-surface/40 px-2 py-2">
        <div className="relative">
          <Avatar size="sm">
            <Avatar.Image src={ME.avatar} />
            <Avatar.Fallback>W</Avatar.Fallback>
          </Avatar>
          <span className={`absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full ring-2 ring-surface ${STATUS.online.color}`} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold">{ME.name}</p>
          <p className="truncate text-[10px] text-muted">En ligne</p>
        </div>
        <Button isIconOnly variant="ghost" size="sm"><Mic className="size-3.5" /></Button>
        <Button isIconOnly variant="ghost" size="sm"><Headphones className="size-3.5" /></Button>
        <Button isIconOnly variant="ghost" size="sm"><Settings className="size-3.5" /></Button>
      </div>
    </div>
  );
}

// ─── Chat Area ───────────────────────────────────────────────────────────────

function ChatArea() {
  const [message, setMessage] = useState('');
  const channelName = 'général';

  return (
    <div className="flex flex-1 flex-col">
      {/* Channel header */}
      <div className="flex items-center gap-2 border-b border-border/20 px-4 py-2">
        <Hash className="size-5 text-muted" />
        <span className="font-bold">{channelName}</span>
        <Separator orientation="vertical" className="h-5" />
        <span className="text-xs text-muted">Discussion libre pour l&apos;équipe de dev</span>

        <div className="ml-auto flex items-center gap-0.5">
          <Tooltip delay={0}><Button isIconOnly size="sm" variant="ghost"><Bell className="size-4" /></Button><Tooltip.Content>Notifications</Tooltip.Content></Tooltip>
          <Tooltip delay={0}><Button isIconOnly size="sm" variant="ghost"><Pin className="size-4" /></Button><Tooltip.Content>Épinglés</Tooltip.Content></Tooltip>
          <Tooltip delay={0}><Button isIconOnly size="sm" variant="ghost"><Users className="size-4" /></Button><Tooltip.Content>Membres</Tooltip.Content></Tooltip>
          <InputGroup variant="secondary" className="ml-1 w-44">
            <InputGroup.Input placeholder="Rechercher" className="text-xs" />
            <InputGroup.Suffix><Search className="size-3.5 text-muted" /></InputGroup.Suffix>
          </InputGroup>
          <Tooltip delay={0}><Button isIconOnly size="sm" variant="ghost"><Inbox className="size-4" /></Button><Tooltip.Content>Boîte de réception</Tooltip.Content></Tooltip>
          <Tooltip delay={0}><Button isIconOnly size="sm" variant="ghost"><HelpCircle className="size-4" /></Button><Tooltip.Content>Aide</Tooltip.Content></Tooltip>
        </div>
      </div>

      {/* Messages */}
      <ScrollShadow className="flex-1 overflow-y-auto px-4 py-2">
        {/* Welcome message */}
        <div className="mb-6 mt-4">
          <div className="mb-2 flex size-16 items-center justify-center rounded-full bg-surface-secondary">
            <Hash className="size-8 text-muted" />
          </div>
          <h2 className="text-2xl font-bold">Bienvenue dans #{channelName}</h2>
          <p className="text-sm text-muted">C&apos;est le début du salon #{channelName}. Bonne discussion !</p>
        </div>

        <Separator className="my-4" />

        {/* Date separator */}
        <div className="relative my-4 flex items-center justify-center">
          <Separator />
          <span className="absolute bg-background px-3 text-[11px] font-semibold text-muted">Aujourd&apos;hui</span>
        </div>

        {/* Messages */}
        <div className="space-y-1">
          {MESSAGES.map((msg, idx) => {
            const prevMsg = idx > 0 ? MESSAGES[idx - 1] : null;
            const isGrouped = prevMsg?.user.id === msg.user.id;

            return (
              <div
                key={msg.id}
                className={`group flex gap-4 rounded-lg px-2 py-0.5 hover:bg-surface-secondary/30 ${!isGrouped && idx > 0 ? 'mt-3' : ''}`}
              >
                {/* Avatar or spacer */}
                <div className="w-10 shrink-0 pt-0.5">
                  {!isGrouped && (
                    <Avatar>
                      <Avatar.Image src={msg.user.avatar} />
                      <Avatar.Fallback>{msg.user.name[0]}</Avatar.Fallback>
                    </Avatar>
                  )}
                  {isGrouped && (
                    <span className="hidden text-[10px] text-muted group-hover:block">{msg.time}</span>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  {!isGrouped && (
                    <div className="flex items-baseline gap-2">
                      <span className="text-sm font-semibold text-foreground hover:underline cursor-pointer">
                        {msg.user.id === ME.id ? ME.name : msg.user.name}
                      </span>
                      <span className="text-[10px] text-muted">{msg.time}</span>
                    </div>
                  )}
                  {msg.content && (
                    <p className="text-[14px] leading-relaxed text-foreground/90">{msg.content}</p>
                  )}
                  {msg.attachment && (
                    <Surface variant="secondary" className="mt-1 inline-flex items-center gap-3 rounded-xl px-4 py-3">
                      <div className="flex size-10 items-center justify-center rounded-lg bg-accent/10 text-accent">
                        <ImageIcon className="size-5" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-accent">{msg.attachment.name}</p>
                        <p className="text-[11px] text-muted">{msg.attachment.size}</p>
                      </div>
                    </Surface>
                  )}
                </div>

                {/* Hover toolbar */}
                <div className="mt-0.5 flex shrink-0 gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                  <Button isIconOnly size="sm" variant="ghost"><SmilePlus className="size-3.5" /></Button>
                  <Button isIconOnly size="sm" variant="ghost"><Reply className="size-3.5" /></Button>
                  <Button isIconOnly size="sm" variant="ghost"><Ellipsis className="size-3.5" /></Button>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollShadow>

      {/* Typing indicator */}
      <div className="px-4">
        <p className="h-5 text-[11px] text-muted">
          <strong>Alice</strong> est en train d&apos;écrire...
        </p>
      </div>

      {/* Input area */}
      <div className="mx-4 mb-2 mt-1">
        <TextField fullWidth aria-label="Message input" name="message">
          <InputGroup fullWidth size="xl" className="rounded-lg">
            <InputGroup.Prefix className="px-1 py-0">
              <Tooltip delay={0}>
                <Button isIconOnly aria-label="Joindre un fichier" size="sm" variant="ghost">
                  <Plus className="size-5" />
                </Button>
                <Tooltip.Content>
                  <p className="text-xs">Joindre un fichier</p>
                </Tooltip.Content>
              </Tooltip>
            </InputGroup.Prefix>
            <InputGroup.Input
              placeholder={`Envoyer un message dans #${channelName}`}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
            <InputGroup.Suffix className="flex items-center gap-1 px-1 py-0">
              <Tooltip delay={0}>
                <Button isIconOnly aria-label="Cadeau" size="sm" variant="ghost">
                  <Gift className="size-5" />
                </Button>
                <Tooltip.Content>
                  <p className="text-xs">Cadeau</p>
                </Tooltip.Content>
              </Tooltip>
              <Tooltip delay={0}>
                <Button isIconOnly aria-label="Sticker" size="sm" variant="ghost">
                  <Sticker className="size-5" />
                </Button>
                <Tooltip.Content>
                  <p className="text-xs">Sticker</p>
                </Tooltip.Content>
              </Tooltip>
              <Tooltip delay={0}>
                <Button isIconOnly aria-label="Emoji" size="sm" variant="ghost">
                  <Smile className="size-5" />
                </Button>
                <Tooltip.Content>
                  <p className="text-xs">Emoji</p>
                </Tooltip.Content>
              </Tooltip>
            </InputGroup.Suffix>
          </InputGroup>
        </TextField>
      </div>
    </div>
  );
}

// ─── Member List ─────────────────────────────────────────────────────────────

function MemberList() {
  const online = USERS.filter(u => u.status === 'online' || u.status === 'dnd');
  const offline = USERS.filter(u => u.status === 'offline' || u.status === 'idle');

  function MemberRow({ user }: { user: typeof USERS[0] }) {
    const statusColor = user.status === 'online' ? 'success' : user.status === 'dnd' ? 'danger' : user.status === 'idle' ? 'warning' : 'default';
    return (
      <Popover>
        <Button fullWidth variant="ghost" size="sm">
          <div className="relative shrink-0">
            <Avatar size="sm">
              <Avatar.Image src={user.avatar} />
              <Avatar.Fallback>{user.name[0]}</Avatar.Fallback>
            </Avatar>
            <span className={`absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full ring-2 ring-surface-secondary ${statusColor === 'success' ? 'bg-green-500' : statusColor === 'danger' ? 'bg-red-500' : statusColor === 'warning' ? 'bg-yellow-500' : 'bg-gray-500'}`} />
          </div>
          <div className="min-w-0 flex-1 text-left">
            <p className="truncate text-xs font-medium">{user.name}</p>
            {user.activity && (
              <p className="truncate text-[10px] text-muted">{user.activity}</p>
            )}
          </div>
        </Button>
        <Popover.Content className="w-[340px] p-0">
          <Popover.Dialog className="overflow-hidden rounded-xl p-0">
            {/* Banner */}
            <div className="relative h-[120px]">
              <img src={user.banner} alt="" className="h-full w-full object-cover" />
            </div>

            {/* Main content on Surface */}
            <Surface className="relative rounded-b-xl px-4 pb-4">
              {/* Avatar overlapping banner */}
              <div className="absolute -top-10 left-4">
                <Badge.Anchor>
                  <Avatar size="xl" className="ring-4 ring-surface">
                    <Avatar.Image src={user.avatar} />
                    <Avatar.Fallback>{user.name[0]}</Avatar.Fallback>
                  </Avatar>
                  <Badge color={statusColor} placement="bottom-right" size="sm" />
                </Badge.Anchor>
              </div>

              {/* Spacer for avatar overflow */}
              <div className="h-12" />

              {/* Name line */}
              <p className="text-base font-bold">{user.name}</p>
              <p className="text-xs text-muted">@{user.username} · {STATUS[user.status].label}</p>

              {/* Badges row */}
              {user.badges.length > 0 && (
                <div className="mt-2 flex gap-1">
                  {user.badges.map((badge, i) => (
                    <Surface key={i} variant="secondary" className="flex size-7 items-center justify-center rounded-md text-sm">
                      {badge}
                    </Surface>
                  ))}
                </div>
              )}

              <Separator className="my-3" />

              {/* Server info + activity */}
              <p className="text-sm">{user.serverInfo}</p>
              {user.activity && (
                <p className="mt-0.5 text-xs text-muted">{user.activity}</p>
              )}

              {/* Tags */}
              {user.tags.length > 0 && (
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {user.tags.map(tag => (
                    <Chip key={tag} size="sm" variant="bordered">{tag}</Chip>
                  ))}
                </div>
              )}

              {/* Member since */}
              <div className="mt-3 flex items-center justify-between text-xs text-muted">
                <span className="flex items-center gap-1.5">
                  <CalendarDays className="size-3.5" />
                  Membre depuis
                </span>
                <span className="font-semibold text-foreground">{user.joinDays} jours</span>
              </div>

              <Separator className="my-3" />

              {/* Message input */}
              <TextField fullWidth aria-label="Envoyer un message" name="popover-msg">
                <InputGroup fullWidth size="sm">
                  <InputGroup.Input placeholder={`Envoyer un message à @${user.username}`} />
                  <InputGroup.Suffix className="px-1 py-0">
                    <Button isIconOnly size="sm" variant="ghost"><Smile className="size-4" /></Button>
                  </InputGroup.Suffix>
                </InputGroup>
              </TextField>
            </Surface>
          </Popover.Dialog>
        </Popover.Content>
      </Popover>
    );
  }

  return (
    <div className="w-56 shrink-0 border-l border-border/20 bg-surface-secondary/20">
      <ScrollShadow className="h-full p-3">
        <p className="mb-1 px-2 text-[11px] font-bold uppercase tracking-widest text-muted">
          En ligne — {online.length}
        </p>
        <div className="space-y-0.5">
          {online.map(u => <MemberRow key={u.id} user={u} />)}
        </div>

        <p className="mb-1 mt-4 px-2 text-[11px] font-bold uppercase tracking-widest text-muted">
          Hors ligne — {offline.length}
        </p>
        <div className="space-y-0.5 opacity-40">
          {offline.map(u => <MemberRow key={u.id} user={u} />)}
        </div>
      </ScrollShadow>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function TestChatPage() {
  const [activeServer, setActiveServer] = useState('s1');
  const [selectedChannel, setSelectedChannel] = useState('c1');

  return (
    <div className="flex h-[calc(100vh-49px)]">
      <ServerList active={activeServer} onSelect={setActiveServer} />
      <ChannelList selectedChannel={selectedChannel} onSelectChannel={setSelectedChannel} />
      <ChatArea />
      <MemberList />
    </div>
  );
}
