'use client';

/**
 * Mutations de serveur. Toutes sont optimistes quand c'est sûr : le store
 * change tout de suite (l'interface ne « réfléchit » jamais), la diffusion de
 * la passerelle confirme, et un refus remet l'état d'avant.
 */

import { toast } from '@heroui/react';

import { api } from '@/lib/api';
import { socketService } from '@/lib/socket';
import { serverListStore } from '@/lib/server-list-store';
import * as notif from '@/lib/notification-store';
import { guildStore } from '@/components/alfy/guild/store';
import { useGuildPrefs } from '@/components/alfy/guild/prefs';
import { normalizeChannel, normalizeRole } from '@/components/alfy/guild/normalize';
import type { ChannelOverride, GuildChannel, GuildChannelType, GuildRole } from '@/components/alfy/guild/types';

type Ack = { error?: string; success?: boolean; [k: string]: unknown };

/** Messages d'erreur lisibles pour les codes renvoyés par la passerelle. */
let errorLabels: Record<string, string> = {};
export function setGuildErrorLabels(labels: Record<string, string>) {
  errorLabels = labels;
}
/** Signale un refus (toast lisible) ; les actions renvoient ensuite `null`/`false`. */
function report(error: unknown, fallback: string): null {
  const code = typeof error === 'string' ? error : (error as Error)?.message ?? '';
  toast.danger(errorLabels[code] ?? errorLabels.default ?? fallback, code && !errorLabels[code] ? { description: code } : undefined);
  return null;
}

async function ask(event: string, data: Record<string, unknown>, timeout = 10_000): Promise<Ack> {
  const res = await socketService.request<Ack>(event, data, timeout);
  if (res?.error) throw new Error(String(res.error));
  return res ?? {};
}

/* ── Salons ──────────────────────────────────────────────────────────────── */

export interface NewChannelInput {
  name: string;
  type: GuildChannelType;
  parentId?: string | null;
  topic?: string;
  isPrivate?: boolean;
  userLimit?: number;
}

/** Nom de salon textuel « à la Discord » : minuscules, tirets, sans espaces. */
export function slugChannelName(name: string, type: GuildChannelType): string {
  if (type === 'voice' || type === 'stage' || type === 'category') return name.trim().replace(/\s+/g, ' ').slice(0, 100);
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\p{L}\p{N}_-]/gu, '')
    .replace(/-+/g, '-')
    .slice(0, 100);
}

export async function createChannel(serverId: string, input: NewChannelInput): Promise<GuildChannel | null> {
  try {
    const res = await ask('CHANNEL_CREATE', {
      serverId,
      name: slugChannelName(input.name, input.type),
      type: input.type,
      ...(input.parentId ? { parentId: input.parentId } : {}),
      ...(input.topic ? { topic: input.topic } : {}),
      ...(input.isPrivate ? { isPrivate: true } : {}),
      ...(input.userLimit ? { userLimit: input.userLimit } : {}),
    });
    const raw = res.channel as Record<string, unknown> | null | undefined;
    if (!raw?.id) return null;
    const channel = normalizeChannel(raw, serverId);
    // Un salon privé n'est pas diffusé : on l'ajoute nous-mêmes (on le voit).
    guildStore.upsertChannel(channel);
    return channel;
  } catch (e) {
    return report(e, 'CHANNEL_CREATE');
  }
}

export function updateChannel(serverId: string, channelId: string, patch: Partial<Pick<GuildChannel, 'name' | 'topic' | 'isNsfw' | 'slowMode' | 'userLimit' | 'parentId' | 'position'>>) {
  const prev = guildStore.get().channels[serverId]?.find((c) => c.id === channelId);
  if (prev) guildStore.patchChannel(serverId, channelId, patch);
  socketService.emit('CHANNEL_UPDATE', { serverId, channelId, ...patch });
}

export function deleteChannel(serverId: string, channelId: string) {
  guildStore.removeChannel(serverId, channelId);
  socketService.emit('CHANNEL_DELETE', { serverId, channelId });
}

/** Glisser-déposer : un lot de positions, appliqué localement puis confirmé. */
export async function reorderChannels(serverId: string, positions: { id: string; position: number; parentId?: string | null }[]) {
  if (positions.length === 0) return;
  const before = guildStore.get().channels[serverId];
  guildStore.applyPositions(serverId, positions);
  try {
    await ask('CHANNEL_REORDER', { serverId, positions });
  } catch (e) {
    if (before) guildStore.setChannels(serverId, before);
    report(e, 'CHANNEL_REORDER');
  }
}

/** Duplique un salon (nom, type, catégorie, sujet, limite). */
export async function duplicateChannel(serverId: string, channel: GuildChannel) {
  return createChannel(serverId, {
    name: channel.name,
    type: channel.type,
    parentId: channel.parentId,
    topic: channel.topic,
    userLimit: channel.userLimit,
  });
}

/* ── Surcharges de permissions ───────────────────────────────────────────── */

export async function getOverrides(serverId: string, channelId: string): Promise<{ overrides: ChannelOverride[]; synced: boolean; parentId: string | null }> {
  const res = await ask('CHANNEL_PERMS_GET', { serverId, channelId });
  const list = Array.isArray(res.overrides) ? (res.overrides as ChannelOverride[]) : [];
  return { overrides: list, synced: Boolean(res.synced), parentId: (res.parentId as string | null) ?? null };
}

export async function setOverride(serverId: string, channelId: string, o: ChannelOverride) {
  try {
    await ask('CHANNEL_PERMS_SET', { serverId, channelId, ...o });
  } catch (e) {
    report(e, 'CHANNEL_PERMS_SET');
  }
}

export async function deleteOverride(serverId: string, channelId: string, targetType: 'role' | 'member', targetId: string) {
  try {
    await ask('CHANNEL_PERMS_DELETE', { serverId, channelId, targetType, targetId });
  } catch (e) {
    report(e, 'CHANNEL_PERMS_DELETE');
  }
}

export async function syncOverrides(serverId: string, channelId: string) {
  try {
    await ask('CHANNEL_PERMS_SYNC', { serverId, channelId });
  } catch (e) {
    report(e, 'CHANNEL_PERMS_SYNC');
  }
}

/* ── Rôles ───────────────────────────────────────────────────────────────── */

export async function createRole(serverId: string, input: { name: string; color?: string; permissions?: number }): Promise<GuildRole | null> {
  try {
    const res = await ask('ROLE_CREATE', { serverId, ...input });
    const raw = res.role as Record<string, unknown> | null | undefined;
    if (!raw?.id) return null;
    const role = normalizeRole(raw);
    guildStore.upsertRole(serverId, role);
    return role;
  } catch (e) {
    return report(e, 'ROLE_CREATE');
  }
}

export function updateRole(serverId: string, roleId: string, patch: Partial<Pick<GuildRole, 'name' | 'color' | 'permissions' | 'hoist' | 'mentionable' | 'iconEmoji'>>) {
  guildStore.patchRole(serverId, roleId, patch);
  socketService.emit('ROLE_UPDATE', { serverId, roleId, ...patch });
}

export function deleteRole(serverId: string, roleId: string) {
  guildStore.removeRole(serverId, roleId);
  socketService.emit('ROLE_DELETE', { serverId, roleId });
}

export async function reorderRoles(serverId: string, positions: { id: string; position: number }[]) {
  const before = guildStore.get().roles[serverId];
  if (before) {
    const byId = new Map(positions.map((p) => [p.id, p.position]));
    guildStore.setRoles(serverId, before.map((r) => (byId.has(r.id) ? { ...r, position: byId.get(r.id)! } : r)));
  }
  try {
    await ask('ROLE_REORDER', { serverId, positions });
  } catch (e) {
    if (before) guildStore.setRoles(serverId, before);
    report(e, 'ROLE_REORDER');
  }
}

/* ── Membres ─────────────────────────────────────────────────────────────── */

export async function setMemberRoles(serverId: string, userId: string, roleIds: string[]) {
  const prev = guildStore.get().members[serverId]?.[userId];
  guildStore.patchMember(serverId, userId, { roleIds });
  try {
    await ask('MEMBER_UPDATE', { serverId, targetUserId: userId, roleIds });
  } catch (e) {
    if (prev) guildStore.patchMember(serverId, userId, { roleIds: prev.roleIds });
    report(e, 'MEMBER_UPDATE');
  }
}

export async function toggleMemberRole(serverId: string, userId: string, roleId: string, on: boolean) {
  const member = guildStore.get().members[serverId]?.[userId];
  const current = member?.roleIds ?? [];
  const next = on ? [...new Set([...current, roleId])] : current.filter((r) => r !== roleId);
  return setMemberRoles(serverId, userId, next);
}

export async function setNickname(serverId: string, userId: string, nickname: string) {
  const prev = guildStore.get().members[serverId]?.[userId];
  guildStore.patchMember(serverId, userId, { nickname: nickname || undefined });
  try {
    await ask('MEMBER_UPDATE', { serverId, targetUserId: userId, nickname: nickname || null });
  } catch (e) {
    if (prev) guildStore.patchMember(serverId, userId, { nickname: prev.nickname });
    report(e, 'MEMBER_UPDATE');
  }
}

export function kickMember(serverId: string, userId: string) {
  guildStore.removeMember(serverId, userId);
  socketService.kickMember(serverId, userId);
}

export function banMember(serverId: string, userId: string, reason?: string) {
  guildStore.removeMember(serverId, userId);
  socketService.banMember(serverId, userId, reason);
}

/* ── Vocal ───────────────────────────────────────────────────────────────── */

export async function setVoiceStatus(serverId: string, channelId: string, status: string) {
  try {
    await ask('VOICE_CHANNEL_STATUS', { serverId, channelId, status });
  } catch (e) {
    report(e, 'VOICE_CHANNEL_STATUS');
  }
}

export async function moderateVoice(serverId: string, targetUserId: string, action: 'mute' | 'unmute' | 'deafen' | 'undeafen' | 'disconnect' | 'move', channelId?: string) {
  try {
    await ask('VOICE_MODERATE', { serverId, targetUserId, action, ...(channelId ? { channelId } : {}) });
  } catch (e) {
    report(e, 'VOICE_MODERATE');
  }
}

/* ── Serveur ─────────────────────────────────────────────────────────────── */

export async function leaveServer(serverId: string): Promise<boolean> {
  const res = (await api.leaveServer(serverId)) as { success?: boolean; error?: string };
  if (res && res.success === false) {
    report(res.error ?? 'LEAVE_FAILED', 'LEAVE_FAILED');
    return false;
  }
  socketService.emit('SERVER_LEAVE', { serverId });
  serverListStore.remove(serverId);
  guildStore.forget(serverId);
  return true;
}

export async function deleteServer(serverId: string): Promise<boolean> {
  const res = (await api.deleteServer(serverId)) as { success?: boolean; error?: string };
  if (res && res.success === false) {
    report(res.error ?? 'DELETE_FAILED', 'DELETE_FAILED');
    return false;
  }
  serverListStore.remove(serverId);
  guildStore.forget(serverId);
  return true;
}

/** Marque un salon comme lu (badge, serveur, synchronisation multi-appareils). */
export function markChannelRead(serverId: string, channelId: string) {
  notif.clearChannelUnread(channelId, serverId);
  const key = `channel:${channelId}`;
  void api.markNotificationsRead(key).catch(() => {});
  socketService.emit('MARK_READ', { key });
}

/** Marque tout un serveur comme lu. */
export function markServerRead(serverId: string) {
  const channels = guildStore.get().channels[serverId] ?? [];
  for (const c of channels) if (c.type !== 'category') markChannelRead(serverId, c.id);
  notif.clearAll(`server:${serverId}`);
}

/** Niveau de notification d'un serveur ou d'un salon (persisté côté compte). */
export function setNotifLevel(targetId: string, level: notif.NotifLevel, targetType: 'channel' | 'server') {
  notif.setChannelSetting(targetId, level);
  if (level === 'all') {
    notif.removeChannelSetting(targetId);
    void api.deleteChannelNotifSetting(targetId).catch(() => {});
  } else {
    void api.setChannelNotifSetting(targetId, level, targetType).catch(() => {});
  }
}

/* ── Divers ──────────────────────────────────────────────────────────────── */

export async function copyText(text: string, done: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(done);
  } catch {
    /* presse-papiers refusé : rien à faire */
  }
}

/** Mute local (affichage) + niveau « rien » pour les notifications. */
export function muteChannel(channelId: string, until: number | null) {
  useGuildPrefs.getState().muteChannel(channelId, until);
}

export function muteServer(serverId: string, until: number | null) {
  useGuildPrefs.getState().muteServer(serverId, until);
}
