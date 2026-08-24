'use client';

import { Button, Dropdown, Header, Label, Tooltip } from '@heroui/react';
import { Headphones, HeadphoneOff, Mic, MicOff, Settings } from 'lucide-react';
import { useState } from 'react';

import { useAuth } from '@/hooks/use-auth';
import { socketService } from '@/lib/socket';
import type { AlfyUser } from '@/components/alfy/mock/types';
import { AlfyAvatar } from '@/components/alfy/primitives/alfy-avatar';
import { StatusDot, usePresenceLabels } from '@/components/alfy/primitives/status-dot';
import { UserPopover } from '@/components/alfy/members/user-popover';
import { useTranslation } from '@/components/locale-provider';
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
  const { t } = useTranslation();
  const presenceLabels = usePresenceLabels();
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
          aria-label={t.userDock.changeStatusAria}
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
                <Dropdown.Item key={s} id={s} textValue={presenceLabels[s]}>
                  <StatusDot status={s} size="sm" ringClass="ring-overlay" />
                  <Label>{presenceLabels[s]}</Label>
                </Dropdown.Item>
              ))}
            </Dropdown.Section>
          </Dropdown.Menu>
        </Dropdown.Popover>
      </Dropdown>

      {/* `UserPopover` rend déjà un `<button>` : en imbriquer un second dedans
          produisait un bouton dans un bouton (HTML invalide, erreur
          d'hydratation, clic avalé). Le déclencheur porte donc directement la
          mise en forme. */}
      <UserPopover
        user={user}
        isSelf
        placement="top"
        triggerClassName="flex min-w-0 flex-1 cursor-pointer flex-col items-start rounded-sm text-left leading-tight outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-focus"
      >
        <span className="w-full truncate text-xs font-semibold">{user.displayName}</span>
        <span className="w-full truncate text-[10px] text-muted">
          {user.customStatus || presenceLabels[status]}
        </span>
      </UserPopover>

      <div className="flex items-center gap-0.5">
        <Tooltip delay={300}>
          <Button
            isIconOnly
            variant="ghost"
            size="sm"
            className={cn('size-7 active:scale-90', muted ? 'text-danger' : 'text-muted')}
            onPress={() => setMuted((m) => !m)}
            aria-label={muted ? t.userDock.unmute : t.userDock.mute}
          >
            {muted ? <MicOff className="size-4" /> : <Mic className="size-4" />}
          </Button>
          <Tooltip.Content>
            <p>{muted ? t.userDock.unmute : t.userDock.mute}</p>
          </Tooltip.Content>
        </Tooltip>
        <Tooltip delay={300}>
          <Button
            isIconOnly
            variant="ghost"
            size="sm"
            className={cn('size-7 active:scale-90', deafened ? 'text-danger' : 'text-muted')}
            onPress={() => setDeafened((d) => !d)}
            aria-label={deafened ? t.userDock.undeafen : t.userDock.deafen}
          >
            {/* L'icône ne changeait pas en sourdine : seule la couleur bougeait,
                indiscernable pour qui ne distingue pas le rouge. */}
            {deafened ? <HeadphoneOff className="size-4" /> : <Headphones className="size-4" />}
          </Button>
          <Tooltip.Content>
            <p>{deafened ? t.userDock.undeafen : t.userDock.deafen}</p>
          </Tooltip.Content>
        </Tooltip>
        <Tooltip delay={300}>
          <Button
            isIconOnly
            variant="ghost"
            size="sm"
            className="size-7 text-muted active:scale-90"
            onPress={onOpenSettings}
            aria-label={t.userDock.accountSettings}
          >
            <Settings className="size-4" />
          </Button>
          <Tooltip.Content>
            <p>{t.userDock.accountSettings}</p>
          </Tooltip.Content>
        </Tooltip>
      </div>
    </div>
  );
}
