'use client';

/**
 * Visualiseur plein écran pour les images d'un message.
 *
 * Deux choix d'implémentation qui méritent une explication :
 *
 *  - Le zoom n'est PAS un glisser-déposer maison. On agrandit l'image au-delà
 *    du conteneur et on laisse le navigateur gérer le déplacement via son
 *    propre défilement — ça marche à la souris, au pavé tactile et au doigt,
 *    sans réimplémenter l'inertie ni les limites, et ça reste accessible au
 *    clavier.
 *
 *  - `Modal.Dialog` est neutralisé (transparent, sans bordure ni ombre) et
 *    repositionné en `fixed inset-0` : on ne dépend plus de la largeur que la
 *    modale se donne. Sans ça, le dialogue s'étirait sur toute la fenêtre,
 *    l'image se retrouvait collée au bord gauche et la barre d'outils étalée
 *    d'un bord à l'autre. Le centrage est fait ici, explicitement.
 */

import { Button, Modal, Tooltip } from '@heroui/react';
import { ChevronLeft, ChevronRight, Download, X, ZoomIn, ZoomOut } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

import type { AlfyAttachment } from '@/components/alfy/mock/types';
import { useTranslation } from '@/components/locale-provider';
import { cn } from '@/lib/utils';

/**
 * Le service media renomme les fichiers `{uuid}-{uuid}.{ext}` : la convention
 * `[attach:img]:<url>` ne transporte pas le nom d'origine, et `map.ts` retombe
 * donc sur le nom de fichier. Afficher « fb4399b0-45a8-…-4af4c6.webp » comme
 * titre n'apprend rien à personne — mieux vaut ne rien afficher.
 */
const NOM_GENERE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(-[0-9a-f-]{36})?\.[a-z0-9]+$/i;

function nomLisible(nom: string): string | null {
  const propre = (nom ?? '').trim();
  if (!propre || NOM_GENERE.test(propre)) return null;
  return propre;
}

interface ImageLightboxProps {
  /** Toutes les images du message — permet de naviguer sans refermer. */
  images: AlfyAttachment[];
  /** Index affiché, ou `null` quand le visualiseur est fermé. */
  index: number | null;
  onIndexChange: (index: number) => void;
  onClose: () => void;
}

export function ImageLightbox({ images, index, onIndexChange, onClose }: ImageLightboxProps) {
  const { t } = useTranslation();
  const [agrandi, setAgrandi] = useState(false);
  const zoneRef = useRef<HTMLDivElement>(null);

  const ouvert = index !== null && index >= 0 && index < images.length;
  const image = ouvert ? images[index] : null;
  const precedent = ouvert && index > 0;
  const suivant = ouvert && index < images.length - 1;

  /* Changer d'image doit repartir en vue ajustée : rester zoomé sur la
     précédente donnerait un cadrage arbitraire sur la suivante. */
  useEffect(() => {
    setAgrandi(false);
    zoneRef.current?.scrollTo({ top: 0, left: 0 });
  }, [index]);

  const aller = useCallback(
    (delta: number) => {
      if (index === null) return;
      const cible = index + delta;
      if (cible >= 0 && cible < images.length) onIndexChange(cible);
    },
    [index, images.length, onIndexChange],
  );

  /* Les flèches ne sont branchées que lorsque le visualiseur est ouvert :
     sinon elles captureraient la navigation du fil derrière. */
  useEffect(() => {
    if (!ouvert) return;
    const surTouche = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') aller(-1);
      else if (e.key === 'ArrowRight') aller(1);
    };
    window.addEventListener('keydown', surTouche);
    return () => window.removeEventListener('keydown', surTouche);
  }, [ouvert, aller]);

  if (!ouvert || !image?.url) return null;
  const url = image.url;
  const titre = nomLisible(image.name);

  return (
    <Modal isOpen onOpenChange={(o) => { if (!o) onClose(); }}>
      <Modal.Backdrop variant="opaque">
        <Modal.Container>
          <Modal.Dialog
            aria-label={titre ?? 'Image'}
            /* Neutralisé et repositionné : voir l'en-tête du fichier. Le clic
               sur cette surface — donc à côté de l'image — referme. */
            className="fixed inset-0 flex h-full max-h-none w-full max-w-none items-center justify-center border-0 bg-transparent p-4 shadow-none sm:max-w-none"
            onClick={onClose}
          >
            {/* `w-fit` : le cadre prend la largeur de l'image, ce qui aligne
                automatiquement la barre d'outils dessus. */}
            <div
              className="flex max-h-full w-fit max-w-full flex-col gap-2"
              /* Tout ce qui est DANS le cadre ne referme pas : sinon cliquer un
                 bouton de la barre fermerait la modale au passage. */
              onClick={(e) => e.stopPropagation()}
            >
              {/* Barre d'outils — au-dessus de l'image, jamais par-dessus :
                  un bouton flottant sur la photo masque toujours quelque chose. */}
              <div className="flex w-full items-center gap-1">
                {titre ? (
                  <p className="min-w-0 flex-1 truncate text-sm text-white/90">{titre}</p>
                ) : (
                  <span className="flex-1" />
                )}

                {images.length > 1 && (
                  <span className="shrink-0 px-1 text-xs tabular-nums text-white/60">
                    {index + 1} / {images.length}
                  </span>
                )}

                <Tooltip delay={600}>
                  <Button
                    isIconOnly
                    size="sm"
                    variant="ghost"
                    aria-label={agrandi ? t.chat.lightbox.zoomOut : t.chat.lightbox.zoomIn}
                    onPress={() => setAgrandi((v) => !v)}
                    className="text-white/80 hover:text-white"
                  >
                    {agrandi
                      ? <ZoomOut className="size-4" aria-hidden />
                      : <ZoomIn className="size-4" aria-hidden />}
                  </Button>
                  <Tooltip.Content>
                    <p>{agrandi ? t.chat.lightbox.zoomOut : t.chat.lightbox.zoomIn}</p>
                  </Tooltip.Content>
                </Tooltip>

                <Tooltip delay={600}>
                  <Button
                    isIconOnly
                    size="sm"
                    variant="ghost"
                    aria-label={t.messageItem.download}
                    onPress={() => {
                      const lien = document.createElement('a');
                      lien.href = url;
                      lien.download = image.name;
                      lien.rel = 'noopener noreferrer';
                      lien.click();
                    }}
                    className="text-white/80 hover:text-white"
                  >
                    <Download className="size-4" aria-hidden />
                  </Button>
                  <Tooltip.Content>
                    <p>{t.messageItem.download}</p>
                  </Tooltip.Content>
                </Tooltip>

                {/* `slot="close"` est le motif de composition documenté par
                    HeroUI : il ferme sans câblage d'état et se place dans le
                    flux de la barre — contrairement à `Modal.CloseTrigger`, qui
                    se positionne en absolu dans un coin du dialogue. */}
                <Tooltip delay={600}>
                  <Button
                    isIconOnly
                    size="sm"
                    variant="ghost"
                    slot="close"
                    aria-label={t.messageItem.closeLightbox}
                    className="text-white/80 hover:text-white"
                  >
                    <X className="size-4" aria-hidden />
                  </Button>
                  <Tooltip.Content>
                    <p>{t.messageItem.closeLightbox}</p>
                  </Tooltip.Content>
                </Tooltip>
              </div>

              <div className="flex min-h-0 items-center justify-center gap-2">
                {images.length > 1 && (
                  <Button
                    isIconOnly
                    size="sm"
                    variant="ghost"
                    aria-label={t.chat.lightbox.previousImage}
                    isDisabled={!precedent}
                    onPress={() => aller(-1)}
                    className="shrink-0 text-white/80 hover:text-white disabled:opacity-25"
                  >
                    <ChevronLeft className="size-5" aria-hidden />
                  </Button>
                )}

                <div
                  ref={zoneRef}
                  className={cn(
                    'flex min-h-0 items-center justify-center rounded-lg',
                    // Agrandi : c'est le défilement natif du conteneur qui sert
                    // de déplacement — pas de glisser-déposer réimplémenté.
                    agrandi ? 'cursor-zoom-out overflow-auto' : 'cursor-zoom-in overflow-hidden',
                  )}
                  onClick={() => setAgrandi((v) => !v)}
                >
                  <img
                    src={url}
                    alt={titre ?? ''}
                    className={cn(
                      // Durée via le jeton --dur-2 : globals.css le met à 0 sous
                      // `prefers-reduced-motion` ET sous le réglage in-app
                      // `[data-motion="reduced"]`. Une valeur en dur échapperait
                      // au second.
                      'block select-none rounded-lg transition-[max-width,max-height] duration-(--dur-2)',
                      agrandi
                        ? 'max-h-none max-w-none'
                        : 'max-h-[calc(100vh-7rem)] max-w-[88vw] object-contain',
                    )}
                    draggable={false}
                  />
                </div>

                {images.length > 1 && (
                  <Button
                    isIconOnly
                    size="sm"
                    variant="ghost"
                    aria-label={t.chat.lightbox.nextImage}
                    isDisabled={!suivant}
                    onPress={() => aller(1)}
                    className="shrink-0 text-white/80 hover:text-white disabled:opacity-25"
                  >
                    <ChevronRight className="size-5" aria-hidden />
                  </Button>
                )}
              </div>
            </div>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
