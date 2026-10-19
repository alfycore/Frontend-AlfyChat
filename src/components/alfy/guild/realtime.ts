'use client';

/**
 * Abonnements temps réel des serveurs — montés UNE fois par la coquille.
 *
 * Avant, chaque hook (salons, membres, rôles…) posait ses propres écouteurs à
 * chaque montage ; ici tout arrive dans le store, et l'interface ne fait que
 * le lire. Les évènements de la passerelle sont tolérés sous leurs deux formes
 * (`{ payload }` ou nus) et en camelCase comme en snake_case.
 */

import { useEffect } from 'react';

import { socketService } from '@/lib/socket';
import { serverListStore } from '@/lib/server-list-store';
import { resolveMediaUrl } from '@/lib/api';
import { toPresence } from '@/components/alfy/live/map';
import type { AlfyPresence } from '@/components/alfy/mock/types';
import { guildStore } from '@/components/alfy/guild/store';
import { loadChannels, loadMyPerms, loadVoice, invalidateGuild } from '@/components/alfy/guild/data';
import {
  mergeChannel,
  normalizeChannel,
  normalizeInfo,
  normalizeMember,
  normalizeRole,
  normalizeVoiceMember,
  unwrapPayload,
} from '@/components/alfy/guild/normalize';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Raw = Record<string, any>;

const sidOf = (o: Raw): string | undefined => o?.serverId ?? o?.server_id;

/** Serveur d'un salon déjà connu (certains évènements omettent `serverId`). */
function serverOfChannel(channelId: string): string | undefined {
  const all = guildStore.get().channels;
  for (const [sid, list] of Object.entries(all)) if (list.some((c) => c.id === channelId)) return sid;
  return undefined;
}

export function useGuildRealtime(currentUserId: string | undefined) {
  useEffect(() => {
    /* ── Salons ─────────────────────────────────────────────────────────── */
    const onChannelCreate = (data: unknown) => {
      const c = unwrapPayload(data);
      const sid = sidOf(c);
      if (!sid || !c?.id) return;
      guildStore.upsertChannel(normalizeChannel(c, sid));
    };
    const onChannelUpdate = (data: unknown) => {
      const c = unwrapPayload(data);
      const id: string | undefined = c?.id ?? c?.channelId;
      if (!id) return;
      const sid = sidOf(c) ?? serverOfChannel(id);
      if (!sid) return;
      const prev = guildStore.get().channels[sid]?.find((x) => x.id === id);
      guildStore.upsertChannel(prev ? mergeChannel(prev, { ...c, id }) : normalizeChannel({ ...c, id }, sid));
    };
    const onChannelDelete = (data: unknown) => {
      const c = unwrapPayload(data);
      const id: string | undefined = c?.channelId ?? c?.id;
      if (!id) return;
      const sid = sidOf(c) ?? serverOfChannel(id);
      if (sid) guildStore.removeChannel(sid, id);
    };
    const onReordered = (data: unknown) => {
      const d = unwrapPayload(data);
      const sid = sidOf(d);
      if (sid && Array.isArray(d.positions)) guildStore.applyPositions(sid, d.positions);
    };
    /* Visibilité changée (surcharge, rôle) : liste filtrée à recharger. */
    const onChannelsInvalidate = (data: unknown) => {
      const sid = sidOf(unwrapPayload(data));
      if (!sid) return;
      guildStore.invalidateMyPerms(sid);
      invalidateGuild(sid, ['channels']);
      void loadChannels(sid, true);
      void loadMyPerms(sid, null, true);
    };

    /* ── Rôles ──────────────────────────────────────────────────────────── */
    const onRoleUpsert = (data: unknown) => {
      const r = unwrapPayload(data);
      const sid = sidOf(r);
      const id: string | undefined = r?.id ?? r?.roleId;
      if (!sid || !id) return;
      const prev = guildStore.get().roles[sid]?.find((x) => x.id === id);
      guildStore.upsertRole(sid, normalizeRole(prev ? { ...prev, ...r, id } : { ...r, id }));
      guildStore.invalidateMyPerms(sid);
      void loadMyPerms(sid, null, true);
    };
    const onRoleDelete = (data: unknown) => {
      const r = unwrapPayload(data);
      const sid = sidOf(r);
      const id: string | undefined = r?.roleId ?? r?.id;
      if (!sid || !id) return;
      guildStore.removeRole(sid, id);
      guildStore.invalidateMyPerms(sid);
      void loadMyPerms(sid, null, true);
    };
    const onRolesReordered = (data: unknown) => {
      const d = unwrapPayload(data);
      const sid = sidOf(d);
      if (sid && Array.isArray(d.roles) && d.roles.length) guildStore.setRoles(sid, d.roles.map((r: Raw, i: number) => normalizeRole(r, i)));
    };

    /* ── Membres ────────────────────────────────────────────────────────── */
    const onMemberJoin = (data: unknown) => {
      const d = unwrapPayload(data);
      const raw: Raw = d?.member ? { ...d.member, ...(d.member.user ?? {}) } : d;
      const sid = sidOf(d) ?? sidOf(raw);
      if (!sid) return;
      const defaultRoleId = guildStore.get().roles[sid]?.find((r) => r.isDefault)?.id ?? null;
      const member = normalizeMember(raw, defaultRoleId);
      if (member.userId) guildStore.upsertMember(sid, member);
    };
    const onMemberLeave = (data: unknown) => {
      const d = unwrapPayload(data);
      const sid = sidOf(d);
      const id: string | undefined = d?.userId ?? d?.user_id ?? d?.id;
      if (sid && id) guildStore.removeMember(sid, id);
    };
    const onMemberUpdate = (data: unknown) => {
      const d = unwrapPayload(data);
      const sid = sidOf(d);
      const id: string | undefined = d?.userId ?? d?.user_id;
      if (!sid || !id) return;
      const defaultRoleId = guildStore.get().roles[sid]?.find((r) => r.isDefault)?.id ?? null;
      const patch: { roleIds?: string[]; nickname?: string } = {};
      if (Array.isArray(d.roleIds)) patch.roleIds = d.roleIds.filter((r: string) => r !== defaultRoleId);
      if (d.nickname !== undefined) patch.nickname = d.nickname || undefined;
      guildStore.patchMember(sid, id, patch);
      if (id === currentUserId) {
        guildStore.invalidateMyPerms(sid);
        void loadMyPerms(sid, null, true);
      }
    };
    /* Présence : les évènements arrivent en rafales (connexions, absences
       automatiques) — on les regroupe et on n'écrit le store qu'une fois par
       fenêtre de 200 ms. */
    let pending: Record<string, { status?: AlfyPresence; customStatus?: string | null }> = {};
    let flushTimer: ReturnType<typeof setTimeout> | null = null;
    const flushPresence = () => {
      flushTimer = null;
      const batch = pending;
      pending = {};
      if (Object.keys(batch).length) guildStore.patchPresence(batch);
    };
    const onPresence = (data: unknown) => {
      const p = unwrapPayload(data);
      const id: string | undefined = p?.userId ?? p?.id;
      if (!id) return;
      pending[id] = {
        ...pending[id],
        ...(p.status ? { status: toPresence(p.status) } : {}),
        ...(p.customStatus !== undefined || p.text !== undefined ? { customStatus: p.customStatus ?? p.text ?? null } : {}),
      };
      if (!flushTimer) flushTimer = setTimeout(flushPresence, 200);
    };

    /* ── Vocal ──────────────────────────────────────────────────────────── */
    const onVoiceState = (data: unknown) => {
      const d = unwrapPayload(data);
      const channelId: string | undefined = d?.channelId;
      const sid = sidOf(d) ?? (channelId ? serverOfChannel(channelId) : undefined);
      if (!channelId || !sid) return;
      guildStore.setVoiceChannel(channelId, {
        serverId: sid,
        participants: (Array.isArray(d.participants) ? d.participants : []).map((p: Raw) => normalizeVoiceMember(p)),
        status: d.status ?? null,
      });
    };
    const onSpeaking = (data: unknown) => {
      const d = unwrapPayload(data);
      if (typeof d?.userId === 'string') guildStore.setSpeaking(d.userId, d.speaking === true);
    };

    /* ── Serveur ────────────────────────────────────────────────────────── */
    const onServerUpdate = (data: unknown) => {
      const s = unwrapPayload(data);
      const id: string | undefined = s?.id ?? s?.serverId;
      if (!id) return;
      const prev = guildStore.get().infos[id];
      if (prev) guildStore.setInfo(id, normalizeInfo({ ...s }, id, prev));
      const icon = s.iconUrl ?? s.icon_url;
      serverListStore.update(id, {
        ...(s.name ? { name: s.name } : {}),
        ...(icon ? { iconUrl: resolveMediaUrl(icon) } : {}),
      });
    };
    const onNodeOnline = (data: unknown) => {
      const sid = sidOf(unwrapPayload(data));
      if (sid) guildStore.patchInfo(sid, { nodeOnline: true });
    };
    const onNodeOffline = (data: unknown) => {
      const sid = sidOf(unwrapPayload(data));
      if (sid) guildStore.patchInfo(sid, { nodeOnline: false });
    };
    const onServerJoined = (data: unknown) => {
      const s = unwrapPayload(data);
      if (!s?.id) return;
      serverListStore.add({ id: s.id, name: s.name ?? '', iconUrl: s.iconUrl, ownerId: s.ownerId });
    };
    const onRemovedFromServer = (data: unknown) => {
      const sid = sidOf(unwrapPayload(data));
      if (!sid) return;
      serverListStore.remove(sid);
      guildStore.forget(sid);
    };

    /* Reconnexion : l'état vocal et les listes ont pu bouger pendant la coupure. */
    const onReconnected = () => {
      const servers = Object.keys(guildStore.get().channels);
      for (const sid of servers) {
        invalidateGuild(sid, ['channels', 'voice', 'members']);
        void loadVoice(sid, true);
      }
    };

    const table: [string, (d: unknown) => void][] = [
      ['CHANNEL_CREATE', onChannelCreate],
      ['CHANNEL_UPDATE', onChannelUpdate],
      ['CHANNEL_DELETE', onChannelDelete],
      ['CHANNELS_REORDERED', onReordered],
      ['CHANNELS_INVALIDATE', onChannelsInvalidate],
      ['CHANNEL_PERMS_UPDATE', onChannelsInvalidate],
      ['ROLE_CREATE', onRoleUpsert],
      ['ROLE_UPDATE', onRoleUpsert],
      ['ROLE_DELETE', onRoleDelete],
      ['ROLES_REORDERED', onRolesReordered],
      ['MEMBER_JOIN', onMemberJoin],
      ['MEMBER_LEAVE', onMemberLeave],
      ['MEMBER_UPDATE', onMemberUpdate],
      ['PRESENCE_UPDATE', onPresence],
      ['VOICE_STATE_UPDATE', onVoiceState],
      ['VOICE_SPEAKING', onSpeaking],
      ['SERVER_UPDATE', onServerUpdate],
      ['SERVER_NODE_ONLINE', onNodeOnline],
      ['SERVER_NODE_OFFLINE', onNodeOffline],
      ['SERVER_JOINED', onServerJoined],
      ['SERVER_KICKED', onRemovedFromServer],
      ['SERVER_BANNED', onRemovedFromServer],
      ['socket:reconnected', onReconnected],
    ];
    for (const [event, fn] of table) socketService.on(event, fn);
    return () => {
      for (const [event, fn] of table) socketService.off(event, fn);
      if (flushTimer) clearTimeout(flushTimer);
    };
  }, [currentUserId]);
}
