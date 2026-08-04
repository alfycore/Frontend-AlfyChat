'use client';

import { Modal } from '@heroui/react';

interface SettingsOverlayProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

/**
 * Popup pour les paramètres (serveur / compte).
 *
 * En dessous de `sm`, reste plein écran : sur un téléphone, la navigation à
 * deux colonnes de `SettingsShell` a besoin de toute la largeur, et une
 * fenêtre flottante y serait illisible — c'est le comportement standard de
 * toute app mobile pour ses réglages.
 *
 * À partir de `sm`, redevient une vraie popup — centrée, à taille bornée,
 * coins arrondis, avec l'app visible (assombrie) derrière — au lieu de
 * l'ancien plein écran qui masquait tout, y compris sur un grand bureau où
 * rien ne le justifiait.
 */
export function SettingsOverlay({ isOpen, onOpenChange, children }: SettingsOverlayProps) {
  return (
    <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
      <Modal.Backdrop>
        <Modal.Container className="max-sm:p-0">
          <Modal.Dialog
            className="max-sm:h-dvh max-sm:max-h-dvh max-sm:w-dvw max-sm:max-w-none max-sm:rounded-none max-sm:border-none max-sm:shadow-none
              overflow-hidden p-0 sm:h-[min(85vh,760px)] sm:w-[min(92vw,1080px)] sm:max-w-none"
          >
            {children}
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
