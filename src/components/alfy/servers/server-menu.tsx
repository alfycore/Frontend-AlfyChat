'use client';

import { Chip, Dropdown, Label } from '@heroui/react';
import { Bell, ChevronDown, LogOut, Server, Settings, UserPlus } from 'lucide-react';

import type { AlfyServer } from '@/components/alfy/mock/types';

interface ServerMenuProps {
  server: AlfyServer;
  onOpenSettings?: () => void;
}

/** En-tête de la sidebar : mini-bannière accent + nom du serveur + menu. */
export function ServerMenu({ server, onOpenSettings }: ServerMenuProps) {
  return (
    <Dropdown>
      <Dropdown.Trigger
        aria-label={`Menu du serveur ${server.name}`}
        className="group/menu relative block w-full cursor-pointer overflow-hidden text-left outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-(--focus)"
      >
        {/* Bannière */}
        <div className="h-16 bg-linear-to-br from-(--accent)/50 via-(--accent)/20 to-transparent transition-opacity group-hover/menu:opacity-90" />
        <div className="absolute inset-x-0 bottom-0 flex items-center gap-2 bg-linear-to-t from-(--surface) via-(--surface)/70 to-transparent px-4 pt-5 pb-2">
          <span className="min-w-0 flex-1 truncate text-sm font-bold">{server.name}</span>
          {server.selfHosted && server.nodeOnline && (
            <Chip size="sm" color="success" variant="soft" className="cursor-default">
              <Server className="size-2.5" aria-hidden />
              <Chip.Label className="text-[10px]">auto</Chip.Label>
            </Chip>
          )}
          <ChevronDown
            className="size-4 shrink-0 text-muted transition-transform duration-150 group-hover/menu:translate-y-0.5"
            aria-hidden
          />
        </div>
      </Dropdown.Trigger>
      <Dropdown.Popover className="min-w-56">
        <Dropdown.Menu
          onAction={(key) => {
            if (key === 'settings') onOpenSettings?.();
          }}
        >
          <Dropdown.Item id="invite" textValue="Inviter des membres">
            <UserPlus className="size-4" />
            <Label>Inviter des membres</Label>
          </Dropdown.Item>
          <Dropdown.Item id="settings" textValue="Paramètres du serveur">
            <Settings className="size-4" />
            <Label>Paramètres du serveur</Label>
          </Dropdown.Item>
          <Dropdown.Item id="notifications" textValue="Notifications">
            <Bell className="size-4" />
            <Label>Notifications</Label>
          </Dropdown.Item>
          <Dropdown.Item id="leave" textValue="Quitter le serveur" variant="danger">
            <LogOut className="size-4" />
            <Label>Quitter le serveur</Label>
          </Dropdown.Item>
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  );
}
