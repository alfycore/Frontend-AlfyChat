'use client';

import { Label, Radio, RadioGroup, Switch } from '@heroui/react';
import { PanelLeft, PanelRight } from 'lucide-react';

import { PanelHeader } from '@/components/alfy/settings/settings-shell';
import { SettingsContent, SettingsRow, SettingsSection } from '@/components/alfy/settings/section';
import { useLayoutPrefs } from '@/hooks/use-layout-prefs';

export function LayoutPanel() {
  const { prefs, updatePrefs } = useLayoutPrefs();
  return (
    <div>
      <PanelHeader title="Mise en page" description="Disposition et densité de l'interface." />

      <SettingsSection title="Barre de serveurs">
        <SettingsContent>
          <RadioGroup
            value={prefs.serverListPosition}
            onChange={(v) => updatePrefs({ serverListPosition: v as 'left' | 'right' })}
            aria-label="Position de la barre"
            className="grid gap-3 sm:grid-cols-2"
          >
            <Radio value="left" className="overflow-hidden rounded-lg border border-border p-0 data-selected:border-accent">
              <Radio.Content className="flex-col items-stretch gap-0">
                <span className="flex h-16 items-center justify-start gap-1 bg-surface-secondary px-3">
                  <PanelLeft className="size-5 text-accent" aria-hidden />
                  <span className="h-8 flex-1 rounded bg-surface" />
                </span>
                <span className="flex items-center gap-2 p-3">
                  <Radio.Control>
                    <Radio.Indicator />
                  </Radio.Control>
                  <Label>À gauche</Label>
                </span>
              </Radio.Content>
            </Radio>
            <Radio value="right" className="overflow-hidden rounded-lg border border-border p-0 data-selected:border-accent">
              <Radio.Content className="flex-col items-stretch gap-0">
                <span className="flex h-16 items-center justify-end gap-1 bg-surface-secondary px-3">
                  <span className="h-8 flex-1 rounded bg-surface" />
                  <PanelRight className="size-5 text-accent" aria-hidden />
                </span>
                <span className="flex items-center gap-2 p-3">
                  <Radio.Control>
                    <Radio.Indicator />
                  </Radio.Control>
                  <Label>À droite</Label>
                </span>
              </Radio.Content>
            </Radio>
          </RadioGroup>
        </SettingsContent>
      </SettingsSection>

      <SettingsSection title="Densité">
        <SettingsRow label="Mode compact" description="Réduit l'espacement des messages pour en afficher plus.">
          <Switch
            aria-label="Mode compact"
            isSelected={prefs.density === 'compact'}
            onChange={(v) => updatePrefs({ density: v ? 'compact' : 'default', compactServerList: v })}
          >
            <Switch.Content>
              <Switch.Control>
                <Switch.Thumb />
              </Switch.Control>
            </Switch.Content>
          </Switch>
        </SettingsRow>
      </SettingsSection>
    </div>
  );
}
