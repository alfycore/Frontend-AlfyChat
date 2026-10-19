'use client';

/**
 * Colonne des salons d'un serveur : en-tête (bannière + menu du serveur),
 * avertissement de node hors ligne, arbre des salons.
 *
 * La bannière défile avec la liste ; l'en-tête reste collé en haut et devient
 * opaque une fois la bannière passée (comportement Discord).
 */

import { Dropdown, ScrollShadow, Skeleton } from '@heroui/react';
import {
  Bell,
  BellRing,
  ChevronDown,
  Copy,
  FolderPlus,
  LogOut,
  PlusCircle,
  Settings,
  TriangleAlert,
  UserPlus,
  UserRoundPen,
  X,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';

import { useTranslation } from '@/components/locale-provider';
import { cn } from '@/lib/utils';
import { MenuSections, type MenuSection } from '@/components/alfy/guild/context-menu';
import { useEnsureGuild, useGuildChannelsLoaded, useGuildInfo, useMyPerms } from '@/components/alfy/guild/hooks';
import { isMuteActive, useGuildPrefs } from '@/components/alfy/guild/prefs';
import { guildUi } from '@/components/alfy/guild/ui';
import { copyText, leaveServer, muteServer } from '@/components/alfy/guild/actions';
import { ChannelTree } from '@/components/alfy/guild/sidebar/channel-tree';
import type { PermKey } from '@/components/alfy/guild/perms';

const BANNER_H = 136;

/** Droits qui justifient l'accès aux réglages du serveur. */
export const SETTINGS_PERMS: PermKey[] = [
  'MANAGE_SERVER', 'MANAGE_ROLES', 'MANAGE_CHANNELS', 'KICK_MEMBERS', 'BAN_MEMBERS',
  'VIEW_AUDIT_LOG', 'MANAGE_EMOJIS', 'MANAGE_WEBHOOKS',
];

function useHeaderMenu(serverId: string): () => MenuSection[] {
  const { t, tx } = useTranslation();
  const router = useRouter();
  const perms = useMyPerms(serverId);
  const info = useGuildInfo(serverId);
  const hideMuted = useGuildPrefs((s) => Boolean(s.hideMuted[serverId]));
  const muted = useGuildPrefs((s) => isMuteActive(s.mutedServers[serverId]));

  return useCallback(() => {
    const canSettings = SETTINGS_PERMS.some((k) => perms.can(k));
    const manageChannels = perms.can('MANAGE_CHANNELS');
    return [
      {
        id: 'invite',
        items: [
          perms.can('CREATE_INVITE') && {
            id: 'invite',
            label: t.guild.menu.invitePeople,
            icon: UserPlus,
            accent: true,
            onAction: () => guildUi.invite(serverId),
          },
        ],
      },
      {
        id: 'manage',
        items: [
          canSettings && { id: 'settings', label: t.guild.menu.serverSettings, icon: Settings, onAction: () => guildUi.serverSettings(serverId) },
          manageChannels && { id: 'create', label: t.guild.menu.createChannel, icon: PlusCircle, onAction: () => guildUi.createChannel(serverId) },
          manageChannels && {
            id: 'create-cat',
            label: t.guild.menu.createCategory,
            icon: FolderPlus,
            onAction: () => guildUi.createChannel(serverId, { type: 'category' }),
          },
        ],
      },
      {
        id: 'notif',
        items: [
          { id: 'notif', label: t.guild.menu.notificationSettings, icon: Bell, onAction: () => guildUi.notifications(serverId) },
          muted && { id: 'unmute', label: t.guild.menu.unmuteServer, icon: BellRing, onAction: () => muteServer(serverId, null) },
          {
            kind: 'check',
            id: 'hide-muted',
            label: t.guild.menu.hideMutedChannels,
            checked: hideMuted,
            onToggle: (v: boolean) => useGuildPrefs.getState().setHideMuted(serverId, v),
          },
        ],
      },
      {
        id: 'profile',
        items: [{ id: 'profile', label: t.guild.menu.editServerProfile, icon: UserRoundPen, onAction: () => guildUi.serverProfile(serverId) }],
      },
      {
        id: 'leave',
        items: [
          !perms.isOwner && {
            id: 'leave',
            label: t.guild.menu.leaveServer,
            icon: LogOut,
            danger: true,
            onAction: async () => {
              const name = info?.name ?? '';
              const ok = await guildUi.confirm({
                title: tx(t.guild.leave.title, { name }),
                body: tx(t.guild.leave.body, { name }),
                confirmLabel: t.guild.leave.confirm,
                danger: true,
              });
              if (ok && (await leaveServer(serverId))) router.push('/channels/me');
            },
          },
        ],
      },
      { id: 'id', items: [{ id: 'copy-id', label: t.guild.menu.copyServerId, icon: Copy, onAction: () => void copyText(serverId, t.guild.menu.copied) }] },
    ] as MenuSection[];
  }, [serverId, perms, info?.name, hideMuted, muted, t, tx, router]);
}

function GuildHeader({ serverId, overBanner }: { serverId: string; overBanner: boolean }) {
  const info = useGuildInfo(serverId);
  const [open, setOpen] = useState(false);
  const build = useHeaderMenu(serverId);

  return (
    <Dropdown isOpen={open} onOpenChange={setOpen}>
      <Dropdown.Trigger
        className={cn(
          'sticky top-0 z-20 flex h-12 w-full shrink-0 cursor-pointer items-center gap-2 px-4 text-left outline-none',
          'transition-[background-color,box-shadow,color] duration-(--dur-2) ease-out-quart',
          'focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-inset',
          overBanner
            ? 'bg-linear-to-b from-black/45 to-transparent text-white'
            : 'border-b border-separator bg-(--alfy-sidebar) text-foreground hover:bg-foreground/4',
          open && !overBanner && 'bg-foreground/6',
        )}
      >
        <span className={cn('min-w-0 flex-1 truncate text-[15px] font-semibold', overBanner && 'drop-shadow')}>{info?.name}</span>
        <span className="relative flex size-4.5 shrink-0 items-center justify-center">
          <ChevronDown
            className={cn('absolute size-4.5 transition-[transform,opacity] duration-(--dur-2) ease-out-quart', open ? 'rotate-90 opacity-0' : 'opacity-100')}
            aria-hidden
          />
          <X
            className={cn('absolute size-4.5 transition-[transform,opacity] duration-(--dur-2) ease-out-quart', open ? 'opacity-100' : '-rotate-90 opacity-0')}
            aria-hidden
          />
        </span>
      </Dropdown.Trigger>
      <Dropdown.Popover placement="bottom" offset={6} className="w-[220px]">
        <MenuSections sections={build()} />
      </Dropdown.Popover>
    </Dropdown>
  );
}

function ChannelSkeleton() {
  return (
    <div className="flex flex-col gap-2 px-3 pt-4" aria-hidden>
      {[52, 0, 70, 58, 64, 0, 48, 66].map((w, i) =>
        w === 0 ? (
          <Skeleton key={i} className="mt-3 h-3 w-24 rounded-sm" />
        ) : (
          <div key={i} className="flex items-center gap-2 px-2">
            <Skeleton className="size-5 shrink-0 rounded-sm" />
            <Skeleton className="h-3.5 rounded-sm" style={{ width: `${w}%` }} />
          </div>
        ),
      )}
    </div>
  );
}

export function GuildSidebar({ serverId, activeChannelId }: { serverId: string; activeChannelId: string | null }) {
  const { t } = useTranslation();
  useEnsureGuild(serverId);
  const info = useGuildInfo(serverId);
  const loaded = useGuildChannelsLoaded(serverId);
  const [pastBanner, setPastBanner] = useState(false);
  const banner = info?.bannerUrl;

  return (
    <div className="alfy-sidebar flex h-full w-full flex-col">
      <ScrollShadow
        hideScrollBar={false}
        className="alfy-thin-scroll relative min-h-0 flex-1 overflow-x-hidden overflow-y-auto"
        onScroll={(e) => {
          const past = e.currentTarget.scrollTop > BANNER_H - 48;
          if (past !== pastBanner) setPastBanner(past);
        }}
      >
        <GuildHeader serverId={serverId} overBanner={!!banner && !pastBanner} />
        {banner && (
          <div className="relative -mt-12 overflow-hidden" style={{ height: BANNER_H }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={banner} alt="" className="size-full object-cover" draggable={false} />
            <div className="absolute inset-x-0 bottom-0 h-10 bg-linear-to-t from-(--alfy-sidebar) to-transparent" />
          </div>
        )}

        {info?.selfHosted && info.nodeOnline === false && (
          <div className="mx-2 mt-2 flex items-start gap-2 rounded-md border border-warning/30 bg-warning/12 px-3 py-2 text-xs text-(--warning)">
            <TriangleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            <span>{t.guild.sidebar.nodeOffline}</span>
          </div>
        )}

        {loaded ? <ChannelTree serverId={serverId} activeChannelId={activeChannelId} /> : <ChannelSkeleton />}
      </ScrollShadow>
    </div>
  );
}
