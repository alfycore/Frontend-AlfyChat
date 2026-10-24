'use client';

import { useState } from 'react';
import { Button, Modal } from '@heroui/react';
import { Trash2 } from 'lucide-react';

/** Confirmation d'une action destructive dans la console admin. */
export function ConfirmDialog({
  isOpen,
  title,
  description,
  confirmLabel = 'Supprimer',
  onConfirm,
  onClose,
}: {
  isOpen: boolean;
  title: string;
  description: React.ReactNode;
  confirmLabel?: string;
  onConfirm: () => Promise<void> | void;
  onClose: () => void;
}) {
  const [pending, setPending] = useState(false);

  const confirm = async () => {
    setPending(true);
    try {
      await onConfirm();
    } finally {
      setPending(false);
    }
  };

  return (
    <Modal.Backdrop isOpen={isOpen} onOpenChange={(o) => !o && !pending && onClose()}>
      <Modal.Container>
        <Modal.Dialog className="sm:max-w-[420px]">
          <Modal.CloseTrigger />
          <Modal.Header>
            <Modal.Icon className="bg-danger/12 text-danger">
              <Trash2 className="size-5" aria-hidden />
            </Modal.Icon>
            <Modal.Heading>{title}</Modal.Heading>
          </Modal.Header>
          <Modal.Body>
            <p className="text-sm text-muted">{description}</p>
          </Modal.Body>
          <Modal.Footer>
            <Button slot="close" variant="tertiary" isDisabled={pending}>Annuler</Button>
            <Button variant="danger" onPress={confirm} isPending={pending}>{confirmLabel}</Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
