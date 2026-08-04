'use client';

import { Button, Disclosure, Dropdown, Label, ScrollShadow, Tooltip } from '@heroui/react';
import { ArrowDown, ArrowUp, MoreVertical, Pencil, Plus, Trash2, TriangleAlert } from 'lucide-react';
import { useState } from 'react';

import type { AlfyServer, AlfyUser } from '@/components/alfy/mock/types';
import { ServerMenu } from '@/components/alfy/servers/server-menu';
import { ChannelItem } from '@/components/alfy/servers/channel-item';
import { UserDock } from '@/components/alfy/servers/user-dock';
import { VoiceDock } from '@/components/alfy/servers/voice-dock';
import { cn } from '@/lib/utils';

interface ChannelSidebarProps {
  server: AlfyServer;
  currentUser: AlfyUser;
  activeChannelId: string | null;
  onSelectChannel: (id: string) => void;
  onOpenServerSettings?: () => void;
  onOpenUserSettings?: () => void;
  /** Nom du salon vocal connecté, ou null. */
  connectedVoiceChannel?: string | null;

  /** Droit MANAGE_CHANNELS — affiche les affordances de gestion si vrai. */
  canManage?: boolean;
  onCreateChannel?: (parentId: string | null) => void;
  onCreateCategory?: () => void;
  onRenameChannel?: (id: string) => void;
  onDeleteChannel?: (id: string) => void;
  onMoveChannel?: (id: string, direction: 'up' | 'down') => void;
  onRenameCategory?: (id: string) => void;
  onDeleteCategory?: (id: string) => void;
  onMoveCategory?: (id: string, direction: 'up' | 'down') => void;
}

function CategoryHeader({
  name,
  canManage,
  isFirst,
  isLast,
  onAddChannel,
  onRename,
  onDelete,
  onMoveUp,
  onMoveDown,
}: {
  name: string;
  canManage: boolean;
  isFirst: boolean;
  isLast: boolean;
  onAddChannel?: () => void;
  onRename?: () => void;
  onDelete?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <div className="group/cat flex items-center gap-0.5">
      <Disclosure.Heading className="min-w-0 flex-1">
        <Button
          slot="trigger"
          variant="ghost"
          size="sm"
          className="h-6 w-full justify-start gap-1 px-1 text-[11px] font-semibold tracking-widest text-muted/80 uppercase transition-colors hover:text-foreground"
        >
          <Disclosure.Indicator className="size-3 shrink-0 transition-transform duration-150" />
          <span className="min-w-0 truncate">{name}</span>
        </Button>
      </Disclosure.Heading>
      {canManage && (
        <div className={cn('flex shrink-0 items-center gap-0.5', menuOpen ? 'flex' : 'hidden group-hover/cat:flex')}>
          {onAddChannel && (
            <Tooltip delay={400}>
              <Button isIconOnly size="sm" variant="ghost" aria-label="Ajouter un salon" className="size-5 text-muted hover:text-foreground" onPress={onAddChannel}>
                <Plus className="size-3.5" />
              </Button>
              <Tooltip.Content>
                <p>Ajouter un salon</p>
              </Tooltip.Content>
            </Tooltip>
          )}
          <Dropdown isOpen={menuOpen} onOpenChange={setMenuOpen}>
            <Dropdown.Trigger
              aria-label="Gérer la catégorie"
              className="flex size-5 shrink-0 cursor-pointer items-center justify-center rounded text-muted outline-none transition-colors hover:bg-surface-tertiary hover:text-foreground focus-visible:ring-2 focus-visible:ring-focus"
            >
              <MoreVertical className="size-3.5" />
            </Dropdown.Trigger>
            <Dropdown.Popover className="min-w-44">
              <Dropdown.Menu
                onAction={(key) => {
                  if (key === 'rename') onRename?.();
                  else if (key === 'up') onMoveUp?.();
                  else if (key === 'down') onMoveDown?.();
                  else if (key === 'delete') onDelete?.();
                }}
              >
                <Dropdown.Item id="rename" textValue="Renommer">
                  <Pencil className="size-4" />
                  <Label>Renommer</Label>
                </Dropdown.Item>
                <Dropdown.Item id="up" textValue="Monter" isDisabled={isFirst}>
                  <ArrowUp className="size-4" />
                  <Label>Monter</Label>
                </Dropdown.Item>
                <Dropdown.Item id="down" textValue="Descendre" isDisabled={isLast}>
                  <ArrowDown className="size-4" />
                  <Label>Descendre</Label>
                </Dropdown.Item>
                <Dropdown.Item id="delete" textValue="Supprimer la catégorie" variant="danger">
                  <Trash2 className="size-4" />
                  <Label>Supprimer la catégorie</Label>
                </Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown.Popover>
          </Dropdown>
        </div>
      )}
    </div>
  );
}

export function ChannelSidebar({
  server,
  currentUser,
  activeChannelId,
  onSelectChannel,
  onOpenServerSettings,
  onOpenUserSettings,
  connectedVoiceChannel,
  canManage = false,
  onCreateChannel,
  onCreateCategory,
  onRenameChannel,
  onDeleteChannel,
  onMoveChannel,
  onRenameCategory,
  onDeleteCategory,
  onMoveCategory,
}: ChannelSidebarProps) {
  const realCategories = server.categories.filter((c) => c.id !== '__root__');

  return (
    <div className="flex h-full w-full flex-col bg-surface-secondary/35">
      <ServerMenu
        server={server}
        onOpenSettings={onOpenServerSettings}
        canManage={canManage}
        onCreateChannel={onCreateChannel ? () => onCreateChannel(null) : undefined}
        onCreateCategory={onCreateCategory}
      />

      {server.selfHosted && !server.nodeOnline && (
        <div className="mx-2 mt-2 flex items-center gap-2 rounded-md bg-warning/15 px-3 py-2 text-xs text-(--warning)">
          <TriangleAlert className="size-3.5 shrink-0" aria-hidden />
          <span>Nœud hors ligne — messages en attente</span>
        </div>
      )}

      <ScrollShadow className="min-h-0 flex-1 overflow-y-auto px-2 py-3">
        <div className="flex flex-col gap-1.5">
          {server.categories.map((cat) => {
            const isRoot = cat.id === '__root__';
            const channels = server.channels.filter((c) => c.categoryId === cat.id);
            if (channels.length === 0 && isRoot) return null;
            const catIndex = realCategories.findIndex((c) => c.id === cat.id);

            const list = (
              <Disclosure.Body className="flex flex-col gap-px pb-1.5 pl-1">
                {channels.length === 0 ? (
                  <p className="px-2 py-1 text-xs text-muted/70 italic">Aucun salon ici pour l&apos;instant.</p>
                ) : (
                  channels.map((ch, i) => (
                    <ChannelItem
                      key={ch.id}
                      channel={ch}
                      active={ch.id === activeChannelId}
                      onSelect={onSelectChannel}
                      canManage={canManage}
                      onRename={onRenameChannel}
                      onDelete={onDeleteChannel}
                      onMoveUp={onMoveChannel ? (id) => onMoveChannel(id, 'up') : undefined}
                      onMoveDown={onMoveChannel ? (id) => onMoveChannel(id, 'down') : undefined}
                      isFirst={i === 0}
                      isLast={i === channels.length - 1}
                    />
                  ))
                )}
              </Disclosure.Body>
            );

            if (isRoot) {
              return (
                <div key={cat.id} className="flex flex-col gap-px">
                  {list}
                </div>
              );
            }

            return (
              <Disclosure key={cat.id} defaultExpanded>
                <CategoryHeader
                  name={cat.name}
                  canManage={canManage}
                  isFirst={catIndex === 0}
                  isLast={catIndex === realCategories.length - 1}
                  onAddChannel={onCreateChannel ? () => onCreateChannel(cat.id) : undefined}
                  onRename={onRenameCategory ? () => onRenameCategory(cat.id) : undefined}
                  onDelete={onDeleteCategory ? () => onDeleteCategory(cat.id) : undefined}
                  onMoveUp={onMoveCategory ? () => onMoveCategory(cat.id, 'up') : undefined}
                  onMoveDown={onMoveCategory ? () => onMoveCategory(cat.id, 'down') : undefined}
                />
                <Disclosure.Content>{list}</Disclosure.Content>
              </Disclosure>
            );
          })}

          {server.categories.length === 0 && (
            <p className="px-2 py-3 text-center text-xs text-muted/70">
              {canManage ? 'Créez votre premier salon depuis le menu du serveur.' : 'Aucun salon pour l’instant.'}
            </p>
          )}
        </div>
      </ScrollShadow>

      <div className="flex flex-col gap-1.5 p-2">
        {connectedVoiceChannel && <VoiceDock channelName={connectedVoiceChannel} />}
        <UserDock user={currentUser} onOpenSettings={onOpenUserSettings} />
      </div>
    </div>
  );
}
