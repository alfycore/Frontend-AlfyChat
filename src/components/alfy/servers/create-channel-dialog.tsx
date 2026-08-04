'use client';

import { Button, Input, Label, ListBox, Modal, RadioGroup, Select, Spinner, TextField } from '@heroui/react';
import { FolderPlus, Hash, Megaphone, Volume2 } from 'lucide-react';
import { useEffect, useState } from 'react';

import type { AlfyCategory } from '@/components/alfy/mock/types';
import { HostingCategoryRadio } from '@/components/alfy/servers/hosting-category-radio';

export type CreatableChannelType = 'text' | 'voice' | 'announcement';

interface CreateChannelDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  /** 'category' masque le choix de type et le sélecteur de catégorie parente. */
  mode: 'channel' | 'category';
  categories: AlfyCategory[];
  defaultCategoryId?: string | null;
  onCreate: (data: { name: string; type: CreatableChannelType | 'category'; parentId: string | null }) => Promise<boolean> | void;
}

const NO_CATEGORY = '__none__';

export function CreateChannelDialog({ isOpen, onOpenChange, mode, categories, defaultCategoryId, onCreate }: CreateChannelDialogProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState<CreatableChannelType>('text');
  const [parentId, setParentId] = useState<string>(defaultCategoryId ?? NO_CATEGORY);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setName('');
    setType('text');
    setParentId(defaultCategoryId ?? NO_CATEGORY);
  }, [isOpen, defaultCategoryId]);

  const creer = async () => {
    if (name.trim().length < 1 || submitting) return;
    setSubmitting(true);
    try {
      const ok = await onCreate({
        name: name.trim(),
        type: mode === 'category' ? 'category' : type,
        parentId: mode === 'category' ? null : parentId === NO_CATEGORY ? null : parentId,
      });
      if (ok !== false) onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
      <Modal.Backdrop>
        <Modal.Container>
          <Modal.Dialog className="sm:max-w-105">
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Icon className="bg-default text-foreground">
                {mode === 'category' ? <FolderPlus className="size-4.5" /> : <Hash className="size-4.5" />}
              </Modal.Icon>
              <Modal.Heading>{mode === 'category' ? 'Créer une catégorie' : 'Créer un salon'}</Modal.Heading>
            </Modal.Header>
            <Modal.Body className="flex flex-col gap-4">
              <TextField
                value={name}
                onChange={setName}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void creer();
                }}
              >
                <Label>Nom {mode === 'category' ? 'de la catégorie' : 'du salon'}</Label>
                <Input placeholder={mode === 'category' ? 'Ex. Général' : 'nouveau-salon'} autoFocus />
              </TextField>

              {mode === 'channel' && (
                <>
                  <RadioGroup
                    value={type}
                    onChange={(v) => setType(v as CreatableChannelType)}
                    aria-label="Type de salon"
                    className="grid gap-3 sm:grid-cols-3"
                  >
                    <HostingCategoryRadio value="text" icon={Hash} title="Texte" subtitle="Messages écrits" />
                    <HostingCategoryRadio value="announcement" icon={Megaphone} title="Annonces" subtitle="Diffusion" />
                    <HostingCategoryRadio value="voice" icon={Volume2} title="Vocal" subtitle="Voix" />
                  </RadioGroup>

                  {categories.length > 0 && (
                    <Select
                      selectedKey={parentId}
                      onSelectionChange={(k) => setParentId(String(k))}
                      aria-label="Catégorie"
                    >
                      <Label>Catégorie (facultatif)</Label>
                      <Select.Trigger>
                        <Select.Value />
                        <Select.Indicator />
                      </Select.Trigger>
                      <Select.Popover>
                        <ListBox>
                          <ListBox.Item id={NO_CATEGORY} textValue="Aucune">
                            Aucune
                            <ListBox.ItemIndicator />
                          </ListBox.Item>
                          {categories.map((c) => (
                            <ListBox.Item key={c.id} id={c.id} textValue={c.name}>
                              {c.name}
                              <ListBox.ItemIndicator />
                            </ListBox.Item>
                          ))}
                        </ListBox>
                      </Select.Popover>
                    </Select>
                  )}
                </>
              )}
            </Modal.Body>
            <Modal.Footer>
              <Button slot="close" variant="tertiary">
                Annuler
              </Button>
              <Button onPress={creer} isDisabled={name.trim().length < 1 || submitting}>
                {submitting ? <Spinner size="sm" /> : 'Créer'}
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
