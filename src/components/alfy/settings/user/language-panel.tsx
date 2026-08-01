'use client';

import { Label, Radio, RadioGroup } from '@heroui/react';

import { useLocale } from '@/components/locale-provider';
import { LOCALES } from '@/i18n';
import { PanelHeader } from '@/components/alfy/settings/settings-shell';
import { SettingsContent, SettingsSection } from '@/components/alfy/settings/section';

export function LanguagePanel() {
  const { locale, setLocale } = useLocale();
  return (
    <div>
      <PanelHeader title="Langue" description="La langue de l'interface. 12 langues disponibles." />
      <SettingsSection title="Langue de l'interface">
        <SettingsContent>
          <RadioGroup value={locale} onChange={(v) => setLocale(v as typeof locale)} aria-label="Langue" className="grid gap-1 sm:grid-cols-2">
            {LOCALES.map((l) => (
              <Radio key={l.value} value={l.value} className="w-full">
                <Radio.Content className="w-full rounded-md p-2.5 hover:bg-surface-secondary">
                  <Radio.Control>
                    <Radio.Indicator />
                  </Radio.Control>
                  <span className="flex items-center gap-2">
                    <span aria-hidden>{l.flag}</span>
                    <Label>{l.label}</Label>
                  </span>
                </Radio.Content>
              </Radio>
            ))}
          </RadioGroup>
        </SettingsContent>
      </SettingsSection>
    </div>
  );
}
