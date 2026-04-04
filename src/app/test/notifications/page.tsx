'use client';

import { useState } from 'react';
import {
  Avatar, Badge, Button, Chip, ScrollShadow, Separator, Surface, Tabs, Tooltip,
} from '@heroui/react';
import {
  Bell, BellOff, Check, CheckCheck, MessageSquare, UserPlus, AtSign,
  Heart, Megaphone, Shield, Trash2, Settings, Filter, X, Dot,
} from 'lucide-react';

// ─── Fake Data ───────────────────────────────────────────────────────────────

type NotifType = 'message' | 'mention' | 'friend_request' | 'friend_accept' | 'reaction' | 'system' | 'announcement';

interface Notif {
  id: string;
  type: NotifType;
  title: string;
  body: string;
  time: string;
  read: boolean;
  avatar?: string;
  avatarFallback?: string;
  server?: string;
  channel?: string;
  actionable?: boolean;
}

const INITIAL_NOTIFS: Notif[] = [
  {
    id: 'n1', type: 'mention', read: false,
    title: 'Alice Martin vous a mentionné',
    body: 'Hey @wiltark tu peux jeter un œil au PR #42 ?',
    time: 'Il y a 2 min', avatar: 'https://i.pravatar.cc/150?u=alice',
    server: 'AlfyChat Dev', channel: 'dev-frontend',
  },
  {
    id: 'n2', type: 'friend_request', read: false,
    title: 'Nouvelle demande d\'ami',
    body: 'hugo.f souhaite vous ajouter comme ami.',
    time: 'Il y a 8 min', avatar: 'https://i.pravatar.cc/150?u=hugo',
    actionable: true,
  },
  {
    id: 'n3', type: 'message', read: false,
    title: 'Bob Dupont — Message direct',
    body: 'T\'es dispo pour la réunion de demain à 10h ?',
    time: 'Il y a 15 min', avatar: 'https://i.pravatar.cc/150?u=bob',
  },
  {
    id: 'n4', type: 'reaction', read: false,
    title: 'Emma Leroy a réagi à votre message',
    body: '🚀 sur « J\'ai préparé une démo avec les nouveaux composants »',
    time: 'Il y a 23 min', avatar: 'https://i.pravatar.cc/150?u=emma',
    server: 'AlfyChat Dev',
  },
  {
    id: 'n5', type: 'announcement', read: false,
    title: 'Annonce — Design System',
    body: 'HeroUI v3.2 vient de sortir avec de nouveaux composants !',
    time: 'Il y a 1 h', avatarFallback: '🎨',
    server: 'Design System',
  },
  {
    id: 'n6', type: 'friend_accept', read: true,
    title: 'Clara Petit a accepté votre demande',
    body: 'Vous êtes maintenant amis avec clara_p.',
    time: 'Il y a 3 h', avatar: 'https://i.pravatar.cc/150?u=clara',
  },
  {
    id: 'n7', type: 'system', read: true,
    title: 'Connexion depuis un nouvel appareil',
    body: 'Connexion détectée depuis Windows · Paris, France.',
    time: 'Hier', avatarFallback: '🔐',
  },
  {
    id: 'n8', type: 'message', read: true,
    title: 'François Roux — Message direct',
    body: 'Salut ! Tu as vu le nouveau thème ?',
    time: 'Hier', avatar: 'https://i.pravatar.cc/150?u=francois',
  },
  {
    id: 'n9', type: 'mention', read: true,
    title: 'David Moreau vous a mentionné',
    body: '@wiltark regarde ce bug sur le endpoint /api/messages',
    time: 'Il y a 2 j', avatar: 'https://i.pravatar.cc/150?u=david',
    server: 'AlfyChat Dev', channel: 'dev-backend',
  },
  {
    id: 'n10', type: 'system', read: true,
    title: 'Mise à jour de sécurité',
    body: 'Votre mot de passe a été modifié avec succès.',
    time: 'Il y a 3 j', avatarFallback: '🛡️',
  },
];

const TYPE_META: Record<NotifType, { icon: React.ReactNode; color: string; label: string }> = {
  message:        { icon: <MessageSquare className="size-3.5" />, color: 'bg-blue-500',   label: 'Messages' },
  mention:        { icon: <AtSign className="size-3.5" />,        color: 'bg-violet-500', label: 'Mentions' },
  friend_request: { icon: <UserPlus className="size-3.5" />,      color: 'bg-green-500',  label: 'Amis' },
  friend_accept:  { icon: <UserPlus className="size-3.5" />,      color: 'bg-green-500',  label: 'Amis' },
  reaction:       { icon: <Heart className="size-3.5" />,         color: 'bg-pink-500',   label: 'Réactions' },
  announcement:   { icon: <Megaphone className="size-3.5" />,     color: 'bg-amber-500',  label: 'Annonces' },
  system:         { icon: <Shield className="size-3.5" />,        color: 'bg-slate-500',  label: 'Système' },
};

// ─── Notification Item ───────────────────────────────────────────────────────

function NotifItem({
  notif, onRead, onDismiss, onAction,
}: {
  notif: Notif;
  onRead: (id: string) => void;
  onDismiss: (id: string) => void;
  onAction?: (id: string, action: 'accept' | 'decline') => void;
}) {
  const meta = TYPE_META[notif.type];

  return (
    <div
      className={[
        'group relative flex gap-3 rounded-xl px-4 py-3 transition-colors cursor-pointer',
        notif.read
          ? 'hover:bg-white/5'
          : 'bg-accent/5 hover:bg-accent/8 border border-accent/10',
      ].join(' ')}
      onClick={() => !notif.read && onRead(notif.id)}
    >
      {/* Avatar + type badge */}
      <div className="relative shrink-0 mt-0.5">
        {notif.avatar ? (
          <Avatar src={notif.avatar} size="md" />
        ) : (
          <div className="flex size-10 items-center justify-center rounded-full bg-surface-secondary text-xl">
            {notif.avatarFallback}
          </div>
        )}
        <span className={[
          'absolute -bottom-0.5 -right-0.5 flex size-5 items-center justify-center rounded-full text-white ring-2 ring-background',
          meta.color,
        ].join(' ')}>
          {meta.icon}
        </span>
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className={['text-sm font-medium leading-tight', notif.read ? 'text-foreground/70' : 'text-foreground'].join(' ')}>
            {notif.title}
          </p>
          <div className="flex shrink-0 items-center gap-1">
            {!notif.read && <span className="size-2 rounded-full bg-accent" />}
            <span className="text-xs text-muted whitespace-nowrap">{notif.time}</span>
          </div>
        </div>

        <p className="mt-0.5 text-xs text-muted line-clamp-2 leading-relaxed">{notif.body}</p>

        {(notif.server || notif.channel) && (
          <div className="mt-1.5 flex items-center gap-1.5">
            {notif.server && <Chip size="xs" variant="soft" color="default">{notif.server}</Chip>}
            {notif.channel && <Chip size="xs" variant="soft" color="default">#{notif.channel}</Chip>}
          </div>
        )}

        {notif.actionable && notif.type === 'friend_request' && (
          <div className="mt-2 flex gap-2">
            <Button size="sm" color="success" variant="soft" onPress={() => onAction?.(notif.id, 'accept')}>
              <Check className="size-3.5" /> Accepter
            </Button>
            <Button size="sm" color="danger" variant="ghost" onPress={() => onAction?.(notif.id, 'decline')}>
              <X className="size-3.5" /> Refuser
            </Button>
          </div>
        )}
      </div>

      {/* Dismiss button (hover) */}
      <Tooltip content="Supprimer">
        <Button
          isIconOnly size="sm" variant="ghost"
          className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity"
          onPress={(e) => { (e as any).stopPropagation?.(); onDismiss(notif.id); }}
        >
          <X className="size-3.5" />
        </Button>
      </Tooltip>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function NotificationsPage() {
  const [notifs, setNotifs] = useState<Notif[]>(INITIAL_NOTIFS);
  const [activeTab, setActiveTab] = useState('all');
  const [muted, setMuted] = useState(false);

  const unreadCount = notifs.filter(n => !n.read).length;

  const filtered = notifs.filter(n => {
    if (activeTab === 'all') return true;
    if (activeTab === 'unread') return !n.read;
    if (activeTab === 'mentions') return n.type === 'mention';
    if (activeTab === 'social') return ['friend_request', 'friend_accept', 'reaction'].includes(n.type);
    return true;
  });

  const markAllRead = () => setNotifs(prev => prev.map(n => ({ ...n, read: true })));
  const markRead = (id: string) => setNotifs(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  const dismiss = (id: string) => setNotifs(prev => prev.filter(n => n.id !== id));
  const handleAction = (id: string, action: 'accept' | 'decline') => {
    setNotifs(prev => prev.map(n =>
      n.id === id ? { ...n, read: true, actionable: false, body: action === 'accept' ? 'Demande acceptée.' : 'Demande refusée.' } : n
    ));
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex size-10 items-center justify-center rounded-2xl bg-accent/15">
              <Bell className="size-5 text-accent" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Notifications</h1>
              <p className="text-xs text-muted">
                {unreadCount > 0 ? `${unreadCount} non lue${unreadCount > 1 ? 's' : ''}` : 'Tout est lu'}
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Tooltip content={muted ? 'Réactiver' : 'Mettre en sourdine'}>
            <Button isIconOnly variant="ghost" size="sm" onPress={() => setMuted(m => !m)}>
              {muted ? <BellOff className="size-4 text-muted" /> : <Bell className="size-4" />}
            </Button>
          </Tooltip>
          <Tooltip content="Paramètres de notification">
            <Button isIconOnly variant="ghost" size="sm">
              <Settings className="size-4" />
            </Button>
          </Tooltip>
          {unreadCount > 0 && (
            <Button size="sm" variant="ghost" onPress={markAllRead}>
              <CheckCheck className="size-4" /> Tout marquer lu
            </Button>
          )}
        </div>
      </div>

      {/* Muted banner */}
      {muted && (
        <Surface className="mb-4 flex items-center gap-3 rounded-xl px-4 py-3 bg-amber-500/10 border border-amber-500/20">
          <BellOff className="size-4 text-amber-400 shrink-0" />
          <p className="text-sm text-amber-300">Notifications en sourdine. Vous ne recevrez plus d'alertes.</p>
        </Surface>
      )}

      {/* Tabs */}
      <Tabs
        selectedKey={activeTab}
        onSelectionChange={(k) => setActiveTab(k as string)}
        className="mb-4"
      >
        <Tabs.List>
          <Tabs.Tab key="all">
            Tout
            {unreadCount > 0 && (
              <Chip size="xs" color="accent" className="ml-1.5">{unreadCount}</Chip>
            )}
          </Tabs.Tab>
          <Tabs.Tab key="unread">Non lues</Tabs.Tab>
          <Tabs.Tab key="mentions">
            <AtSign className="size-3.5" /> Mentions
          </Tabs.Tab>
          <Tabs.Tab key="social">
            <UserPlus className="size-3.5" /> Social
          </Tabs.Tab>
        </Tabs.List>
      </Tabs>

      {/* List */}
      <ScrollShadow className="max-h-[calc(100vh-280px)]">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <div className="flex size-14 items-center justify-center rounded-full bg-surface-secondary">
              <Bell className="size-6 text-muted" />
            </div>
            <p className="text-sm font-medium text-foreground">Aucune notification</p>
            <p className="text-xs text-muted">Tout est à jour ici.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            {filtered.map((notif) => (
              <NotifItem
                key={notif.id}
                notif={notif}
                onRead={markRead}
                onDismiss={dismiss}
                onAction={handleAction}
              />
            ))}
          </div>
        )}
      </ScrollShadow>

      {/* Footer */}
      {filtered.length > 0 && (
        <>
          <Separator className="my-4" />
          <div className="flex justify-center">
            <Button variant="ghost" size="sm" color="danger" onPress={() => setNotifs([])}>
              <Trash2 className="size-3.5" /> Effacer toutes les notifications
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
