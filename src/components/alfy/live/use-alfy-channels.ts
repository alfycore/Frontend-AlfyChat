'use client';

/**
 * Salons + catégories d'un serveur, en temps réel, mappés en types alfy.
 * Porté depuis atelier/chrome/SidebarChannels.tsx (source de vérité) :
 * requestServerChannels / requestServerInfo + CHANNEL_* + SERVER_NODE_*.
 */

import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';

import { socketService } from '@/lib/socket';
import { serverListStore } from '@/lib/server-list-store';
import * as notif from '@/lib/notification-store';
import { normalizeChannel, toAlfyChannel, unwrap, type RawChannel } from '@/components/alfy/live/map';
import type { AlfyCategory, AlfyServer } from '@/components/alfy/mock/types';

interface ServerInfo {
  name: string;
  iconUrl?: string;
  nodeOnline: boolean | null;
  selfHosted: boolean;
  ownerId?: string;
}

/**
 * Construit l'`AlfyServer` complet (catégories + salons + compteurs) attendu
 * par la sidebar alfy. Rôles et membres restent vides ici : ils sont chargés
 * par `useAlfyMembers` là où c'est nécessaire.
 */
export function useAlfyChannels(serverId: string | null): AlfyServer | null {
  const [raw, setRaw] = useState<RawChannel[]>([]);
  const [info, setInfo] = useState<ServerInfo>({ name: 'Serveur', nodeOnline: null, selfHosted: false });
  const notifState = useSyncExternalStore(notif.subscribe, notif.getSnapshot, notif.getSnapshot);

  /* Chargement initial */
  useEffect(() => {
    if (!serverId) {
      setRaw([]);
      return;
    }
    const cached = serverListStore.get().find((s) => s.id === serverId);
    setInfo((i) => ({ ...i, name: cached?.name ?? i.name, iconUrl: cached?.iconUrl }));

    socketService.requestServerChannels(serverId, (data: unknown) => {
      const d = data as { channels?: unknown[] } | unknown[];
      const list = Array.isArray(d) ? d : (d?.channels ?? []);
      setRaw((list as Record<string, unknown>[]).map(normalizeChannel));
    });

    socketService.requestServerInfo(serverId, (data: unknown) => {
      const d = unwrap(data);
      if (d?.error) return;
      setInfo({
        name: d.name ?? 'Serveur',
        iconUrl: d.iconUrl ?? d.icon_url ?? undefined,
        nodeOnline:
          typeof (d.nodeOnline ?? d.node_online) === 'boolean'
            ? Boolean(d.nodeOnline ?? d.node_online)
            : null,
        selfHosted: Boolean(d.selfHosted ?? d.self_hosted ?? d.nodeToken ?? d.node_token),
        ownerId: d.ownerId ?? d.owner_id,
      });
    });
  }, [serverId]);

  /* Temps réel : CRUD salons + statut du nœud */
  useEffect(() => {
    if (!serverId) return;

    const onCreate = (data: unknown) => {
      const ch = unwrap(data);
      if ((ch?.serverId ?? ch?.server_id) !== serverId) return;
      const next = normalizeChannel(ch);
      setRaw((prev) => (prev.some((c) => c.id === next.id) ? prev : [...prev, next]));
    };
    const onUpdate = (data: unknown) => {
      const ch = normalizeChannel(unwrap(data));
      setRaw((prev) => prev.map((c) => (c.id === ch.id ? { ...c, ...ch } : c)));
    };
    const onDelete = (data: unknown) => {
      const d = unwrap(data);
      const id = d?.channelId ?? d?.id;
      if (id) setRaw((prev) => prev.filter((c) => c.id !== id));
    };
    const matches = (d: unknown) => {
      const o = unwrap(d);
      return (o?.serverId ?? o?.server_id) === serverId;
    };
    const onNodeOnline = (d: unknown) => matches(d) && setInfo((i) => ({ ...i, nodeOnline: true }));
    const onNodeOffline = (d: unknown) => matches(d) && setInfo((i) => ({ ...i, nodeOnline: false }));
    const onServerUpdate = (data: unknown) => {
      const s = unwrap(data);
      if ((s?.id ?? s?.serverId) !== serverId) return;
      setInfo((i) => ({ ...i, name: s.name ?? i.name, iconUrl: s.iconUrl ?? s.icon_url ?? i.iconUrl }));
    };

    socketService.on('CHANNEL_CREATE', onCreate);
    socketService.on('CHANNEL_UPDATE', onUpdate);
    socketService.on('CHANNEL_DELETE', onDelete);
    socketService.on('SERVER_UPDATE', onServerUpdate);
    socketService.on('SERVER_NODE_ONLINE', onNodeOnline);
    socketService.on('SERVER_NODE_OFFLINE', onNodeOffline);
    return () => {
      socketService.off('CHANNEL_CREATE', onCreate);
      socketService.off('CHANNEL_UPDATE', onUpdate);
      socketService.off('CHANNEL_DELETE', onDelete);
      socketService.off('SERVER_UPDATE', onServerUpdate);
      socketService.off('SERVER_NODE_ONLINE', onNodeOnline);
      socketService.off('SERVER_NODE_OFFLINE', onNodeOffline);
    };
  }, [serverId]);

  return useMemo(() => {
    if (!serverId) return null;

    const sorted = [...raw].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
    const cats = sorted.filter((c) => c.type === 'category');
    const catIds = new Set(cats.map((c) => c.id));

    const categories: AlfyCategory[] = cats.map((c) => ({ id: c.id, name: c.name }));
    // Salons sans catégorie : regroupés dans une catégorie implicite.
    const orphans = sorted.filter(
      (c) => c.type !== 'category' && (!c.parentId || !catIds.has(c.parentId)),
    );
    if (orphans.length) categories.unshift({ id: '__root__', name: 'Salons' });

    const channels = sorted
      .filter((c) => c.type !== 'category')
      .map((c) => {
        const key = `channel:${c.id}`;
        const ch = toAlfyChannel(c, serverId, {
          unread: notifState.unread.get(key) ?? 0,
          mentions: notifState.mentions.get(key) ?? 0,
        });
        // Rattache les orphelins à la catégorie implicite.
        if (!ch.categoryId || !catIds.has(ch.categoryId)) ch.categoryId = '__root__';
        return ch;
      });

    return {
      id: serverId,
      name: info.name,
      iconUrl: info.iconUrl,
      isPublic: true,
      ownerId: info.ownerId ?? '',
      nodeOnline: info.nodeOnline ?? true,
      selfHosted: info.selfHosted,
      categories,
      channels,
      roles: [],
      members: [],
      mentionCount: 0,
      unread: false,
    } satisfies AlfyServer;
  }, [serverId, raw, info, notifState]);
}
