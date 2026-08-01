'use client';

import { useEffect, useState } from 'react';
import { Switch } from '@heroui/react';

import { api } from '@/lib/api';
import { useAuth } from '@/hooks/use-auth';
import { PanelHeader } from '@/components/alfy/settings/settings-shell';
import { SettingsRow, SettingsSection } from '@/components/alfy/settings/section';

function SwitchControl({ label, isSelected, onChange }: { label: string; isSelected: boolean; onChange: (v: boolean) => void }) {
  return (
    <Switch isSelected={isSelected} onChange={onChange} aria-label={label}>
      <Switch.Content>
        <Switch.Control>
          <Switch.Thumb />
        </Switch.Control>
      </Switch.Content>
    </Switch>
  );
}

export function NotificationsPanel() {
  const { user } = useAuth();
  const [desktop, setDesktop] = useState(true);
  const [sound, setSound] = useState(true);
  const [dm, setDm] = useState(true);
  const [mentions, setMentions] = useState(true);
  const [dnd, setDnd] = useState(false);
  const [quietStart, setQuietStart] = useState('');
  const [quietEnd, setQuietEnd] = useState('');

  useEffect(() => {
    if (!user?.id) return;
    api.getPreferences(user.id).then((res: any) => {
      if (res?.success && res?.data) {
        const p = res.data;
        if (p.notificationsDesktop !== undefined) setDesktop(p.notificationsDesktop);
        if (p.notificationsSound !== undefined) setSound(p.notificationsSound);
        if (p.notificationsDm !== undefined) setDm(p.notificationsDm);
        if (p.notificationsMentions !== undefined) setMentions(p.notificationsMentions);
        if (p.dndEnabled !== undefined) setDnd(p.dndEnabled);
        if (p.quietStart) setQuietStart(p.quietStart);
        if (p.quietEnd) setQuietEnd(p.quietEnd);
      }
    }).catch(() => {});
  }, [user?.id]);

  const save = (updates: Record<string, unknown>) => {
    if (user?.id) api.updatePreferences(user.id, updates).catch(() => {});
  };

  return (
    <div>
      <PanelHeader title="Notifications" description="Ce qui vous est signalé, et comment." />

      <SettingsSection title="Général">
        <SettingsRow label="Notifications sur le bureau" description="Afficher une notification système.">
          <SwitchControl label="Notifications sur le bureau" isSelected={desktop} onChange={(v) => { setDesktop(v); save({ notificationsDesktop: v }); }} />
        </SettingsRow>
        <SettingsRow label="Sons" description="Jouer un son à la réception.">
          <SwitchControl label="Sons" isSelected={sound} onChange={(v) => { setSound(v); save({ notificationsSound: v }); }} />
        </SettingsRow>
      </SettingsSection>

      <SettingsSection title="Déclencheurs">
        <SettingsRow label="Messages privés" description="Toujours notifier les DM et groupes.">
          <SwitchControl label="Messages privés" isSelected={dm} onChange={(v) => { setDm(v); save({ notificationsDm: v }); }} />
        </SettingsRow>
        <SettingsRow label="Mentions" description="@vous, @rôle et @everyone.">
          <SwitchControl label="Mentions" isSelected={mentions} onChange={(v) => { setMentions(v); save({ notificationsMentions: v }); }} />
        </SettingsRow>
      </SettingsSection>

      <SettingsSection title="Ne pas déranger">
        <SettingsRow label="Mode ne pas déranger" description="Coupe les notifications immédiatement (les mentions passent quand même).">
          <SwitchControl label="Mode ne pas déranger" isSelected={dnd} onChange={(v) => { setDnd(v); save({ dndEnabled: v }); }} />
        </SettingsRow>
        <div className="px-3 pb-3">
          <p className="mb-2 text-xs text-muted">Plage horaire de silence quotidienne</p>
          <div className="flex items-center gap-3 text-xs">
            <label className="flex items-center gap-1.5">
              De
              <input
                type="time"
                value={quietStart}
                onChange={(e) => setQuietStart(e.target.value)}
                onBlur={() => save({ quietStart: quietStart || null })}
                className="rounded-md border border-border bg-surface px-2 py-1 text-xs text-foreground outline-none focus:border-accent"
              />
            </label>
            <label className="flex items-center gap-1.5">
              à
              <input
                type="time"
                value={quietEnd}
                onChange={(e) => setQuietEnd(e.target.value)}
                onBlur={() => save({ quietEnd: quietEnd || null })}
                className="rounded-md border border-border bg-surface px-2 py-1 text-xs text-foreground outline-none focus:border-accent"
              />
            </label>
            {(quietStart || quietEnd) && (
              <button
                type="button"
                className="text-muted hover:text-foreground"
                onClick={() => { setQuietStart(''); setQuietEnd(''); save({ quietStart: null, quietEnd: null }); }}
              >
                Effacer
              </button>
            )}
          </div>
        </div>
      </SettingsSection>
    </div>
  );
}
