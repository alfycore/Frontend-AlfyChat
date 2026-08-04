'use client';

import { Button, Modal } from '@heroui/react';
import { Hash, Plus, SendHorizontal, Smile, Volume2 } from 'lucide-react';

import { useTranslation } from '@/components/locale-provider';
import { APP_ICONS, appIconDataUri } from '@/hooks/use-app-prefs';

const CHANNELS = ['général', 'annonces', 'design', 'incidents'];
const MESSAGES = [
  { auteur: 'Camille', couleur: 'var(--accent)', heure: '14:02', texte: 'On garde ce thème ? Les bordures ressortent mieux.' },
  { auteur: 'Nadir', couleur: undefined, heure: '14:03', texte: 'Oui, et le contraste des salons est bon en sombre profond.' },
  { auteur: 'Camille', couleur: 'var(--accent)', heure: '14:05', texte: 'Parfait. Je verrouille la palette pour la v2.' },
];

/**
 * Aperçu du thème — un AlfyChat miniature rendu avec les mêmes jetons CSS que
 * l'app. Tout changement de thème, de palette ou de profondeur est visible ici
 * immédiatement, sans quitter les réglages.
 */
export function ThemePreview({
  isOpen,
  onOpenChange,
  appIcon,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  appIcon: string;
}) {
  const { t } = useTranslation();
  return (
    <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
      <Modal.Backdrop className="bg-background/80 backdrop-blur-sm">
        <Modal.Container>
          <Modal.Dialog className="w-full max-w-3xl overflow-hidden p-0">
            <div className="flex items-center justify-between border-b border-separator px-5 py-3.5">
              <div>
                <h2 className="text-sm font-bold">{t.profile.appearance.preview.title}</h2>
                <p className="text-xs text-muted">{t.profile.appearance.preview.description}</p>
              </div>
              <Button size="sm" variant="ghost" onPress={() => onOpenChange(false)}>
                {t.common.close}
              </Button>
            </div>

            <div className="flex h-88 bg-background text-foreground">
              {/* Rail serveurs */}
              <div className="flex w-14 shrink-0 flex-col items-center gap-2 border-r border-separator bg-surface py-3">
                <img src={appIconDataUri(appIcon)} alt="" className="size-9 rounded-xl" />
                <span className="h-px w-6 bg-separator" />
                {['#7c5cff', '#34d399', '#fb923c'].map((c) => (
                  <span key={c} className="size-9 rounded-2xl" style={{ background: c, opacity: 0.85 }} />
                ))}
                <span className="flex size-9 items-center justify-center rounded-2xl border border-dashed border-border text-muted">
                  <Plus className="size-4" aria-hidden />
                </span>
              </div>

              {/* Salons */}
              <div className="hidden w-44 shrink-0 flex-col border-r border-separator bg-surface sm:flex">
                <div className="flex h-11 items-center border-b border-separator px-3 text-xs font-bold">
                  Atelier Alfy
                </div>
                <div className="flex flex-col gap-0.5 p-2">
                  {CHANNELS.map((c, i) => (
                    <span
                      key={c}
                      className={[
                        'flex items-center gap-1.5 rounded-md px-2 py-1.5 text-[13px]',
                        i === 0 ? 'bg-surface-tertiary text-foreground' : 'text-muted',
                      ].join(' ')}
                    >
                      <Hash className="size-3.5 opacity-70" aria-hidden />
                      {c}
                    </span>
                  ))}
                  <span className="mt-1 flex items-center gap-1.5 rounded-md px-2 py-1.5 text-[13px] text-muted">
                    <Volume2 className="size-3.5 opacity-70" aria-hidden />
                    vocal
                  </span>
                </div>
              </div>

              {/* Conversation */}
              <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex h-11 items-center gap-1.5 border-b border-separator px-4 text-sm font-semibold">
                  <Hash className="size-4 text-muted" aria-hidden />
                  général
                </div>
                <div className="flex-1 space-y-3 overflow-hidden p-4">
                  {MESSAGES.map((m) => (
                    <div key={m.texte} className="flex gap-2.5">
                      <span className="mt-0.5 size-8 shrink-0 rounded-full bg-surface-tertiary" />
                      <div className="min-w-0">
                        <p className="flex items-baseline gap-2">
                          <span className="text-[13px] font-semibold" style={m.couleur ? { color: m.couleur } : undefined}>
                            {m.auteur}
                          </span>
                          <span className="text-[10px] text-muted">{m.heure}</span>
                        </p>
                        <p className="text-sm text-foreground/90">{m.texte}</p>
                      </div>
                    </div>
                  ))}
                  <div className="ml-11 flex gap-1">
                    <span className="rounded-full border border-accent/50 bg-accent/15 px-2 py-0.5 text-xs">👍 3</span>
                    <span className="rounded-full bg-surface-secondary px-2 py-0.5 text-xs text-muted">🎨 1</span>
                  </div>
                </div>
                <div className="p-3">
                  <div className="flex items-center gap-2 rounded-xl border border-border bg-field px-3 py-2">
                    <span className="flex-1 text-sm text-field-ph">Envoyer un message dans #général</span>
                    <Smile className="size-4 text-muted" aria-hidden />
                    <span className="flex size-6 items-center justify-center rounded-md bg-accent text-accent-fg">
                      <SendHorizontal className="size-3.5" aria-hidden />
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}

/**
 * Aperçu de l'icône — l'icône choisie remise dans ses contextes réels :
 * onglet de navigateur, écran d'accueil mobile, barre des tâches.
 */
export function AppIconPreview({
  isOpen,
  onOpenChange,
  appIcon,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  appIcon: string;
}) {
  const { t } = useTranslation();
  const meta = APP_ICONS.find((i) => i.id === appIcon) ?? APP_ICONS[0];
  const src = appIconDataUri(appIcon);

  return (
    <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
      <Modal.Backdrop className="bg-background/80 backdrop-blur-sm">
        <Modal.Container>
          <Modal.Dialog className="w-full max-w-lg overflow-hidden p-0">
            <div className="flex items-center justify-between border-b border-separator px-5 py-3.5">
              <div>
                <h2 className="text-sm font-bold">{t.profile.appearance.iconPreview.title}</h2>
                <p className="text-xs text-muted">{meta.nom}</p>
              </div>
              <Button size="sm" variant="ghost" onPress={() => onOpenChange(false)}>
                {t.common.close}
              </Button>
            </div>

            <div className="space-y-5 p-5">
              {/* Onglet de navigateur */}
              <div>
                <p className="mb-2 text-[11px] font-semibold tracking-wider text-muted uppercase">{t.profile.appearance.iconPreview.tabLabel}</p>
                <div className="flex items-center gap-2 rounded-t-lg border border-b-0 border-border bg-surface-secondary px-3 py-2">
                  <img src={src} alt="" className="size-4 rounded-[3px]" />
                  <span className="text-xs">AlfyChat</span>
                  <span className="ml-auto text-xs text-muted">✕</span>
                </div>
                <div className="h-6 rounded-b-lg border border-border bg-background" />
              </div>

              {/* Écran d'accueil */}
              <div>
                <p className="mb-2 text-[11px] font-semibold tracking-wider text-muted uppercase">{t.profile.appearance.iconPreview.homeScreenLabel}</p>
                <div className="flex items-end gap-4 rounded-lg border border-border bg-surface-secondary p-4">
                  <span className="flex flex-col items-center gap-1.5">
                    <img src={src} alt="" className="size-14 rounded-[1rem] shadow-lg" />
                    <span className="text-[10px] text-muted">AlfyChat</span>
                  </span>
                  <span className="flex flex-col items-center gap-1.5 opacity-40">
                    <span className="size-14 rounded-[1rem] bg-surface-tertiary" />
                    <span className="text-[10px] text-muted">Réglages</span>
                  </span>
                  <span className="flex flex-col items-center gap-1.5 opacity-40">
                    <span className="size-14 rounded-[1rem] bg-surface-tertiary" />
                    <span className="text-[10px] text-muted">Photos</span>
                  </span>
                </div>
              </div>

              {/* Tailles */}
              <div>
                <p className="mb-2 text-[11px] font-semibold tracking-wider text-muted uppercase">{t.profile.appearance.iconPreview.sizesLabel}</p>
                <div className="flex items-end gap-3">
                  {[16, 24, 32, 48, 64].map((s) => (
                    <img key={s} src={src} alt="" style={{ width: s, height: s }} className="rounded-[22%]" />
                  ))}
                </div>
              </div>
            </div>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
