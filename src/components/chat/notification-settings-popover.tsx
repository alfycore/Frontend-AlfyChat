'use client';

import { useCallback, useState } from 'react';
import { BellIcon, BellOffIcon, AtSignIcon } from '@/components/icons';
import {
  ContextMenuSub,
  ContextMenuSubTrigger,
  ContextMenuSubContent,
  ContextMenuRadioGroup,
  ContextMenuRadioItem,
} from '@/components/ui/context-menu';
import { api } from '@/lib/api';
import {
  setChannelSetting,
  removeChannelSetting,
  getLevel,
  type NotifLevel,
} from '@/lib/notification-store';

interface Props {
  targetId: string;
  targetType: 'channel' | 'dm' | 'group' | 'server';
  label?: string;
}

const LEVELS: { value: NotifLevel; label: string }[] = [
  { value: 'all',      label: 'Tous les messages' },
  { value: 'mentions', label: 'Mentions seulement' },
  { value: 'nothing',  label: 'Muet' },
];

function levelIcon(level: NotifLevel) {
  if (level === 'nothing')  return <BellOffIcon size={13} className="shrink-0 opacity-60" />;
  if (level === 'mentions') return <AtSignIcon  size={13} className="shrink-0 opacity-60" />;
  return <BellIcon size={13} className="shrink-0 opacity-60" />;
}

/**
 * Sous-menu "Notifications" pour les ContextMenu (canaux, DMs, groupes).
 * Place this component inside a <ContextMenuContent>.
 */
export function NotificationSettingsItem({ targetId, targetType, label = 'Notifications' }: Props) {
  const [current, setCurrent] = useState<NotifLevel>(() => getLevel(targetId));

  const handleChange = useCallback(async (value: string) => {
    const level = value as NotifLevel;
    const previous = current;
    setCurrent(level);
    if (level === 'all') removeChannelSetting(targetId);
    else setChannelSetting(targetId, level);

    try {
      if (level === 'all') await api.deleteChannelNotifSetting(targetId);
      else await api.setChannelNotifSetting(targetId, level, targetType);
    } catch {
      setCurrent(previous);
      if (previous === 'all') removeChannelSetting(targetId);
      else setChannelSetting(targetId, previous);
    }
  }, [current, targetId, targetType]);

  return (
    <ContextMenuSub>
      <ContextMenuSubTrigger className="flex items-center gap-2">
        {levelIcon(current)}
        <span>{label}</span>
      </ContextMenuSubTrigger>
      <ContextMenuSubContent className="min-w-44">
        <ContextMenuRadioGroup value={current} onValueChange={handleChange}>
          {LEVELS.map(({ value, label: lbl }) => (
            <ContextMenuRadioItem key={value} value={value}>
              {lbl}
            </ContextMenuRadioItem>
          ))}
        </ContextMenuRadioGroup>
      </ContextMenuSubContent>
    </ContextMenuSub>
  );
}
