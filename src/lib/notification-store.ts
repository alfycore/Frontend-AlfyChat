/**
 * notification-store.ts
 *
 * Store central de notifications — gère :
 * - Compteurs non-lus (unread) par conversation
 * - Compteurs de mentions (@) séparés des messages normaux
 * - Paramètres de notification par canal (all / mentions / nothing)
 * - Historique des 100 dernières notifications
 * - Conversation active (pour éviter les doubles badges)
 * - Dernier timestamp vu par conversation (divider "nouveaux messages")
 *
 * Intentionnellement SANS Zustand pour éviter les imports circulaires côté SSR.
 * Les composants s'abonnent via useSyncExternalStore + subscribe().
 */

import { useSyncExternalStore } from 'react';

// ── Types ──────────────────────────────────────────────────────────────────────

export type NotifLevel = 'all' | 'mentions' | 'nothing';

export interface NotificationEntry {
  id: string;
  type: 'message' | 'mention' | 'friend_request' | 'friend_accept' | 'reaction';
  /** dm:userId / group:groupId / channel:channelId */
  conversationKey: string;
  senderId?: string;
  senderName: string;
  senderAvatar?: string;
  /** Tronqué à 80 chars */
  preview: string;
  channelName?: string;
  serverName?: string;
  timestamp: string;
  read: boolean;
}

type Listener = () => void;

// ── Storage keys (namespace par userId) ───────────────────────────────────────

let STORAGE_KEY_UNREAD    = 'alfychat_unread';
let STORAGE_KEY_MENTIONS  = 'alfychat_mentions';
let STORAGE_KEY_HISTORY   = 'alfychat_notif_history';
let STORAGE_KEY_SETTINGS  = 'alfychat_notif_settings';
let STORAGE_KEY_LAST_SEEN = 'alfychat_last_seen';

export function setStorageNamespace(userId: string) {
  STORAGE_KEY_UNREAD    = `alfychat_unread_${userId}`;
  STORAGE_KEY_MENTIONS  = `alfychat_mentions_${userId}`;
  STORAGE_KEY_HISTORY   = `alfychat_notif_history_${userId}`;
  STORAGE_KEY_SETTINGS  = `alfychat_notif_settings_${userId}`;
  STORAGE_KEY_LAST_SEEN = `alfychat_last_seen_${userId}`;
  // Recharger depuis le localStorage utilisateur
  state.unread          = loadMap(STORAGE_KEY_UNREAD);
  state.mentions        = loadMap(STORAGE_KEY_MENTIONS);
  state.history         = loadHistory();
  state.channelSettings = loadSettings();
  lastSeenMap.clear();
  loadLastSeen().forEach((v, k) => lastSeenMap.set(k, v));
  notify();
}

// ── Helpers localStorage ───────────────────────────────────────────────────────

function loadMap(key: string): Map<string, number> {
  if (typeof window === 'undefined') return new Map();
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return new Map();
    return new Map(Object.entries(JSON.parse(raw) as Record<string, number>).map(([k, v]) => [k, Number(v)]));
  } catch { return new Map(); }
}

function saveMap(key: string, map: Map<string, number>) {
  if (typeof window === 'undefined') return;
  try {
    const obj: Record<string, number> = {};
    map.forEach((v, k) => { obj[k] = v; });
    localStorage.setItem(key, JSON.stringify(obj));
  } catch { /* ignore */ }
}

function loadHistory(): NotificationEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_HISTORY);
    return raw ? (JSON.parse(raw) as NotificationEntry[]) : [];
  } catch { return []; }
}

function saveHistory(history: NotificationEntry[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(history));
  } catch { /* ignore */ }
}

function loadSettings(): Map<string, NotifLevel> {
  if (typeof window === 'undefined') return new Map();
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SETTINGS);
    if (!raw) return new Map();
    return new Map(Object.entries(JSON.parse(raw) as Record<string, NotifLevel>));
  } catch { return new Map(); }
}

function saveSettings(map: Map<string, NotifLevel>) {
  if (typeof window === 'undefined') return;
  try {
    const obj: Record<string, NotifLevel> = {};
    map.forEach((v, k) => { obj[k] = v; });
    localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(obj));
  } catch { /* ignore */ }
}

function loadLastSeen(): Map<string, string> {
  if (typeof window === 'undefined') return new Map();
  try {
    const raw = localStorage.getItem(STORAGE_KEY_LAST_SEEN);
    if (!raw) return new Map();
    return new Map(Object.entries(JSON.parse(raw) as Record<string, string>));
  } catch { return new Map(); }
}

function saveLastSeen(map: Map<string, string>) {
  if (typeof window === 'undefined') return;
  try {
    const obj: Record<string, string> = {};
    map.forEach((v, k) => { obj[k] = v; });
    localStorage.setItem(STORAGE_KEY_LAST_SEEN, JSON.stringify(obj));
  } catch { /* ignore */ }
}

// ── State ──────────────────────────────────────────────────────────────────────

interface NotificationState {
  unread: Map<string, number>;
  mentions: Map<string, number>;
  channelSettings: Map<string, NotifLevel>;
  history: NotificationEntry[];
  activeRecipientId: string | null;
  activeGroupId: string | null;
  activeChannelId: string | null;
}

const state: NotificationState = {
  unread:          loadMap(STORAGE_KEY_UNREAD),
  mentions:        loadMap(STORAGE_KEY_MENTIONS),
  channelSettings: loadSettings(),
  history:         loadHistory(),
  activeRecipientId: null,
  activeGroupId:     null,
  activeChannelId:   null,
};

const lastSeenMap: Map<string, string> = loadLastSeen();

const listeners = new Set<Listener>();
let cachedSnapshot: NotificationState = snapshot();

function snapshot(): NotificationState {
  return {
    ...state,
    unread:          new Map(state.unread),
    mentions:        new Map(state.mentions),
    channelSettings: new Map(state.channelSettings),
    history:         [...state.history],
  };
}

function notify() {
  saveMap(STORAGE_KEY_UNREAD, state.unread);
  saveMap(STORAGE_KEY_MENTIONS, state.mentions);
  cachedSnapshot = snapshot();
  listeners.forEach((l) => l());
}

// ── Subscribe / getSnapshot ───────────────────────────────────────────────────

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  if (typeof window !== 'undefined' && (state.unread.size > 0 || state.mentions.size > 0)) {
    Promise.resolve().then(listener);
  }
  return () => listeners.delete(listener);
}

export function getSnapshot(): NotificationState {
  return cachedSnapshot;
}

// ── Active conversation ───────────────────────────────────────────────────────

export function setActiveDM(recipientId: string | null) {
  _markPreviousSeen();
  state.activeRecipientId = recipientId;
  state.activeGroupId     = null;
  state.activeChannelId   = null;
  if (recipientId) {
    state.unread.delete(recipientId);
    state.mentions.delete(recipientId);
  }
  notify();
}

export function setActiveGroup(groupId: string | null) {
  _markPreviousSeen();
  state.activeGroupId     = groupId;
  state.activeRecipientId = null;
  state.activeChannelId   = null;
  if (groupId) {
    state.unread.delete(`group:${groupId}`);
    state.mentions.delete(`group:${groupId}`);
  }
  notify();
}

export function setActiveChannel(channelId: string | null, serverId?: string) {
  _markPreviousSeen();
  state.activeChannelId   = channelId;
  state.activeRecipientId = null;
  state.activeGroupId     = null;
  if (channelId) {
    const key = `channel:${channelId}`;
    const count = state.unread.get(key) ?? 0;
    state.unread.delete(key);
    state.mentions.delete(key);
    if (serverId && count > 0) {
      const sKey = `server:${serverId}`;
      const newCount = (state.unread.get(sKey) ?? 0) - count;
      if (newCount <= 0) state.unread.delete(sKey);
      else state.unread.set(sKey, newCount);
    }
    if (serverId) {
      // Décrementer aussi les mentions serveur
      const sMKey = `server:${serverId}`;
      const mentionCount = state.mentions.get(key) ?? 0;
      if (mentionCount > 0) {
        const newMCount = (state.mentions.get(sMKey) ?? 0) - mentionCount;
        if (newMCount <= 0) state.mentions.delete(sMKey);
        else state.mentions.set(sMKey, newMCount);
      }
    }
  }
  notify();
}

function _markPreviousSeen() {
  if (state.activeRecipientId) markLastSeen(state.activeRecipientId);
  if (state.activeGroupId)     markLastSeen(`group:${state.activeGroupId}`);
  if (state.activeChannelId)   markLastSeen(`channel:${state.activeChannelId}`);
}

// ── Predicates ────────────────────────────────────────────────────────────────

export function isDMActive(recipientId: string):  boolean { return state.activeRecipientId === recipientId; }
export function isGroupActive(groupId: string):   boolean { return state.activeGroupId === groupId; }
export function isChannelActive(channelId: string): boolean { return state.activeChannelId === channelId; }

// ── Unread counts ─────────────────────────────────────────────────────────────

export function incrementUnread(key: string) {
  state.unread.set(key, (state.unread.get(key) ?? 0) + 1);
  notify();
}

export function incrementMention(key: string) {
  state.mentions.set(key, (state.mentions.get(key) ?? 0) + 1);
  notify();
}

export function clearUnread(key: string) {
  if (state.unread.has(key)) { state.unread.delete(key); notify(); }
}

export function clearMention(key: string) {
  if (state.mentions.has(key)) { state.mentions.delete(key); notify(); }
}

export function clearAll(key: string) {
  const changed = state.unread.has(key) || state.mentions.has(key);
  state.unread.delete(key);
  state.mentions.delete(key);
  if (changed) notify();
}

export function clearChannelUnread(channelId: string, serverId?: string) {
  const key = `channel:${channelId}`;
  const count = state.unread.get(key) ?? 0;
  const mentionCount = state.mentions.get(key) ?? 0;
  if (count > 0 || mentionCount > 0) {
    state.unread.delete(key);
    state.mentions.delete(key);
    if (serverId) {
      const sKey  = `server:${serverId}`;
      const newC  = (state.unread.get(sKey)   ?? 0) - count;
      const newM  = (state.mentions.get(sKey)  ?? 0) - mentionCount;
      if (newC <= 0) state.unread.delete(sKey);   else state.unread.set(sKey, newC);
      if (newM <= 0) state.mentions.delete(sKey); else state.mentions.set(sKey, newM);
    }
    notify();
  }
}

export function setUnreadCount(key: string, count: number) {
  if (count <= 0) { state.unread.delete(key); } else { state.unread.set(key, count); }
  notify();
}

export function setMentionCount(key: string, count: number) {
  if (count <= 0) { state.mentions.delete(key); } else { state.mentions.set(key, count); }
  notify();
}

export function getUnread(key: string):  number { return state.unread.get(key) ?? 0; }
export function getMention(key: string): number { return state.mentions.get(key) ?? 0; }
export function getAllUnread(): ReadonlyMap<string, number> { return state.unread; }
export function getAllMentions(): ReadonlyMap<string, number> { return state.mentions; }

// ── Channel notification settings ─────────────────────────────────────────────

export function setChannelSetting(targetId: string, level: NotifLevel) {
  state.channelSettings.set(targetId, level);
  saveSettings(state.channelSettings);
  notify();
}

export function removeChannelSetting(targetId: string) {
  state.channelSettings.delete(targetId);
  saveSettings(state.channelSettings);
  notify();
}

export function getLevel(targetId: string): NotifLevel {
  return state.channelSettings.get(targetId) ?? 'all';
}

export function loadChannelSettings(settings: Record<string, NotifLevel>) {
  state.channelSettings = new Map(Object.entries(settings));
  saveSettings(state.channelSettings);
  notify();
}

// ── Notification history ──────────────────────────────────────────────────────

const HISTORY_MAX = 100;

export function pushHistory(entry: NotificationEntry) {
  state.history = [entry, ...state.history].slice(0, HISTORY_MAX);
  saveHistory(state.history);
  notify();
}

export function markHistoryRead(id: string) {
  state.history = state.history.map((e) => e.id === id ? { ...e, read: true } : e);
  saveHistory(state.history);
  notify();
}

export function markAllHistoryRead() {
  state.history = state.history.map((e) => ({ ...e, read: true }));
  saveHistory(state.history);
  notify();
}

export function clearHistory() {
  state.history = [];
  saveHistory(state.history);
  notify();
}

export function getUnreadHistoryCount(): number {
  return state.history.filter((e) => !e.read).length;
}

// ── Last seen timestamps ──────────────────────────────────────────────────────

export function markLastSeen(conversationKey: string) {
  lastSeenMap.set(conversationKey, new Date().toISOString());
  saveLastSeen(lastSeenMap);
}

export function getLastSeen(conversationKey: string): string | null {
  return lastSeenMap.get(conversationKey) ?? null;
}

// ── Prune (nettoyage des clés orphelines) ────────────────────────────────────

export function pruneUnread(knownKeys: string[]) {
  const known = new Set(knownKeys);
  let changed = false;
  state.unread.forEach((_, key) => {
    if (key.startsWith('server:') || key.startsWith('channel:')) return;
    if (!known.has(key)) { state.unread.delete(key); changed = true; }
  });
  if (changed) notify();
}

export function pruneServerUnread(knownServerIds: string[], knownChannelIds?: string[]) {
  const knownServers  = new Set(knownServerIds.map((id) => `server:${id}`));
  const knownChannels = knownChannelIds ? new Set(knownChannelIds.map((id) => `channel:${id}`)) : null;
  let changed = false;
  const prune = (map: Map<string, number>) => {
    map.forEach((_, key) => {
      if (key.startsWith('server:') && !knownServers.has(key)) { map.delete(key); changed = true; }
      else if (knownChannels && key.startsWith('channel:') && !knownChannels.has(key)) { map.delete(key); changed = true; }
    });
  };
  prune(state.unread);
  prune(state.mentions);
  if (changed) notify();
}

// ── React hook ────────────────────────────────────────────────────────────────

const SERVER_SNAPSHOT: NotificationState = {
  unread: new Map(), mentions: new Map(), channelSettings: new Map(), history: [],
  activeRecipientId: null, activeGroupId: null, activeChannelId: null,
};

export function useNotificationStore() {
  return useSyncExternalStore(subscribe, getSnapshot, () => SERVER_SNAPSHOT);
}
