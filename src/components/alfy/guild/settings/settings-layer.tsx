'use client';

/**
 * Réglages plein écran (serveur, salon) au gabarit Discord :
 *  - colonne de navigation à gauche, groupes titrés, entrée « danger » en bas ;
 *  - contenu à droite, bouton rond « ÉCHAP » pour fermer ;
 *  - barre « Attention — il reste des modifications non enregistrées ! » : tant
 *    qu'elle est là, fermer ou changer d'onglet est refusé et la barre tremble ;
 *  - sur mobile : liste des sections, puis la section avec un retour.
 */

import { Button, Modal, ScrollShadow } from '@heroui/react';
import { ArrowLeft, X, type LucideIcon } from 'lucide-react';
import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { useIsMobile } from '@/hooks/use-mobile';
import { useTranslation } from '@/components/locale-provider';
import { cn } from '@/lib/utils';

export interface SettingsNavItem {
  id: string;
  label: string;
  icon?: LucideIcon;
  danger?: boolean;
}

export interface SettingsNavGroup {
  id: string;
  title?: string;
  items: (SettingsNavItem | false | null | undefined)[];
}

interface FormHandle {
  dirty: boolean;
  saving?: boolean;
  save: () => Promise<unknown> | void;
  reset: () => void;
}

const FormContext = createContext<((form: FormHandle | null) => void) | null>(null);
const GuardContext = createContext<{ blocked: boolean; nudge: () => void }>({ blocked: false, nudge: () => {} });

/** Pour les navigations internes d'une page (ex. passer d'un rôle à l'autre). */
export function useSettingsGuard() {
  return useContext(GuardContext);
}

/**
 * Déclare l'état d'un formulaire de réglages : la barre d'enregistrement
 * apparaît dès qu'il est modifié, et protège la sortie.
 */
export function useSettingsForm(form: FormHandle) {
  const register = useContext(FormContext);
  const ref = useRef(form);
  useLayoutEffect(() => {
    ref.current = form;
  });
  useEffect(() => {
    register?.(form.dirty ? { ...ref.current, save: () => ref.current.save(), reset: () => ref.current.reset() } : null);
  }, [register, form.dirty, form.saving]);
  useEffect(() => () => register?.(null), [register]);
}

interface SettingsLayerProps {
  isOpen: boolean;
  onClose: () => void;
  /** Titre au-dessus de la navigation (nom du serveur / salon). */
  title: ReactNode;
  groups: SettingsNavGroup[];
  active: string;
  onSelect: (id: string) => void;
  children: ReactNode;
}

export function SettingsLayer({ isOpen, onClose, title, groups, active, onSelect, children }: SettingsLayerProps) {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const [form, setForm] = useState<FormHandle | null>(null);
  const [shake, setShake] = useState(0);
  const [mobileContent, setMobileContent] = useState(false);
  const [saving, setSaving] = useState(false);

  const blocked = Boolean(form?.dirty);
  const nudge = useCallback(() => setShake((n) => n + 1), []);

  const tryClose = useCallback(() => {
    if (blocked) {
      nudge();
      return;
    }
    onClose();
  }, [blocked, nudge, onClose]);

  const select = (id: string) => {
    if (id === active) {
      setMobileContent(true);
      return;
    }
    if (blocked) {
      nudge();
      return;
    }
    onSelect(id);
    setMobileContent(true);
  };

  const visibleGroups = useMemo(
    () => groups.map((g) => ({ ...g, items: g.items.filter(Boolean) as SettingsNavItem[] })).filter((g) => g.items.length),
    [groups],
  );

  const guard = useMemo(() => ({ blocked, nudge }), [blocked, nudge]);
  const showNav = !isMobile || !mobileContent;
  const showContent = !isMobile || mobileContent;

  return (
    <Modal isOpen={isOpen} onOpenChange={(open) => !open && tryClose()}>
      <Modal.Backdrop className="bg-transparent">
        <Modal.Container className="p-0">
          <Modal.Dialog className="alfy-settings-enter flex h-dvh w-screen max-w-none flex-row overflow-hidden rounded-none border-0 bg-surface p-0 shadow-none">
            {/* ── Navigation ── */}
            {showNav && (
              <nav
                aria-label={t.guild.settings.navAria}
                className={cn('alfy-sidebar flex shrink-0 justify-end overflow-y-auto', isMobile ? 'w-full' : 'w-[max(232px,calc((100vw-740px)/2-24px))]')}
              >
                <div className={cn('flex w-full flex-col py-15 pr-2 pl-5', !isMobile && 'max-w-[218px]')}>
                  <div className="truncate px-2.5 pb-1.5 text-xs font-bold tracking-[0.02em] text-muted uppercase">{title}</div>
                  {visibleGroups.map((group, gi) => (
                    <div key={group.id} className={cn(gi > 0 && 'mt-2 border-t border-separator pt-2')}>
                      {group.title && <p className="px-2.5 pt-1.5 pb-1.5 text-xs font-bold tracking-[0.02em] text-muted uppercase">{group.title}</p>}
                      {group.items.map((item) => {
                        const Icon = item.icon;
                        const current = item.id === active && !isMobile;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => select(item.id)}
                            aria-current={current ? 'page' : undefined}
                            className={cn(
                              'mb-0.5 flex h-8 w-full cursor-pointer items-center gap-2 rounded-md px-2.5 text-left text-[15px] font-medium outline-none transition-colors duration-(--dur-1) focus-visible:ring-2 focus-visible:ring-focus',
                              item.danger
                                ? 'text-danger hover:bg-danger/10'
                                : current
                                  ? 'bg-foreground/10 text-foreground'
                                  : 'text-muted hover:bg-foreground/6 hover:text-foreground',
                            )}
                          >
                            {Icon && <Icon className="size-4 shrink-0" aria-hidden />}
                            <span className="truncate">{item.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </nav>
            )}

            {/* ── Contenu ── */}
            {showContent && (
              <div className="relative flex min-w-0 flex-1 bg-surface">
                <ScrollShadow className="alfy-thin-scroll h-full min-w-0 flex-1 overflow-y-auto">
                  <div className={cn('mx-auto w-full max-w-[740px] px-6 pt-15 pb-28', isMobile && 'pt-4')}>
                    {isMobile && (
                      <Button variant="ghost" size="sm" className="mb-4 -ml-2 text-muted" onPress={() => (blocked ? nudge() : setMobileContent(false))}>
                        <ArrowLeft className="size-4" aria-hidden />
                        {t.guild.settings.back}
                      </Button>
                    )}
                    <FormContext.Provider value={setForm}>
                      <GuardContext.Provider value={guard}>{children}</GuardContext.Provider>
                    </FormContext.Provider>
                  </div>
                </ScrollShadow>

                {/* Fermer */}
                <div className={cn('shrink-0 pt-15 pr-5', isMobile && 'absolute top-3 right-3 pt-0 pr-0')}>
                  <button
                    type="button"
                    onClick={tryClose}
                    aria-label={t.guild.settings.close}
                    className="group/esc flex cursor-pointer flex-col items-center gap-1.5 outline-none"
                  >
                    <span className="flex size-9 items-center justify-center rounded-full border-2 border-muted/60 text-muted transition-colors duration-(--dur-1) group-hover/esc:border-foreground group-hover/esc:text-foreground group-focus-visible/esc:ring-2 group-focus-visible/esc:ring-focus">
                      <X className="size-4.5" strokeWidth={2.5} aria-hidden />
                    </span>
                    {!isMobile && <span className="text-[13px] font-semibold text-muted">{t.guild.settings.esc}</span>}
                  </button>
                </div>

                {/* Modifications non enregistrées */}
                <div
                  className={cn(
                    'pointer-events-none absolute inset-x-0 bottom-5 flex justify-center px-4 transition-[transform,opacity] duration-(--dur-3) ease-out-quart',
                    blocked ? 'translate-y-0 opacity-100' : 'translate-y-24 opacity-0',
                  )}
                >
                  <div
                    key={shake}
                    className={cn(
                      'pointer-events-auto flex w-full max-w-[700px] items-center gap-3 rounded-lg border px-4 py-2.5 shadow-lg',
                      shake > 0 ? 'alfy-shake border-danger bg-danger text-(--danger-foreground)' : 'border-border bg-overlay text-foreground',
                    )}
                  >
                    <p className="min-w-0 flex-1 text-sm font-medium">{t.guild.settings.unsaved}</p>
                    <Button variant="ghost" size="sm" className={shake > 0 ? 'text-(--danger-foreground)' : undefined} onPress={() => form?.reset()}>
                      {t.guild.settings.reset}
                    </Button>
                    <Button
                      size="sm"
                      className="bg-success text-(--success-foreground) hover:bg-success/90"
                      isPending={saving}
                      onPress={async () => {
                        if (!form) return;
                        setSaving(true);
                        try {
                          await form.save();
                        } finally {
                          setSaving(false);
                          setShake(0);
                        }
                      }}
                    >
                      {t.guild.settings.save}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
