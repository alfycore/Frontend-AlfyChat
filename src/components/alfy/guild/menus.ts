'use client';

/**
 * Sous-menus communs aux menus contextuels (serveur, catégorie, salon) :
 * mise en sourdine avec durée et niveau de notification, comme Discord.
 */

import { Bell, BellOff, Clock } from 'lucide-react';
import { useCallback } from 'react';

import * as notif from '@/lib/notification-store';
import { useTranslation } from '@/components/locale-provider';
import type { MenuSubmenu } from '@/components/alfy/guild/context-menu';

const MINUTE = 60_000;

export function useMuteSubmenu() {
  const { t } = useTranslation();
  return useCallback(
    (id: string, label: string, onMute: (until: number) => void): MenuSubmenu => {
      const at = (ms: number) => () => onMute(Date.now() + ms);
      return {
        kind: 'submenu',
        id,
        label,
        icon: BellOff,
        sections: [
          {
            id: `${id}-durations`,
            items: [
              { id: `${id}-15m`, label: t.guild.mute.m15, icon: Clock, onAction: at(15 * MINUTE) },
              { id: `${id}-1h`, label: t.guild.mute.h1, icon: Clock, onAction: at(60 * MINUTE) },
              { id: `${id}-3h`, label: t.guild.mute.h3, icon: Clock, onAction: at(180 * MINUTE) },
              { id: `${id}-8h`, label: t.guild.mute.h8, icon: Clock, onAction: at(480 * MINUTE) },
              { id: `${id}-24h`, label: t.guild.mute.h24, icon: Clock, onAction: at(1440 * MINUTE) },
              { id: `${id}-forever`, label: t.guild.mute.forever, icon: BellOff, onAction: () => onMute(0) },
            ],
          },
        ],
      };
    },
    [t],
  );
}

export function useNotifSubmenu() {
  const { t } = useTranslation();
  return useCallback(
    (
      id: string,
      targetId: string,
      _targetType: 'server' | 'channel',
      onLevel: (level: notif.NotifLevel) => void,
      inheritLabel?: string,
    ): MenuSubmenu => {
      const level = notif.getLevel(targetId);
      const check = (l: notif.NotifLevel, label: string) => ({
        kind: 'check' as const,
        id: `${id}-${l}`,
        label,
        checked: level === l,
        onToggle: () => onLevel(l),
      });
      return {
        kind: 'submenu',
        id,
        label: t.guild.menu.notificationSettings,
        description: inheritLabel,
        icon: Bell,
        sections: [
          {
            id: `${id}-levels`,
            items: [
              check('all', t.guild.notif.all),
              check('mentions', t.guild.notif.mentions),
              check('nothing', t.guild.notif.nothing),
            ],
          },
        ],
      };
    },
    [t],
  );
}
