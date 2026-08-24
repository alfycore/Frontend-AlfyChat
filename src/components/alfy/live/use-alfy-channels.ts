'use client';

/**
 * Salons + catégories d'un serveur, en temps réel, mappés en types alfy.
 * Porté depuis atelier/chrome/SidebarChannels.tsx (source de vérité) :
 * requestServerChannels / requestServerInfo + CHANNEL_* + SERVER_NODE_*.
 */

import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';

import { resolveMediaUrl } from '@/lib/api';
import { socketService } from '@/lib/socket';
import { serverListStore } from '@/lib/server-list-store';
import { liveKey, readLive, writeLive } from '@/lib/live-cache';
import * as notif from '@/lib/notification-store';
import { normalizeChannel, toAlfyChannel, unwrap, type RawChannel } from '@/components/alfy/live/map';
import type { AlfyCategory, AlfyServer } from '@/components/alfy/mock/types';

interface ServerInfo {
  name: string;
  iconUrl?: string;
  bannerUrl?: string;
  description?: string;
  isPublic: boolean;
  nodeOnline: boolean | null;
  selfHosted: boolean;
  ownerId?: string;
  hostingType?: 'platform' | 'self_hosted' | 'certified_host';
  hostingCategory?: 'standard' | 'community';
  maxMembers?: number;
}

const INFO_VIDE: ServerInfo = { name: 'Serveur', isPublic: false, nodeOnline: null, selfHosted: false };

/**
 * Fiche serveur de départ, du plus complet au plus pauvre : le cache live
 * (déjà visité dans cette session), sinon le nom et l'icône que la liste des
 * serveurs connaît déjà, sinon rien. Évite le « Serveur » générique affiché
 * une fraction de seconde le temps de la réponse WebSocket.
 */
function infoInitiale(serverId: string | null): ServerInfo {
  const enCache = readLive<ServerInfo>(liveKey.serverInfo(serverId));
  if (enCache) return enCache;
  const listed = serverId ? serverListStore.get().find((s) => s.id === serverId) : undefined;
  if (!listed) return INFO_VIDE;
  return { ...INFO_VIDE, name: listed.name ?? INFO_VIDE.name, iconUrl: listed.iconUrl };
}

/**
 * Construit l'`AlfyServer` complet (catégories + salons + compteurs) attendu
 * par la sidebar alfy. Rôles et membres restent vides ici : ils sont chargés
 * par `useAlfyMembers` là où c'est nécessaire.
 */
export function useAlfyChannels(serverId: string | null): AlfyServer | null {
  /* Amorçage depuis le cache : revenir sur un serveur déjà ouvert affiche
     immédiatement ses salons, le réseau ne fait que les corriger. */
  const [raw, setRaw] = useState<RawChannel[]>(
    () => readLive<RawChannel[]>(liveKey.channels(serverId)) ?? [],
  );
  const [info, setInfo] = useState<ServerInfo>(() => infoInitiale(serverId));
  const notifState = useSyncExternalStore(notif.subscribe, notif.getSnapshot, notif.getSnapshot);

  /* Changement de serveur sans démontage : réamorçage pendant le rendu, donc
     les salons du serveur précédent ne sont jamais peints. */
  const [prevServerId, setPrevServerId] = useState(serverId);
  if (prevServerId !== serverId) {
    setPrevServerId(serverId);
    setRaw(readLive<RawChannel[]>(liveKey.channels(serverId)) ?? []);
    setInfo(infoInitiale(serverId));
  }

  useEffect(() => {
    writeLive(liveKey.channels(serverId), raw);
  }, [serverId, raw]);
  useEffect(() => {
    writeLive(liveKey.serverInfo(serverId), info);
  }, [serverId, info]);

  /* Chargement initial */
  useEffect(() => {
    // Pas de serveur : le réamorçage en phase de rendu a déjà vidé l'état.
    if (!serverId) return;

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
        iconUrl: resolveMediaUrl(d.iconUrl ?? d.icon_url ?? undefined),
        bannerUrl: resolveMediaUrl(d.bannerUrl ?? d.banner_url ?? undefined),
        description: d.description ?? undefined,
        isPublic: Boolean(d.isPublic ?? d.is_public),
        nodeOnline:
          typeof (d.nodeOnline ?? d.node_online) === 'boolean'
            ? Boolean(d.nodeOnline ?? d.node_online)
            : null,
        selfHosted: Boolean(d.selfHosted ?? d.self_hosted ?? d.nodeToken ?? d.node_token),
        ownerId: d.ownerId ?? d.owner_id,
        hostingType: d.hostingType ?? d.hosting_type,
        hostingCategory: d.category,
        maxMembers: d.maxMembers ?? d.max_members,
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
      bannerUrl: info.bannerUrl,
      description: info.description,
      isPublic: info.isPublic,
      ownerId: info.ownerId ?? '',
      nodeOnline: info.nodeOnline ?? true,
      selfHosted: info.selfHosted,
      hostingType: info.hostingType,
      hostingCategory: info.hostingCategory,
      maxMembers: info.maxMembers,
      categories,
      channels,
      roles: [],
      members: [],
      mentionCount: 0,
      unread: false,
    } satisfies AlfyServer;
  }, [serverId, raw, info, notifState]);
}
