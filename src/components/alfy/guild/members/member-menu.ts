'use client';

/**
 * Menu contextuel d'un membre (liste des membres, participants vocaux, fil de
 * discussion). Même contenu partout, filtré par les droits du membre courant
 * et par la hiérarchie des rôles — comme sur Discord.
 */

import {
  Ban,
  Copy,
  HeadphoneOff,
  Headphones,
  MessageCircle,
  Mic,
  MicOff,
  MoveRight,
  PhoneOff,
  Shield,
  UserMinus,
  UserRoundPen,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback } from 'react';

import { useAuth } from '@/hooks/use-auth';
import { useTranslation } from '@/components/locale-provider';
import type { MenuSection } from '@/components/alfy/guild/context-menu';
import { guildStore } from '@/components/alfy/guild/store';
import { guildUi } from '@/components/alfy/guild/ui';
import { copyText, moderateVoice, toggleMemberRole } from '@/components/alfy/guild/actions';
import { useMyPerms, memberRoles } from '@/components/alfy/guild/hooks';
import { useVoicePrefs } from '@/components/alfy/guild/voice/voice-prefs';
import { isVoiceType } from '@/components/alfy/guild/channel-icons';
import type { GuildRole } from '@/components/alfy/guild/types';

/** Position du plus haut rôle d'un membre (0 = @everyone seul). */
export function topPosition(roleIds: string[], roles: GuildRole[]): number {
  let top = 0;
  for (const r of roles) if (roleIds.includes(r.id) && r.position > top) top = r.position;
  return top;
}

export function useMemberMenu(serverId: string) {
  const { t } = useTranslation();
  const router = useRouter();
  const { user } = useAuth();
  const me = user?.id;
  const perms = useMyPerms(serverId);

  return useCallback(
    (userId: string): MenuSection[] => {
      const state = guildStore.get();
      const info = state.infos[serverId];
      const roles = state.roles[serverId] ?? [];
      const member = state.members[serverId]?.[userId];
      const mine = me ? state.members[serverId]?.[me] : undefined;
      const isSelf = userId === me;
      const targetIsOwner = info?.ownerId === userId;

      // Hiérarchie : on n'agit que sur un membre strictement en dessous de soi.
      const myTop = perms.isOwner ? Number.MAX_SAFE_INTEGER : topPosition(mine?.roleIds ?? [], roles);
      const theirTop = topPosition(member?.roleIds ?? [], roles);
      const outranks = !isSelf && !targetIsOwner && (perms.isOwner || myTop > theirTop);

      /* Présence vocale de la cible sur ce serveur. */
      let voiceChannelId: string | null = null;
      let voiceState: { serverMuted: boolean; serverDeafened: boolean } | null = null;
      for (const [cid, v] of Object.entries(state.voice)) {
        if (v.serverId !== serverId) continue;
        const p = v.participants.find((x) => x.userId === userId);
        if (p) {
          voiceChannelId = cid;
          voiceState = p;
          break;
        }
      }
      const voicePrefs = useVoicePrefs.getState();
      const volume = voicePrefs.volumes[userId] ?? 100;
      const otherVoiceChannels = (state.channels[serverId] ?? []).filter((c) => isVoiceType(c.type) && c.id !== voiceChannelId);

      const assignable = roles.filter((r) => !r.isDefault && (perms.isOwner || r.position < myTop));
      const current = memberRoles(member, roles).map((r) => r.id);

      const sections: (MenuSection | false)[] = [
        {
          id: 'profile',
          items: [
            !isSelf && { id: 'message', label: t.guild.member.message, icon: MessageCircle, onAction: () => router.push(`/channels/me/${userId}`) },
            isSelf
              ? perms.can('CHANGE_NICKNAME') && { id: 'nick-self', label: t.guild.member.editServerProfile, icon: UserRoundPen, onAction: () => guildUi.serverProfile(serverId) }
              : perms.can('MANAGE_NICKNAMES') && outranks && { id: 'nick', label: t.guild.member.changeNickname, icon: UserRoundPen, onAction: () => guildUi.memberAction('nickname', serverId, userId) },
          ],
        },
        !!voiceChannelId && !isSelf && {
          id: 'voice-local',
          items: [
            {
              kind: 'check',
              id: 'local-mute',
              label: t.guild.member.muteForMe,
              icon: VolumeX,
              checked: Boolean(voicePrefs.localMutes[userId]),
              onToggle: () => useVoicePrefs.getState().toggleLocalMute(userId),
            },
            {
              kind: 'submenu',
              id: 'volume',
              label: t.guild.member.userVolume,
              description: `${volume} %`,
              icon: Volume2,
              sections: [
                {
                  id: 'volumes',
                  items: [25, 50, 75, 100, 150, 200].map((v) => ({
                    kind: 'check' as const,
                    id: `v-${v}`,
                    label: `${v} %`,
                    checked: volume === v,
                    onToggle: () => useVoicePrefs.getState().setVolume(userId, v),
                  })),
                },
              ],
            },
          ],
        },
        !!voiceChannelId && (perms.can('MUTE_MEMBERS') || perms.can('MOVE_MEMBERS')) && (outranks || isSelf) && {
          id: 'voice-mod',
          items: [
            perms.can('MUTE_MEMBERS') && {
              id: 'server-mute',
              label: voiceState?.serverMuted ? t.guild.member.serverUnmute : t.guild.member.serverMute,
              icon: voiceState?.serverMuted ? Mic : MicOff,
              danger: !voiceState?.serverMuted,
              onAction: () => void moderateVoice(serverId, userId, voiceState?.serverMuted ? 'unmute' : 'mute'),
            },
            perms.can('MUTE_MEMBERS') && {
              id: 'server-deafen',
              label: voiceState?.serverDeafened ? t.guild.member.serverUndeafen : t.guild.member.serverDeafen,
              icon: voiceState?.serverDeafened ? Headphones : HeadphoneOff,
              danger: !voiceState?.serverDeafened,
              onAction: () => void moderateVoice(serverId, userId, voiceState?.serverDeafened ? 'undeafen' : 'deafen'),
            },
            perms.can('MOVE_MEMBERS') && otherVoiceChannels.length > 0 && {
              kind: 'submenu',
              id: 'move',
              label: t.guild.member.moveTo,
              icon: MoveRight,
              sections: [
                {
                  id: 'targets',
                  items: otherVoiceChannels.map((c) => ({
                    id: `move-${c.id}`,
                    label: c.name,
                    icon: Volume2,
                    onAction: () => void moderateVoice(serverId, userId, 'move', c.id),
                  })),
                },
              ],
            },
            perms.can('MOVE_MEMBERS') && {
              id: 'disconnect',
              label: t.guild.member.disconnect,
              icon: PhoneOff,
              danger: true,
              onAction: () => void moderateVoice(serverId, userId, 'disconnect'),
            },
          ],
        },
        perms.can('MANAGE_ROLES') && assignable.length > 0 && (outranks || (isSelf && perms.isOwner)) && {
          id: 'roles',
          items: [
            {
              kind: 'submenu',
              id: 'roles',
              label: t.guild.member.roles,
              icon: Shield,
              sections: [
                {
                  id: 'role-list',
                  items: assignable.map((r) => ({
                    kind: 'check' as const,
                    id: `r-${r.id}`,
                    label: r.name,
                    checked: current.includes(r.id),
                    onToggle: (on: boolean) => void toggleMemberRole(serverId, userId, r.id, on),
                  })),
                },
              ],
            },
          ],
        },
        outranks && (perms.can('KICK_MEMBERS') || perms.can('BAN_MEMBERS')) && {
          id: 'mod',
          items: [
            perms.can('KICK_MEMBERS') && {
              id: 'kick',
              label: t.guild.member.kick,
              icon: UserMinus,
              danger: true,
              onAction: () => guildUi.memberAction('kick', serverId, userId),
            },
            perms.can('BAN_MEMBERS') && {
              id: 'ban',
              label: t.guild.member.ban,
              icon: Ban,
              danger: true,
              onAction: () => guildUi.memberAction('ban', serverId, userId),
            },
          ],
        },
        {
          id: 'id',
          items: [{ id: 'copy-id', label: t.guild.member.copyUserId, icon: Copy, onAction: () => void copyText(userId, t.guild.menu.copied) }],
        },
      ];
      return sections.filter(Boolean) as MenuSection[];
    },
    [serverId, me, perms, t, router],
  );
}
