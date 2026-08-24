'use client';

import { Chip, Dropdown, Label, Separator } from '@heroui/react';
import { ChevronDown, FolderPlus, Hash, LogOut, Server, Settings, UserPlus } from 'lucide-react';

import type { AlfyServer } from '@/components/alfy/mock/types';
import { useTranslation } from '@/components/locale-provider';

interface ServerMenuProps {
  server: AlfyServer;
  onOpenSettings?: () => void;
  canManage?: boolean;
  onCreateChannel?: () => void;
  onCreateCategory?: () => void;
  /** Ouvre les réglages sur l'onglet des invitations. */
  onInvite?: () => void;
  /** Quitte le serveur (confirmation gérée par l'appelant). */
  onLeave?: () => void;
}

/**
 * En-tête de la sidebar : bannière du serveur (ou dégradé de repli) + nom + menu.
 *
 * Les entrées « Inviter des membres », « Notifications » et « Quitter le
 * serveur » étaient rendues sans gestionnaire : le menu proposait trois
 * commandes qui ne faisaient rien. Elles sont maintenant conditionnées à leur
 * action, et « Notifications » — qui n'a aucune destination côté serveur — a
 * été retirée.
 */
export function ServerMenu({
  server,
  onOpenSettings,
  canManage = false,
  onCreateChannel,
  onCreateCategory,
  onInvite,
  onLeave,
}: ServerMenuProps) {
  const { t, tx } = useTranslation();
  return (
    <Dropdown>
      <Dropdown.Trigger
        aria-label={tx(t.serverMenu.menuAria, { name: server.name })}
        className="group/menu relative block w-full cursor-pointer overflow-hidden text-left outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-focus"
      >
        {/* Bannière */}
        <div
          className="h-16 bg-linear-to-br from-(--accent)/50 via-(--accent)/20 to-transparent bg-cover bg-center transition-opacity group-hover/menu:opacity-90"
          style={server.bannerUrl ? { backgroundImage: `url(${server.bannerUrl})` } : undefined}
        />
        <div className="absolute inset-x-0 bottom-0 flex items-center gap-2 bg-linear-to-t from-surface via-(--surface)/70 to-transparent px-4 pt-5 pb-2">
          <span className="min-w-0 flex-1 truncate text-sm font-bold">{server.name}</span>
          {server.selfHosted && server.nodeOnline && (
            <Chip size="sm" color="success" variant="soft" className="cursor-default">
              <Server className="size-2.5" aria-hidden />
              <Chip.Label className="text-[10px]">{t.serverMenu.autoChip}</Chip.Label>
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
            else if (key === 'invite') onInvite?.();
            else if (key === 'create-channel') onCreateChannel?.();
            else if (key === 'create-category') onCreateCategory?.();
            else if (key === 'leave') onLeave?.();
          }}
        >
          {onInvite && (
            <Dropdown.Item id="invite" textValue={t.serverMenu.inviteMembers}>
              <UserPlus className="size-4" />
              <Label>{t.serverMenu.inviteMembers}</Label>
            </Dropdown.Item>
          )}
          {onOpenSettings && (
            <Dropdown.Item id="settings" textValue={t.serverMenu.serverSettings}>
              <Settings className="size-4" />
              <Label>{t.serverMenu.serverSettings}</Label>
            </Dropdown.Item>
          )}
          {canManage && (onCreateChannel || onCreateCategory) && (
            <>
              <Separator className="my-1" />
              {onCreateChannel && (
                <Dropdown.Item id="create-channel" textValue={t.serverMenu.createChannel}>
                  <Hash className="size-4" />
                  <Label>{t.serverMenu.createChannel}</Label>
                </Dropdown.Item>
              )}
              {onCreateCategory && (
                <Dropdown.Item id="create-category" textValue={t.serverMenu.createCategory}>
                  <FolderPlus className="size-4" />
                  <Label>{t.serverMenu.createCategory}</Label>
                </Dropdown.Item>
              )}
            </>
          )}
          {onLeave && (
            <>
              <Separator className="my-1" />
              <Dropdown.Item id="leave" textValue={t.serverMenu.leaveServer} variant="danger">
                <LogOut className="size-4" />
                <Label>{t.serverMenu.leaveServer}</Label>
              </Dropdown.Item>
            </>
          )}
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  );
}
