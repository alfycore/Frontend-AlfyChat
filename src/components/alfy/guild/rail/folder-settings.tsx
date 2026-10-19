'use client';

/** Réglages d'un dossier du rail : nom et couleur (comme Discord). */

import { Button, ColorSwatch, Input, Label, Modal, TextField } from '@heroui/react';
import { Check } from 'lucide-react';
import { useState } from 'react';

import { useTranslation } from '@/components/locale-provider';
import { cn } from '@/lib/utils';
import { useGuildPrefs, type GuildFolder } from '@/components/alfy/guild/prefs';

/** Palette Discord des dossiers (couleurs de marque, lisibles en clair comme en sombre). */
export const FOLDER_COLORS = ['#5865f2', '#57f287', '#fee75c', '#eb459e', '#ed4245', '#3ba55c', '#faa61a', '#00b0f4', '#9b59b6', '#99aab5'];

export function FolderSettingsModal({ folder, onClose }: { folder: GuildFolder | null; onClose: () => void }) {
  return (
    <Modal isOpen={!!folder} onOpenChange={(open) => !open && onClose()}>
      <Modal.Backdrop>
        <Modal.Container>
          <Modal.Dialog className="sm:max-w-md">
            {folder && <FolderForm key={folder.id} folder={folder} onClose={onClose} />}
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}

function FolderForm({ folder, onClose }: { folder: GuildFolder; onClose: () => void }) {
  const { t } = useTranslation();
  const updateFolder = useGuildPrefs((s) => s.updateFolder);
  const [name, setName] = useState(folder.name ?? '');
  const [color, setColor] = useState<string | undefined>(folder.color);

  const save = () => {
    updateFolder(folder.id, { name: name.trim() || undefined, color });
    onClose();
  };

  return (
    <>
      <Modal.CloseTrigger />
      <Modal.Header>
        <Modal.Heading>{t.guild.folder.title}</Modal.Heading>
      </Modal.Header>
      <Modal.Body className="flex flex-col gap-5">
        <TextField value={name} onChange={setName} autoFocus>
          <Label>{t.guild.folder.name}</Label>
          <Input placeholder={t.guild.rail.folderUnnamed} maxLength={40} onKeyDown={(e) => e.key === 'Enter' && save()} />
        </TextField>
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold tracking-wide text-muted uppercase">{t.guild.folder.color}</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setColor(undefined)}
              aria-pressed={color === undefined}
              aria-label={t.guild.folder.defaultColor}
              className={cn(
                'flex size-8 cursor-pointer items-center justify-center rounded-md bg-accent outline-none transition-transform duration-(--dur-1) active:scale-95 focus-visible:ring-2 focus-visible:ring-focus',
              )}
            >
              {color === undefined && <Check className="size-4 text-accent-foreground" strokeWidth={3} />}
            </button>
            {FOLDER_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                aria-pressed={color === c}
                aria-label={c}
                className="relative cursor-pointer rounded-md outline-none transition-transform duration-(--dur-1) active:scale-95 focus-visible:ring-2 focus-visible:ring-focus"
              >
                <ColorSwatch color={c} size="lg" />
                {color === c && <Check className="absolute inset-0 m-auto size-4 text-white drop-shadow" strokeWidth={3} />}
              </button>
            ))}
          </div>
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="tertiary" onPress={onClose}>
          {t.common.cancel}
        </Button>
        <Button variant="primary" onPress={save}>
          {t.guild.common.save}
        </Button>
      </Modal.Footer>
    </>
  );
}
