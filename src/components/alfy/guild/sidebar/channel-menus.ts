'use client';

/** Menus contextuels des salons et catégories (contenu calqué sur Discord). */

import {
  BellRing,
  Check,
  ChevronsDownUp,
  Copy,
  CopyPlus,
  Hash,
  Link2,
  MessageSquare,
  Pencil,
  Plus,
  Trash2,
  UserPlus,
  Volume2,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback } from 'react';

import { useTranslation } from '@/components/locale-provider';
import type { MenuSection } from '@/components/alfy/guild/context-menu';
import { useMuteSubmenu, useNotifSubmenu } from '@/components/alfy/guild/menus';
import { guildUi } from '@/components/alfy/guild/ui';
import { guildStore } from '@/components/alfy/guild/store';
import { isMuteActive, useGuildPrefs } from '@/components/alfy/guild/prefs';
import {
  copyText,
  deleteChannel,
  duplicateChannel,
  markChannelRead,
  muteChannel,
  setNotifLevel,
} from '@/components/alfy/guild/actions';
import { isVoiceType } from '@/components/alfy/guild/channel-icons';
import type { GuildPerms } from '@/components/alfy/guild/hooks';
import type { GuildChannel } from '@/components/alfy/guild/types';

export function useChannelMenu(serverId: string, perms: GuildPerms) {
  const { t, tx } = useTranslation();
  const router = useRouter();
  const muteMenu = useMuteSubmenu();
  const notifMenu = useNotifSubmenu();

  const confirmDelete = useCallback(
    async (channel: GuildChannel) => {
      const isCat = channel.type === 'category';
      const ok = await guildUi.confirm({
        title: isCat ? t.guild.deleteChannel.titleCategory : t.guild.deleteChannel.title,
        body: tx(isCat ? t.guild.deleteChannel.bodyCategory : t.guild.deleteChannel.body, { name: channel.name }),
        confirmLabel: isCat ? t.guild.deleteChannel.confirmCategory : t.guild.deleteChannel.confirm,
        danger: true,
      });
      if (!ok) return;
      deleteChannel(serverId, channel.id);
      if (typeof window !== 'undefined' && window.location.pathname.includes(channel.id)) router.push(`/channels/server/${serverId}`);
    },
    [serverId, t, tx, router],
  );

  return useCallback(
    (channel: GuildChannel): MenuSection[] => {
      const manage = perms.can('MANAGE_CHANNELS');
      const muted = isMuteActive(useGuildPrefs.getState().mutedChannels[channel.id]);
      const voice = isVoiceType(channel.type);
      const link = `${window.location.origin}/channels/server/${serverId}/${channel.id}`;

      if (channel.type === 'category') {
        const prefs = useGuildPrefs.getState();
        const collapsed = (prefs.collapsed[serverId] ?? []).includes(channel.id);
        const allCats = (guildStore.get().channels[serverId] ?? []).filter((c) => c.type === 'category').map((c) => c.id);
        return [
          {
            id: 'read',
            items: [
              {
                id: 'read',
                label: t.guild.menu.markRead,
                icon: Check,
                onAction: () =>
                  (guildStore.get().channels[serverId] ?? []).filter((c) => c.parentId === channel.id).forEach((c) => markChannelRead(serverId, c.id)),
              },
            ],
          },
          {
            id: 'collapse',
            items: [
              { kind: 'check', id: 'collapse', label: t.guild.menu.collapseCategory, checked: collapsed, onToggle: () => prefs.toggleCategory(serverId, channel.id) },
              { id: 'collapse-all', label: t.guild.menu.collapseAll, icon: ChevronsDownUp, onAction: () => prefs.setCollapsedAll(serverId, allCats) },
            ],
          },
          {
            id: 'notif',
            items: [
              muted
                ? { id: 'unmute', label: t.guild.menu.unmuteCategory, icon: BellRing, onAction: () => muteChannel(channel.id, null) }
                : muteMenu('mute', t.guild.menu.muteCategory, (until) => muteChannel(channel.id, until)),
              notifMenu('notif', channel.id, 'channel', (level) => setNotifLevel(channel.id, level, 'channel')),
            ],
          },
          manage && {
            id: 'manage',
            items: [
              { id: 'edit', label: t.guild.menu.editCategory, icon: Pencil, onAction: () => guildUi.channelSettings(serverId, channel.id) },
              { id: 'create', label: t.guild.menu.createChannel, icon: Plus, onAction: () => guildUi.createChannel(serverId, { parentId: channel.id }) },
              { id: 'delete', label: t.guild.menu.deleteCategory, icon: Trash2, danger: true, onAction: () => void confirmDelete(channel) },
            ],
          },
          { id: 'id', items: [{ id: 'copy-id', label: t.guild.menu.copyChannelId, icon: Copy, onAction: () => void copyText(channel.id, t.guild.menu.copied) }] },
        ].filter(Boolean) as MenuSection[];
      }

      return [
        { id: 'read', items: [{ id: 'read', label: t.guild.menu.markRead, icon: Check, onAction: () => markChannelRead(serverId, channel.id) }] },
        {
          id: 'link',
          items: [
            perms.can('CREATE_INVITE') && { id: 'invite', label: t.guild.menu.invitePeople, icon: UserPlus, accent: true, onAction: () => guildUi.invite(serverId, channel.id) },
            { id: 'copy-link', label: t.guild.menu.copyLink, icon: Link2, onAction: () => void copyText(link, t.guild.menu.linkCopied) },
            voice && {
              id: 'open-chat',
              label: t.guild.menu.openChat,
              icon: MessageSquare,
              onAction: () => router.push(`/channels/server/${serverId}/${channel.id}?chat=1`),
            },
          ],
        },
        {
          id: 'notif',
          items: [
            muted
              ? { id: 'unmute', label: t.guild.menu.unmuteChannel, icon: BellRing, onAction: () => muteChannel(channel.id, null) }
              : muteMenu('mute', t.guild.menu.muteChannel, (until) => muteChannel(channel.id, until)),
            notifMenu('notif', channel.id, 'channel', (level) => setNotifLevel(channel.id, level, 'channel')),
          ],
        },
        manage && {
          id: 'manage',
          items: [
            { id: 'edit', label: t.guild.menu.editChannel, icon: Pencil, onAction: () => guildUi.channelSettings(serverId, channel.id) },
            { id: 'duplicate', label: t.guild.menu.duplicateChannel, icon: CopyPlus, onAction: () => void duplicateChannel(serverId, channel) },
            {
              id: 'create-text',
              label: voice ? t.guild.menu.createVoiceChannel : t.guild.menu.createTextChannel,
              icon: voice ? Volume2 : Hash,
              onAction: () => guildUi.createChannel(serverId, { parentId: channel.parentId, type: voice ? 'voice' : 'text' }),
            },
            { id: 'delete', label: t.guild.menu.deleteChannel, icon: Trash2, danger: true, onAction: () => void confirmDelete(channel) },
          ],
        },
        { id: 'id', items: [{ id: 'copy-id', label: t.guild.menu.copyChannelId, icon: Copy, onAction: () => void copyText(channel.id, t.guild.menu.copied) }] },
      ].filter(Boolean) as MenuSection[];
    },
    [serverId, perms, t, router, muteMenu, notifMenu, confirmDelete],
  );
}
