'use client';

/**
 * Pont données réelles → types alfy pour la liste des serveurs.
 * Réutilise le cache existant `serverListStore` (alimenté par api.getServers)
 * et le `notification-store` pour les badges, puis mappe vers `AlfyServer`
 * afin d'alimenter les composants présentationnels alfy.
 */

import { useEffect, useSyncExternalStore } from 'react';

import { api, resolveMediaUrl } from '@/lib/api';
import { socketService } from '@/lib/socket';
import { serverListStore, type CachedServer } from '@/lib/server-list-store';
import * as notif from '@/lib/notification-store';
import type { AlfyServer } from '@/components/alfy/mock/types';

/** Un serveur réel n'expose pas tout le détail alfy : on complète à vide. */
function toAlfyServer(s: CachedServer, unread: number, mentions: number): AlfyServer {
  return {
    id: s.id,
    name: s.name,
    iconUrl: s.iconUrl ? resolveMediaUrl(s.iconUrl) : undefined,
    isPublic: true,
    ownerId: s.ownerId ?? '',
    nodeOnline: false,
    selfHosted: false,
    categories: [],
    channels: [],
    roles: [],
    members: [],
    mentionCount: mentions,
    unread: unread > 0,
  };
}

/** Serveurs réels mappés en `AlfyServer[]`, tenus à jour par le store + WS. */
export function useAlfyServers(): { servers: AlfyServer[]; loaded: boolean; dmUnread: number } {
  const cached = useSyncExternalStore(
    serverListStore.subscribe,
    serverListStore.getSnapshot,
    serverListStore.getServerSnapshot,
  );
  const notifState = useSyncExternalStore(notif.subscribe, notif.getSnapshot, notif.getSnapshot);

  // Chargement initial (une seule fois grâce au flag du store).
  useEffect(() => {
    if (serverListStore.isLoaded()) return;
    let cancelled = false;
    api
      .getServers()
      .then((res) => {
        const list = (res?.data ?? res) as CachedServer[] | undefined;
        if (!cancelled && Array.isArray(list)) serverListStore.set(list);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // Mises à jour temps réel minimales (création / suppression / renommage).
  useEffect(() => {
    const onUpdate = (data: unknown) => {
      const s = ((data as { payload?: CachedServer })?.payload ?? data) as CachedServer;
      if (s?.id) serverListStore.update(s.id, { name: s.name, iconUrl: s.iconUrl });
    };
    socketService.on('SERVER_UPDATE', onUpdate);
    return () => socketService.off('SERVER_UPDATE', onUpdate);
  }, []);

  const servers = cached.map((s) => {
    let unread = 0;
    let mentions = 0;
    // Les compteurs sont indexés par salon : on agrège ce qui appartient au serveur.
    notifState.unread.forEach((count, key) => {
      if (key.startsWith(`channel:`) && key.includes(s.id)) unread += count;
    });
    notifState.mentions.forEach((count, key) => {
      if (key.startsWith(`channel:`) && key.includes(s.id)) mentions += count;
    });
    return toAlfyServer(s, unread, mentions);
  });

  // Non-lus des DM/groupes = tout ce qui n'est pas un salon de serveur.
  let dmUnread = 0;
  notifState.unread.forEach((count, key) => {
    if (!key.startsWith('channel:')) dmUnread += count;
  });

  return { servers, loaded: serverListStore.isLoaded(), dmUnread };
}
