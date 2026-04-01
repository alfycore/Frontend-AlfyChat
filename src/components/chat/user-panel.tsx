'use client';

import { useState, useRef, useEffect } from 'react';
import { MicIcon, MicOffIcon, HeadphonesIcon, SettingsIcon, CheckIcon, PencilIcon } from '@/components/icons';
import { useAuth } from '@/hooks/use-auth';
import { useTranslation } from '@/components/locale-provider';
import {
  Avatar, Button, Dropdown, InputGroup, Modal, Tooltip,
} from '@heroui/react';
import { socketService } from '@/lib/socket';
import { resolveMediaUrl } from '@/lib/api';
import { SettingsDialog } from '@/components/chat/settings-dialog';

interface User {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  status: 'online' | 'offline' | 'idle' | 'dnd' | 'invisible';
  customStatus?: string | null;
}

interface UserPanelProps {
  user: User;
}

const statusConfig: Record<string, { color: string }> = {
  online: { color: 'bg-green-500' },
  idle: { color: 'bg-yellow-500' },
  dnd: { color: 'bg-red-500' },
  offline: { color: 'bg-[var(--muted)]/40' },
  invisible: { color: 'bg-[var(--muted)]/40' },
};

export function UserPanel({ user }: UserPanelProps) {
  const { updateUser } = useAuth();
  const { t } = useTranslation();
  const [isMuted, setIsMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [editingCustomStatus, setEditingCustomStatus] = useState(false);
  const [customStatusDraft, setCustomStatusDraft] = useState(user.customStatus ?? '');
  const customStatusInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setCustomStatusDraft(user.customStatus ?? '');
  }, [user.customStatus]);

  useEffect(() => {
    if (editingCustomStatus) customStatusInputRef.current?.focus();
  }, [editingCustomStatus]);

  const status = statusConfig[user.status] ?? statusConfig.offline;

  const handleStatusChange = (s: 'online' | 'idle' | 'dnd' | 'invisible') => {
    socketService.updatePresence(s, user.customStatus ?? null);
    updateUser({ status: s });
  };

  const saveCustomStatus = () => {
    const trimmed = customStatusDraft.trim().slice(0, 100);
    socketService.updatePresence(
      user.status === 'offline' ? 'online' : (user.status as 'online' | 'idle' | 'dnd' | 'invisible'),
      trimmed || null,
    );
    updateUser({ customStatus: trimmed || null });
    setEditingCustomStatus(false);
  };

  return (
    <div data-tour="user-panel" className="flex h-[52px] shrink-0 items-center gap-1 overflow-hidden border-t border-[var(--border)]/30 bg-[var(--background)]/80 px-1.5 md:gap-1 md:px-2">
      {/* Avatar + user info */}
      <div className="min-w-0 flex-1">
      <Dropdown>
        <Dropdown.Trigger>
          <div className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-xl px-1.5 py-1 transition-colors duration-150 hover:bg-[var(--surface-secondary)]/30">
            <div className="relative shrink-0">
              <Avatar size="sm" className="size-8">
                <Avatar.Image src={resolveMediaUrl(user.avatarUrl)} alt={user.displayName} />
                <Avatar.Fallback className="bg-[var(--accent)] text-[var(--accent-foreground)] text-[11px] font-semibold">
                  {user.displayName?.[0]?.toUpperCase()}
                </Avatar.Fallback>
              </Avatar>
              <span className={`absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full ring-[1.5px] ring-[var(--background)] ${status.color}`}>
                {user.status === 'dnd' && (
                  <span className="absolute inset-0 flex items-center justify-center">
                    <span className="block h-[2px] w-[5px] rounded-full bg-white" />
                  </span>
                )}
              </span>
            </div>
            <div className="min-w-0 flex-1 text-left">
              <p className="truncate text-[12px] font-semibold leading-tight text-[var(--foreground)]">{user.displayName}</p>
              <p className="truncate text-[10px] text-[var(--muted)]/60">
                {user.customStatus ? user.customStatus : (t.status[user.status] ?? t.status.offline)}
              </p>
            </div>
          </div>
        </Dropdown.Trigger>
        <Dropdown.Popover className="min-w-52">
          <Dropdown.Menu
            onAction={(key) => {
              if (['online', 'idle', 'dnd', 'invisible'].includes(key as string)) {
                handleStatusChange(key as 'online' | 'idle' | 'dnd' | 'invisible');
              } else if (key === 'edit-custom-status') {
                // Dropdown closes first (by HeroUI default), then we open the modal
                setTimeout(() => setEditingCustomStatus(true), 0);
              } else if (key === 'clear-custom-status') {
                socketService.updatePresence(
                  user.status === 'offline' ? 'online' : (user.status as 'online' | 'idle' | 'dnd' | 'invisible'),
                  null,
                );
                updateUser({ customStatus: null });
                setCustomStatusDraft('');
              }
            }}
          >
            <Dropdown.Item id="user-info" textValue="Info" className="pointer-events-none">
              <div>
                <p className="text-[13px] font-semibold">{user.displayName}</p>
                <p className="text-[11px] text-[var(--muted)]">@{user.username}</p>
              </div>
            </Dropdown.Item>

            {/* Statut personnalisé */}
            <Dropdown.Item id="edit-custom-status" textValue="Statut personnalisé">
              <div className="flex w-full items-center gap-2">
                <PencilIcon size={13} className="shrink-0 text-[var(--muted)]" />
                <span className="flex-1 truncate text-[13px] text-[var(--muted)]">
                  {user.customStatus || 'Définir un statut...'}
                </span>
              </div>
            </Dropdown.Item>

            {/* Effacer le statut personnalisé */}
            {user.customStatus && (
              <Dropdown.Item id="clear-custom-status" textValue="Effacer le statut">
                <span className="text-[13px] text-red-400">Effacer le statut</span>
              </Dropdown.Item>
            )}

            {/* Statuts disponibles */}
            {(['online', 'idle', 'dnd', 'invisible'] as const).map((s) => {
              const cfg = statusConfig[s];
              const isActive = user.status === s;
              return (
                <Dropdown.Item key={s} id={s} textValue={t.status[s]}>
                  <div className={`size-2.5 rounded-full ${cfg.color}`} />
                  <span className="flex-1 text-[13px]">{t.status[s]}</span>
                  {isActive && <CheckIcon size={14} className="text-[var(--accent)]" />}
                </Dropdown.Item>
              );
            })}
          </Dropdown.Menu>
        </Dropdown.Popover>
      </Dropdown>
      </div>

      {/* Modal statut personnalisé — ouvert séparément pour ne pas fermer le dropdown avant validation */}
      <Modal isOpen={editingCustomStatus} onOpenChange={(open) => { if (!open) setEditingCustomStatus(false); }}>
        <Modal.Backdrop isDismissable>
          <Modal.Container size="sm">
            <Modal.Dialog>
              <Modal.Header>Définir un statut personnalisé</Modal.Header>
              <Modal.Body>
                <InputGroup>
                  <InputGroup.Input
                    ref={customStatusInputRef}
                    value={customStatusDraft}
                    onChange={(e) => setCustomStatusDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveCustomStatus();
                      if (e.key === 'Escape') setEditingCustomStatus(false);
                    }}
                    maxLength={100}
                    placeholder="Définir un statut..."
                    autoFocus
                  />
                </InputGroup>
              </Modal.Body>
              <Modal.Footer>
                <Button variant="ghost" onPress={() => setEditingCustomStatus(false)}>Annuler</Button>
                <Button onPress={saveCustomStatus}>Enregistrer</Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>

      {/* Audio controls + settings */}
      <div className="flex shrink-0 items-center gap-0.5">
        <Tooltip delay={0}>
          <Button
            isIconOnly size="sm" variant="tertiary"
            className={`size-7 rounded-xl transition-colors ${isMuted ? 'text-red-400 hover:text-red-300' : 'text-[var(--muted)]/60 hover:text-[var(--foreground)]'}`}
            onPress={() => setIsMuted(v => !v)}
          >
            {isMuted ? <MicOffIcon size={14} /> : <MicIcon size={14} />}
          </Button>
          <Tooltip.Content placement="top">{isMuted ? 'Réactiver le micro' : 'Couper le micro'}</Tooltip.Content>
        </Tooltip>
        <Tooltip delay={0}>
          <Button
            isIconOnly size="sm" variant="tertiary"
            className={`size-7 rounded-xl transition-colors ${isDeafened ? 'text-red-400 hover:text-red-300' : 'text-[var(--muted)]/60 hover:text-[var(--foreground)]'}`}
            onPress={() => setIsDeafened(v => !v)}
          >
            <HeadphonesIcon size={14} />
          </Button>
          <Tooltip.Content placement="top">{isDeafened ? 'Réactiver le son' : 'Se mettre en sourdine'}</Tooltip.Content>
        </Tooltip>
        <Tooltip delay={0}>
          <Button
            data-tour="user-settings"
            isIconOnly size="sm" variant="tertiary"
            className="size-7 rounded-xl text-[var(--muted)]/60 hover:text-[var(--foreground)]"
            onPress={() => setShowSettings(true)}
          >
            <SettingsIcon size={15} />
          </Button>
          <Tooltip.Content placement="top">{t.userPanel.settings}</Tooltip.Content>
        </Tooltip>
      </div>

      <SettingsDialog open={showSettings} onOpenChange={setShowSettings} />
    </div>
  );
}
