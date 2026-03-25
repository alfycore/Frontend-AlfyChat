'use client';

import { useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { MicIcon, MicOffIcon, Volume2Icon, VolumeXIcon, SettingsIcon, CheckIcon } from '@/components/icons';
import { useAuth } from '@/hooks/use-auth';
import { useTranslation } from '@/components/locale-provider';
import {
  Avatar, Button, Dropdown, Separator, Tooltip,
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
}

interface UserPanelProps {
  user: User;
}

const statusConfig: Record<string, { color: string; label?: string }> = {
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

  const status = statusConfig[user.status] ?? statusConfig.offline;

  const handleStatusChange = (s: 'online' | 'idle' | 'dnd' | 'invisible') => {
    socketService.updatePresence(s);
    updateUser({ status: s });
  };

  return (
    <div className="flex h-[52px] shrink-0 items-center gap-1 overflow-hidden border-t border-[var(--border)]/30 bg-[var(--background)]/80 px-1.5 backdrop-blur-xl md:gap-1 md:px-2">
      {/* Avatar + user info */}
      <div className="min-w-0 flex-1">
      <Dropdown>
        <Dropdown.Trigger>
          <div className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-lg px-1.5 py-1 transition-colors duration-150 hover:bg-[var(--surface-secondary)]/30">
            <div className="relative shrink-0">
              <Avatar size="sm" className="size-8">
                <Avatar.Image src={resolveMediaUrl(user.avatarUrl)} alt={user.displayName} />
                <Avatar.Fallback className="bg-[var(--accent)] text-[var(--accent-foreground)] text-[11px] font-semibold">
                  {user.displayName?.[0]?.toUpperCase()}
                </Avatar.Fallback>
              </Avatar>
              <span className={`absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full ring-[1.5px] ring-[var(--background)] ${status.color}`} />
            </div>
            <div className="min-w-0 flex-1 text-left">
              <p className="truncate text-[12px] font-semibold leading-tight text-[var(--foreground)]">{user.displayName}</p>
              <p className="truncate text-[10px] text-[var(--muted)]/60">{t.status[user.status] ?? t.status.offline}</p>
            </div>
          </div>
        </Dropdown.Trigger>
        <Dropdown.Popover className="min-w-48">
          <Dropdown.Menu
            onAction={(key) => {
              if (['online', 'idle', 'dnd', 'invisible'].includes(key as string)) {
                handleStatusChange(key as 'online' | 'idle' | 'dnd' | 'invisible');
              }
            }}
          >
              <Dropdown.Item id="user-info" textValue="Info" className="pointer-events-none">
                <div>
                  <p className="text-[13px] font-semibold">{user.displayName}</p>
                  <p className="text-[11px] text-[var(--muted)]">@{user.username}</p>
                </div>
              </Dropdown.Item>
              {(['online', 'idle', 'dnd', 'invisible'] as const).map((s) => {
                const cfg = statusConfig[s];
                const isActive = user.status === s;
                return (
                    <Dropdown.Item key={s} id={s} textValue={t.status[s]}>
                    <div className={`size-2.5 rounded-full ${cfg.color}`} />
                    <span className="flex-1 text-[13px]">{t.status[s]}</span>
                    {isActive && <HugeiconsIcon icon={CheckIcon} size={14} className="text-[var(--accent)]" />}
                  </Dropdown.Item>
                );
              })}
          </Dropdown.Menu>
        </Dropdown.Popover>
      </Dropdown>
      </div>

      {/* Audio controls */}
      <div className="flex shrink-0 items-center">


        <Tooltip delay={0}>
            <Button
              data-tour="user-settings"
              isIconOnly
              size="sm"
              variant="tertiary"
              className="size-7 rounded-md text-[var(--muted)]/60 hover:text-[var(--foreground)]"
              onPress={() => setShowSettings(true)}
            >
              <HugeiconsIcon icon={SettingsIcon} size={15} />
            </Button>
            <Tooltip.Content placement="top">{t.userPanel.settings}</Tooltip.Content>
        </Tooltip>
      </div>

      <SettingsDialog open={showSettings} onOpenChange={setShowSettings} />
    </div>
  );
}
