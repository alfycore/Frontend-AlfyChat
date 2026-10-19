'use client';

/**
 * Éditeur de statut personnalisé : émoji + texte + « effacer après », avec
 * l'aperçu de ce que voient les autres. Monté une fois (racine du module
 * serveur), ouvert depuis le menu de statut.
 */

import { Button, Input, Label, ListBox, Modal, Select, TextField } from '@heroui/react';
import { X } from 'lucide-react';
import { useState } from 'react';

import { useAuth } from '@/hooks/use-auth';
import { resolveMediaUrl } from '@/lib/api';
import { EmojiPicker } from '@/components/alfy/chat/emoji-picker';
import { AlfyAvatar } from '@/components/alfy/primitives/alfy-avatar';
import type { AlfyPresence } from '@/components/alfy/mock/types';
import { useTranslation } from '@/components/locale-provider';
import { CLEAR_AFTER, useStatusStore, type ClearAfter } from '@/components/alfy/status/status-store';
import { useStatusActions } from '@/components/alfy/status/use-status';

function Editor({ onClose }: { onClose: () => void }) {
  const { t, tx } = useTranslation();
  const { user } = useAuth();
  const { setCustom } = useStatusActions();
  const me = user as (typeof user & { emoji?: string | null; customStatus?: string | null }) | null;
  // Brouillon initialisé à l'ouverture (le composant n'existe que fenêtre ouverte).
  const [text, setText] = useState(me?.customStatus ?? '');
  const [emoji, setEmoji] = useState<string | null>(me?.emoji ?? null);
  const [clearAfter, setClearAfter] = useState<ClearAfter>('today');
  if (!me) return null;

  const display = me.displayName || me.username;
  const save = () => {
    setCustom(text, emoji, clearAfter);
    onClose();
  };

  return (
    <>
      <Modal.CloseTrigger />
      <Modal.Header className="flex-col items-start gap-0.5">
        <Modal.Heading>{t.presence.dialogTitle}</Modal.Heading>
        <p className="text-sm text-muted">{t.presence.dialogDesc}</p>
      </Modal.Header>
      <Modal.Body className="flex flex-col gap-4">
        <form
          className="flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
        >
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border bg-surface-secondary text-xl">
            {emoji ? (
              <button type="button" aria-label={t.presence.removeEmoji} className="group/e relative cursor-pointer leading-none" onClick={() => setEmoji(null)}>
                <span className="transition-opacity duration-(--dur-1) group-hover/e:opacity-30">{emoji}</span>
                <X className="absolute inset-0 m-auto size-4 opacity-0 transition-opacity duration-(--dur-1) group-hover/e:opacity-100" aria-hidden />
              </button>
            ) : (
              <EmojiPicker onPick={setEmoji} showStickers={false} />
            )}
          </span>
          <TextField value={text} onChange={(v) => setText(v.slice(0, 100))} aria-label={t.presence.dialogTitle} className="flex-1">
            <Input placeholder={t.presence.placeholder} autoFocus maxLength={100} />
          </TextField>
        </form>
        <p className="-mt-2 text-right text-xs text-muted tabular-nums">{tx(t.presence.counter, { n: text.length })}</p>

        <Select value={clearAfter} onChange={(k) => setClearAfter(String(k) as ClearAfter)} aria-label={t.presence.clearAfter}>
          <Label className="text-xs text-muted">{t.presence.clearAfter}</Label>
          <Select.Trigger>
            <Select.Value />
            <Select.Indicator />
          </Select.Trigger>
          <Select.Popover>
            <ListBox>
              {CLEAR_AFTER.map((c) => (
                <ListBox.Item key={c} id={c} textValue={t.presence.clearOptions[c]}>
                  {t.presence.clearOptions[c]}
                  <ListBox.ItemIndicator />
                </ListBox.Item>
              ))}
            </ListBox>
          </Select.Popover>
        </Select>

        <section>
          <h3 className="mb-2 text-xs font-semibold tracking-wide text-muted uppercase">{t.presence.preview}</h3>
          <div className="flex items-center gap-3 rounded-xl border border-border bg-surface-secondary p-3">
            <AlfyAvatar
              name={display}
              avatarUrl={resolveMediaUrl(me.avatarUrl ?? undefined)}
              size="md"
              status={((me.status as AlfyPresence) ?? 'online') as AlfyPresence}
              statusRingClass="ring-(--surface-secondary)"
            />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">{display}</p>
              <p className="flex min-w-0 items-center gap-1 truncate text-xs text-muted">
                {emoji && <span className="text-sm leading-none">{emoji}</span>}
                <span className="truncate">{text.trim() || t.presence.placeholder}</span>
              </p>
            </div>
          </div>
        </section>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onPress={onClose}>
          {t.presence.cancel}
        </Button>
        <Button variant="primary" onPress={save}>
          {t.presence.save}
        </Button>
      </Modal.Footer>
    </>
  );
}

export function CustomStatusDialog() {
  const open = useStatusStore((s) => s.editorOpen);
  const close = () => useStatusStore.getState().closeEditor();
  return (
    <Modal isOpen={open} onOpenChange={(o) => !o && close()}>
      <Modal.Backdrop>
        <Modal.Container>
          <Modal.Dialog className="sm:max-w-md">{open && <Editor onClose={close} />}</Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
