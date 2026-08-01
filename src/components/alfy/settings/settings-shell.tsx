'use client';

import { Button, Header, Label, ListBox, ScrollShadow, Tooltip } from '@heroui/react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { LucideIcon } from 'lucide-react';

export interface SettingsTab {
  id: string;
  label: string;
  icon: LucideIcon;
  content: React.ReactNode;
  danger?: boolean;
}

export interface SettingsGroup {
  /** Petit intitulé (uppercase) au-dessus du groupe d'onglets. */
  label?: string;
  items: SettingsTab[];
}

interface SettingsShellProps {
  title: string;
  subtitle?: string;
  groups: SettingsGroup[];
  /** Fermeture du panneau (navigation ou fermeture de la popup). */
  onClose: () => void;
  /** Pied de navigation optionnel (version, actions danger…). */
  navFooter?: React.ReactNode;
}

/** Navigation programmatique entre onglets (liens « Paramètres connexes »). */
const SettingsNavContext = createContext<{ goTo: (tabId: string) => void } | null>(null);

/** Permet à un panneau de renvoyer vers un autre onglet des réglages. */
export function useSettingsNav() {
  return useContext(SettingsNavContext) ?? { goTo: () => {} };
}

/**
 * Gabarit plein écran des paramètres, densité Discord :
 * navigation groupée (ListBox à sections) sur colonne sombre alignée à
 * droite, contenu large, bouton de fermeture dédié, fermeture Échap.
 */
export function SettingsShell({ title, subtitle, groups, onClose, navFooter }: SettingsShellProps) {
  const allTabs = groups.flatMap((g) => g.items);
  const [selectedId, setSelectedId] = useState(allTabs[0]?.id);
  const selected = allTabs.find((t) => t.id === selectedId) ?? allTabs[0];
  // Sur mobile, une seule colonne à la fois : liste des onglets ou contenu.
  const [showNavOnMobile, setShowNavOnMobile] = useState(true);

  const goTo = useCallback((tabId: string) => {
    setSelectedId(tabId);
    setShowNavOnMobile(false);
  }, []);
  const nav = useMemo(() => ({ goTo }), [goTo]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <SettingsNavContext.Provider value={nav}>
    <div className="alfy-enter flex h-full bg-background">
      {/* Colonne navigation — fond distinct, nav collée au contenu */}
      <div
        className={[
          'grow justify-end border-r border-separator bg-surface sm:flex sm:w-auto sm:shrink-0',
          showNavOnMobile ? 'flex w-full' : 'hidden',
        ].join(' ')}
      >
        <ScrollShadow className="h-full w-full overflow-y-auto sm:w-auto">
          <div className="flex h-full w-full flex-col px-3 py-6 sm:w-57 sm:py-12">
            <div className="mb-4 flex items-center justify-between gap-2 px-2.5">
              <div className="min-w-0">
                <p className="truncate text-[11px] font-semibold tracking-wider text-muted uppercase">
                  {subtitle}
                </p>
                <h1 className="truncate text-sm font-bold">{title}</h1>
              </div>
              <Button
                isIconOnly
                variant="ghost"
                size="sm"
                aria-label="Fermer les paramètres"
                className="shrink-0 sm:hidden"
                onPress={onClose}
              >
                <X className="size-4.5" />
              </Button>
            </div>

            <ListBox
              aria-label={title}
              selectionMode="single"
              disallowEmptySelection
              selectedKeys={selectedId ? [selectedId] : []}
              onSelectionChange={(keys) => {
                const id = [...keys][0];
                if (id) goTo(String(id));
              }}
              className="flex w-full flex-col gap-1 border-0 bg-transparent p-0 shadow-none"
            >
              {groups.map((group, gi) => (
                <ListBox.Section key={group.label ?? gi} className={gi > 0 ? 'mt-4' : undefined}>
                  {group.label && (
                    <Header className="mb-1 px-2.5 text-[11px] font-semibold tracking-wider text-muted/80 uppercase select-none">
                      {group.label}
                    </Header>
                  )}
                  {group.items.map(({ id, label, icon: Icon, danger }) => (
                    <ListBox.Item
                      key={id}
                      id={id}
                      textValue={label}
                      className={[
                        'w-full cursor-pointer justify-start gap-2.5 rounded-md px-2.5 py-1.5 text-sm font-medium',
                        'transition-colors duration-100',
                        danger
                          ? 'text-danger hover:bg-danger/10'
                          : 'text-muted hover:bg-surface-secondary hover:text-foreground',
                        'data-selected:bg-surface-tertiary data-selected:text-foreground',
                      ].join(' ')}
                    >
                      <Icon className="size-4 shrink-0 opacity-80" aria-hidden />
                      <Label>{label}</Label>
                    </ListBox.Item>
                  ))}
                </ListBox.Section>
              ))}
            </ListBox>

            {navFooter && <div className="mt-auto px-2.5 pt-6">{navFooter}</div>}
          </div>
        </ScrollShadow>
      </div>

      {/* Colonne contenu */}
      <div
        className={[
          'min-w-0 grow-2 basis-0 sm:flex',
          showNavOnMobile ? 'hidden' : 'flex w-full',
        ].join(' ')}
      >
        <div className="min-w-0 flex-1">
          {/* Barre mobile : retour vers la liste + titre de l'onglet */}
          <div className="flex items-center gap-2 border-b border-separator px-3 py-3 sm:hidden">
            <Button
              isIconOnly
              variant="ghost"
              size="sm"
              aria-label="Retour aux paramètres"
              onPress={() => setShowNavOnMobile(true)}
            >
              <ChevronLeft className="size-4.5" />
            </Button>
            <p className="min-w-0 flex-1 truncate text-sm font-semibold">{selected?.label}</p>
          </div>

          <ScrollShadow className="h-[calc(100%-3.25rem)] overflow-y-auto sm:h-full">
            {/* key = remonte l'animation d'entrée à chaque changement d'onglet */}
            <div key={selected?.id} className="alfy-enter max-w-180 px-4 py-6 sm:px-10 sm:py-12">
              {selected?.content}
            </div>
          </ScrollShadow>
        </div>

        {/* Bouton de fermeture, colonne dédiée façon Discord */}
        <div className="hidden shrink-0 flex-col items-center pt-12 pr-8 pl-2 sm:flex">
          <Tooltip delay={300}>
            <Button
              isIconOnly
              variant="ghost"
              aria-label="Fermer les paramètres"
              className="rounded-full border-2 border-border text-muted transition-transform hover:scale-105 hover:text-foreground"
              onPress={onClose}
            >
              <X className="size-4.5" />
            </Button>
            <Tooltip.Content>
              <p>Fermer</p>
            </Tooltip.Content>
          </Tooltip>
          <span className="mt-1 text-[10px] font-semibold text-muted select-none">ÉCHAP</span>
        </div>
      </div>
    </div>
    </SettingsNavContext.Provider>
  );
}

/**
 * Renvoi vers un autre onglet des réglages — le bloc « Paramètres connexes »
 * de Discord : icône, titre, sous-titre, chevron.
 */
export function RelatedSetting({
  icon: Icon,
  title,
  description,
  tabId,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  tabId: string;
}) {
  const { goTo } = useSettingsNav();
  return (
    <button
      type="button"
      onClick={() => goTo(tabId)}
      className="group/rel flex w-full cursor-pointer items-center gap-3 rounded-lg border border-border/70 bg-surface px-4 py-3 text-left outline-none transition-colors hover:bg-surface-secondary focus-visible:ring-2 focus-visible:ring-focus"
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-surface-secondary text-foreground transition-transform group-hover/rel:scale-105">
        <Icon className="size-4.5" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium">{title}</span>
        <span className="block truncate text-xs text-muted">{description}</span>
      </span>
      <ChevronRight className="size-4 shrink-0 text-muted transition-transform group-hover/rel:translate-x-0.5" aria-hidden />
    </button>
  );
}

/** En-tête d'un panneau de paramètres. */
export function PanelHeader({ title, description }: { title: string; description?: string }) {
  return (
    <header className="mb-7">
      <h2 className="text-xl font-bold tracking-tight">{title}</h2>
      {description && <p className="mt-1.5 max-w-lg text-sm leading-relaxed text-muted">{description}</p>}
    </header>
  );
}
