'use client';

import { Modal } from '@heroui/react';

interface SettingsOverlayProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

/**
 * Popup plein écran pour les paramètres (serveur / compte), façon Discord :
 * un Modal HeroUI sans marges ni coins arrondis, posé au-dessus de l'app.
 */
export function SettingsOverlay({ isOpen, onOpenChange, children }: SettingsOverlayProps) {
  return (
    <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
      <Modal.Backdrop className="bg-background/98 backdrop-blur-sm">
        <Modal.Container className="p-0">
          <Modal.Dialog className="h-dvh max-h-dvh w-dvw max-w-none rounded-none border-none p-0 shadow-none">
            {children}
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
