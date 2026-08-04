'use client';

import { useEffect, useState } from 'react';
import { Label, ListBox, Radio, RadioGroup, Select, Slider, Switch } from '@heroui/react';

import { api } from '@/lib/api';
import { useAuth } from '@/hooks/use-auth';
import { getAudioPreferences, setAudioPreferences, type AudioPreferences } from '@/hooks/use-call';
import { PanelHeader } from '@/components/alfy/settings/settings-shell';
import { SettingsContent, SettingsRow, SettingsSection } from '@/components/alfy/settings/section';
import { useTranslation } from '@/components/locale-provider';

interface DeviceOption {
  deviceId: string;
  label: string;
}

function DeviceSelect({
  label,
  options,
  selectedKey,
  onChange,
}: {
  label: string;
  options: DeviceOption[];
  selectedKey: string;
  onChange: (id: string) => void;
}) {
  return (
    <Select className="max-w-sm" selectedKey={selectedKey} onSelectionChange={(k) => onChange(String(k))} aria-label={label}>
      <Label>{label}</Label>
      <Select.Trigger>
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover>
        <ListBox>
          {options.map((o) => (
            <ListBox.Item key={o.deviceId} id={o.deviceId} textValue={o.label}>
              {o.label}
              <ListBox.ItemIndicator />
            </ListBox.Item>
          ))}
        </ListBox>
      </Select.Popover>
    </Select>
  );
}

const MIC_MODES = [
  { value: 'vad', label: 'Activité vocale', desc: 'Déclenché automatiquement par votre voix.' },
  { value: 'ptt', label: 'Push-to-talk', desc: 'Maintenez une touche pour parler.' },
  { value: 'always', label: 'Toujours ouvert', desc: 'Microphone constamment actif.' },
];

export function VoicePanel() {
  const { user } = useAuth();
  const [prefs, setPrefs] = useState<AudioPreferences>(() => getAudioPreferences());
  const [inputs, setInputs] = useState<DeviceOption[]>([{ deviceId: 'default', label: 'Micro par défaut' }]);
  const [outputs, setOutputs] = useState<DeviceOption[]>([{ deviceId: 'default', label: 'Sortie par défaut' }]);
  const [micMode, setMicMode] = useState('vad');

  useEffect(() => {
    if (user?.id) {
      api.getPreferences(user.id).then((res: any) => {
        if (res?.success && res?.data?.micMode) setMicMode(res.data.micMode);
      }).catch(() => {});
    }

    let cancelled = false;
    (async () => {
      try {
        // Demande l'accès micro brièvement pour révéler les labels des périphériques
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((t) => t.stop());
      } catch { /* accès refusé — on affichera les IDs génériques */ }
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        if (cancelled) return;
        const ins = devices.filter((d) => d.kind === 'audioinput').map((d, i) => ({ deviceId: d.deviceId, label: d.label || `Microphone ${i + 1}` }));
        const outs = devices.filter((d) => d.kind === 'audiooutput').map((d, i) => ({ deviceId: d.deviceId, label: d.label || `Sortie ${i + 1}` }));
        setInputs([{ deviceId: 'default', label: 'Micro par défaut' }, ...ins.filter((d) => d.deviceId && d.deviceId !== 'default')]);
        setOutputs([{ deviceId: 'default', label: 'Sortie par défaut' }, ...outs.filter((d) => d.deviceId && d.deviceId !== 'default')]);
      } catch { /* enumerateDevices indisponible */ }
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  const update = (patch: Partial<AudioPreferences>) => {
    setPrefs((p) => ({ ...p, ...patch }));
    setAudioPreferences(patch);
  };

  const handleMicMode = (v: string) => {
    setMicMode(v);
    if (user?.id) api.updatePreferences(user.id, { micMode: v }).catch(() => {});
  };

  return (
    <div>
      <PanelHeader title="Voix & vidéo" description="Périphériques et qualité de vos appels." />

      <SettingsSection title="Périphériques">
        <SettingsContent className="flex flex-col gap-5">
          <DeviceSelect label="Microphone" options={inputs} selectedKey={prefs.inputDeviceId} onChange={(id) => update({ inputDeviceId: id })} />
          <DeviceSelect label="Sortie audio" options={outputs} selectedKey={prefs.outputDeviceId} onChange={(id) => update({ outputDeviceId: id })} />
        </SettingsContent>
      </SettingsSection>

      <SettingsSection title="Entrée micro">
        <SettingsContent>
          <Slider
            value={prefs.inputVolume}
            onChange={(v) => update({ inputVolume: Array.isArray(v) ? v[0] : v })}
            aria-label="Volume d'entrée"
            className="max-w-sm"
          >
            <div className="flex items-center justify-between">
              <Label className="text-xs">Sensibilité d&apos;entrée</Label>
              <Slider.Output className="text-xs text-muted" />
            </div>
            <Slider.Track>
              <Slider.Fill />
              <Slider.Thumb />
            </Slider.Track>
          </Slider>
        </SettingsContent>
        <SettingsRow label="Suppression de bruit" description="Filtre les bruits de fond (clavier, ventilateur).">
          <Switch isSelected={prefs.noiseSuppression} onChange={(v) => update({ noiseSuppression: v })} aria-label="Suppression de bruit">
            <Switch.Content>
              <Switch.Control>
                <Switch.Thumb />
              </Switch.Control>
            </Switch.Content>
          </Switch>
        </SettingsRow>
        <SettingsRow label="Annulation d'écho" description="Évite le larsen quand vous utilisez des haut-parleurs.">
          <Switch isSelected={prefs.echoCancellation} onChange={(v) => update({ echoCancellation: v })} aria-label="Annulation d'écho">
            <Switch.Content>
              <Switch.Control>
                <Switch.Thumb />
              </Switch.Control>
            </Switch.Content>
          </Switch>
        </SettingsRow>
      </SettingsSection>

      <SettingsSection title="Mode d'activation" description="Comment déclencher la transmission vocale.">
        <SettingsContent>
          <RadioGroup value={micMode} onChange={handleMicMode} aria-label="Mode d'activation" className="flex flex-col gap-2">
            {MIC_MODES.map((m) => (
              <Radio key={m.value} value={m.value} className="rounded-lg border border-border p-3 data-selected:border-accent">
                <Radio.Content className="w-full items-start gap-2">
                  <Radio.Control>
                    <Radio.Indicator />
                  </Radio.Control>
                  <span className="flex flex-col">
                    <Label>{m.label}</Label>
                    <span className="text-xs text-muted">{m.desc}</span>
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
