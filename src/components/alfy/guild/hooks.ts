'use client';

/**
 * Sélecteurs du store « guild ». Chaque hook lit la tranche minimale et dérive
 * le reste en `useMemo` : une mise à jour de présence ne re-rend pas la liste
 * des salons, un nouveau salon ne re-rend pas la liste des membres.
 */

import { useEffect, useMemo, useSyncExternalStore } from 'react';

import { useAuth } from '@/hooks/use-auth';
import { serverListStore } from '@/lib/server-list-store';
import * as notif from '@/lib/notification-store';
import { useGuildStore } from '@/components/alfy/guild/store';
import { ensureGuild, loadMyPerms } from '@/components/alfy/guild/data';
import { ALL_PERMS, hasPerm, P, type PermKey } from '@/components/alfy/guild/perms';
import type {
  ChannelGroup,
  GuildChannel,
  GuildInfo,
  GuildMember,
  GuildRole,
  VoiceChannelState,
} from '@/components/alfy/guild/types';

const EMPTY_CHANNELS: GuildChannel[] = [];
const EMPTY_ROLES: GuildRole[] = [];
const EMPTY_MEMBERS: Record<string, GuildMember> = {};

/** Charge (ou rafraîchit) un serveur dès qu'il est affiché. */
export function useEnsureGuild(serverId: string | null) {
  useEffect(() => {
    if (serverId) void ensureGuild(serverId);
  }, [serverId]);
}

/** Fiche serveur ; à défaut, ce que la liste des serveurs en sait déjà (nom, icône). */
export function useGuildInfo(serverId: string | null): GuildInfo | null {
  const info = useGuildStore((s) => (serverId ? s.infos[serverId] : undefined));
  const listed = useSyncExternalStore(serverListStore.subscribe, serverListStore.getSnapshot, serverListStore.getServerSnapshot);
  return useMemo(() => {
    if (!serverId) return null;
    if (info) return info;
    const l = listed.find((s) => s.id === serverId);
    return {
      id: serverId,
      name: l?.name ?? '',
      iconUrl: l?.iconUrl,
      ownerId: l?.ownerId ?? '',
      isPublic: false,
      nodeOnline: null,
      selfHosted: false,
    };
  }, [serverId, info, listed]);
}

export function useGuildChannels(serverId: string | null): GuildChannel[] {
  return useGuildStore((s) => (serverId ? (s.channels[serverId] ?? EMPTY_CHANNELS) : EMPTY_CHANNELS));
}

export function useGuildChannelsLoaded(serverId: string | null): boolean {
  return useGuildStore((s) => Boolean(serverId && s.channels[serverId]));
}

export function useGuildChannel(serverId: string | null, channelId: string | null): GuildChannel | undefined {
  return useGuildStore((s) => (serverId && channelId ? s.channels[serverId]?.find((c) => c.id === channelId) : undefined));
}

/**
 * Salons regroupés comme dans la sidebar : d'abord ceux sans catégorie, puis
 * chaque catégorie avec ses salons, textuels avant vocaux (ordre Discord).
 */
export function groupChannels(channels: GuildChannel[]): ChannelGroup[] {
  const categories = channels.filter((c) => c.type === 'category');
  const catIds = new Set(categories.map((c) => c.id));
  const rank = (c: GuildChannel) => (c.type === 'voice' || c.type === 'stage' ? 1 : 0);
  const sort = (list: GuildChannel[]) => [...list].sort((a, b) => rank(a) - rank(b) || a.position - b.position);
  const orphans = channels.filter((c) => c.type !== 'category' && (!c.parentId || !catIds.has(c.parentId)));
  const groups: ChannelGroup[] = [];
  if (orphans.length) groups.push({ category: null, channels: sort(orphans) });
  for (const cat of categories) {
    groups.push({ category: cat, channels: sort(channels.filter((c) => c.parentId === cat.id)) });
  }
  return groups;
}

export function useChannelGroups(serverId: string | null): ChannelGroup[] {
  const channels = useGuildChannels(serverId);
  return useMemo(() => groupChannels(channels), [channels]);
}

export function useGuildRoles(serverId: string | null): GuildRole[] {
  return useGuildStore((s) => (serverId ? (s.roles[serverId] ?? EMPTY_ROLES) : EMPTY_ROLES));
}

export function useGuildMembers(serverId: string | null): Record<string, GuildMember> {
  return useGuildStore((s) => (serverId ? (s.members[serverId] ?? EMPTY_MEMBERS) : EMPTY_MEMBERS));
}

export function useGuildMembersLoaded(serverId: string | null): boolean {
  return useGuildStore((s) => Boolean(serverId && s.members[serverId]));
}

export function useGuildMember(serverId: string | null, userId: string | null | undefined): GuildMember | undefined {
  return useGuildStore((s) => (serverId && userId ? s.members[serverId]?.[userId] : undefined));
}

/** Rôles d'un membre, du plus haut au plus bas (sans @everyone). */
export function memberRoles(member: GuildMember | undefined, roles: GuildRole[]): GuildRole[] {
  if (!member) return [];
  return roles.filter((r) => !r.isDefault && member.roleIds.includes(r.id));
}

/** Couleur d'affichage d'un membre = couleur de son plus haut rôle coloré. */
export function memberColor(member: GuildMember | undefined, roles: GuildRole[]): string | undefined {
  const colored = memberRoles(member, roles).find((r) => r.color && r.color !== '#99aab5' && r.color !== '#000000');
  return colored?.color;
}

/** Nom affiché dans un serveur : pseudo de serveur, sinon nom global. */
export function memberName(member: GuildMember | undefined, fallback?: string): string {
  return member?.nickname || member?.user.displayName || member?.user.username || fallback || '';
}

export function useVoiceChannel(channelId: string | null): VoiceChannelState | undefined {
  return useGuildStore((s) => (channelId ? s.voice[channelId] : undefined));
}

/** Présence courante d'un utilisateur (statut + statut perso). */
export function usePresence(userId: string | null | undefined) {
  return useGuildStore((s) => (userId ? s.presence[userId] : undefined));
}

export function useIsSpeaking(userId: string | null | undefined): boolean {
  return useGuildStore((s) => Boolean(userId && s.speaking[userId]));
}

/* ── Droits du membre courant ─────────────────────────────────────────────── */

export interface GuildPerms {
  isOwner: boolean;
  bits: number;
  /** Les droits viennent du serveur (surcharges incluses) et non d'une estimation locale. */
  exact: boolean;
  can: (key: PermKey) => boolean;
}

function localBits(ownerId: string | undefined, userId: string | undefined, roles: GuildRole[], member: GuildMember | undefined): number {
  if (!userId) return 0;
  if (ownerId && ownerId === userId) return ALL_PERMS;
  let bits = roles.find((r) => r.isDefault)?.permissions ?? 0;
  if (member) for (const r of roles) if (member.roleIds.includes(r.id)) bits |= r.permissions;
  if (bits & P.ADMIN) bits = ALL_PERMS;
  return bits;
}

/**
 * Droits du membre courant sur un serveur, ou dans un salon. Affiche aussitôt
 * une estimation locale (rôles connus), puis la remplace par la valeur exacte
 * renvoyée par la passerelle (surcharges de salon incluses).
 */
export function useMyPerms(serverId: string | null, channelId?: string | null): GuildPerms {
  const { user } = useAuth();
  const me = user?.id;
  const key = serverId ? (channelId ? `${serverId}:${channelId}` : serverId) : '';
  const exact = useGuildStore((s) => (key ? s.myPerms[key] : undefined));
  const ownerId = useGuildStore((s) => (serverId ? s.infos[serverId]?.ownerId : undefined));
  const roles = useGuildRoles(serverId);
  const member = useGuildMember(serverId, me);

  useEffect(() => {
    if (serverId && me) void loadMyPerms(serverId, channelId);
  }, [serverId, channelId, me]);

  return useMemo(() => {
    const isOwner = exact?.isOwner ?? Boolean(ownerId && ownerId === me);
    const bits = exact ? exact.permissions : localBits(ownerId, me, roles, member);
    return { isOwner, bits, exact: Boolean(exact), can: (k: PermKey) => isOwner || hasPerm(bits, k) };
  }, [exact, ownerId, me, roles, member]);
}

/* ── Non-lus ──────────────────────────────────────────────────────────────── */

/**
 * Compteur d'une seule clé (`channel:<id>`, `server:<id>`…). Renvoie un nombre :
 * le composant ne se re-rend que quand CE compteur change, pas à chaque
 * message reçu ailleurs dans l'application.
 */
export function useNotifCount(kind: 'unread' | 'mentions', key: string): number {
  return useSyncExternalStore(
    notif.subscribe,
    () => notif.getSnapshot()[kind].get(key) ?? 0,
    () => 0,
  );
}

/** Ids (joints) des salons non lus parmi une liste — change seulement quand l'ensemble change. */
export function useUnreadIdsKey(channelIds: string[]): string {
  return useSyncExternalStore(
    notif.subscribe,
    () => {
      const unread = notif.getSnapshot().unread;
      let out = '';
      for (const id of channelIds) if ((unread.get(`channel:${id}`) ?? 0) > 0) out += `${id},`;
      return out;
    },
    () => '',
  );
}

export function useNotifState() {
  return useSyncExternalStore(notif.subscribe, notif.getSnapshot, notif.getSnapshot);
}

export function channelUnread(state: ReturnType<typeof notif.getSnapshot>, channelId: string) {
  const key = `channel:${channelId}`;
  return { unread: state.unread.get(key) ?? 0, mentions: state.mentions.get(key) ?? 0 };
}

export function serverUnread(state: ReturnType<typeof notif.getSnapshot>, serverId: string) {
  const key = `server:${serverId}`;
  return { unread: state.unread.get(key) ?? 0, mentions: state.mentions.get(key) ?? 0 };
}
