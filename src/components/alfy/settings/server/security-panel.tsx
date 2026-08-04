'use client';

import { Label, Radio, RadioGroup, Spinner, Switch, toast } from '@heroui/react';
import { useEffect, useState } from 'react';

import { api } from '@/lib/api';
import { PanelHeader } from '@/components/alfy/settings/settings-shell';
import { SettingsContent, SettingsRow, SettingsSection } from '@/components/alfy/settings/section';
import { useTranslation } from '@/components/locale-provider';

type VerificationLevel = 'none' | 'low' | 'medium' | 'high';

/** Réglages de sécurité du serveur (Type 1 comme auto-hébergé). */
export function ServerSecurityPanel({
  serverId,
  onSave,
}: {
  serverId: string;
  onSave: (data: { verificationLevel?: VerificationLevel; require2faModeration?: boolean; restrictEmojiUsage?: boolean }) => Promise<boolean> | void;
}) {
  const { t } = useTranslation();
  const LEVELS: { value: VerificationLevel; label: string; description: string }[] = [
    { value: 'none', label: t.securityPanel.levelNone, description: t.securityPanel.levelNoneDesc },
    { value: 'low', label: t.securityPanel.levelLow, description: t.securityPanel.levelLowDesc },
    { value: 'medium', label: t.securityPanel.levelMedium, description: t.securityPanel.levelMediumDesc },
    { value: 'high', label: t.securityPanel.levelHigh, description: t.securityPanel.levelHighDesc },
  ];
  const [level, setLevel] = useState<VerificationLevel>('none');
  const [require2fa, setRequire2fa] = useState(false);
  const [restrictEmoji, setRestrictEmoji] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.getServerSecurity(serverId).then((res) => {
      if (res.success && res.data) {
        setLevel(res.data.verificationLevel);
        setRequire2fa(res.data.require2faModeration);
        setRestrictEmoji(res.data.restrictEmojiUsage);
      }
      setLoaded(true);
    });
  }, [serverId]);

  const changerNiveau = async (v: VerificationLevel) => {
    setLevel(v);
    setSaving(true);
    const ok = await onSave({ verificationLevel: v });
    setSaving(false);
    if (ok === false) toast.danger(t.securityPanel.saveError);
  };

  const changer2fa = async (v: boolean) => {
    setRequire2fa(v);
    setSaving(true);
    const ok = await onSave({ require2faModeration: v });
    setSaving(false);
    if (ok === false) toast.danger(t.securityPanel.saveError);
  };

  const changerRestrictionEmoji = async (v: boolean) => {
    setRestrictEmoji(v);
    setSaving(true);
    const ok = await onSave({ restrictEmojiUsage: v });
    setSaving(false);
    if (ok === false) toast.danger(t.securityPanel.saveError);
  };

  if (!loaded) {
    return (
      <div className="flex justify-center p-12">
        <Spinner size="sm" />
      </div>
    );
  }

  return (
    <div>
      <PanelHeader title={t.securityPanel.panelTitle} description={t.securityPanel.panelDescription} />

      <SettingsSection title={t.securityPanel.verificationLevel} description={t.securityPanel.verificationLevelDesc}>
        <SettingsContent>
          <RadioGroup value={level} onChange={(v) => void changerNiveau(v as VerificationLevel)} aria-label={t.securityPanel.verificationLevel} className="flex flex-col gap-2">
            {LEVELS.map((l) => (
              <Radio key={l.value} value={l.value} isDisabled={saving}>
                <Radio.Content className="items-start gap-3 rounded-lg border border-border p-3 data-selected:border-accent data-disabled:opacity-60">
                  <Radio.Control className="mt-0.5">
                    <Radio.Indicator />
                  </Radio.Control>
                  <span className="flex flex-col gap-0.5">
                    <Label>{l.label}</Label>
                    <span className="text-xs text-muted">{l.description}</span>
                  </span>
                </Radio.Content>
              </Radio>
            ))}
          </RadioGroup>
        </SettingsContent>
      </SettingsSection>

      <SettingsSection title={t.securityPanel.moderation}>
        <SettingsRow
          label={t.securityPanel.require2fa}
          description={t.securityPanel.require2faDesc}
        >
          <Switch isSelected={require2fa} isDisabled={saving} onChange={(v) => void changer2fa(v)} aria-label={t.securityPanel.require2fa}>
            <Switch.Content>
              <Switch.Control>
                <Switch.Thumb />
              </Switch.Control>
            </Switch.Content>
          </Switch>
        </SettingsRow>
      </SettingsSection>

      <SettingsSection title={t.securityPanel.emoji}>
        <SettingsRow
          label={t.securityPanel.restrictEmoji}
          description={t.securityPanel.restrictEmojiDesc}
        >
          <Switch isSelected={restrictEmoji} isDisabled={saving} onChange={(v) => void changerRestrictionEmoji(v)} aria-label={t.securityPanel.restrictEmoji}>
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
