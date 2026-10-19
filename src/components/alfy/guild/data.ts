'use client';

/**
 * Chargeurs des données de serveur, avec mutualisation des requêtes en vol et
 * fraîcheur (stale-while-revalidate) : le store est toujours affiché tel quel,
 * le réseau ne fait que le corriger. Les préchargements (survol du rail, d'un
 * salon) passent par les mêmes fonctions — un serveur survolé puis ouvert ne
 * coûte qu'un seul aller-retour.
 */

import { socketService } from '@/lib/socket';
import { serverListStore } from '@/lib/server-list-store';
import { liveKey, readLive, writeLive } from '@/lib/live-cache';
import { guildStore } from '@/components/alfy/guild/store';
import {
  listOf,
  normalizeChannel,
  normalizeInfo,
  normalizeMember,
  normalizeRole,
  normalizeVoiceMember,
  unwrapPayload,
} from '@/components/alfy/guild/normalize';
import type { VoiceChannelState } from '@/components/alfy/guild/types';

const inflight = new Map<string, Promise<void>>();

/** Exécute `fn` au plus une fois à la fois par clé, et seulement si la donnée a vieilli. */
function once(key: string, maxAgeMs: number, fn: () => Promise<void>, force = false): Promise<void> {
  if (!force && Date.now() - guildStore.fetchedAt(key) < maxAgeMs) return Promise.resolve();
  const running = inflight.get(key);
  if (running) return running;
  const p = fn()
    .then(() => guildStore.stamp(key))
    .catch(() => {})
    .finally(() => inflight.delete(key));
  inflight.set(key, p);
  return p;
}

const FRESH = 30_000;

export function loadInfo(serverId: string, force = false): Promise<void> {
  return once(`info:${serverId}`, FRESH, async () => {
    const res = await socketService.request<Record<string, unknown>>('SERVER_INFO', { serverId }, 10_000);
    const d = unwrapPayload(res);
    if (!d || d.error) throw new Error(String(d?.error ?? 'NO_INFO'));
    const info = normalizeInfo(d, serverId, guildStore.get().infos[serverId]);
    guildStore.setInfo(serverId, info);
    // La fiche serveur sert aussi le rail (nom/icône à jour).
    serverListStore.update(serverId, { name: info.name, iconUrl: info.iconUrl, ownerId: info.ownerId });
  }, force);
}

export function loadChannels(serverId: string, force = false): Promise<void> {
  return once(`channels:${serverId}`, FRESH, async () => {
    const res = await socketService.request<unknown>('SERVER_GET_CHANNELS', { serverId }, 10_000);
    const list = listOf(res, 'channels').map((c) => normalizeChannel(c, serverId)).filter((c) => c.id);
    guildStore.setChannels(serverId, list);
  }, force);
}

export function loadRoles(serverId: string, force = false): Promise<void> {
  return once(`roles:${serverId}`, FRESH, async () => {
    const res = await socketService.request<unknown>('ROLE_LIST', { serverId }, 10_000);
    guildStore.setRoles(serverId, listOf(res, 'roles').map((r, i) => normalizeRole(r, i)).filter((r) => r.id));
  }, force);
}

export function loadMembers(serverId: string, force = false): Promise<void> {
  return once(`members:${serverId}`, FRESH, async () => {
    const res = await socketService.request<unknown>('MEMBER_LIST', { serverId }, 15_000);
    const defaultRoleId = guildStore.get().roles[serverId]?.find((r) => r.isDefault)?.id ?? null;
    guildStore.setMembers(serverId, listOf(res, 'members').map((m) => normalizeMember(m, defaultRoleId)).filter((m) => m.userId));
  }, force);
}

export function loadVoice(serverId: string, force = false): Promise<void> {
  return once(`voice:${serverId}`, 10_000, async () => {
    const res = await socketService.request<{ channels?: { channelId: string; participants: unknown[]; status?: string | null }[] }>(
      'GET_VOICE_STATE',
      { serverId },
      8_000,
    );
    const channels: Record<string, VoiceChannelState> = {};
    for (const c of res?.channels ?? []) {
      channels[c.channelId] = {
        serverId,
        participants: (c.participants ?? []).map((p) => normalizeVoiceMember(p as Record<string, unknown>)),
        status: c.status ?? null,
      };
    }
    guildStore.setVoiceSnapshot(serverId, channels);
  }, force);
}

/** Droits du membre courant (serveur, ou dans un salon précis). */
export function loadMyPerms(serverId: string, channelId?: string | null, force = false): Promise<void> {
  const key = channelId ? `${serverId}:${channelId}` : serverId;
  return once(`perms:${key}`, 60_000, async () => {
    const res = await socketService.request<{ isOwner?: boolean; permissions?: number; error?: string }>(
      'MY_PERMISSIONS',
      { serverId, channelId: channelId ?? undefined },
      8_000,
    );
    if (!res || res.error) throw new Error(res?.error ?? 'NO_PERMS');
    guildStore.setMyPerms(key, { isOwner: Boolean(res.isOwner), permissions: Number(res.permissions) || 0, at: Date.now() });
  }, force);
}

/** Tout ce qu'il faut pour afficher un serveur ouvert. */
export function ensureGuild(serverId: string): Promise<unknown> {
  return Promise.all([
    loadInfo(serverId),
    loadChannels(serverId),
    // Les membres ont besoin du rôle @everyone pour être normalisés proprement.
    loadRoles(serverId).then(() => loadMembers(serverId)),
    loadVoice(serverId),
    loadMyPerms(serverId),
  ]);
}

/** Préchargement léger (survol du rail) : de quoi peindre la sidebar instantanément. */
export function prefetchGuild(serverId: string): void {
  void loadInfo(serverId);
  void loadChannels(serverId);
  void loadRoles(serverId);
  void loadVoice(serverId);
}

/** Invalide les chargements d'un serveur : le prochain `ensure*` refera la requête. */
export function invalidateGuild(serverId: string, what: ('info' | 'channels' | 'roles' | 'members' | 'voice')[]) {
  guildStore.forgetFetched(what.map((w) => `${w}:${serverId}`), `perms:${serverId}`);
}

/* ── Messages : préchauffage au survol d'un salon ─────────────────────────── */

interface HistoriqueCache {
  raw: Record<string, unknown>[];
  hasMore: boolean;
}
const PAGE_SIZE = 50;
const warming = new Set<string>();

/**
 * Remplit le cache de messages d'un salon avant son ouverture. Le hook de
 * messages lit ce même cache au montage : le salon s'affiche sans spinner, et
 * l'historique frais ne fait que se superposer.
 */
export function prefetchChannelMessages(serverId: string, channelId: string): void {
  const key = liveKey.messages(channelId);
  if (!key || readLive<HistoriqueCache>(key) || warming.has(channelId)) return;
  warming.add(channelId);
  socketService.requestMessageHistory(serverId, channelId, { limit: PAGE_SIZE }, (res: unknown) => {
    warming.delete(channelId);
    const d = res as { messages?: unknown[]; error?: string } | unknown[];
    if (!Array.isArray(d) && d?.error) return;
    const list = (Array.isArray(d) ? d : (d?.messages ?? [])) as Record<string, unknown>[];
    // Le hook a pu monter entre-temps : ne jamais écraser son état.
    if (readLive<HistoriqueCache>(key)) return;
    writeLive<HistoriqueCache>(key, { raw: list, hasMore: list.length >= PAGE_SIZE });
  });
}

/* ── Préchargement global à l'ouverture de l'application ──────────────────── */

let bootPrefetched = false;

/**
 * Précharge salons et fiches de tous les serveurs de l'utilisateur, quelques-uns
 * à la fois et quand le navigateur est inactif : cliquer n'importe quel serveur
 * du rail affiche ensuite sa liste de salons sans attente.
 */
export function prefetchAllGuilds(serverIds: string[]): void {
  if (bootPrefetched || serverIds.length === 0) return;
  bootPrefetched = true;
  const queue = [...serverIds];
  const idle = (cb: () => void) => {
    const w = window as unknown as { requestIdleCallback?: (fn: () => void, o?: { timeout: number }) => void };
    if (w.requestIdleCallback) w.requestIdleCallback(cb, { timeout: 1500 });
    else setTimeout(cb, 200);
  };
  const next = () => {
    const batch = queue.splice(0, 3);
    if (batch.length === 0) return;
    Promise.all(batch.map((id) => Promise.all([loadInfo(id), loadChannels(id), loadVoice(id)]))).finally(() => idle(next));
  };
  idle(next);
}
