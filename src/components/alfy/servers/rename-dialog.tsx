'use client';

import { Button, Input, Label, Modal, Spinner, TextField } from '@heroui/react';
import { Pencil } from 'lucide-react';
import { useEffect, useState } from 'react';

interface RenameDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  fieldLabel: string;
  initialValue: string;
  onSave: (name: string) => Promise<boolean> | void;
}

/** Petite modale générique « renommer X » — salon, catégorie… */
export function RenameDialog({ isOpen, onOpenChange, title, fieldLabel, initialValue, onSave }: RenameDialogProps) {
  const [value, setValue] = useState(initialValue);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) setValue(initialValue);
  }, [isOpen, initialValue]);

  const enregistrer = async () => {
    if (!value.trim() || saving) return;
    setSaving(true);
    try {
      const ok = await onSave(value.trim());
      if (ok !== false) onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
      <Modal.Backdrop>
        <Modal.Container>
          <Modal.Dialog className="sm:max-w-95">
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Icon className="bg-default text-foreground">
                <Pencil className="size-4.5" />
              </Modal.Icon>
              <Modal.Heading>{title}</Modal.Heading>
            </Modal.Header>
            <Modal.Body>
              <TextField
                value={value}
                onChange={setValue}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void enregistrer();
                }}
              >
                <Label>{fieldLabel}</Label>
                <Input autoFocus />
              </TextField>
            </Modal.Body>
            <Modal.Footer>
              <Button slot="close" variant="tertiary">
                Annuler
              </Button>
              <Button onPress={enregistrer} isDisabled={!value.trim() || saving}>
                {saving ? <Spinner size="sm" /> : 'Enregistrer'}
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
