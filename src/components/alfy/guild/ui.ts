'use client';

/**
 * État des fenêtres du module serveur (création de salon, invitation,
 * réglages…). N'importe quel composant les ouvre — menu contextuel, en-tête,
 * raccourci clavier — sans faire remonter de callbacks : un seul hôte
 * (`GuildDialogs`) les rend.
 */

import { create } from 'zustand';

import type { GuildChannelType } from '@/components/alfy/guild/types';

export type ServerSettingsTab =
  | 'overview' | 'roles' | 'emoji' | 'members' | 'invites' | 'bans'
  | 'automod' | 'audit' | 'integrations' | 'safety' | 'delete';

export type ChannelSettingsTab = 'overview' | 'permissions' | 'invites' | 'integrations';

export interface ConfirmRequest {
  title: string;
  body?: string;
  confirmLabel: string;
  cancelLabel?: string;
  danger?: boolean;
  resolve: (ok: boolean) => void;
}

interface GuildUiState {
  createChannel: { serverId: string; parentId?: string | null; type?: GuildChannelType } | null;
  invite: { serverId: string; channelId?: string | null } | null;
  serverSettings: { serverId: string; tab: ServerSettingsTab; roleId?: string } | null;
  channelSettings: { serverId: string; channelId: string; tab: ChannelSettingsTab } | null;
  serverProfile: { serverId: string } | null;
  notifications: { serverId: string } | null;
  createServer: boolean;
  joinServer: boolean;
  /** Action de modération sur un membre (pseudo d'un autre, expulsion, bannissement). */
  memberAction: { kind: 'nickname' | 'kick' | 'ban'; serverId: string; userId: string } | null;
  confirm: ConfirmRequest | null;
}

export const useGuildUi = create<GuildUiState>()(() => ({
  createChannel: null,
  invite: null,
  serverSettings: null,
  channelSettings: null,
  serverProfile: null,
  notifications: null,
  createServer: false,
  joinServer: false,
  memberAction: null,
  confirm: null,
}));

const set = useGuildUi.setState;

export const guildUi = {
  createChannel: (serverId: string, opts?: { parentId?: string | null; type?: GuildChannelType }) =>
    set({ createChannel: { serverId, ...opts } }),
  invite: (serverId: string, channelId?: string | null) => set({ invite: { serverId, channelId } }),
  serverSettings: (serverId: string, tab: ServerSettingsTab = 'overview', roleId?: string) =>
    set({ serverSettings: { serverId, tab, roleId } }),
  channelSettings: (serverId: string, channelId: string, tab: ChannelSettingsTab = 'overview') =>
    set({ channelSettings: { serverId, channelId, tab } }),
  serverProfile: (serverId: string) => set({ serverProfile: { serverId } }),
  notifications: (serverId: string) => set({ notifications: { serverId } }),
  createServer: () => set({ createServer: true }),
  joinServer: () => set({ joinServer: true }),
  memberAction: (kind: 'nickname' | 'kick' | 'ban', serverId: string, userId: string) =>
    set({ memberAction: { kind, serverId, userId } }),
  close: (key: keyof Omit<GuildUiState, 'confirm'>) =>
    set({ [key]: key === 'createServer' || key === 'joinServer' ? false : null } as Partial<GuildUiState>),

  /** Confirmation modale, sous forme de promesse. */
  confirm: (req: Omit<ConfirmRequest, 'resolve'>): Promise<boolean> =>
    new Promise((resolve) => {
      useGuildUi.getState().confirm?.resolve(false);
      set({ confirm: { ...req, resolve } });
    }),
  settleConfirm: (ok: boolean) => {
    const current = useGuildUi.getState().confirm;
    set({ confirm: null });
    current?.resolve(ok);
  },
};
