'use client';

import { Label, ListBox, Popover, Separator, Switch, Tooltip } from '@heroui/react';
import { Bell, BellOff, BellRing, Volume2 } from 'lucide-react';
import { useRef, useState } from 'react';

import { api } from '@/lib/api';
import { getLevel, removeChannelSetting, setChannelSetting, type NotifLevel } from '@/lib/notification-store';
import { useTranslation } from '@/components/locale-provider';

interface ChannelNotifSettingsProps {
  channelId: string;
  channelName: string;
  targetType?: 'channel' | 'dm' | 'group' | 'server';
}

/** Réglages de notification pour le salon courant. */
export function ChannelNotifSettings({ channelId, channelName, targetType = 'channel' }: ChannelNotifSettingsProps) {
  const { t, tx } = useTranslation();
  const OPTIONS: { id: NotifLevel; label: string; icon: typeof Bell; desc: string }[] = [
    { id: 'all', label: t.admin.notifications.levelAllLabel, icon: BellRing, desc: t.admin.notifications.levelAllDesc },
    { id: 'mentions', label: t.admin.notifications.levelMentionsLabel, icon: Bell, desc: t.admin.notifications.levelMentionsDesc },
    { id: 'nothing', label: t.admin.notifications.levelNothingLabel, icon: BellOff, desc: t.admin.notifications.levelNothingDesc },
  ];
  const [level, setLevel] = useState<NotifLevel>(() => getLevel(channelId));
  const previousLevelRef = useRef<NotifLevel>('all');

  const persist = (next: NotifLevel) => {
    setLevel(next);
    setChannelSetting(channelId, next);
    if (next === 'all') {
      removeChannelSetting(channelId);
      api.deleteChannelNotifSetting(channelId).catch(() => {});
    } else {
      api.setChannelNotifSetting(channelId, next, targetType).catch(() => {});
    }
  };

  const muted = level === 'nothing';

  return (
    <Popover>
      <Tooltip delay={300}>
        <Popover.Trigger
          aria-label={t.admin.notifications.ariaChannelSettings}
          className="flex size-8 cursor-pointer items-center justify-center rounded-md text-muted outline-none transition-colors hover:bg-surface-secondary hover:text-foreground focus-visible:ring-2 focus-visible:ring-focus"
        >
          {muted ? <BellOff className="size-4.5" /> : <Bell className="size-4.5" />}
        </Popover.Trigger>
        <Tooltip.Content>
          <p>{t.admin.notifications.tooltipChannelNotifications}</p>
        </Tooltip.Content>
      </Tooltip>
      <Popover.Content className="w-64">
        <Popover.Dialog aria-label={tx(t.admin.notifications.dialogAriaFor, { channel: channelName })} className="flex flex-col gap-2">
          <p className="text-[11px] font-semibold tracking-wider text-muted uppercase">
            {tx(t.admin.notifications.headerChannel, { channel: channelName })}
          </p>
          <Switch
            isSelected={muted}
            onChange={(v) => {
              if (v) { previousLevelRef.current = level; persist('nothing'); }
              else { persist(previousLevelRef.current === 'nothing' ? 'all' : previousLevelRef.current); }
            }}
          >
            <Switch.Content className="flex w-full items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-sm">
                <Volume2 className="size-4 text-muted" aria-hidden />
                {t.admin.notifications.mute}
              </span>
              <Switch.Control>
                <Switch.Thumb />
              </Switch.Control>
            </Switch.Content>
          </Switch>
          <Separator />
          <ListBox
            aria-label={t.admin.notifications.ariaLevel}
            selectionMode="single"
            disallowEmptySelection
            selectedKeys={[level]}
            onSelectionChange={(keys) => {
              const id = [...keys][0];
              if (id) persist(String(id) as NotifLevel);
            }}
          >
            {OPTIONS.map((o) => (
              <ListBox.Item key={o.id} id={o.id} textValue={o.label}>
                <o.icon className="size-4 shrink-0 text-muted" aria-hidden />
                <span className="flex flex-col">
                  <Label>{o.label}</Label>
                  <span className="text-[11px] text-muted">{o.desc}</span>
                </span>
                <ListBox.ItemIndicator />
              </ListBox.Item>
            ))}
          </ListBox>
        </Popover.Dialog>
      </Popover.Content>
    </Popover>
  );
}
