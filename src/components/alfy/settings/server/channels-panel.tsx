'use client';

import { Button, Dropdown, Label, Tooltip, toast } from '@heroui/react';
import { Ellipsis, GripVertical, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';

import type { AlfyChannel, AlfyServer } from '@/components/alfy/mock/types';
import { PanelHeader } from '@/components/alfy/settings/settings-shell';
import { SettingsSection } from '@/components/alfy/settings/section';
import { CHANNEL_TYPE_ICONS } from '@/components/alfy/servers/channel-item';

interface ChannelsPanelProps {
  server: AlfyServer;
  /** Persistance réelle ; sans elle, l'état reste local (mock). */
  onCreateChannel?: (name: string, categoryId: string) => void;
  onDeleteChannel?: (channelId: string) => void;
}

export function ChannelsPanel({ server, onCreateChannel, onDeleteChannel }: ChannelsPanelProps) {
  const [localChannels, setLocalChannels] = useState<AlfyChannel[]>(server.channels);
  const isLive = Boolean(onCreateChannel || onDeleteChannel);
  // En réel, la liste vient du serveur (mise à jour par WS après écriture).
  const channels = isLive ? server.channels : localChannels;

  const addChannel = (categoryId: string) => {
    const name = 'nouveau-salon';
    if (isLive) {
      onCreateChannel?.(name, categoryId);
    } else {
      setLocalChannels((cs) => [
        ...cs,
        {
          id: `ch-new-${Date.now()}`,
          serverId: server.id,
          name,
          type: 'text',
          categoryId,
          unreadCount: 0,
          mentionCount: 0,
        },
      ]);
    }
    toast('Salon créé', { description: `#${name}` });
  };

  const removeChannel = (id: string) => {
    if (isLive) onDeleteChannel?.(id);
    else setLocalChannels((cs) => cs.filter((c) => c.id !== id));
    toast('Salon supprimé');
  };

  return (
    <div>
      <PanelHeader
        title="Salons"
        description="Organisez vos catégories et vos salons. Glissez pour réordonner (démo)."
      />
      {server.categories.map((cat) => (
        <SettingsSection key={cat.id} title={cat.name}>
          <div className="flex items-center justify-between px-3 py-2">
            <span className="text-[11px] font-semibold tracking-wider text-muted uppercase">
              {channels.filter((c) => c.categoryId === cat.id).length} salons
            </span>
            <Button size="sm" variant="ghost" onPress={() => addChannel(cat.id)}>
              <Plus className="size-3.5" />
              Ajouter
            </Button>
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
                  <GripVertical className="size-4 shrink-0 cursor-grab text-muted/50" aria-hidden />
                  <Icon className="size-4 shrink-0 text-muted" aria-hidden />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">{ch.name}</span>
                  <span className="text-[10px] text-muted uppercase">{ch.type}</span>
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
                          if (k === 'edit') toast('Édition du salon', { description: `#${ch.name}` });
                          if (k === 'delete') removeChannel(ch.id);
                        }}
                      >
                        <Dropdown.Item id="edit" textValue="Modifier">
                          <Pencil className="size-4" />
                          <Label>Modifier le salon</Label>
                        </Dropdown.Item>
                        <Dropdown.Item id="delete" textValue="Supprimer" variant="danger">
                          <Trash2 className="size-4" />
                          <Label>Supprimer</Label>
                        </Dropdown.Item>
                      </Dropdown.Menu>
                    </Dropdown.Popover>
                  </Dropdown>
                </div>
              );
            })}
        </SettingsSection>
      ))}
      <div className="flex justify-end">
        <Button variant="secondary" onPress={() => toast('Catégorie créée')}>
          <Plus className="size-3.5" />
          Nouvelle catégorie
        </Button>
      </div>
    </div>
  );
}
