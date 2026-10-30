'use client';

/**
 * Studio de couleurs — palette entièrement personnalisée.
 *
 * Deux couleurs (teinte des fonds, accent) et une intensité suffisent : le
 * thème clair et le thème sombre sont générés avec les mêmes règles que les
 * palettes intégrées (voir atelier/theme/generate.ts). Les réglages avancés
 * permettent ensuite de retoucher chaque variable, mode par mode.
 */

import {
  Accordion,
  Button,
  ColorArea,
  ColorPicker,
  ColorSlider,
  ColorSwatch,
  Label,
  Modal,
  Slider,
  TextArea,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
} from '@heroui/react';
import { Check, ChevronDown, ClipboardCopy, Download, RotateCcw, TriangleAlert } from 'lucide-react';
import { useMemo, useState, type CSSProperties } from 'react';

import { CUSTOM_VARS, hexToOklch, oklchToHex, type CustomVars, type ThemeMode } from '@/components/atelier/theme/custom';
import { DEFAULT_SEED, checkContrast, generateTheme, parseOklch, type ThemeSeed } from '@/components/atelier/theme/generate';
import { useThemeKit } from '@/components/atelier/theme/ThemeKit';
import { useTranslation } from '@/components/locale-provider';
import { cn } from '@/lib/utils';

/** Graines proposées : données de démonstration, pas des couleurs d'interface. */
const IDEAS: ThemeSeed[] = [
  { base: '#7c5cff', accent: '#7c5cff', tint: 45 },
  { base: '#2563eb', accent: '#38bdf8', tint: 55 },
  { base: '#0f766e', accent: '#2dd4bf', tint: 45 },
  { base: '#15803d', accent: '#a3e635', tint: 35 },
  { base: '#c2410c', accent: '#fb923c', tint: 35 },
  { base: '#be123c', accent: '#fb7185', tint: 40 },
  { base: '#a16207', accent: '#facc15', tint: 30 },
  { base: '#475569', accent: '#e2e8f0', tint: 0 },
];

const GROUP_ORDER = ['Page', 'Surfaces', 'Accent', 'Champs', 'Statuts', 'Divers'] as const;

/** Sélecteur de couleur compact : pastille cliquable, popover HeroUI. */
function Pastille({ hex, onChange, label, size = 'lg' }: { hex: string; onChange: (hex: string) => void; label: string; size?: 'md' | 'lg' }) {
  return (
    <ColorPicker value={hex} onChange={(c) => onChange(c.toString('hex'))}>
      <ColorPicker.Trigger aria-label={label} className="shrink-0 transition-transform duration-200 hover:scale-105">
        <ColorSwatch size={size} />
      </ColorPicker.Trigger>
      <ColorPicker.Popover>
        <ColorArea aria-label={label} className="max-w-full" colorSpace="hsb" xChannel="saturation" yChannel="brightness">
          <ColorArea.Thumb />
        </ColorArea>
        <ColorSlider aria-label={label} channel="hue" className="gap-1 px-1" colorSpace="hsb">
          <ColorSlider.Track>
            <ColorSlider.Thumb />
          </ColorSlider.Track>
        </ColorSlider>
      </ColorPicker.Popover>
    </ColorPicker>
  );
}

/** Aperçu miniature d'un mode : fond, panneau, bulle d'accent. */
function MiniApercu({ vars, title }: { vars: CustomVars; title: string }) {
  return (
    <div
      className="flex h-28 flex-1 flex-col gap-2 overflow-hidden rounded-2xl p-3 transition-colors duration-300"
      style={{ background: vars['--background'] } as CSSProperties}
      aria-hidden
    >
      <span className="text-[10px] font-medium uppercase tracking-wider" style={{ color: vars['--muted'] }}>{title}</span>
      <div className="flex flex-1 flex-col justify-end gap-1.5 rounded-xl p-2" style={{ background: vars['--surface'] }}>
        <span className="h-1.5 w-2/3 rounded-full" style={{ background: vars['--foreground'], opacity: 0.85 }} />
        <span className="h-1.5 w-1/2 rounded-full" style={{ background: vars['--muted'] }} />
        <span className="mt-1 h-4 w-14 self-end rounded-full" style={{ background: vars['--accent'] }} />
      </div>
    </div>
  );
}

function ImportModal({ isOpen, onOpenChange }: { isOpen: boolean; onOpenChange: (v: boolean) => void }) {
  const { importCustom } = useThemeKit();
  const { t } = useTranslation();
  const s = t.profile.appearance.studio;
  const [code, setCode] = useState('');
  const [error, setError] = useState(false);

  const isVars = (o: unknown): o is CustomVars =>
    !!o && typeof o === 'object' && Object.entries(o as object).every(([k, v]) => k.startsWith('--') && typeof v === 'string' && parseOklch(v) !== null);

  const apply = () => {
    try {
      const parsed = JSON.parse(code);
      if (!isVars(parsed?.light) || !isVars(parsed?.dark)) throw new Error('format');
      importCustom({ light: parsed.light, dark: parsed.dark });
      setCode('');
      setError(false);
      onOpenChange(false);
    } catch {
      setError(true);
    }
  };

  return (
    <Modal.Backdrop isOpen={isOpen} onOpenChange={onOpenChange}>
      <Modal.Container>
        <Modal.Dialog className="sm:max-w-[480px]">
          <Modal.CloseTrigger />
          <Modal.Header>
            <Modal.Heading>{s.importTitle}</Modal.Heading>
          </Modal.Header>
          <Modal.Body className="flex flex-col gap-3">
            <p className="text-sm text-muted">{s.importHint}</p>
            <TextField aria-label={s.importTitle} value={code} onChange={(v) => { setCode(v); setError(false); }}>
              <TextArea rows={6} className="font-mono text-xs" placeholder='{ "light": { … }, "dark": { … } }' />
            </TextField>
            {error && <p className="text-sm text-danger">{s.importError}</p>}
          </Modal.Body>
          <Modal.Footer>
            <Button slot="close" variant="tertiary">{s.cancel}</Button>
            <Button onPress={apply} isDisabled={!code.trim()}>{s.importConfirm}</Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}

export function ColorStudio() {
  const { state, resolvedMode, applySeed, setCustomVar, setPalette } = useThemeKit();
  const { t } = useTranslation();
  const s = t.profile.appearance.studio;

  const seed = state.customSeed ?? DEFAULT_SEED;
  const custom = state.custom ?? generateTheme(seed);
  const [editMode, setEditMode] = useState<ThemeMode>(resolvedMode);
  const [copied, setCopied] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const checks = useMemo(() => checkContrast(custom[resolvedMode]), [custom, resolvedMode]);
  const edited = useMemo(
    () => state.customSeed !== null && JSON.stringify(generateTheme(state.customSeed)) !== JSON.stringify(custom),
    [state.customSeed, custom],
  );

  const set = (patch: Partial<ThemeSeed>) => applySeed({ ...seed, ...patch });

  const exportTheme = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify({ v: 1, seed: state.customSeed, light: custom.light, dark: custom.dark }));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* presse-papiers refusé */
    }
  };

  const modeName = resolvedMode === 'dark' ? s.dark : s.light;

  return (
    <div className="at-fade-up mt-4 flex flex-col gap-3">
      {/* Les deux couleurs + intensité, avec aperçu clair/sombre en direct */}
      <div className="flex flex-col gap-5 rounded-2xl bg-surface px-5 py-5">
        <div>
          <p className="text-sm font-medium">{s.title}</p>
          <p className="mt-0.5 max-w-lg text-xs leading-relaxed text-muted">{s.description}</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {([
            ['base', s.baseLabel, s.baseHint],
            ['accent', s.accentLabel, s.accentHint],
          ] as const).map(([key, label, hint]) => (
            <div key={key} className="flex items-center gap-3 rounded-xl bg-surface-2 px-3 py-3">
              <Pastille hex={seed[key]} label={s.pick.replace('{name}', label)} onChange={(hex) => set({ [key]: hex })} />
              <div className="min-w-0">
                <p className="text-sm font-medium">{label}</p>
                <p className="truncate text-xs text-muted">{hint}</p>
              </div>
              <span className="ml-auto font-mono text-[11px] uppercase text-muted">{seed[key]}</span>
            </div>
          ))}
        </div>

        <Slider
          value={seed.tint}
          minValue={0}
          maxValue={100}
          step={5}
          onChange={(v) => set({ tint: Array.isArray(v) ? v[0] : v })}
          aria-label={s.tintLabel}
        >
          <div className="flex items-center justify-between">
            <Label className="text-xs">{s.tintLabel}</Label>
            <Slider.Output className="text-xs text-muted" />
          </div>
          <Slider.Track>
            <Slider.Fill />
            <Slider.Thumb />
          </Slider.Track>
        </Slider>
        <p className="-mt-3 text-[11px] text-muted">{s.tintHint}</p>

        <div className="flex gap-3">
          <MiniApercu vars={custom.light} title={s.lightTab} />
          <MiniApercu vars={custom.dark} title={s.darkTab} />
        </div>

        <div>
          <p className="mb-2 text-xs text-muted">{s.ideas}</p>
          <div className="flex flex-wrap gap-2">
            {IDEAS.map((idea) => {
              const active = state.customSeed?.base === idea.base && state.customSeed?.accent === idea.accent;
              return (
                <button
                  key={idea.base + idea.accent}
                  type="button"
                  onClick={() => applySeed(idea)}
                  aria-label={`${idea.base} · ${idea.accent}`}
                  className={cn(
                    'relative size-9 overflow-hidden rounded-full outline-none transition-transform duration-200 hover:scale-110 focus-visible:ring-2 focus-visible:ring-focus',
                    active && 'scale-110 shadow-lg',
                  )}
                  style={{ background: `linear-gradient(135deg, ${idea.base} 0 50%, ${idea.accent} 50% 100%)` }}
                >
                  {active && <Check className="absolute inset-0 m-auto size-4 text-white drop-shadow" strokeWidth={3} aria-hidden />}
                </button>
              );
            })}
          </div>
        </div>

        {(edited || state.customSeed === null) && (
          <p className="rounded-xl bg-warning/10 px-3 py-2 text-xs leading-relaxed text-foreground">
            {state.customSeed === null ? s.importedNote : s.editedNote}
          </p>
        )}
      </div>

      {/* Lisibilité du mode affiché */}
      <div className="rounded-2xl bg-surface px-5 py-4">
        <p className="mb-3 text-sm font-medium">{s.readability.replace('{mode}', modeName)}</p>
        <ul className="grid gap-2 sm:grid-cols-2">
          {checks.map((c) => (
            <li key={c.id} className={cn('flex items-center gap-2 rounded-xl px-3 py-2 text-xs', c.ok ? 'bg-surface-2' : 'bg-danger/10')}>
              {c.ok ? <Check className="size-3.5 text-success" aria-hidden /> : <TriangleAlert className="size-3.5 text-danger" aria-hidden />}
              <span className="flex-1">{s.checks[c.id]}</span>
              <span className="font-mono tabular-nums text-muted">{c.ratio.toFixed(1)}:1</span>
              <span className={cn('font-medium', c.ok ? 'text-success' : 'text-danger')}>{c.ok ? s.readable : s.tooLow}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Réglages avancés : chaque variable, par mode */}
      <Accordion className="rounded-2xl bg-surface px-5">
        <Accordion.Item>
          <Accordion.Heading>
            <Accordion.Trigger className="py-4 text-left">
              <span className="flex-1">
                <span className="block text-sm font-medium">{s.advanced}</span>
                <span className="block text-xs font-normal text-muted">{s.advancedHint}</span>
              </span>
              <Accordion.Indicator><ChevronDown className="size-4" aria-hidden /></Accordion.Indicator>
            </Accordion.Trigger>
          </Accordion.Heading>
          <Accordion.Panel>
            <Accordion.Body className="pb-5">
              <ToggleButtonGroup
                aria-label={s.advanced}
                selectionMode="single"
                disallowEmptySelection
                selectedKeys={[editMode]}
                onSelectionChange={(keys) => {
                  const next = [...keys][0] as ThemeMode | undefined;
                  if (next) setEditMode(next);
                }}
                size="sm"
                className="mb-4"
              >
                <ToggleButton id="light">{s.lightTab}</ToggleButton>
                <ToggleButton id="dark"><ToggleButtonGroup.Separator />{s.darkTab}</ToggleButton>
              </ToggleButtonGroup>
              <div className="flex flex-col gap-5">
                {GROUP_ORDER.map((groupe) => (
                  <div key={groupe}>
                    <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted">{groupe}</p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {CUSTOM_VARS.filter((v) => v.groupe === groupe).map((v) => {
                        const value = custom[editMode][v.cssVar] ?? 'oklch(50% 0 0)';
                        return (
                          <div key={v.cssVar} className="flex items-center gap-3 rounded-xl bg-surface-2 px-3 py-2">
                            <Pastille
                              size="md"
                              hex={oklchToHex(value)}
                              label={s.pick.replace('{name}', v.label)}
                              onChange={(hex) => setCustomVar(editMode, v.cssVar, hexToOklch(hex))}
                            />
                            <span className="min-w-0 flex-1 truncate text-xs">{v.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </Accordion.Body>
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion>

      {/* Partage et remise à zéro */}
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant="secondary" onPress={exportTheme}>
          {copied ? <Check className="size-3.5" aria-hidden /> : <ClipboardCopy className="size-3.5" aria-hidden />}
          {copied ? s.copied : s.export}
        </Button>
        <Button size="sm" variant="secondary" onPress={() => setImportOpen(true)}>
          <Download className="size-3.5" aria-hidden />
          {s.import}
        </Button>
        <Button size="sm" variant="ghost" className="ml-auto text-muted" onPress={() => setPalette('alfy')}>
          <RotateCcw className="size-3.5" aria-hidden />
          {s.reset}
        </Button>
      </div>

      <ImportModal isOpen={importOpen} onOpenChange={setImportOpen} />
    </div>
  );
}
