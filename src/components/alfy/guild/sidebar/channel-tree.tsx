'use client';

/**
 * Arbre des salons d'un serveur.
 *
 * Glisser-déposer (pour qui gère les salons) : réordonner les salons, les
 * déplacer d'une catégorie à l'autre, réordonner les catégories (elles se
 * replient toutes pendant le glisser, comme sur Discord). Le résultat part en
 * UN lot de positions, appliqué localement avant la réponse.
 *
 * Catégorie repliée : on garde visibles le salon ouvert, les salons non lus et
 * le salon vocal où l'on est connecté.
 *
 * L'arbre ne s'abonne qu'à ce qui change sa FORME (salons, repli, sourdines,
 * ensemble des non-lus) ; chaque rangée gère seule ses compteurs.
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
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { SortableContext, arrayMove, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useCallback, useMemo, useState } from 'react';

import { useTranslation } from '@/components/locale-provider';
import { isMuteActive, useGuildPrefs } from '@/components/alfy/guild/prefs';
import { groupChannels, useGuildChannels, useMyPerms, useUnreadIdsKey } from '@/components/alfy/guild/hooks';
import { reorderChannels } from '@/components/alfy/guild/actions';
import { CHANNEL_ICONS, isVoiceType } from '@/components/alfy/guild/channel-icons';
import { useVoiceChannelId } from '@/components/alfy/guild/voice/use-guild-voice';
import { CategoryRow, ChannelRow, VoiceChannelRow } from '@/components/alfy/guild/sidebar/channel-rows';
import type { GuildChannel } from '@/components/alfy/guild/types';

const ROOT = '__root__';
const CAT = 'cat:';
const EMPTY: string[] = [];

interface Draft {
  containers: Record<string, string[]>;
  categories: string[];
}

function draftFrom(channels: GuildChannel[]): Draft {
  const groups = groupChannels(channels);
  const containers: Record<string, string[]> = { [ROOT]: [] };
  const categories: string[] = [];
  for (const g of groups) {
    const key = g.category?.id ?? ROOT;
    if (g.category) categories.push(g.category.id);
    containers[key] = g.channels.map((c) => c.id);
  }
  return { containers, categories };
}

function containerOf(draft: Draft, id: string): string | null {
  if (id.startsWith(CAT)) return id.slice(CAT.length);
  for (const [key, ids] of Object.entries(draft.containers)) if (ids.includes(id)) return key;
  return null;
}

/** Lot de positions modifiées par rapport à l'état courant. */
function positionsFrom(draft: Draft, channels: GuildChannel[]) {
  const byId = new Map(channels.map((c) => [c.id, c]));
  const out: { id: string; position: number; parentId?: string | null }[] = [];
  let pos = 0;
  for (const id of draft.containers[ROOT] ?? []) out.push({ id, position: pos++, parentId: null });
  for (const catId of draft.categories) {
    out.push({ id: catId, position: pos++ });
    for (const id of draft.containers[catId] ?? []) out.push({ id, position: pos++, parentId: catId });
  }
  return out.filter((row) => {
    const c = byId.get(row.id);
    if (!c) return false;
    return c.position !== row.position || (row.parentId !== undefined && (c.parentId ?? null) !== row.parentId);
  });
}

interface ChannelTreeProps {
  serverId: string;
  activeChannelId: string | null;
}

export function ChannelTree({ serverId, activeChannelId }: ChannelTreeProps) {
  const { t } = useTranslation();
  const channels = useGuildChannels(serverId);
  const perms = useMyPerms(serverId);
  const canManage = perms.can('MANAGE_CHANNELS');
  const canInvite = perms.can('CREATE_INVITE');
  const collapsed = useGuildPrefs((s) => s.collapsed[serverId] ?? EMPTY);
  const toggle = useGuildPrefs((s) => s.toggleCategory);
  const hideMuted = useGuildPrefs((s) => Boolean(s.hideMuted[serverId]));
  const mutedChannels = useGuildPrefs((s) => s.mutedChannels);
  const serverMuted = useGuildPrefs((s) => isMuteActive(s.mutedServers[serverId]));
  const voiceChannelId = useVoiceChannelId();

  const byId = useMemo(() => new Map(channels.map((c) => [c.id, c])), [channels]);
  const channelIds = useMemo(() => channels.filter((c) => c.type !== 'category').map((c) => c.id), [channels]);
  const unreadKey = useUnreadIdsKey(channelIds);
  const unreadSet = useMemo(() => new Set(unreadKey.split(',').filter(Boolean)), [unreadKey]);
  const toggleCategory = useCallback((categoryId: string) => toggle(serverId, categoryId), [toggle, serverId]);

  /* ── Glisser-déposer ─────────────────────────────────────────────────── */
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const [draft, setDraft] = useState<Draft | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const draggingCategory = dragId?.startsWith(CAT) ?? false;
  const baseLayout = useMemo(() => draftFrom(channels), [channels]);
  const layout = draft ?? baseLayout;

  const onDragStart = (e: DragStartEvent) => {
    setDragId(String(e.active.id));
    setDraft(baseLayout);
  };
  const onDragOver = (e: DragOverEvent) => {
    const activeId = String(e.active.id);
    const overId = e.over ? String(e.over.id) : null;
    if (!overId || activeId.startsWith(CAT)) return;
    setDraft((d) => {
      if (!d) return d;
      const from = containerOf(d, activeId);
      const to = containerOf(d, overId);
      if (!from || !to || from === to) return d;
      const source = d.containers[from].filter((x) => x !== activeId);
      const target = [...(d.containers[to] ?? [])];
      const index = overId.startsWith(CAT) ? target.length : Math.max(0, target.indexOf(overId));
      target.splice(index, 0, activeId);
      return { ...d, containers: { ...d.containers, [from]: source, [to]: target } };
    });
  };
  const onDragEnd = (e: DragEndEvent) => {
    const activeId = String(e.active.id);
    const overId = e.over ? String(e.over.id) : null;
    const current = draft;
    setDraft(null);
    setDragId(null);
    if (!current || !overId) return;
    let next = current;
    if (activeId.startsWith(CAT)) {
      const a = activeId.slice(CAT.length);
      const o = overId.startsWith(CAT) ? overId.slice(CAT.length) : byId.get(overId)?.parentId;
      if (!o) return;
      const from = next.categories.indexOf(a);
      const to = next.categories.indexOf(o);
      if (from < 0 || to < 0 || from === to) return;
      next = { ...next, categories: arrayMove(next.categories, from, to) };
    } else {
      const container = containerOf(next, activeId);
      if (container && !overId.startsWith(CAT)) {
        const ids = next.containers[container];
        const from = ids.indexOf(activeId);
        const to = ids.indexOf(overId);
        if (from >= 0 && to >= 0 && from !== to) next = { ...next, containers: { ...next.containers, [container]: arrayMove(ids, from, to) } };
      }
    }
    const positions = positionsFrom(next, channels);
    if (positions.length) void reorderChannels(serverId, positions);
  };
  const onDragCancel = () => {
    setDraft(null);
    setDragId(null);
  };

  /* ── Filtrage d'affichage ────────────────────────────────────────────── */
  const isMuted = (c: GuildChannel) =>
    serverMuted || isMuteActive(mutedChannels[c.id]) || (c.parentId ? isMuteActive(mutedChannels[c.parentId]) : false);
  const isVisible = (c: GuildChannel, categoryCollapsed: boolean) => {
    if (draggingCategory) return false;
    const active = c.id === activeChannelId;
    const muted = isMuted(c);
    if (hideMuted && muted && !active) return false;
    if (!categoryCollapsed) return true;
    return active || (unreadSet.has(c.id) && !muted) || voiceChannelId === c.id;
  };

  const renderChannel = (c: GuildChannel) => {
    const common = {
      serverId,
      channel: c,
      active: c.id === activeChannelId,
      muted: isMuted(c),
      canInvite,
      canManage,
      perms,
    };
    return isVoiceType(c.type) ? <VoiceChannelRow key={c.id} {...common} connected={voiceChannelId === c.id} /> : <ChannelRow key={c.id} {...common} />;
  };

  const rootIds = layout.containers[ROOT] ?? [];
  const dragged = dragId ? (dragId.startsWith(CAT) ? byId.get(dragId.slice(CAT.length)) : byId.get(dragId)) : undefined;

  if (channels.length === 0) {
    return <p className="px-4 py-6 text-center text-xs text-muted">{canManage ? t.guild.sidebar.emptyManage : t.guild.sidebar.empty}</p>;
  }

  const visibleRoot = rootIds.map((id) => byId.get(id)).filter((c): c is GuildChannel => !!c && isVisible(c, false));

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[restrictToVerticalAxis]}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      onDragCancel={onDragCancel}
    >
      <div className="flex flex-col pb-2">
        {visibleRoot.length > 0 && (
          <SortableContext items={visibleRoot.map((c) => c.id)} strategy={verticalListSortingStrategy}>
            <div className="pt-1">{visibleRoot.map(renderChannel)}</div>
          </SortableContext>
        )}

        <SortableContext items={layout.categories.map((id) => `${CAT}${id}`)} strategy={verticalListSortingStrategy}>
          {layout.categories.map((catId) => {
            const cat = byId.get(catId);
            if (!cat) return null;
            const isCollapsed = collapsed.includes(catId);
            const visible = (layout.containers[catId] ?? []).map((id) => byId.get(id)).filter((c): c is GuildChannel => !!c && isVisible(c, isCollapsed));
            return (
              <div key={catId}>
                <CategoryRow
                  serverId={serverId}
                  category={cat}
                  collapsed={isCollapsed || draggingCategory}
                  canManage={canManage}
                  perms={perms}
                  onToggle={toggleCategory}
                />
                <SortableContext items={visible.map((c) => c.id)} strategy={verticalListSortingStrategy}>
                  <div className="pt-1">{visible.map(renderChannel)}</div>
                </SortableContext>
              </div>
            );
          })}
        </SortableContext>
      </div>

      <DragOverlay dropAnimation={{ duration: 160, easing: 'cubic-bezier(.165,.84,.44,1)' }}>{dragged ? <DragPreview channel={dragged} /> : null}</DragOverlay>
    </DndContext>
  );
}

function DragPreview({ channel }: { channel: GuildChannel }) {
  const Icon = CHANNEL_ICONS[channel.type] ?? CHANNEL_ICONS.text;
  if (channel.type === 'category') {
    return (
      <div className="flex h-7 items-center rounded-md bg-surface-tertiary px-3 text-[11px] font-semibold tracking-[0.04em] text-foreground uppercase shadow-lg ring-1 ring-border">
        {channel.name}
      </div>
    );
  }
  return (
    <div className="flex h-8 items-center gap-1.5 rounded-md bg-surface-tertiary px-2 text-[15px] font-semibold text-foreground shadow-lg ring-1 ring-border">
      <Icon className="size-5 text-muted" aria-hidden />
      <span className="truncate">{channel.name}</span>
    </div>
  );
}
