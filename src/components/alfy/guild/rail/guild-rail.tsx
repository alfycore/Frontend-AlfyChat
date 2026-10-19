'use client';

/**
 * Rail des serveurs (colonne de gauche), comportement Discord :
 *  - Accueil (messages privés) en tête, badge des MP non lus ;
 *  - serveurs réordonnables au glisser-déposer ;
 *  - glisser un serveur AU CENTRE d'un autre crée un dossier (ou l'y ajoute) ;
 *  - dossiers repliables, colorés, renommables ;
 *  - clic droit partout ; survol = préchargement du serveur (ouverture instantanée).
 */

import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragMoveEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  type SortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ScrollShadow, Separator, Tooltip } from '@heroui/react';
import {
  BellRing,
  Check,
  Compass,
  Copy,
  Folder,
  FolderMinus,
  FolderPlus,
  LogOut,
  Pencil,
  Plus,
  Settings,
  UserPlus,
  UserRoundPen,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { memo, useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';

import { useAuth } from '@/hooks/use-auth';
import { api } from '@/lib/api';
import { loadBootstrap } from '@/lib/bootstrap-store';
import { serverListStore, type CachedServer } from '@/lib/server-list-store';
import * as notif from '@/lib/notification-store';
import { AlfyMark } from '@/components/alfy/primitives/alfy-mark';
import { useTranslation } from '@/components/locale-provider';
import { cn } from '@/lib/utils';
import { prefetchGuild, prefetchAllGuilds } from '@/components/alfy/guild/data';
import { useGuildStore } from '@/components/alfy/guild/store';
import { useVoiceChannelId } from '@/components/alfy/guild/voice/use-guild-voice';
import { useNotifCount } from '@/components/alfy/guild/hooks';
import { folderIdOf, isFolderKey, isMuteActive, resolveRail, useGuildPrefs, type GuildFolder } from '@/components/alfy/guild/prefs';
import { useBindContextMenu, type MenuSection } from '@/components/alfy/guild/context-menu';
import { guildUi } from '@/components/alfy/guild/ui';
import { copyText, leaveServer, markServerRead, muteServer, setNotifLevel } from '@/components/alfy/guild/actions';
import { GuildButton, GuildIconFace, GuildPill, MentionBadge } from '@/components/alfy/guild/rail/guild-icon';
import { FolderSettingsModal } from '@/components/alfy/guild/rail/folder-settings';
import { useMuteSubmenu, useNotifSubmenu } from '@/components/alfy/guild/menus';

function useServerList(): CachedServer[] {
  const list = useSyncExternalStore(serverListStore.subscribe, serverListStore.getSnapshot, serverListStore.getServerSnapshot);
  useEffect(() => {
    if (serverListStore.isLoaded()) return;
    let cancelled = false;
    loadBootstrap()
      .then(async (boot) => {
        if (cancelled) return;
        const fromBoot = boot?.servers as CachedServer[] | undefined;
        const fallback = fromBoot ?? ((await api.getServers().catch(() => null))?.data as CachedServer[] | undefined);
        if (!cancelled && Array.isArray(fallback)) serverListStore.set(fallback);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);
  return list;
}

/** Non-lus des MP/groupes = toute clé qui n'est ni un salon ni un serveur. */
function useDmUnread(): number {
  return useSyncExternalStore(
    notif.subscribe,
    () => {
      let n = 0;
      notif.getSnapshot().unread.forEach((count, key) => {
        if (!key.startsWith('channel:') && !key.startsWith('server:')) n += count;
      });
      return n;
    },
    () => 0,
  );
}

/** Non-lus et mentions cumulés d'une liste de serveurs (clé « u|m », primitive stable). */
function useServersUnread(serverIds: string[]): { unread: number; mentions: number } {
  const key = useSyncExternalStore(
    notif.subscribe,
    () => {
      const st = notif.getSnapshot();
      let u = 0;
      let m = 0;
      for (const id of serverIds) {
        u += st.unread.get(`server:${id}`) ?? 0;
        m += st.mentions.get(`server:${id}`) ?? 0;
      }
      return `${u}|${m}`;
    },
    () => '0|0',
  );
  const [u, m] = key.split('|');
  return { unread: Number(u), mentions: Number(m) };
}

const CHILD = 'child:';
const childId = (folderId: string, serverId: string) => `${CHILD}${folderId}:${serverId}`;
const parseChild = (id: string) => {
  const [folderId, serverId] = id.slice(CHILD.length).split(':');
  return { folderId, serverId };
};

interface GuildRailProps {
  activeServerId: string | null;
  homeActive: boolean;
}

export function GuildRail({ activeServerId, homeActive }: GuildRailProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const servers = useServerList();
  const railOrder = useGuildPrefs((s) => s.railOrder);
  const folders = useGuildPrefs((s) => s.folders);
  const setRailOrder = useGuildPrefs((s) => s.setRailOrder);
  const setFolderServers = useGuildPrefs((s) => s.setFolderServers);
  const addToFolder = useGuildPrefs((s) => s.addToFolder);
  const createFolder = useGuildPrefs((s) => s.createFolder);
  const removeFromFolder = useGuildPrefs((s) => s.removeFromFolder);
  const updateFolder = useGuildPrefs((s) => s.updateFolder);

  const byId = useMemo(() => new Map(servers.map((s) => [s.id, s])), [servers]);
  const items = useMemo(() => resolveRail(servers.map((s) => s.id), { railOrder, folders }), [servers, railOrder, folders]);

  // Préchargement des salons de tous les serveurs, à l'inactivité.
  useEffect(() => {
    if (servers.length) prefetchAllGuilds(servers.map((s) => s.id));
  }, [servers]);

  /* Serveur du salon vocal où l'on est connecté (badge haut-parleur). */
  const voiceServerId = useVoiceServerId();

  const [folderEditing, setFolderEditing] = useState<GuildFolder | null>(null);

  /* ── Glisser-déposer ─────────────────────────────────────────────────── */
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const [dragging, setDragging] = useState<string | null>(null);
  const [combineWith, setCombineWith] = useState<string | null>(null);
  const combineRef = useRef<string | null>(null);

  /* Pendant qu'on vise le centre d'une icône, les autres ne s'écartent pas :
     sans ça, l'icône visée glisse hors du curseur et la fusion devient
     impossible à viser. */
  const strategy: SortingStrategy = useCallback(
    (args) => (combineRef.current ? null : verticalListSortingStrategy(args)),
    [],
  );

  const serverOfDragId = (id: string) => (id.startsWith(CHILD) ? parseChild(id).serverId : isFolderKey(id) ? null : id);

  const onDragStart = (e: DragStartEvent) => setDragging(String(e.active.id));
  const onDragMove = (e: DragMoveEvent) => {
    const activeId = String(e.active.id);
    const overId = e.over ? String(e.over.id) : null;
    let next: string | null = null;
    // Seul un serveur se fusionne, et seulement sur un élément de premier niveau.
    if (overId && serverOfDragId(activeId) && !overId.startsWith(CHILD) && overId !== activeId) {
      const a = e.active.rect.current.translated;
      const o = e.over!.rect;
      if (a) {
        const dy = Math.abs(a.top + a.height / 2 - (o.top + o.height / 2));
        if (dy < o.height * 0.22) next = overId;
      }
    }
    if (next !== combineRef.current) {
      combineRef.current = next;
      setCombineWith(next);
    }
  };
  const resetDrag = () => {
    setDragging(null);
    combineRef.current = null;
    setCombineWith(null);
  };
  const onDragEnd = (e: DragEndEvent) => {
    const activeId = String(e.active.id);
    const overId = e.over ? String(e.over.id) : null;
    const target = combineRef.current;
    resetDrag();
    const keys = items.map((i) => i.key);
    const movedServer = serverOfDragId(activeId);

    if (target && movedServer) {
      if (isFolderKey(target)) addToFolder(folderIdOf(target), movedServer);
      else if (target !== movedServer) {
        // Ancrer l'ordre courant avant de créer le dossier à la place de la cible.
        setRailOrder(keys);
        createFolder([target, movedServer], keys.indexOf(target));
      }
      return;
    }
    if (!overId || overId === activeId) return;

    if (activeId.startsWith(CHILD) && overId.startsWith(CHILD)) {
      const a = parseChild(activeId);
      const o = parseChild(overId);
      if (a.folderId !== o.folderId) return;
      const folder = folders[a.folderId];
      if (!folder) return;
      const ids = folder.serverIds;
      setFolderServers(a.folderId, arrayMove(ids, ids.indexOf(a.serverId), ids.indexOf(o.serverId)));
      return;
    }
    if (activeId.startsWith(CHILD)) {
      // Sortir un serveur de son dossier en le déposant entre deux éléments.
      const { serverId } = parseChild(activeId);
      removeFromFolder(serverId);
      const after = resolveRail(servers.map((s) => s.id), useGuildPrefs.getState()).map((i) => i.key);
      const from = after.indexOf(serverId);
      const to = after.indexOf(overId);
      if (from >= 0 && to >= 0) setRailOrder(arrayMove(after, from, to));
      return;
    }
    if (overId.startsWith(CHILD)) {
      if (movedServer) addToFolder(parseChild(overId).folderId, movedServer);
      return;
    }
    const from = keys.indexOf(activeId);
    const to = keys.indexOf(overId);
    if (from >= 0 && to >= 0) setRailOrder(arrayMove(keys, from, to));
  };

  const draggedServer = dragging ? byId.get(serverOfDragId(dragging) ?? '') : undefined;
  const draggedFolder = dragging && isFolderKey(dragging) ? items.find((i) => i.key === dragging)?.folder : undefined;

  const go = useCallback((serverId: string) => router.push(`/channels/server/${serverId}`), [router]);

  return (
    <nav aria-label={t.guild.rail.aria} className="flex h-full w-18 shrink-0 flex-col items-center bg-background pt-3">
      <HomeButton active={homeActive} onSelect={() => router.push('/channels/me')} />
      <Separator className="my-2 w-8 shrink-0 rounded-full bg-separator" />

      <ScrollShadow hideScrollBar className="flex min-h-0 w-full flex-1 flex-col items-center gap-2 overflow-x-hidden overflow-y-auto pb-3">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          modifiers={[restrictToVerticalAxis]}
          onDragStart={onDragStart}
          onDragMove={onDragMove}
          onDragEnd={onDragEnd}
          onDragCancel={resetDrag}
        >
          <SortableContext items={items.map((i) => i.key)} strategy={strategy}>
            {items.map((item) =>
              item.folder ? (
                <SortableFolder
                  key={item.key}
                  sortId={item.key}
                  folder={item.folder}
                  byId={byId}
                  activeServerId={activeServerId}
                  voiceServerId={voiceServerId}
                  combineTarget={combineWith === item.key}
                  strategy={strategy}
                  onSelect={go}
                  onToggle={() => updateFolder(item.folder!.id, { expanded: !item.folder!.expanded })}
                  onEdit={() => setFolderEditing(item.folder!)}
                />
              ) : (
                <SortableGuild
                  key={item.key}
                  sortId={item.key}
                  server={byId.get(item.serverId!)}
                  active={item.serverId === activeServerId}
                  inVoice={item.serverId === voiceServerId}
                  combineTarget={combineWith === item.key}
                  onSelect={go}
                />
              ),
            )}
          </SortableContext>

          <DragOverlay dropAnimation={{ duration: 180, easing: 'cubic-bezier(.165,.84,.44,1)' }}>
            {draggedServer ? (
              <GuildIconFace name={draggedServer.name} iconUrl={draggedServer.iconUrl} highlight className="shadow-lg ring-2 ring-accent/40" />
            ) : draggedFolder ? (
              <FolderFace folder={draggedFolder} byId={byId} />
            ) : null}
          </DragOverlay>
        </DndContext>

        <RailAction label={t.guild.rail.addServer} onPress={() => guildUi.createServer()} tone="success">
          <Plus className="size-6" aria-hidden />
        </RailAction>
        <RailAction label={t.guild.rail.discover} onPress={() => router.push('/channels/discover-server')} tone="success">
          <Compass className="size-6" aria-hidden />
        </RailAction>
      </ScrollShadow>

      <FolderSettingsModal folder={folderEditing} onClose={() => setFolderEditing(null)} />
    </nav>
  );
}

/** Serveur hébergeant l'appel vocal de serveur en cours, le cas échéant. */
function useVoiceServerId(): string | null {
  const callChannelId = useVoiceChannelId();
  return useGuildStore((s) => {
    if (!callChannelId) return null;
    for (const [sid, list] of Object.entries(s.channels)) if (list.some((c) => c.id === callChannelId)) return sid;
    return null;
  });
}

/* ════════════════════════════════════════════════════════════════════════ */

function HomeButton({ active, onSelect }: { active: boolean; onSelect: () => void }) {
  const { t } = useTranslation();
  const unread = useDmUnread();
  return (
    <div className="relative w-full shrink-0">
      <Tooltip delay={0} closeDelay={0}>
        <button
          type="button"
          onClick={onSelect}
          aria-label={t.guild.rail.home}
          aria-current={active ? 'page' : undefined}
          className="group/guild relative flex w-full cursor-pointer justify-center outline-none"
        >
          <GuildPill state={active ? 'active' : 'none'} />
          <span
            className={cn(
              'flex size-12 items-center justify-center overflow-hidden transition-[border-radius,background-color] duration-(--dur-2) ease-out-quart',
              active ? 'rounded-2xl bg-accent' : 'rounded-[24px] bg-surface-secondary group-hover:rounded-2xl group-hover:bg-accent',
              'group-focus-visible/guild:ring-2 group-focus-visible/guild:ring-focus',
            )}
          >
            <AlfyMark
              className={cn(
                'size-7 transition-[filter] duration-(--dur-2)',
                active ? 'brightness-0 invert' : 'group-hover/guild:brightness-0 group-hover/guild:invert',
              )}
            />
          </span>
          <MentionBadge count={unread} className="right-2.5" />
        </button>
        <Tooltip.Content placement="right" offset={14} className="px-3 py-2 text-sm font-semibold">
          <p>{t.guild.rail.home}</p>
        </Tooltip.Content>
      </Tooltip>
    </div>
  );
}

function RailAction({
  label,
  onPress,
  children,
  tone,
}: {
  label: string;
  onPress: () => void;
  children: React.ReactNode;
  tone: 'success' | 'accent';
}) {
  return (
    <Tooltip delay={0} closeDelay={0}>
      <button
        type="button"
        onClick={onPress}
        aria-label={label}
        className="group/guild relative flex w-full shrink-0 cursor-pointer justify-center outline-none"
      >
        <GuildPill state="none" />
        <span
          className={cn(
            'flex size-12 items-center justify-center rounded-[24px] bg-surface-secondary transition-[border-radius,background-color,color] duration-(--dur-2) ease-out-quart group-hover:rounded-2xl',
            'group-focus-visible/guild:ring-2 group-focus-visible/guild:ring-focus',
            tone === 'success'
              ? 'text-success group-hover:bg-success group-hover:text-(--success-foreground)'
              : 'text-accent group-hover:bg-accent group-hover:text-accent-foreground',
          )}
        >
          {children}
        </span>
      </button>
      <Tooltip.Content placement="right" offset={14} className="px-3 py-2 text-sm font-semibold">
        <p>{label}</p>
      </Tooltip.Content>
    </Tooltip>
  );
}

/* ── Serveur triable ─────────────────────────────────────────────────────── */

function useGuildMenu(server: CachedServer | undefined) {
  const { t, tx } = useTranslation();
  const router = useRouter();
  const { user } = useAuth();
  const folders = useGuildPrefs((s) => s.folders);
  const hideMuted = useGuildPrefs((s) => (server ? Boolean(s.hideMuted[server.id]) : false));
  const muted = useGuildPrefs((s) => (server ? isMuteActive(s.mutedServers[server.id]) : false));
  const muteMenu = useMuteSubmenu();
  const notifMenu = useNotifSubmenu();

  return useCallback((): MenuSection[] => {
    if (!server) return [];
    const isOwner = server.ownerId === user?.id;
    const owner = Object.values(folders).find((f) => f.serverIds.includes(server.id));
    return [
      {
        id: 'read',
        items: [{ id: 'mark-read', label: t.guild.menu.markRead, icon: Check, onAction: () => markServerRead(server.id) }],
      },
      {
        id: 'invite',
        items: [{ id: 'invite', label: t.guild.menu.invitePeople, icon: UserPlus, accent: true, onAction: () => guildUi.invite(server.id) }],
      },
      {
        id: 'notif',
        items: [
          muted
            ? { id: 'unmute', label: t.guild.menu.unmuteServer, icon: BellRing, onAction: () => muteServer(server.id, null) }
            : muteMenu('mute', t.guild.menu.muteServer, (until) => muteServer(server.id, until)),
          notifMenu('notif', server.id, 'server', (level) => setNotifLevel(server.id, level, 'server')),
          {
            kind: 'check',
            id: 'hide-muted',
            label: t.guild.menu.hideMutedChannels,
            checked: hideMuted,
            onToggle: (v) => useGuildPrefs.getState().setHideMuted(server.id, v),
          },
        ],
      },
      {
        id: 'server',
        items: [
          { id: 'settings', label: t.guild.menu.serverSettings, icon: Settings, onAction: () => guildUi.serverSettings(server.id) },
          { id: 'profile', label: t.guild.menu.editServerProfile, icon: UserRoundPen, onAction: () => guildUi.serverProfile(server.id) },
        ],
      },
      {
        id: 'folder',
        items: [
          owner
            ? { id: 'unfolder', label: t.guild.menu.removeFromFolder, icon: FolderMinus, onAction: () => useGuildPrefs.getState().removeFromFolder(server.id) }
            : {
                kind: 'submenu',
                id: 'add-folder',
                label: t.guild.menu.addToFolder,
                icon: FolderPlus,
                sections: [
                  {
                    id: 'folders',
                    items: [
                      ...Object.values(folders).map((f) => ({
                        id: `f-${f.id}`,
                        label: f.name || t.guild.rail.folderUnnamed,
                        icon: Folder,
                        onAction: () => useGuildPrefs.getState().addToFolder(f.id, server.id),
                      })),
                      {
                        id: 'new-folder',
                        label: t.guild.menu.newFolder,
                        icon: FolderPlus,
                        onAction: () => {
                          const prefs = useGuildPrefs.getState();
                          const keys = resolveRail(serverListStore.get().map((s) => s.id), prefs).map((i) => i.key);
                          prefs.setRailOrder(keys);
                          prefs.createFolder([server.id], keys.indexOf(server.id));
                        },
                      },
                    ],
                  },
                ],
              },
        ],
      },
      {
        id: 'leave',
        items: [
          !isOwner && {
            id: 'leave',
            label: t.guild.menu.leaveServer,
            icon: LogOut,
            danger: true,
            onAction: async () => {
              const ok = await guildUi.confirm({
                title: tx(t.guild.leave.title, { name: server.name }),
                body: tx(t.guild.leave.body, { name: server.name }),
                confirmLabel: t.guild.leave.confirm,
                danger: true,
              });
              if (ok && (await leaveServer(server.id))) router.push('/channels/me');
            },
          },
        ],
      },
      {
        id: 'id',
        items: [{ id: 'copy-id', label: t.guild.menu.copyServerId, icon: Copy, onAction: () => void copyText(server.id, t.guild.menu.copied) }],
      },
    ];
  }, [server, user?.id, folders, hideMuted, muted, muteMenu, notifMenu, t, tx, router]);
}

const SortableGuild = memo(function SortableGuild({
  sortId,
  server,
  active,
  inVoice,
  combineTarget,
  onSelect,
}: {
  sortId: string;
  server: CachedServer | undefined;
  active: boolean;
  inVoice: boolean;
  combineTarget: boolean;
  onSelect: (id: string) => void;
}) {
  const { t } = useTranslation();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: sortId });
  const bind = useBindContextMenu();
  const buildMenu = useGuildMenu(server);
  const muted = useGuildPrefs((s) => (server ? isMuteActive(s.mutedServers[server.id]) : false));
  const unread = useNotifCount('unread', `server:${server?.id ?? ''}`);
  const mentions = useNotifCount('mentions', `server:${server?.id ?? ''}`);
  if (!server) return null;

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn('relative w-full shrink-0', isDragging && 'opacity-0')}
    >
      <GuildButton
        {...attributes}
        {...listeners}
        {...bind(buildMenu)}
        name={server.name}
        iconUrl={server.iconUrl}
        active={active}
        unread={!muted && unread > 0}
        mentions={mentions}
        inVoice={inVoice}
        highlight={combineTarget}
        ariaLabel={mentions > 0 ? `${server.name}, ${mentions} ${t.guild.rail.mentionsSuffix}` : server.name}
        onSelect={() => onSelect(server.id)}
        onHover={() => prefetchGuild(server.id)}
        className={cn(combineTarget && '[&>span:nth-child(2)]:ring-4 [&>span:nth-child(2)]:ring-accent/60')}
      />
    </div>
  );
});

/* ── Dossier ─────────────────────────────────────────────────────────────── */

function FolderFace({ folder, byId }: { folder: GuildFolder; byId: Map<string, CachedServer> }) {
  const color = folder.color ?? 'var(--accent)';
  const preview = folder.serverIds.slice(0, 4).map((id) => byId.get(id)).filter(Boolean) as CachedServer[];
  return (
    <span
      className="grid size-12 grid-cols-2 place-items-center gap-0.5 rounded-2xl p-1.5 transition-colors duration-(--dur-2)"
      style={{ backgroundColor: `color-mix(in oklab, ${color} 28%, transparent)` }}
    >
      {preview.map((s) => (
        <GuildIconFace key={s.id} name={s.name} iconUrl={s.iconUrl} size="sm" />
      ))}
    </span>
  );
}

function SortableFolder({
  sortId,
  folder,
  byId,
  activeServerId,
  voiceServerId,
  combineTarget,
  strategy,
  onSelect,
  onToggle,
  onEdit,
}: {
  sortId: string;
  folder: GuildFolder;
  byId: Map<string, CachedServer>;
  activeServerId: string | null;
  voiceServerId: string | null;
  combineTarget: boolean;
  strategy: SortingStrategy;
  onSelect: (id: string) => void;
  onToggle: () => void;
  onEdit: () => void;
}) {
  const { t } = useTranslation();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: sortId });
  const bind = useBindContextMenu();
  const color = folder.color ?? 'var(--accent)';
  const containsActive = folder.serverIds.includes(activeServerId ?? '');
  const { unread, mentions } = useServersUnread(folder.serverIds);
  const names = folder.serverIds.map((id) => byId.get(id)?.name).filter(Boolean).join(', ');

  const menu = (): MenuSection[] => [
    {
      id: 'f',
      items: [
        { id: 'read', label: t.guild.menu.markFolderRead, icon: Check, onAction: () => folder.serverIds.forEach(markServerRead) },
        { id: 'edit', label: t.guild.menu.folderSettings, icon: Pencil, onAction: onEdit },
      ],
    },
    {
      id: 'u',
      items: [{ id: 'ungroup', label: t.guild.menu.ungroupFolder, icon: FolderMinus, danger: true, onAction: () => useGuildPrefs.getState().deleteFolder(folder.id) }],
    },
  ];

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn('relative w-full shrink-0', isDragging && 'opacity-0')}
    >
      <div
        className={cn(
          'mx-auto flex w-12 flex-col items-center overflow-hidden transition-[background-color,border-radius] duration-(--dur-3) ease-out-quart',
          folder.expanded ? 'gap-2 rounded-2xl pb-2' : 'rounded-2xl',
        )}
        style={folder.expanded ? { backgroundColor: `color-mix(in oklab, ${color} 16%, transparent)` } : undefined}
      >
        <Tooltip delay={0} closeDelay={0}>
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={folder.expanded}
            aria-label={folder.name || t.guild.rail.folderUnnamed}
            className="group/guild relative flex w-18 cursor-pointer justify-center outline-none"
            {...attributes}
            {...listeners}
            {...bind(menu)}
          >
            {!folder.expanded && <GuildPill state={containsActive ? 'active' : unread > 0 ? 'unread' : 'none'} />}
            {folder.expanded ? (
              <span className="flex size-12 items-center justify-center rounded-2xl">
                <Folder className="size-6" style={{ color, fill: `color-mix(in oklab, ${color} 30%, transparent)` }} aria-hidden />
              </span>
            ) : (
              <span className={cn('rounded-2xl', combineTarget && 'ring-4 ring-accent/60')}>
                <FolderFace folder={folder} byId={byId} />
              </span>
            )}
            {!folder.expanded && <MentionBadge count={mentions} className="right-2.5" />}
          </button>
          <Tooltip.Content placement="right" offset={14} className="max-w-60 px-3 py-2">
            <p className="text-sm font-semibold">{folder.name || t.guild.rail.folderUnnamed}</p>
            <p className="line-clamp-2 text-xs text-muted">{names}</p>
          </Tooltip.Content>
        </Tooltip>

        {folder.expanded && (
          <SortableContext items={folder.serverIds.map((id) => childId(folder.id, id))} strategy={strategy}>
            {folder.serverIds.map((id) => (
              <div key={id} className="w-18">
                <SortableGuild
                  sortId={childId(folder.id, id)}
                  server={byId.get(id)}
                  active={id === activeServerId}
                  inVoice={id === voiceServerId}
                  combineTarget={false}
                  onSelect={onSelect}
                />
              </div>
            ))}
          </SortableContext>
        )}
      </div>
    </div>
  );
}

