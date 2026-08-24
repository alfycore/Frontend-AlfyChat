'use client';

import { Button, Dropdown, Label, Tooltip } from '@heroui/react';
import { Ellipsis, FolderPlus, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';

import type { AlfyChannel, AlfyServer } from '@/components/alfy/mock/types';
import { PanelHeader } from '@/components/alfy/settings/settings-shell';
import { SettingsSection } from '@/components/alfy/settings/section';
import { CHANNEL_TYPE_ICONS } from '@/components/alfy/servers/channel-item';
import {
  CreateChannelDialog,
  type CreatableChannelType,
} from '@/components/alfy/servers/create-channel-dialog';

export interface CreateChannelInput {
  name: string;
  type: CreatableChannelType | 'category';
  parentId: string | null;
}

interface ChannelsPanelProps {
  server: AlfyServer;
  /**
   * Persistance réelle. Retourne false si le serveur a refusé — la boîte de dialogue
   * reste alors ouverte. Sans ce callback, le panneau est en lecture seule.
   */
  onCreateChannel?: (data: CreateChannelInput) => Promise<boolean> | void;
  onDeleteChannel?: (channelId: string) => Promise<boolean> | void;
}

export function ChannelsPanel({ server, onCreateChannel, onDeleteChannel }: ChannelsPanelProps) {
  // La liste vient toujours du serveur : elle est rafraîchie par les événements
  // CHANNEL_CREATE / CHANNEL_DELETE. Aucun état local optimiste.
  const channels: AlfyChannel[] = server.channels;
  const canManage = Boolean(onCreateChannel || onDeleteChannel);

  const [dialog, setDialog] = useState<{ mode: 'channel' | 'category'; categoryId: string | null } | null>(null);

  return (
    <div>
      <PanelHeader
        title="Salons"
        description="Organisez vos catégories et vos salons."
      />

      {server.categories.map((cat) => (
        <SettingsSection key={cat.id} title={cat.name}>
          <div className="flex items-center justify-between px-3 py-2">
            <span className="text-[11px] font-semibold tracking-wider text-muted uppercase">
              {channels.filter((c) => c.categoryId === cat.id).length} salons
            </span>
            {canManage && (
              <Button
                size="sm"
                variant="ghost"
                onPress={() => setDialog({ mode: 'channel', categoryId: cat.id })}
              >
                <Plus className="size-3.5" />
                Ajouter
              </Button>
            )}
          </div>
          {channels
            .filter((c) => c.categoryId === cat.id)
            .map((ch) => {
              const Icon = CHANNEL_TYPE_ICONS[ch.type];
              return (
                <div
                  key={ch.id}
                  className="flex items-center gap-2 border-t border-separator px-3 py-2.5 transition-colors hover:bg-surface-secondary/50"
                >
                  <Icon className="size-4 shrink-0 text-muted" aria-hidden />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">{ch.name}</span>
                  <span className="text-[10px] text-muted uppercase">{ch.type}</span>
                  {canManage && onDeleteChannel && (
                    <Dropdown>
                      <Dropdown.Trigger
                        aria-label={`Actions pour ${ch.name}`}
                        className="flex size-7 cursor-pointer items-center justify-center rounded-sm text-muted outline-none transition-colors hover:bg-surface-secondary hover:text-foreground focus-visible:ring-2 focus-visible:ring-focus"
                      >
                        <Ellipsis className="size-4" />
                      </Dropdown.Trigger>
                      <Dropdown.Popover className="min-w-44">
                        <Dropdown.Menu
                          onAction={(k) => {
                            if (k === 'delete') void onDeleteChannel(ch.id);
                          }}
                        >
                          <Dropdown.Item id="delete" textValue="Supprimer" variant="danger">
                            <Trash2 className="size-4" />
                            <Label>Supprimer</Label>
                          </Dropdown.Item>
                        </Dropdown.Menu>
                      </Dropdown.Popover>
                    </Dropdown>
                  )}
                </div>
              );
            })}
        </SettingsSection>
      ))}

      {canManage && (
        <div className="flex justify-end gap-2">
          <Tooltip>
            <Button variant="secondary" onPress={() => setDialog({ mode: 'category', categoryId: null })}>
              <FolderPlus className="size-3.5" />
              Nouvelle catégorie
            </Button>
            <Tooltip.Content>Une catégorie regroupe des salons.</Tooltip.Content>
          </Tooltip>
        </div>
      )}

      {onCreateChannel && (
        <CreateChannelDialog
          isOpen={dialog !== null}
          onOpenChange={(open) => { if (!open) setDialog(null); }}
          mode={dialog?.mode ?? 'channel'}
          categories={server.categories}
          defaultCategoryId={dialog?.categoryId}
          onCreate={onCreateChannel}
        />
      )}
    </div>
  );
}
