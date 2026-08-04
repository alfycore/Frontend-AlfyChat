'use client';

import { Label, Radio, RadioGroup, Spinner, Switch, toast } from '@heroui/react';
import { useEffect, useState } from 'react';

import { api } from '@/lib/api';
import { PanelHeader } from '@/components/alfy/settings/settings-shell';
import { SettingsContent, SettingsRow, SettingsSection } from '@/components/alfy/settings/section';

type VerificationLevel = 'none' | 'low' | 'medium' | 'high';

const LEVELS: { value: VerificationLevel; label: string; description: string }[] = [
  { value: 'none', label: 'Aucune', description: 'Pas de restriction à l’arrivée.' },
  { value: 'low', label: 'Faible', description: 'Email vérifié requis.' },
  { value: 'medium', label: 'Moyenne', description: 'Compte créé depuis plus de 5 minutes.' },
  { value: 'high', label: 'Élevée', description: 'Membre du serveur depuis plus de 10 minutes avant de pouvoir écrire.' },
];

/** Réglages de sécurité du serveur (Type 1 comme auto-hébergé). */
export function ServerSecurityPanel({
  serverId,
  onSave,
}: {
  serverId: string;
  onSave: (data: { verificationLevel?: VerificationLevel; require2faModeration?: boolean; restrictEmojiUsage?: boolean }) => Promise<boolean> | void;
}) {
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
    if (ok === false) toast.danger('Enregistrement impossible');
  };

  const changer2fa = async (v: boolean) => {
    setRequire2fa(v);
    setSaving(true);
    const ok = await onSave({ require2faModeration: v });
    setSaving(false);
    if (ok === false) toast.danger('Enregistrement impossible');
  };

  const changerRestrictionEmoji = async (v: boolean) => {
    setRestrictEmoji(v);
    setSaving(true);
    const ok = await onSave({ restrictEmojiUsage: v });
    setSaving(false);
    if (ok === false) toast.danger('Enregistrement impossible');
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
      <PanelHeader title="Sécurité" description="Restreint l'accès et exige des garanties supplémentaires pour modérer." />

      <SettingsSection title="Niveau de vérification" description="S'applique aux nouveaux membres qui rejoignent le serveur.">
        <SettingsContent>
          <RadioGroup value={level} onChange={(v) => void changerNiveau(v as VerificationLevel)} aria-label="Niveau de vérification" className="flex flex-col gap-2">
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

      <SettingsSection title="Modération">
        <SettingsRow
          label="Double authentification exigée"
          description="Les modérateurs doivent avoir activé le 2FA sur leur compte pour expulser ou bannir."
        >
          <Switch isSelected={require2fa} isDisabled={saving} onChange={(v) => void changer2fa(v)} aria-label="Double authentification exigée">
            <Switch.Content>
              <Switch.Control>
                <Switch.Thumb />
              </Switch.Control>
            </Switch.Content>
          </Switch>
        </SettingsRow>
      </SettingsSection>

      <SettingsSection title="Émoji">
        <SettingsRow
          label="Réserver les émoji de ce serveur"
          description="Sinon, les émoji personnalisés de ce serveur sont utilisables par ses membres dans n'importe quelle conversation (MP, groupes, autres serveurs)."
        >
          <Switch isSelected={restrictEmoji} isDisabled={saving} onChange={(v) => void changerRestrictionEmoji(v)} aria-label="Réserver les émoji de ce serveur">
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
