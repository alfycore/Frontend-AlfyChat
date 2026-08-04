'use client';

import { Button, Label, Radio, RadioGroup, Slider, Switch } from '@heroui/react';
import { AlignLeft, RotateCcw, Rows3 } from 'lucide-react';

import { PanelHeader } from '@/components/alfy/settings/settings-shell';
import { SettingsContent, SettingsRow, SettingsSection } from '@/components/alfy/settings/section';
import { useTranslation } from '@/components/locale-provider';
import { useAppPrefs, type MessageDisplay } from '@/hooks/use-app-prefs';
import { cn } from '@/lib/utils';

export function AccessibilityPanel() {
  const { prefs, updatePrefs } = useAppPrefs();
  const { t } = useTranslation();

  const DISPLAYS: { id: MessageDisplay; nom: string; description: string; icon: typeof Rows3 }[] = [
    {
      id: 'cozy',
      nom: t.profile.accessibility.displays.cozy.name,
      description: t.profile.accessibility.displays.cozy.description,
      icon: Rows3,
    },
    {
      id: 'compact',
      nom: t.profile.accessibility.displays.compact.name,
      description: t.profile.accessibility.displays.compact.description,
      icon: AlignLeft,
    },
  ];

  return (
    <div>
      <PanelHeader
        title={t.profile.accessibility.title}
        description={t.profile.accessibility.description}
      />

      {/* ── Affichage des messages ────────────────────────────────────── */}
      <SettingsSection title={t.profile.accessibility.messageDisplay.sectionTitle}>
        <SettingsContent>
          <RadioGroup
            value={prefs.messageDisplay}
            onChange={(v) => updatePrefs({ messageDisplay: v as MessageDisplay })}
            aria-label={t.profile.accessibility.messageDisplay.ariaLabel}
            className="grid gap-3 sm:grid-cols-2"
          >
            {DISPLAYS.map(({ id, nom, description, icon: Icon }) => (
              <Radio
                key={id}
                value={id}
                className={cn(
                  'cursor-pointer overflow-hidden rounded-lg border p-0 transition-all',
                  prefs.messageDisplay === id ? 'border-accent ring-1 ring-accent/40' : 'border-border',
                )}
              >
                <Radio.Content className="flex-col items-stretch gap-0">
                  <span className="flex h-16 items-center justify-center border-b border-separator bg-surface-secondary">
                    <Icon className="size-5 text-muted" aria-hidden />
                  </span>
                  <span className="flex items-start gap-2 p-3">
                    <Radio.Control className="mt-0.5">
                      <Radio.Indicator />
                    </Radio.Control>
                    <span className="flex min-w-0 flex-col">
                      <Label className="text-sm font-medium">{nom}</Label>
                      <span className="text-[11px] leading-relaxed text-muted">{description}</span>
                    </span>
                  </span>
                </Radio.Content>
              </Radio>
            ))}
          </RadioGroup>
        </SettingsContent>
      </SettingsSection>

      {/* ── Couleurs ──────────────────────────────────────────────────── */}
      <SettingsSection title={t.profile.accessibility.colors.sectionTitle}>
        <SettingsContent>
          <Slider
            value={prefs.saturation}
            minValue={0}
            maxValue={100}
            step={5}
            onChange={(v) => updatePrefs({ saturation: Array.isArray(v) ? v[0] : v })}
            aria-label={t.profile.accessibility.colors.saturationLabel}
            className="max-w-sm"
          >
            <div className="flex items-center justify-between">
              <Label className="text-xs">{t.profile.accessibility.colors.saturationLabel}</Label>
              <Slider.Output className="text-xs text-muted" />
            </div>
            <Slider.Track>
              <Slider.Fill />
              <Slider.Thumb />
            </Slider.Track>
          </Slider>
          <p className="mt-2 text-[11px] text-muted">
            {t.profile.accessibility.colors.saturationHint}
          </p>
        </SettingsContent>
        <SettingsRow
          label={t.profile.accessibility.colors.highContrastLabel}
          description={t.profile.accessibility.colors.highContrastDescription}
        >
          <Switch
            aria-label={t.profile.accessibility.colors.highContrastLabel}
            isSelected={prefs.highContrast}
            onChange={(v) => updatePrefs({ highContrast: v })}
          >
            <Switch.Content>
              <Switch.Control>
                <Switch.Thumb />
              </Switch.Control>
            </Switch.Content>
          </Switch>
        </SettingsRow>
      </SettingsSection>

      {/* ── Mouvement & texte ─────────────────────────────────────────── */}
      <SettingsSection title={t.profile.accessibility.motion.sectionTitle}>
        <SettingsRow
          label={t.profile.accessibility.motion.reducedMotionLabel}
          description={t.profile.accessibility.motion.reducedMotionDescription}
        >
          <Switch
            aria-label={t.profile.accessibility.motion.reducedMotionLabel}
            isSelected={prefs.reducedMotion}
            onChange={(v) => updatePrefs({ reducedMotion: v })}
          >
            <Switch.Content>
              <Switch.Control>
                <Switch.Thumb />
              </Switch.Control>
            </Switch.Content>
          </Switch>
        </SettingsRow>
        <SettingsContent>
          <Slider
            value={prefs.fontScale}
            minValue={85}
            maxValue={130}
            step={5}
            onChange={(v) => updatePrefs({ fontScale: Array.isArray(v) ? v[0] : v })}
            aria-label={t.profile.accessibility.motion.fontSizeLabel}
            className="max-w-sm"
          >
            <div className="flex items-center justify-between">
              <Label className="text-xs">{t.profile.accessibility.motion.fontSizeLabel}</Label>
              <Slider.Output className="text-xs text-muted" />
            </div>
            <Slider.Track>
              <Slider.Fill />
              <Slider.Thumb />
            </Slider.Track>
          </Slider>
          <p className="mt-2 text-[11px] text-muted">
            {t.profile.accessibility.motion.fontSizeHint}
          </p>
        </SettingsContent>
      </SettingsSection>

      <div className="flex justify-end">
        <Button
          size="sm"
          variant="ghost"
          className="text-muted"
          onPress={() =>
            updatePrefs({
              messageDisplay: 'cozy',
              saturation: 100,
              highContrast: false,
              reducedMotion: false,
              fontScale: 100,
            })
          }
        >
          <RotateCcw className="size-3.5" aria-hidden />
          {t.profile.accessibility.reset}
        </Button>
      </div>
    </div>
  );
}
