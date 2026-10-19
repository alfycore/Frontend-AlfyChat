'use client';

/**
 * Store central des serveurs (zustand).
 *
 * Une seule source de vérité pour salons, rôles, membres, présence vocale et
 * droits du membre courant, alimentée par `useGuildRealtime` (un unique jeu
 * d'abonnements socket) et par les chargeurs de `data.ts`. Chaque composant
 * lit ce dont il a besoin par sélecteur : changer de serveur ne refait aucune
 * requête si le serveur a déjà été visité, et les données des serveurs voisins
 * sont préchargées au survol du rail.
 */

import { create } from 'zustand';

import type { AlfyPresence } from '@/components/alfy/mock/types';
import type {
  GuildChannel,
  GuildInfo,
  GuildMember,
  GuildRole,
  VoiceChannelState,
} from '@/components/alfy/guild/types';

export interface MyPerms {
  isOwner: boolean;
  permissions: number;
  at: number;
}

export interface GuildState {
  infos: Record<string, GuildInfo>;
  /** serverId → salons (catégories incluses), triés par position. */
  channels: Record<string, GuildChannel[]>;
  /** serverId → rôles, du plus haut au plus bas. */
  roles: Record<string, GuildRole[]>;
  /** serverId → userId → membre. */
  members: Record<string, Record<string, GuildMember>>;
  /** channelId → présence vocale. */
  voice: Record<string, VoiceChannelState>;
  /** userId → parle en ce moment (anneau vert). */
  speaking: Record<string, true>;
  /** `serverId` ou `serverId:channelId` → droits du membre courant. */
  myPerms: Record<string, MyPerms>;
  /** userId → présence courante (séparée des membres, voir `patchPresence`). */
  presence: Record<string, { status: AlfyPresence; customStatus?: string }>;
  /** Horodatage du dernier chargement réussi, par ressource (`channels:<id>`…). */
  fetchedAt: Record<string, number>;
}

export const useGuildStore = create<GuildState>()(() => ({
  infos: {},
  channels: {},
  roles: {},
  members: {},
  voice: {},
  speaking: {},
  myPerms: {},
  presence: {},
  fetchedAt: {},
}));

const set = useGuildStore.setState;

/** Copie d'un enregistrement sans une clé. */
function omit<T>(record: Record<string, T>, key: string): Record<string, T> {
  const next = { ...record };
  delete next[key];
  return next;
}
const get = useGuildStore.getState;

const byPosition = (a: GuildChannel, b: GuildChannel) => a.position - b.position || a.name.localeCompare(b.name);
const byRoleRank = (a: GuildRole, b: GuildRole) => b.position - a.position;

function stamp(key: string) {
  set((s) => ({ fetchedAt: { ...s.fetchedAt, [key]: Date.now() } }));
}

export const guildStore = {
  get,
  stamp,
  fetchedAt: (key: string) => get().fetchedAt[key] ?? 0,
  /** Oublie des horodatages : le prochain chargement repartira au réseau. */
  forgetFetched(keys: string[], prefix?: string) {
    set((s) => {
      const next = { ...s.fetchedAt };
      for (const k of keys) delete next[k];
      if (prefix) for (const k of Object.keys(next)) if (k.startsWith(prefix)) delete next[k];
      return { fetchedAt: next };
    });
  },

  /* ── Infos ───────────────────────────────────────────────────────────── */
  setInfo(serverId: string, info: GuildInfo) {
    set((s) => ({ infos: { ...s.infos, [serverId]: info } }));
  },
  patchInfo(serverId: string, patch: Partial<GuildInfo>) {
    set((s) => {
      const prev = s.infos[serverId];
      if (!prev) return s;
      return { infos: { ...s.infos, [serverId]: { ...prev, ...patch } } };
    });
  },

  /* ── Salons ──────────────────────────────────────────────────────────── */
  setChannels(serverId: string, list: GuildChannel[]) {
    set((s) => ({ channels: { ...s.channels, [serverId]: [...list].sort(byPosition) } }));
  },
  upsertChannel(channel: GuildChannel) {
    set((s) => {
      const list = s.channels[channel.serverId] ?? [];
      const exists = list.some((c) => c.id === channel.id);
      const next = exists ? list.map((c) => (c.id === channel.id ? { ...c, ...channel } : c)) : [...list, channel];
      return { channels: { ...s.channels, [channel.serverId]: next.sort(byPosition) } };
    });
  },
  patchChannel(serverId: string, channelId: string, patch: Partial<GuildChannel>) {
    set((s) => {
      const list = s.channels[serverId];
      if (!list) return s;
      return {
        channels: {
          ...s.channels,
          [serverId]: list.map((c) => (c.id === channelId ? { ...c, ...patch } : c)).sort(byPosition),
        },
      };
    });
  },
  removeChannel(serverId: string, channelId: string) {
    set((s) => {
      const list = s.channels[serverId];
      if (!list) return s;
      // Une catégorie supprimée libère ses salons (comme côté serveur).
      const next = list
        .filter((c) => c.id !== channelId)
        .map((c) => (c.parentId === channelId ? { ...c, parentId: null } : c));
      return { channels: { ...s.channels, [serverId]: next } };
    });
  },
  /** Applique un lot de positions (glisser-déposer ou diffusion CHANNELS_REORDERED). */
  applyPositions(serverId: string, positions: { id: string; position: number; parentId?: string | null }[]) {
    set((s) => {
      const list = s.channels[serverId];
      if (!list) return s;
      const byId = new Map(positions.map((p) => [p.id, p]));
      const next = list.map((c) => {
        const p = byId.get(c.id);
        if (!p) return c;
        return { ...c, position: p.position, ...(p.parentId !== undefined ? { parentId: p.parentId } : {}) };
      });
      return { channels: { ...s.channels, [serverId]: next.sort(byPosition) } };
    });
  },

  /* ── Rôles ───────────────────────────────────────────────────────────── */
  setRoles(serverId: string, list: GuildRole[]) {
    set((s) => ({ roles: { ...s.roles, [serverId]: [...list].sort(byRoleRank) } }));
  },
  upsertRole(serverId: string, role: GuildRole) {
    set((s) => {
      const list = s.roles[serverId] ?? [];
      const exists = list.some((r) => r.id === role.id);
      const next = exists ? list.map((r) => (r.id === role.id ? { ...r, ...role } : r)) : [...list, role];
      return { roles: { ...s.roles, [serverId]: next.sort(byRoleRank) } };
    });
  },
  patchRole(serverId: string, roleId: string, patch: Partial<GuildRole>) {
    set((s) => {
      const list = s.roles[serverId];
      if (!list) return s;
      return { roles: { ...s.roles, [serverId]: list.map((r) => (r.id === roleId ? { ...r, ...patch } : r)).sort(byRoleRank) } };
    });
  },
  removeRole(serverId: string, roleId: string) {
    set((s) => {
      const list = s.roles[serverId];
      const members = s.members[serverId];
      const nextMembers = members
        ? Object.fromEntries(
            Object.entries(members).map(([id, m]) => [id, m.roleIds.includes(roleId) ? { ...m, roleIds: m.roleIds.filter((r) => r !== roleId) } : m]),
          )
        : members;
      return {
        roles: list ? { ...s.roles, [serverId]: list.filter((r) => r.id !== roleId) } : s.roles,
        members: nextMembers ? { ...s.members, [serverId]: nextMembers } : s.members,
      };
    });
  },

  /* ── Membres ─────────────────────────────────────────────────────────── */
  setMembers(serverId: string, list: GuildMember[]) {
    set((s) => {
      const presence = { ...s.presence };
      for (const m of list) presence[m.userId] = { status: m.user.status, customStatus: m.user.customStatus };
      return { members: { ...s.members, [serverId]: Object.fromEntries(list.map((m) => [m.userId, m])) }, presence };
    });
  },
  upsertMember(serverId: string, member: GuildMember) {
    set((s) => {
      const current = s.members[serverId] ?? {};
      const prev = current[member.userId];
      const merged = prev ? { ...prev, ...member, user: { ...prev.user, ...member.user } } : member;
      const presence = s.presence[member.userId]
        ? s.presence
        : { ...s.presence, [member.userId]: { status: member.user.status, customStatus: member.user.customStatus } };
      return { members: { ...s.members, [serverId]: { ...current, [member.userId]: merged } }, presence };
    });
  },
  patchMember(serverId: string, userId: string, patch: Partial<Omit<GuildMember, 'user'>>) {
    set((s) => {
      const current = s.members[serverId];
      const prev = current?.[userId];
      if (!current || !prev) return s;
      return { members: { ...s.members, [serverId]: { ...current, [userId]: { ...prev, ...patch } } } };
    });
  },
  removeMember(serverId: string, userId: string) {
    set((s) => {
      const current = s.members[serverId];
      if (!current?.[userId]) return s;
      return { members: { ...s.members, [serverId]: omit(current, userId) } };
    });
  },
  /**
   * Présence (statut, statut perso) — tenue À PART des fiches membres : un
   * changement de statut ne recrée aucun membre, donc ne re-rend ni le fil de
   * messages ni les rangées qui ne l'affichent pas. Appliquée par lots.
   */
  patchPresence(batch: Record<string, { status?: AlfyPresence; customStatus?: string | null }>) {
    set((s) => {
      const presence = { ...s.presence };
      for (const [userId, patch] of Object.entries(batch)) {
        const prev = presence[userId];
        presence[userId] = {
          status: patch.status ?? prev?.status ?? 'offline',
          customStatus: patch.customStatus !== undefined ? (patch.customStatus ?? undefined) : prev?.customStatus,
        };
      }
      return { presence };
    });
  },

  /* ── Vocal ───────────────────────────────────────────────────────────── */
  setVoiceChannel(channelId: string, state: VoiceChannelState) {
    set((s) => {
      if (state.participants.length === 0) {
        if (!s.voice[channelId]) return s;
        return { voice: omit(s.voice, channelId) };
      }
      return { voice: { ...s.voice, [channelId]: state } };
    });
  },
  /** Remplace tout l'état vocal d'un serveur (instantané GET_VOICE_STATE). */
  setVoiceSnapshot(serverId: string, channels: Record<string, VoiceChannelState>) {
    set((s) => {
      const voice: GuildState['voice'] = {};
      for (const [id, v] of Object.entries(s.voice)) if (v.serverId !== serverId) voice[id] = v;
      for (const [id, v] of Object.entries(channels)) if (v.participants.length) voice[id] = v;
      return { voice };
    });
  },
  setSpeaking(userId: string, speaking: boolean) {
    set((s) => {
      if (speaking === Boolean(s.speaking[userId])) return s;
      if (speaking) return { speaking: { ...s.speaking, [userId]: true as const } };
      return { speaking: omit(s.speaking, userId) as Record<string, true> };
    });
  },

  /* ── Droits du membre courant ────────────────────────────────────────── */
  setMyPerms(key: string, perms: MyPerms) {
    set((s) => ({ myPerms: { ...s.myPerms, [key]: perms } }));
  },
  /** Oublie les droits mis en cache d'un serveur (rôle, surcharge, membre modifié). */
  invalidateMyPerms(serverId: string) {
    set((s) => ({
      myPerms: Object.fromEntries(Object.entries(s.myPerms).filter(([k]) => k !== serverId && !k.startsWith(`${serverId}:`))),
    }));
  },

  /** Oubli complet d'un serveur (quitté, expulsé, supprimé). */
  forget(serverId: string) {
    set((s) => {
      const drop = <T,>(r: Record<string, T>) => omit(r, serverId);
      return {
        infos: drop(s.infos),
        channels: drop(s.channels),
        roles: drop(s.roles),
        members: drop(s.members),
        voice: Object.fromEntries(Object.entries(s.voice).filter(([, v]) => v.serverId !== serverId)),
      };
    });
  },
};
