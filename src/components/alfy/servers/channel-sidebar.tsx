'use client';

import { Button, Disclosure, ScrollShadow } from '@heroui/react';
import { TriangleAlert } from 'lucide-react';

import type { AlfyServer, AlfyUser } from '@/components/alfy/mock/types';
import { ServerMenu } from '@/components/alfy/servers/server-menu';
import { ChannelItem } from '@/components/alfy/servers/channel-item';
import { UserDock } from '@/components/alfy/servers/user-dock';
import { VoiceDock } from '@/components/alfy/servers/voice-dock';

interface ChannelSidebarProps {
  server: AlfyServer;
  currentUser: AlfyUser;
  activeChannelId: string | null;
  onSelectChannel: (id: string) => void;
  onOpenServerSettings?: () => void;
  onOpenUserSettings?: () => void;
  /** Nom du salon vocal connecté, ou null. */
  connectedVoiceChannel?: string | null;
}

export function ChannelSidebar({
  server,
  currentUser,
  activeChannelId,
  onSelectChannel,
  onOpenServerSettings,
  onOpenUserSettings,
  connectedVoiceChannel,
}: ChannelSidebarProps) {
  return (
    <div className="flex h-full w-full flex-col bg-surface-secondary/35">
      <ServerMenu server={server} onOpenSettings={onOpenServerSettings} />

      {server.selfHosted && !server.nodeOnline && (
        <div className="mx-2 mt-2 flex items-center gap-2 rounded-md bg-warning/15 px-3 py-2 text-xs text-(--warning)">
          <TriangleAlert className="size-3.5 shrink-0" aria-hidden />
          <span>Nœud hors ligne — messages en attente</span>
        </div>
      )}

      <ScrollShadow className="min-h-0 flex-1 overflow-y-auto px-2 py-3">
        <div className="flex flex-col gap-1.5">
          {server.categories.map((cat) => {
            const channels = server.channels.filter((c) => c.categoryId === cat.id);
            if (channels.length === 0) return null;
            return (
              <Disclosure key={cat.id} defaultExpanded>
                <Disclosure.Heading>
                  <Button
                    slot="trigger"
                    variant="ghost"
                    size="sm"
                    className="h-6 w-full justify-start gap-1 px-1 text-[11px] font-semibold tracking-widest text-muted/80 uppercase transition-colors hover:text-foreground"
                  >
                    <Disclosure.Indicator className="size-3 transition-transform duration-150" />
                    {cat.name}
                  </Button>
                </Disclosure.Heading>
                <Disclosure.Content>
                  <Disclosure.Body className="flex flex-col gap-px pb-1.5 pl-1">
                    {channels.map((ch) => (
                      <ChannelItem
                        key={ch.id}
                        channel={ch}
                        active={ch.id === activeChannelId}
                        onSelect={onSelectChannel}
                      />
                    ))}
                  </Disclosure.Body>
                </Disclosure.Content>
              </Disclosure>
            );
          })}
        </div>
      </ScrollShadow>

      <div className="flex flex-col gap-1.5 p-2">
        {connectedVoiceChannel && <VoiceDock channelName={connectedVoiceChannel} />}
        <UserDock user={currentUser} onOpenSettings={onOpenUserSettings} />
      </div>
    </div>
  );
}
