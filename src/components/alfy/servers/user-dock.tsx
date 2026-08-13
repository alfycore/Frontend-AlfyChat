'use client';

import { Button, Dropdown, Header, Label, Tooltip } from '@heroui/react';
import { Headphones, Mic, MicOff, Settings } from 'lucide-react';
import { useState } from 'react';

import { useAuth } from '@/hooks/use-auth';
import { socketService } from '@/lib/socket';
import type { AlfyPresence, AlfyUser } from '@/components/alfy/mock/types';
import { AlfyAvatar } from '@/components/alfy/primitives/alfy-avatar';
import { PRESENCE_LABELS, StatusDot } from '@/components/alfy/primitives/status-dot';
import { UserPopover } from '@/components/alfy/members/user-popover';
import { cn } from '@/lib/utils';

type SelectableStatus = 'online' | 'idle' | 'dnd' | 'invisible';
const SELECTABLE: SelectableStatus[] = ['online', 'idle', 'dnd', 'invisible'];

interface UserDockProps {
  user: AlfyUser;
  onOpenSettings?: () => void;
}

/** Dock utilisateur en bas de la sidebar : statut, micro, casque, réglages. */
export function UserDock({ user, onOpenSettings }: UserDockProps) {
  // `user.status` (prop) reflète déjà la présence réelle — dérivée de
  // useAuth() par le container. On ne garde `updateUser` que pour l'écriture
  // optimiste : le serveur ne renvoie jamais l'écho de son propre changement.
  const { updateUser } = useAuth();
  const status = user.status;
  const [muted, setMuted] = useState(false);
  const [deafened, setDeafened] = useState(false);

  const changerStatut = (next: SelectableStatus) => {
    if (next === status) return;
    // Optimiste : le serveur ne renvoie PRESENCE_UPDATE qu'à ses amis/contacts
    // de MP, jamais à soi-même — sans cette écriture locale, le menu semblait
    // fonctionner (fermait) sans jamais refléter le nouveau statut choisi.
    updateUser({ status: next });
    socketService.updatePresence(next, user.customStatus ?? null, user.statusEmoji ?? null);
  };

  return (
    <div className="flex shrink-0 items-center gap-2 rounded-lg border border-border/50 bg-surface-tertiary/80 px-2.5 py-2 shadow-sm backdrop-blur-sm">
      <Dropdown>
        <Dropdown.Trigger
          aria-label="Changer le statut"
          className="shrink-0 cursor-pointer rounded-full outline-none transition-transform active:scale-95 focus-visible:ring-2 focus-visible:ring-[color:var(--focus)]"
        >
          <AlfyAvatar
            name={user.displayName}
            avatarUrl={user.avatarUrl}
            size="sm"
            status={status}
            statusRingClass="ring-surface-tertiary"
          />
        </Dropdown.Trigger>
        <Dropdown.Popover className="min-w-52">
          <Dropdown.Menu onAction={(key) => changerStatut(String(key) as SelectableStatus)}>
            <Dropdown.Section>
              <Header>{user.displayName}</Header>
              {SELECTABLE.map((s) => (
                <Dropdown.Item key={s} id={s} textValue={PRESENCE_LABELS[s]}>
                  <StatusDot status={s} size="sm" ringClass="ring-overlay" />
                  <Label>{PRESENCE_LABELS[s]}</Label>
                </Dropdown.Item>
              ))}
            </Dropdown.Section>
          </Dropdown.Menu>
        </Dropdown.Popover>
      </Dropdown>

      <UserPopover user={user} isSelf placement="top" triggerClassName="min-w-0 flex-1 text-left outline-none">
        <button
          type="button"
          aria-label="Voir mon profil"
          className="flex min-w-0 w-full cursor-pointer flex-col rounded-sm leading-tight outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-focus"
        >
          <span className="truncate text-xs font-semibold">{user.displayName}</span>
          <span className="truncate text-[10px] text-muted">
            {user.customStatus || PRESENCE_LABELS[status]}
          </span>
        </button>
      </UserPopover>

      <div className="flex items-center gap-0.5">
        <Tooltip delay={300}>
          <Button
            isIconOnly
            variant="ghost"
            size="sm"
            className={cn('size-7 active:scale-90', muted ? 'text-danger' : 'text-muted')}
            onPress={() => setMuted((m) => !m)}
            aria-label={muted ? 'Réactiver le micro' : 'Couper le micro'}
          >
            {muted ? <MicOff className="size-4" /> : <Mic className="size-4" />}
          </Button>
          <Tooltip.Content>
            <p>{muted ? 'Réactiver le micro' : 'Couper le micro'}</p>
          </Tooltip.Content>
        </Tooltip>
        <Tooltip delay={300}>
          <Button
            isIconOnly
            variant="ghost"
            size="sm"
            className={cn('size-7 active:scale-90', deafened ? 'text-danger' : 'text-muted')}
            onPress={() => setDeafened((d) => !d)}
            aria-label={deafened ? 'Réactiver le son' : 'Mettre en sourdine'}
          >
            <Headphones className="size-4" />
          </Button>
          <Tooltip.Content>
            <p>{deafened ? 'Réactiver le son' : 'Mettre en sourdine'}</p>
          </Tooltip.Content>
        </Tooltip>
        <Tooltip delay={300}>
          <Button
            isIconOnly
            variant="ghost"
            size="sm"
            className="size-7 text-muted active:scale-90"
            onPress={onOpenSettings}
            aria-label="Paramètres du compte"
          >
            <Settings className="size-4" />
          </Button>
          <Tooltip.Content>
            <p>Paramètres du compte</p>
          </Tooltip.Content>
        </Tooltip>
      </div>
    </div>
  );
}
