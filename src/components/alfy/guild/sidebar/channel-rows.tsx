'use client';

/**
 * Rangées de la liste des salons, au gabarit Discord :
 *  - salon : icône, nom, pastille de non-lu à gauche, badge de mentions,
 *    actions (inviter, réglages) au survol ou quand il est ouvert ;
 *  - salon vocal : idem + participants (anneau vert quand ils parlent, micro /
 *    casque coupés, caméra, « EN DIRECT »), statut de salon, limite d'utilisateurs,
 *    raccourci « Inviter dans le salon… » quand on y est ;
 *  - catégorie : repliable, « + » au survol pour qui gère les salons.
 *
 * Performance : chaque rangée s'abonne à SON compteur de non-lus, à SA présence
 * vocale et à SON tri (dnd-kit) ; ses props sont des primitives ou des objets
 * stables, donc `memo` l'épargne quand un autre salon change. Un message reçu
 * dans #général ne re-rend plus que la rangée #général.
 *
 * Toute la rangée est la cible de clic ; les actions sont des boutons frères
 * posés par-dessus (jamais un bouton dans un bouton).
 */

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Avatar, Input, Tooltip } from '@heroui/react';
import {
  ChevronDown,
  ChevronRight,
  HeadphoneOff,
  MessageSquare,
  MicOff,
  Pencil,
  Plus,
  Settings,
  UserPlus,
  Video,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { memo, useState, type ReactNode } from 'react';

import { useTranslation } from '@/components/locale-provider';
import { cn } from '@/lib/utils';
import { UserPopover } from '@/components/alfy/members/user-popover';
import { toAlfyUser } from '@/components/alfy/live/map';
import { CHANNEL_ICONS } from '@/components/alfy/guild/channel-icons';
import { useBindContextMenu } from '@/components/alfy/guild/context-menu';
import { memberColor, memberName, useGuildMember, useGuildRoles, useIsSpeaking, useNotifCount, useVoiceChannel, type GuildPerms } from '@/components/alfy/guild/hooks';
import { prefetchChannelMessages } from '@/components/alfy/guild/data';
import { setVoiceStatus } from '@/components/alfy/guild/actions';
import { guildUi } from '@/components/alfy/guild/ui';
import { useChannelMenu } from '@/components/alfy/guild/sidebar/channel-menus';
import { useMemberMenu } from '@/components/alfy/guild/members/member-menu';
import { joinVoice } from '@/components/alfy/guild/voice/use-guild-voice';
import type { GuildChannel, VoiceMember } from '@/components/alfy/guild/types';

/* ── Primitives ───────────────────────────────────────────────────────────── */

export function UnreadPill({ show }: { show: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        'pointer-events-none absolute top-1/2 left-0 h-2 w-1 -translate-y-1/2 rounded-r-full bg-foreground transition-[transform,opacity] duration-(--dur-2) ease-out-quart',
        show ? 'scale-100 opacity-100' : 'scale-0 opacity-0',
      )}
    />
  );
}

export function MentionCount({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="alfy-badge-pop flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[11px] leading-none font-bold text-(--danger-foreground) tabular-nums">
      {count > 99 ? '99+' : count}
    </span>
  );
}

function RowAction({ label, onPress, children }: { label: string; onPress: () => void; children: ReactNode }) {
  return (
    <Tooltip delay={300} closeDelay={0}>
      <button
        type="button"
        aria-label={label}
        onClick={(e) => {
          e.stopPropagation();
          onPress();
        }}
        className="relative z-10 flex size-5 cursor-pointer items-center justify-center rounded-sm text-muted outline-none transition-colors duration-(--dur-1) hover:text-foreground focus-visible:ring-2 focus-visible:ring-focus"
      >
        {children}
      </button>
      <Tooltip.Content>
        <p>{label}</p>
      </Tooltip.Content>
    </Tooltip>
  );
}

/** Tri dnd-kit propre à la rangée (désactivé sans droit de gestion). */
function useRowSortable(id: string, enabled: boolean) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id, disabled: !enabled });
  return {
    setNodeRef,
    style: { transform: CSS.Translate.toString(transform), transition },
    handleProps: enabled ? { ...attributes, ...listeners } : undefined,
    isDragging,
  };
}

interface RowProps {
  serverId: string;
  channel: GuildChannel;
  active: boolean;
  muted: boolean;
  canInvite: boolean;
  canManage: boolean;
  perms: GuildPerms;
}

/* ── Salon (non vocal) ────────────────────────────────────────────────────── */

export const ChannelRow = memo(function ChannelRow({ serverId, channel, active, muted, canInvite, canManage, perms }: RowProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const bind = useBindContextMenu();
  const channelMenu = useChannelMenu(serverId, perms);
  const unread = useNotifCount('unread', `channel:${channel.id}`) > 0;
  const mentions = useNotifCount('mentions', `channel:${channel.id}`);
  const { setNodeRef, style, handleProps, isDragging } = useRowSortable(channel.id, canManage);
  const Icon = CHANNEL_ICONS[channel.type] ?? CHANNEL_ICONS.text;
  const strong = (unread && !muted) || active;

  return (
    <div ref={setNodeRef} style={style} className={cn('relative px-2 py-px', isDragging && 'z-20 opacity-60')} {...bind(() => channelMenu(channel))}>
      <UnreadPill show={unread && !active && !muted} />
      <div
        className={cn(
          'group/ch relative flex h-8 items-center gap-1.5 rounded-md px-2 transition-colors duration-(--dur-1)',
          active ? 'bg-foreground/10 text-foreground' : 'text-muted hover:bg-foreground/6 hover:text-foreground/90',
          muted && !active && 'opacity-45',
        )}
      >
        <button
          type="button"
          aria-current={active ? 'page' : undefined}
          aria-label={channel.name}
          onClick={() => router.push(`/channels/server/${serverId}/${channel.id}`)}
          onMouseEnter={() => prefetchChannelMessages(serverId, channel.id)}
          onFocus={() => prefetchChannelMessages(serverId, channel.id)}
          className="absolute inset-0 cursor-pointer rounded-md outline-none focus-visible:ring-2 focus-visible:ring-focus"
          {...handleProps}
        />
        <Icon className={cn('pointer-events-none size-5 shrink-0', strong ? 'text-foreground/80' : 'text-muted/80')} aria-hidden />
        <span className={cn('pointer-events-none min-w-0 flex-1 truncate text-[15px] leading-5', strong ? 'font-semibold text-foreground' : 'font-medium')}>
          {channel.name}
        </span>
        {channel.isNsfw && <span className="pointer-events-none shrink-0 rounded-sm bg-danger/15 px-1 text-[10px] font-bold text-danger">NSFW</span>}
        <span className={cn('relative flex shrink-0 items-center gap-1', !active && 'hidden group-focus-within/ch:flex group-hover/ch:flex')}>
          {canInvite && (
            <RowAction label={t.guild.channel.createInvite} onPress={() => guildUi.invite(serverId, channel.id)}>
              <UserPlus className="size-4" aria-hidden />
            </RowAction>
          )}
          {canManage && (
            <RowAction label={t.guild.channel.editChannel} onPress={() => guildUi.channelSettings(serverId, channel.id)}>
              <Settings className="size-4" aria-hidden />
            </RowAction>
          )}
        </span>
        {!active && mentions > 0 && (
          <span className="pointer-events-none flex shrink-0 group-hover/ch:hidden">
            <MentionCount count={mentions} />
          </span>
        )}
      </div>
    </div>
  );
});

/* ── Salon vocal ──────────────────────────────────────────────────────────── */

export const VoiceChannelRow = memo(function VoiceChannelRow({
  serverId,
  channel,
  active,
  muted,
  canInvite,
  canManage,
  perms,
  connected,
}: RowProps & { connected: boolean }) {
  const { t } = useTranslation();
  const router = useRouter();
  const bind = useBindContextMenu();
  const channelMenu = useChannelMenu(serverId, perms);
  const state = useVoiceChannel(channel.id);
  const unread = useNotifCount('unread', `channel:${channel.id}`) > 0;
  const mentions = useNotifCount('mentions', `channel:${channel.id}`);
  const { setNodeRef, style, handleProps, isDragging } = useRowSortable(channel.id, canManage);
  const Icon = CHANNEL_ICONS[channel.type] ?? CHANNEL_ICONS.voice;
  const participants = state?.participants ?? [];
  const count = participants.length;
  const [editing, setEditing] = useState<string | null>(null);

  const open = () => {
    if (!connected) void joinVoice(serverId, channel);
    router.push(`/channels/server/${serverId}/${channel.id}`);
  };
  const saveStatus = () => {
    if (editing === null) return;
    void setVoiceStatus(serverId, channel.id, editing.trim());
    setEditing(null);
  };

  return (
    <div ref={setNodeRef} style={style} className={cn('relative px-2 py-px', isDragging && 'z-20 opacity-60')} {...bind(() => channelMenu(channel))}>
      <UnreadPill show={unread && !active && !muted} />
      <div
        className={cn(
          'group/ch relative flex h-8 items-center gap-1.5 rounded-md px-2 transition-colors duration-(--dur-1)',
          active || connected ? 'bg-foreground/10 text-foreground' : 'text-muted hover:bg-foreground/6 hover:text-foreground/90',
          muted && !active && !connected && 'opacity-45',
        )}
      >
        <button
          type="button"
          aria-label={connected ? channel.name : `${t.guild.voice.join} ${channel.name}`}
          aria-current={active ? 'page' : undefined}
          onClick={open}
          className="absolute inset-0 cursor-pointer rounded-md outline-none focus-visible:ring-2 focus-visible:ring-focus"
          {...handleProps}
        />
        <Icon className={cn('pointer-events-none size-5 shrink-0', connected ? 'text-success' : 'text-muted/80')} aria-hidden />
        <span className={cn('pointer-events-none min-w-0 flex-1 truncate text-[15px] leading-5', connected || active ? 'font-semibold text-foreground' : 'font-medium')}>
          {channel.name}
        </span>
        <span className={cn('relative flex shrink-0 items-center gap-1', !(active || connected) && 'hidden group-focus-within/ch:flex group-hover/ch:flex')}>
          <RowAction label={t.guild.voice.openChat} onPress={() => router.push(`/channels/server/${serverId}/${channel.id}?chat=1`)}>
            <MessageSquare className="size-4" aria-hidden />
          </RowAction>
          {canInvite && (
            <RowAction label={t.guild.channel.createInvite} onPress={() => guildUi.invite(serverId, channel.id)}>
              <UserPlus className="size-4" aria-hidden />
            </RowAction>
          )}
          {canManage && (
            <RowAction label={t.guild.channel.editChannel} onPress={() => guildUi.channelSettings(serverId, channel.id)}>
              <Settings className="size-4" aria-hidden />
            </RowAction>
          )}
        </span>
        {channel.userLimit > 0 && (
          <span
            className={cn('pointer-events-none flex shrink-0 overflow-hidden rounded-sm text-[11px] leading-4 font-semibold tabular-nums', !(active || connected) && 'group-hover/ch:hidden')}
            aria-label={`${count}/${channel.userLimit}`}
          >
            <span className="bg-foreground/12 px-1 text-foreground/80">{String(count).padStart(2, '0')}</span>
            <span className="bg-foreground/22 px-1 text-foreground">{String(channel.userLimit).padStart(2, '0')}</span>
          </span>
        )}
        {!active && mentions > 0 && channel.userLimit === 0 && (
          <span className="pointer-events-none flex shrink-0 group-hover/ch:hidden">
            <MentionCount count={mentions} />
          </span>
        )}
      </div>

      {/* Statut de salon (éphémère) : visible par tous, modifiable par qui y est. */}
      {(state?.status || connected) && (
        <div className="ml-7 pr-2">
          {editing !== null ? (
            <Input
              autoFocus
              aria-label={t.guild.voice.statusAria}
              value={editing}
              maxLength={100}
              placeholder={t.guild.voice.statusPlaceholder}
              onChange={(e) => setEditing(e.target.value)}
              onBlur={saveStatus}
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveStatus();
                if (e.key === 'Escape') setEditing(null);
              }}
              className="my-0.5 h-7 text-xs"
            />
          ) : (
            <button
              type="button"
              disabled={!connected}
              onClick={() => setEditing(state?.status ?? '')}
              className={cn(
                'group/status flex w-full items-center gap-1 rounded-sm py-0.5 text-left text-xs text-muted outline-none focus-visible:ring-2 focus-visible:ring-focus',
                connected && 'cursor-pointer hover:text-foreground',
              )}
            >
              <span className="min-w-0 truncate">{state?.status || t.guild.voice.setStatus}</span>
              {connected && <Pencil className="size-3 shrink-0 opacity-70 group-hover/status:opacity-100" aria-hidden />}
            </button>
          )}
        </div>
      )}

      {participants.length > 0 && (
        <ul className="ml-6 flex flex-col gap-px pt-0.5 pb-1">
          {participants.map((p) => (
            <VoiceParticipantRow key={p.userId} serverId={serverId} participant={p} />
          ))}
        </ul>
      )}

      {connected && canInvite && (
        <button
          type="button"
          onClick={() => guildUi.invite(serverId, channel.id)}
          className="group/inv ml-6 flex h-8 w-[calc(100%-1.5rem)] cursor-pointer items-center gap-2 rounded-md px-2 text-left text-sm text-muted outline-none transition-colors duration-(--dur-1) hover:bg-foreground/6 hover:text-foreground focus-visible:ring-2 focus-visible:ring-focus"
        >
          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-foreground/8">
            <UserPlus className="size-3.5" aria-hidden />
          </span>
          <span className="min-w-0 flex-1 truncate">{t.guild.voice.inviteToChannel}</span>
          <ChevronRight className="size-4 shrink-0 opacity-60 transition-transform duration-(--dur-1) group-hover/inv:translate-x-0.5" aria-hidden />
        </button>
      )}
    </div>
  );
});

const VoiceParticipantRow = memo(function VoiceParticipantRow({ serverId, participant }: { serverId: string; participant: VoiceMember }) {
  const { t } = useTranslation();
  const bind = useBindContextMenu();
  const memberMenu = useMemberMenu(serverId);
  const member = useGuildMember(serverId, participant.userId);
  const roles = useGuildRoles(serverId);
  const speaking = useIsSpeaking(participant.userId);
  const silent = participant.muted || participant.serverMuted || participant.deafened || participant.serverDeafened;
  const color = memberColor(member, roles);
  const name = memberName(member, participant.displayName || participant.username);
  const user =
    member?.user ?? toAlfyUser({ id: participant.userId, username: participant.username, displayName: participant.displayName, avatarUrl: participant.avatarUrl }, participant.userId);

  return (
    <li {...bind(() => memberMenu(participant.userId))}>
      <UserPopover
        user={user}
        placement="right"
        triggerClassName="group/p flex h-8 w-full cursor-pointer items-center gap-2 rounded-md px-2 text-left outline-none transition-colors duration-(--dur-1) hover:bg-foreground/6 focus-visible:ring-2 focus-visible:ring-focus"
      >
        <span
          className={cn(
            'relative flex shrink-0 rounded-full transition-shadow duration-(--dur-1)',
            speaking && !silent && 'shadow-[0_0_0_2px_var(--alfy-sidebar),0_0_0_4px_var(--success)]',
          )}
        >
          <Avatar className="size-6 text-[10px]">
            {(user.avatarUrl ?? participant.avatarUrl) && <Avatar.Image src={user.avatarUrl ?? participant.avatarUrl} alt="" />}
            <Avatar.Fallback>{(name[0] ?? '?').toUpperCase()}</Avatar.Fallback>
          </Avatar>
        </span>
        <span
          className={cn('min-w-0 flex-1 truncate text-sm', speaking && !silent ? 'text-foreground' : 'text-muted group-hover/p:text-foreground/90')}
          style={color ? { color } : undefined}
        >
          {name}
        </span>
        <span className="flex shrink-0 items-center gap-1 text-muted">
          {participant.streaming && (
            <span className="rounded-sm bg-danger px-1 text-[10px] leading-4 font-bold tracking-wide text-(--danger-foreground) uppercase">{t.guild.voice.live}</span>
          )}
          {participant.video && <Video className="size-3.5" aria-label={t.guild.voice.cameraOn} />}
          {(participant.muted || participant.serverMuted) && (
            <MicOff className={cn('size-3.5', participant.serverMuted && 'text-danger')} aria-label={participant.serverMuted ? t.guild.voice.serverMuted : t.guild.voice.muted} />
          )}
          {(participant.deafened || participant.serverDeafened) && (
            <HeadphoneOff className={cn('size-3.5', participant.serverDeafened && 'text-danger')} aria-label={participant.serverDeafened ? t.guild.voice.serverDeafened : t.guild.voice.deafened} />
          )}
        </span>
      </UserPopover>
    </li>
  );
});

/* ── Catégorie ────────────────────────────────────────────────────────────── */

export const CategoryRow = memo(function CategoryRow({
  serverId,
  category,
  collapsed,
  canManage,
  perms,
  onToggle,
}: {
  serverId: string;
  category: GuildChannel;
  collapsed: boolean;
  canManage: boolean;
  perms: GuildPerms;
  onToggle: (categoryId: string) => void;
}) {
  const { t } = useTranslation();
  const bind = useBindContextMenu();
  const channelMenu = useChannelMenu(serverId, perms);
  const { setNodeRef, style, handleProps, isDragging } = useRowSortable(`cat:${category.id}`, canManage);
  return (
    <div ref={setNodeRef} style={style} className={cn('group/cat relative mt-4 flex h-6 items-center pr-2 pl-1', isDragging && 'z-20 opacity-60')} {...bind(() => channelMenu(category))}>
      <button
        type="button"
        aria-expanded={!collapsed}
        onClick={() => onToggle(category.id)}
        className="flex min-w-0 flex-1 cursor-pointer items-center gap-0.5 rounded-sm text-[11px] font-semibold tracking-[0.04em] text-muted uppercase outline-none transition-colors duration-(--dur-1) hover:text-foreground focus-visible:ring-2 focus-visible:ring-focus"
        {...handleProps}
      >
        <ChevronDown className={cn('size-3 shrink-0 transition-transform duration-(--dur-2) ease-out-quart', collapsed && '-rotate-90')} strokeWidth={2.5} aria-hidden />
        <span className="truncate">{category.name}</span>
      </button>
      {canManage && (
        <Tooltip delay={300} closeDelay={0}>
          <button
            type="button"
            aria-label={t.guild.menu.createChannel}
            onClick={() => guildUi.createChannel(serverId, { parentId: category.id })}
            className="flex size-4.5 cursor-pointer items-center justify-center rounded-sm text-muted opacity-0 outline-none transition-[opacity,color] duration-(--dur-1) group-hover/cat:opacity-100 hover:text-foreground focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-focus"
          >
            <Plus className="size-4" aria-hidden />
          </button>
          <Tooltip.Content>
            <p>{t.guild.menu.createChannel}</p>
          </Tooltip.Content>
        </Tooltip>
      )}
    </div>
  );
});
