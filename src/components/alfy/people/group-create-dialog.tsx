'use client';

import { Button, Checkbox, CheckboxGroup, Input, Label, Modal, TextField, toast } from '@heroui/react';
import { Users } from 'lucide-react';
import { useState } from 'react';

import { USERS } from '@/components/alfy/mock/data';
import { AlfyAvatar } from '@/components/alfy/primitives/alfy-avatar';

const FRIENDS = USERS.filter((u) => u.id !== 'u-me' && u.id !== 'u-alfybot');

/** Bouton + modale de création d'un groupe (choix des membres + nom). */
export function GroupCreateDialog({ trigger }: { trigger: React.ReactNode }) {
  const [selected, setSelected] = useState<string[]>([]);
  const [name, setName] = useState('');

  return (
    <Modal>
      {trigger}
      <Modal.Backdrop>
        <Modal.Container>
          <Modal.Dialog className="sm:max-w-[420px]">
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Icon className="bg-default text-foreground">
                <Users className="size-5" />
              </Modal.Icon>
              <Modal.Heading>Nouveau groupe</Modal.Heading>
            </Modal.Header>
            <Modal.Body className="flex flex-col gap-4">
              <TextField value={name} onChange={setName}>
                <Label>Nom du groupe (facultatif)</Label>
                <Input placeholder="Ex. Équipe design" />
              </TextField>
              <CheckboxGroup value={selected} onChange={setSelected} aria-label="Membres">
                <Label>Ajouter des membres</Label>
                <div className="max-h-56 overflow-y-auto">
                  {FRIENDS.map((u) => (
                    <Checkbox key={u.id} value={u.id} className="w-full py-1.5">
                      <Checkbox.Control>
                        <Checkbox.Indicator />
                      </Checkbox.Control>
                      <span className="flex items-center gap-2">
                        <AlfyAvatar name={u.displayName} avatarUrl={u.avatarUrl} size="sm" status={u.status} statusRingClass="ring-overlay" />
                        <span className="text-sm">{u.displayName}</span>
                      </span>
                    </Checkbox>
                  ))}
                </div>
              </CheckboxGroup>
            </Modal.Body>
            <Modal.Footer>
              <Button slot="close" variant="tertiary">
                Annuler
              </Button>
              <Button
                slot="close"
                isDisabled={selected.length === 0}
                onPress={() =>
                  toast('Groupe créé', {
                    description: `${selected.length + 1} membres${name ? ` — ${name}` : ''}`,
                  })
                }
              >
                Créer le groupe
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
