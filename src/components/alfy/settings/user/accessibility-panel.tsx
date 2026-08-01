'use client';

import { Button, Label, Radio, RadioGroup, Slider, Switch } from '@heroui/react';
import { AlignLeft, RotateCcw, Rows3 } from 'lucide-react';

import { PanelHeader } from '@/components/alfy/settings/settings-shell';
import { SettingsContent, SettingsRow, SettingsSection } from '@/components/alfy/settings/section';
import { useAppPrefs, type MessageDisplay } from '@/hooks/use-app-prefs';
import { cn } from '@/lib/utils';

const DISPLAYS: { id: MessageDisplay; nom: string; description: string; icon: typeof Rows3 }[] = [
  {
    id: 'cozy',
    nom: 'Confortable',
    description: 'Avatars ronds, espacement généreux — la vue par défaut.',
    icon: Rows3,
  },
  {
    id: 'compact',
    nom: 'Compact',
    description: 'Une ligne par message, avatars masquables.',
    icon: AlignLeft,
  },
];

export function AccessibilityPanel() {
  const { prefs, updatePrefs } = useAppPrefs();

  return (
    <div>
      <PanelHeader
        title="Accessibilité"
        description="Saturation des couleurs, contraste, mouvement et taille du texte."
      />

      {/* ── Affichage des messages ────────────────────────────────────── */}
      <SettingsSection title="Affichage des messages de discussion">
        <SettingsContent>
          <RadioGroup
            value={prefs.messageDisplay}
            onChange={(v) => updatePrefs({ messageDisplay: v as MessageDisplay })}
            aria-label="Affichage des messages"
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
      <SettingsSection title="Couleurs">
        <SettingsContent>
          <Slider
            value={prefs.saturation}
            minValue={0}
            maxValue={100}
            step={5}
            onChange={(v) => updatePrefs({ saturation: Array.isArray(v) ? v[0] : v })}
            aria-label="Saturation des couleurs"
            className="max-w-sm"
          >
            <div className="flex items-center justify-between">
              <Label className="text-xs">Saturation des couleurs</Label>
              <Slider.Output className="text-xs text-muted" />
            </div>
            <Slider.Track>
              <Slider.Fill />
              <Slider.Thumb />
            </Slider.Track>
          </Slider>
          <p className="mt-2 text-[11px] text-muted">
            Réduisez la saturation si les couleurs vives vous gênent. 100 % correspond aux couleurs d&apos;origine.
          </p>
        </SettingsContent>
        <SettingsRow
          label="Mode contraste élevé"
          description="Renforce les bordures, les séparateurs et les textes secondaires."
        >
          <Switch
            aria-label="Mode contraste élevé"
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
      <SettingsSection title="Mouvement et texte">
        <SettingsRow
          label="Réduire le mouvement"
          description="Coupe les animations et les transitions dans toute l'application."
        >
          <Switch
            aria-label="Réduire le mouvement"
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
            aria-label="Taille du texte"
            className="max-w-sm"
          >
            <div className="flex items-center justify-between">
              <Label className="text-xs">Taille du texte</Label>
              <Slider.Output className="text-xs text-muted" />
            </div>
            <Slider.Track>
              <Slider.Fill />
              <Slider.Thumb />
            </Slider.Track>
          </Slider>
          <p className="mt-2 text-[11px] text-muted">
            S&apos;applique à toute l&apos;interface, pas seulement aux messages.
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
          Réinitialiser l&apos;accessibilité
        </Button>
      </div>
    </div>
  );
}
