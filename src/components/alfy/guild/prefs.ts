'use client';

/**
 * Préférences d'interface des serveurs, propres à l'appareil (localStorage) :
 * ordre et dossiers du rail, catégories repliées, dernier salon ouvert par
 * serveur, serveurs/salons en sourdine. Rien de tout ça n'est partagé : ce sont
 * des réglages d'affichage, comme sur Discord.
 */

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export interface GuildFolder {
  id: string;
  name?: string;
  /** Couleur hex, `undefined` = accent. */
  color?: string;
  serverIds: string[];
  expanded: boolean;
}

/** Durée d'une mise en sourdine : timestamp de fin, ou `0` = jusqu'à réactivation. */
export type MuteUntil = number;

interface GuildPrefsState {
  /** Éléments de premier niveau du rail : ids de serveurs ou `folder:<id>`. */
  railOrder: string[];
  folders: Record<string, GuildFolder>;
  /** serverId → ids des catégories repliées. */
  collapsed: Record<string, string[]>;
  /** serverId → dernier salon ouvert (rouvert au retour sur le serveur). */
  lastChannel: Record<string, string>;
  /** serverId → masquer les salons en sourdine. */
  hideMuted: Record<string, boolean>;
  mutedServers: Record<string, MuteUntil>;
  mutedChannels: Record<string, MuteUntil>;
  /** Afficher toutes les catégories repliées d'un coup (« Tout replier »). */
}

interface GuildPrefsActions {
  setRailOrder: (order: string[]) => void;
  toggleCategory: (serverId: string, categoryId: string) => void;
  setCollapsedAll: (serverId: string, categoryIds: string[]) => void;
  rememberChannel: (serverId: string, channelId: string) => void;
  setHideMuted: (serverId: string, value: boolean) => void;
  muteServer: (serverId: string, until: MuteUntil | null) => void;
  muteChannel: (channelId: string, until: MuteUntil | null) => void;
  createFolder: (serverIds: string[], at?: number) => string;
  addToFolder: (folderId: string, serverId: string) => void;
  removeFromFolder: (serverId: string) => void;
  updateFolder: (folderId: string, patch: Partial<Omit<GuildFolder, 'id' | 'serverIds'>>) => void;
  deleteFolder: (folderId: string) => void;
  setFolderServers: (folderId: string, serverIds: string[]) => void;
}

const FOLDER = 'folder:';
export const isFolderKey = (key: string) => key.startsWith(FOLDER);
export const folderIdOf = (key: string) => key.slice(FOLDER.length);
export const folderKey = (id: string) => `${FOLDER}${id}`;

/** Retire un serveur partout (rail et dossiers) — les dossiers vidés disparaissent. */
function detach(state: GuildPrefsState, serverId: string): Pick<GuildPrefsState, 'railOrder' | 'folders'> {
  const folders: Record<string, GuildFolder> = {};
  let railOrder = state.railOrder.filter((k) => k !== serverId);
  for (const [id, f] of Object.entries(state.folders)) {
    const serverIds = f.serverIds.filter((s) => s !== serverId);
    if (serverIds.length === 0) {
      railOrder = railOrder.filter((k) => k !== folderKey(id));
      continue;
    }
    folders[id] = { ...f, serverIds };
  }
  return { railOrder, folders };
}

export const useGuildPrefs = create<GuildPrefsState & GuildPrefsActions>()(
  persist(
    (set) => ({
      railOrder: [],
      folders: {},
      collapsed: {},
      lastChannel: {},
      hideMuted: {},
      mutedServers: {},
      mutedChannels: {},

      setRailOrder: (railOrder) => set({ railOrder }),
      toggleCategory: (serverId, categoryId) =>
        set((s) => {
          const list = s.collapsed[serverId] ?? [];
          const next = list.includes(categoryId) ? list.filter((c) => c !== categoryId) : [...list, categoryId];
          return { collapsed: { ...s.collapsed, [serverId]: next } };
        }),
      setCollapsedAll: (serverId, categoryIds) => set((s) => ({ collapsed: { ...s.collapsed, [serverId]: categoryIds } })),
      rememberChannel: (serverId, channelId) =>
        set((s) => (s.lastChannel[serverId] === channelId ? s : { lastChannel: { ...s.lastChannel, [serverId]: channelId } })),
      setHideMuted: (serverId, value) => set((s) => ({ hideMuted: { ...s.hideMuted, [serverId]: value } })),
      muteServer: (serverId, until) =>
        set((s) => {
          const next = { ...s.mutedServers };
          if (until === null) delete next[serverId];
          else next[serverId] = until;
          return { mutedServers: next };
        }),
      muteChannel: (channelId, until) =>
        set((s) => {
          const next = { ...s.mutedChannels };
          if (until === null) delete next[channelId];
          else next[channelId] = until;
          return { mutedChannels: next };
        }),

      createFolder: (serverIds, at) => {
        const id = Math.random().toString(36).slice(2, 10);
        set((s) => {
          let state: GuildPrefsState = s;
          for (const sid of serverIds) state = { ...state, ...detach(state, sid) };
          const order = [...state.railOrder];
          const index = Math.min(Math.max(at ?? order.length, 0), order.length);
          order.splice(index, 0, folderKey(id));
          return { railOrder: order, folders: { ...state.folders, [id]: { id, serverIds, expanded: true } } };
        });
        return id;
      },
      addToFolder: (folderId, serverId) =>
        set((s) => {
          if (!s.folders[folderId]) return s;
          const base = detach(s, serverId);
          const folder = base.folders[folderId] ?? { ...s.folders[folderId], serverIds: [] };
          return { ...base, folders: { ...base.folders, [folderId]: { ...folder, serverIds: [...folder.serverIds, serverId] } } };
        }),
      removeFromFolder: (serverId) =>
        set((s) => {
          const owner = Object.values(s.folders).find((f) => f.serverIds.includes(serverId));
          if (!owner) return s;
          const base = detach(s, serverId);
          const at = base.railOrder.indexOf(folderKey(owner.id));
          const order = [...base.railOrder];
          order.splice(at >= 0 ? at + 1 : order.length, 0, serverId);
          return { ...base, railOrder: order };
        }),
      updateFolder: (folderId, patch) =>
        set((s) => (s.folders[folderId] ? { folders: { ...s.folders, [folderId]: { ...s.folders[folderId], ...patch } } } : s)),
      deleteFolder: (folderId) =>
        set((s) => {
          const folder = s.folders[folderId];
          if (!folder) return s;
          const at = s.railOrder.indexOf(folderKey(folderId));
          const order = s.railOrder.filter((k) => k !== folderKey(folderId));
          order.splice(at >= 0 ? at : order.length, 0, ...folder.serverIds);
          const folders = { ...s.folders };
          delete folders[folderId];
          return { railOrder: order, folders };
        }),
      setFolderServers: (folderId, serverIds) =>
        set((s) => (s.folders[folderId] ? { folders: { ...s.folders, [folderId]: { ...s.folders[folderId], serverIds } } } : s)),
    }),
    {
      name: 'alfy-guild-prefs-v1',
      storage: createJSONStorage(() => {
        try {
          return localStorage;
        } catch {
          // Navigation privée stricte : préférences de session seulement.
          const memory = new Map<string, string>();
          return {
            getItem: (k: string) => memory.get(k) ?? null,
            setItem: (k: string, v: string) => void memory.set(k, v),
            removeItem: (k: string) => void memory.delete(k),
          };
        }
      }),
      version: 1,
    },
  ),
);

/** Sourdine encore active ? (`0` = indéfinie). */
export function isMuteActive(until: MuteUntil | undefined): boolean {
  if (until === undefined) return false;
  return until === 0 || until > Date.now();
}

export const guildPrefs = {
  get: useGuildPrefs.getState,
  isServerMuted: (serverId: string) => isMuteActive(useGuildPrefs.getState().mutedServers[serverId]),
  isChannelMuted: (channelId: string) => isMuteActive(useGuildPrefs.getState().mutedChannels[channelId]),
};

/** Ordre effectif du rail : préférences + serveurs nouveaux en fin, absents retirés. */
export function resolveRail(
  serverIds: string[],
  prefs: Pick<GuildPrefsState, 'railOrder' | 'folders'>,
): { key: string; folder?: GuildFolder; serverId?: string }[] {
  const known = new Set(serverIds);
  const placed = new Set<string>();
  const out: { key: string; folder?: GuildFolder; serverId?: string }[] = [];
  for (const key of prefs.railOrder) {
    if (isFolderKey(key)) {
      const folder = prefs.folders[folderIdOf(key)];
      if (!folder) continue;
      const ids = folder.serverIds.filter((id) => known.has(id) && !placed.has(id));
      if (ids.length === 0) continue;
      ids.forEach((id) => placed.add(id));
      out.push({ key, folder: { ...folder, serverIds: ids } });
    } else if (known.has(key) && !placed.has(key)) {
      placed.add(key);
      out.push({ key, serverId: key });
    }
  }
  for (const id of serverIds) if (!placed.has(id)) out.push({ key: id, serverId: id });
  return out;
}
