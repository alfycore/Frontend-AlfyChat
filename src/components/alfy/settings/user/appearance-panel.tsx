'use client';

import {
  Button,
  ColorArea,
  ColorPicker,
  ColorSlider,
  ColorSwatch,
  ListBox,
  Select,
  Switch,
  ToggleButton,
  ToggleButtonGroup,
} from '@heroui/react';
import { Accessibility, Check, ChevronRight, RotateCcw } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';

import { AppIconPreview, ThemePreview } from '@/components/alfy/settings/user/theme-preview';
import { useSettingsNav } from '@/components/alfy/settings/settings-shell';
import { PALETTES, type PaletteId } from '@/components/atelier/theme/palettes';
import { useThemeKit } from '@/components/atelier/theme/ThemeKit';
import { useTranslation } from '@/components/locale-provider';
import { APP_ICONS, appIconDataUri, useAppPrefs, type ThemePreset } from '@/hooks/use-app-prefs';
import { cn } from '@/lib/utils';

/* ══════════════════════════════════════════════════════════════════════════
 * Données des sélecteurs.
 * Les aperçus d'un thème ne peuvent pas s'exprimer en jetons du thème courant
 * (ils montrent justement un AUTRE thème) : comme `palettes.ts`, on les garde
 * en données, jamais en littéraux dispersés dans le JSX.
 * ══════════════════════════════════════════════════════════════════════════ */

interface PresetMeta {
  id: ThemePreset;
  mode: 'light' | 'dark' | 'system';
  /** Aperçu : fond de la fenêtre, panneau, et barre de contenu. */
  fond: string;
  panneau: string;
  trait: string;
}

const PRESETS: PresetMeta[] = [
  { id: 'light', mode: 'light', fond: 'oklch(97% 0.006 289)', panneau: 'oklch(100% 0.003 289)', trait: 'oklch(88% 0.008 289)' },
  { id: 'dark', mode: 'dark', fond: 'oklch(21% 0.012 289)', panneau: 'oklch(26% 0.011 289)', trait: 'oklch(38% 0.010 289)' },
  { id: 'deep', mode: 'dark', fond: 'oklch(12% 0.008 289)', panneau: 'oklch(17% 0.010 289)', trait: 'oklch(30% 0.010 289)' },
  { id: 'oled', mode: 'dark', fond: 'oklch(0% 0 0)', panneau: 'oklch(10% 0.008 289)', trait: 'oklch(24% 0.010 289)' },
  { id: 'system', mode: 'system', fond: 'linear-gradient(115deg, oklch(97% 0.006 289) 0 50%, oklch(12% 0.008 289) 50% 100%)', panneau: 'transparent', trait: 'transparent' },
];

/**
 * Jetons du ToggleButton neutralisés : la tuile porte elle-même son visuel,
 * le composant ne garde que le comportement (sélection, clavier, focus).
 */
const TILE_TOKENS = {
  '--toggle-button-bg': 'transparent',
  '--toggle-button-bg-hover': 'transparent',
  '--toggle-button-bg-pressed': 'transparent',
  '--toggle-button-bg-selected': 'transparent',
  '--toggle-button-bg-selected-hover': 'transparent',
  '--toggle-button-bg-selected-pressed': 'transparent',
} as CSSProperties;

/* ══════════════════════════════════════════════════════════════════════════
 * Briques locales — aucune bordure : les zones se séparent par le fond.
 * ══════════════════════════════════════════════════════════════════════════ */

/** Bloc de réglages, entrée en cascade pilotée par `delai`. */
function Bloc({
  titre,
  intro,
  action,
  delai = 0,
  children,
}: {
  titre: string;
  intro?: string;
  action?: ReactNode;
  delai?: number;
  children: ReactNode;
}) {
  return (
    <section
      className="at-fade-up mb-10"
      style={{ animationDelay: `${delai}ms` } as CSSProperties}
    >
      <div className="mb-4 flex items-end justify-between gap-6">
        <div className="min-w-0">
          <h3 className="font-heading text-lg tracking-tight">{titre}</h3>
          {intro && <p className="mt-1 max-w-md text-sm leading-relaxed text-muted">{intro}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

/** Rangée d'un réglage : libellé à gauche, contrôle à droite, fond seul. */
function Rangee({
  titre,
  detail,
  children,
}: {
  titre: string;
  detail?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-6 rounded-2xl bg-surface px-5 py-4 transition-colors duration-200 hover:bg-surface-2">
      <div className="min-w-0">
        <p className="text-sm font-medium">{titre}</p>
        {detail && <p className="mt-0.5 text-xs leading-relaxed text-muted">{detail}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

/** Pastille de sélection — seul marqueur d'état, pas d'anneau ni de bordure. */
function Coche({ actif }: { actif: boolean }) {
  if (!actif) return null;
  return (
    <span className="at-pop absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full bg-accent text-accent-fg shadow-lg">
      <Check className="size-3" strokeWidth={3} aria-hidden />
    </span>
  );
}

/** Interrupteur — composition HeroUI v3.2 (Control imbriqué dans Content). */
function Bascule({
  label,
  isSelected,
  onChange,
}: {
  label: string;
  isSelected: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <Switch aria-label={label} isSelected={isSelected} onChange={onChange}>
      <Switch.Content>
        <Switch.Control>
          <Switch.Thumb />
        </Switch.Control>
      </Switch.Content>
    </Switch>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
 * Panneau
 * ══════════════════════════════════════════════════════════════════════════ */

export function AppearancePanel() {
  const { setTheme } = useTheme();
  const { state, setPalette, setAccent, setAccentCustomHex } = useThemeKit();
  const { prefs, updatePrefs } = useAppPrefs();
  const { goTo } = useSettingsNav();
  const { t } = useTranslation();

  const SERVER_THEME_OPTIONS = [
    { id: 'server', label: t.profile.appearance.serverThemeOptions.server },
    { id: 'user', label: t.profile.appearance.serverThemeOptions.user },
  ];

  const [monte, setMonte] = useState(false);
  const [apercuTheme, setApercuTheme] = useState(false);
  const [apercuIcone, setApercuIcone] = useState(false);
  useEffect(() => setMonte(true), []);

  /** Un preset pilote le mode next-themes ET la profondeur du fond. */
  const choisirPreset = (id: ThemePreset) => {
    const preset = PRESETS.find((p) => p.id === id);
    if (!preset) return;
    updatePrefs({ themePreset: id });
    setTheme(preset.mode);
  };

  /* La palette de couleur et l'accent sont deux axes indépendants : une
   * palette reste sélectionnée même si l'accent a été personnalisé. */
  const paletteActive: PaletteId = state.palette === 'custom' ? 'alfy' : state.palette;
  const accentLibre = state.accent === 'custom' && state.accentCustom !== null;

  /** Lecture d'une sélection unique de ToggleButtonGroup. */
  const premiereCle = (cles: Iterable<string | number>) => {
    const [first] = [...cles];
    return first === undefined ? null : String(first);
  };

  return (
    <div>
      {/* ── Titre ─────────────────────────────────────────────────────── */}
      <header className="at-fade-up mb-10 flex items-start justify-between gap-6">
        <div className="min-w-0">
          <h2 className="font-heading text-3xl leading-tight tracking-tighter">{t.profile.appearance.title}</h2>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-muted">
            {t.profile.appearance.description}
          </p>
        </div>
        <Button variant="secondary" className="shrink-0" onPress={() => setApercuTheme(true)}>
          {t.profile.appearance.previewButton}
        </Button>
      </header>

      {/* ── Profondeur ────────────────────────────────────────────────── */}
      <Bloc
        titre={t.profile.appearance.depth.title}
        intro={t.profile.appearance.depth.description}
        delai={40}
      >
        {monte && (
          <ToggleButtonGroup
            isDetached
            aria-label={t.profile.appearance.depth.ariaLabel}
            selectionMode="single"
            disallowEmptySelection
            selectedKeys={[prefs.themePreset]}
            onSelectionChange={(cles) => {
              const id = premiereCle(cles as Iterable<string>);
              if (id) choisirPreset(id as ThemePreset);
            }}
            className="grid w-full grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5"
          >
            {PRESETS.map((p) => {
              const actif = prefs.themePreset === p.id;
              return (
                <ToggleButton
                  key={p.id}
                  id={p.id}
                  style={TILE_TOKENS}
                  className="group/tuile relative h-auto w-full flex-col items-stretch gap-0 p-0 text-left"
                >
                  <span
                    className={cn(
                      'relative block h-18 w-full overflow-hidden rounded-2xl p-2',
                      'transition-transform duration-300 ease-out group-hover/tuile:-translate-y-0.5',
                      actif && 'shadow-lg',
                    )}
                    style={{ background: p.fond }}
                  >
                    <span className="block h-full w-full rounded-lg" style={{ background: p.panneau }}>
                      <span className="mt-2 ml-2 block h-1.5 w-8 rounded-full" style={{ background: p.trait }} />
                      <span className="mt-1.5 ml-2 block h-1.5 w-12 rounded-full opacity-60" style={{ background: p.trait }} />
                    </span>
                    <Coche actif={actif} />
                  </span>
                  <span className="mt-2 block px-0.5">
                    <span className={cn('block text-xs font-medium transition-colors', actif ? 'text-foreground' : 'text-muted')}>
                      {t.profile.appearance.presets[p.id].name}
                    </span>
                    <span className="block text-[10px] text-muted/70">{t.profile.appearance.presets[p.id].detail}</span>
                  </span>
                </ToggleButton>
              );
            })}
          </ToggleButtonGroup>
        )}
      </Bloc>

      {/* ── Couleur ───────────────────────────────────────────────────── */}
      <Bloc
        titre={t.profile.appearance.color.title}
        intro={t.profile.appearance.color.description}
        delai={80}
        action={
          accentLibre ? (
            <Button size="sm" variant="ghost" className="shrink-0 text-muted" onPress={() => setAccent('auto')}>
              <RotateCcw className="size-3.5" aria-hidden />
              {t.profile.appearance.color.resetAccent}
            </Button>
          ) : undefined
        }
      >
        <ToggleButtonGroup
          isDetached
          aria-label={t.profile.appearance.color.ariaLabel}
          selectionMode="single"
          disallowEmptySelection
          selectedKeys={[paletteActive]}
          onSelectionChange={(cles) => {
            const id = premiereCle(cles as Iterable<string>);
            if (id) setPalette(id as PaletteId);
          }}
          className="grid w-full grid-cols-4 gap-3 sm:grid-cols-8"
        >
          {PALETTES.map((p) => {
            const actif = paletteActive === p.id;
            return (
              <ToggleButton
                key={p.id}
                id={p.id}
                aria-label={p.nom}
                style={TILE_TOKENS}
                className="group/pastille relative h-auto w-full flex-col gap-0 p-0"
              >
                <span
                  className={cn(
                    'relative block aspect-square w-full overflow-hidden rounded-2xl',
                    'transition-transform duration-300 ease-out group-hover/pastille:scale-105',
                    actif && 'shadow-lg',
                  )}
                  style={{
                    background: `linear-gradient(140deg, ${p.swatch.dark.accent} 0%, ${p.swatch.dark.surface} 62%, ${p.swatch.dark.background} 100%)`,
                  }}
                >
                  <Coche actif={actif} />
                </span>
                <span className={cn('mt-2 block truncate text-[10px] transition-colors', actif ? 'text-foreground' : 'text-muted')}>
                  {p.nom}
                </span>
              </ToggleButton>
            );
          })}
        </ToggleButtonGroup>

        <div className="mt-4 flex items-center justify-between gap-6 rounded-2xl bg-surface px-5 py-4">
          <div className="min-w-0">
            <p className="text-sm font-medium">{t.profile.appearance.color.customTitle}</p>
            <p className="mt-0.5 text-xs leading-relaxed text-muted">
              {t.profile.appearance.color.customDescription}
            </p>
          </div>
          <ColorPicker
            value={state.accentCustom?.hex ?? '#8b5cf6'}
            onChange={(couleur) => setAccentCustomHex(couleur.toString('hex'))}
          >
            <ColorPicker.Trigger className="shrink-0">
              <ColorSwatch size="lg" />
            </ColorPicker.Trigger>
            <ColorPicker.Popover>
              <ColorArea aria-label={t.profile.appearance.color.hueSaturationAriaLabel} className="max-w-full" colorSpace="hsb" xChannel="saturation" yChannel="brightness">
                <ColorArea.Thumb />
              </ColorArea>
              <ColorSlider aria-label={t.profile.appearance.color.hueAriaLabel} channel="hue" className="gap-1 px-1" colorSpace="hsb">
                <ColorSlider.Track>
                  <ColorSlider.Thumb />
                </ColorSlider.Track>
              </ColorSlider>
            </ColorPicker.Popover>
          </ColorPicker>
        </div>
      </Bloc>

      {/* ── Application ───────────────────────────────────────────────── */}
      <Bloc titre={t.profile.appearance.app.title} intro={t.profile.appearance.app.description} delai={120}>
        <div className="flex flex-col gap-2">
          <Rangee
            titre={t.profile.appearance.app.syncTitle}
            detail={t.profile.appearance.app.syncDetail}
          >
            <Bascule
              label={t.profile.appearance.app.syncAriaLabel}
              isSelected={prefs.syncThemeAcrossDevices}
              onChange={(v) => updatePrefs({ syncThemeAcrossDevices: v })}
            />
          </Rangee>

          <Rangee
            titre={t.profile.appearance.app.applyToProfilesTitle}
            detail={t.profile.appearance.app.applyToProfilesDetail}
          >
            <Bascule
              label={t.profile.appearance.app.applyToProfilesAriaLabel}
              isSelected={prefs.applyThemeToProfiles}
              onChange={(v) => updatePrefs({ applyThemeToProfiles: v })}
            />
          </Rangee>

          <Rangee titre={t.profile.appearance.app.serversTitle} detail={t.profile.appearance.app.serversDetail}>
            <Select
              className="w-64"
              aria-label={t.profile.appearance.app.serversAriaLabel}
              selectedKey={prefs.serverThemeMode}
              onSelectionChange={(k) => updatePrefs({ serverThemeMode: k as 'server' | 'user' })}
            >
              <Select.Trigger>
                <Select.Value />
                <Select.Indicator />
              </Select.Trigger>
              <Select.Popover>
                <ListBox>
                  {SERVER_THEME_OPTIONS.map((o) => (
                    <ListBox.Item key={o.id} id={o.id} textValue={o.label}>
                      {o.label}
                      <ListBox.ItemIndicator />
                    </ListBox.Item>
                  ))}
                </ListBox>
              </Select.Popover>
            </Select>
          </Rangee>
        </div>
      </Bloc>

      {/* ── Icône ─────────────────────────────────────────────────────── */}
      <Bloc
        titre={t.profile.appearance.icon.title}
        intro={t.profile.appearance.icon.description}
        delai={160}
        action={
          <Button size="sm" variant="ghost" className="shrink-0" onPress={() => setApercuIcone(true)}>
            {t.common.preview}
            <ChevronRight className="size-3.5" aria-hidden />
          </Button>
        }
      >
        <ToggleButtonGroup
          isDetached
          aria-label={t.profile.appearance.icon.ariaLabel}
          selectionMode="single"
          disallowEmptySelection
          selectedKeys={[prefs.appIcon]}
          onSelectionChange={(cles) => {
            const id = premiereCle(cles as Iterable<string>);
            if (id) updatePrefs({ appIcon: id });
          }}
          className="grid w-full grid-cols-4 gap-3 sm:grid-cols-6"
        >
          {APP_ICONS.map((icone) => {
            const actif = prefs.appIcon === icone.id;
            return (
              <ToggleButton
                key={icone.id}
                id={icone.id}
                aria-label={icone.nom}
                style={TILE_TOKENS}
                className="group/icone relative h-auto w-full flex-col gap-0 p-0"
              >
                <span
                  className={cn(
                    'relative block w-full transition-transform duration-300 ease-out group-hover/icone:scale-105',
                    actif && 'drop-shadow-lg',
                  )}
                >
                  <img src={appIconDataUri(icone.id)} alt="" className="aspect-square w-full rounded-2xl" />
                  <Coche actif={actif} />
                </span>
                <span className={cn('mt-2 block truncate text-[10px] transition-colors', actif ? 'text-foreground' : 'text-muted')}>
                  {icone.nom}
                </span>
              </ToggleButton>
            );
          })}
        </ToggleButtonGroup>
      </Bloc>

      {/* ── Renvoi ────────────────────────────────────────────────────── */}
      <section className="at-fade-up" style={{ animationDelay: '200ms' } as CSSProperties}>
        <Button
          variant="ghost"
          className="group/lien h-auto w-full justify-start gap-3 rounded-2xl bg-surface px-5 py-4 transition-colors hover:bg-surface-2"
          onPress={() => goTo('accessibility')}
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-surface-2 transition-transform duration-300 group-hover/lien:scale-105">
            <Accessibility className="size-4.5" aria-hidden />
          </span>
          <span className="min-w-0 flex-1 text-left">
            <span className="block text-sm font-medium">{t.profile.appearance.link.title}</span>
            <span className="block truncate text-xs font-normal text-muted">
              {t.profile.appearance.link.description}
            </span>
          </span>
          <ChevronRight className="size-4 shrink-0 text-muted transition-transform duration-300 group-hover/lien:translate-x-1" aria-hidden />
        </Button>
      </section>

      <ThemePreview isOpen={apercuTheme} onOpenChange={setApercuTheme} appIcon={prefs.appIcon} />
      <AppIconPreview isOpen={apercuIcone} onOpenChange={setApercuIcone} appIcon={prefs.appIcon} />
    </div>
  );
}
