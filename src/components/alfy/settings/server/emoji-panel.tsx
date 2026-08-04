'use client';

import { Button, Input, Label, Spinner, TextField, toast } from '@heroui/react';
import { Smile, Trash2, Upload } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { api, resolveMediaUrl } from '@/lib/api';
import { PanelHeader } from '@/components/alfy/settings/settings-shell';
import { SettingsSection } from '@/components/alfy/settings/section';
import { useTranslation } from '@/components/locale-provider';

interface Emoji {
  id: string;
  name: string;
  imageUrl: string;
  animated: boolean;
}

export function EmojiPanel({ serverId }: { serverId: string }) {
  const { t, tx } = useTranslation();
  const [emojis, setEmojis] = useState<Emoji[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [name, setName] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const reload = () => {
    api.getServerEmojis(serverId).then((res) => {
      if (res.success && res.data) setEmojis(res.data.map((e) => ({ ...e, imageUrl: resolveMediaUrl(e.imageUrl) ?? e.imageUrl })));
      setLoaded(true);
    });
  };

  useEffect(reload, [serverId]);

  const ajouter = async () => {
    if (!file || name.trim().length < 2 || submitting) return;
    setSubmitting(true);
    try {
      const up = await api.uploadImage(file, 'icon');
      if (!up.success || !up.data?.url) {
        toast.danger(t.emojiPanel.uploadError, { description: up.error ?? file.name });
        return;
      }
      const res = await api.createServerEmoji(serverId, { name: name.trim(), imageUrl: up.data.url });
      if (!res.success) {
        toast.danger(t.emojiPanel.createError, { description: res.error ?? t.emojiPanel.retry });
        return;
      }
      setName('');
      setFile(null);
      reload();
      toast(t.emojiPanel.emojiAdded, { description: `:${name.trim()}:` });
    } finally {
      setSubmitting(false);
    }
  };

  const supprimer = async (emojiId: string) => {
    const res = await api.deleteServerEmoji(serverId, emojiId);
    if (!res.success) {
      toast.danger(t.emojiPanel.deleteError, { description: res.error });
      return;
    }
    setEmojis((prev) => prev.filter((e) => e.id !== emojiId));
  };

  return (
    <div>
      <PanelHeader title={t.emojiPanel.panelTitle} description={t.emojiPanel.panelDescription} />

      <SettingsSection title={tx(t.emojiPanel.addSection, { n: emojis.length })}>
        <div className="flex flex-wrap items-end gap-3 p-4">
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            className="flex size-16 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-lg border border-dashed border-border bg-surface-2 text-muted transition-colors hover:border-accent hover:text-foreground"
          >
            {file ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={URL.createObjectURL(file)} alt="" className="size-full object-cover" />
            ) : (
              <Upload className="size-5" aria-hidden />
            )}
          </button>
          <input
            ref={fileInput}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          <TextField value={name} onChange={setName} className="max-w-48">
            <Label>{t.emojiPanel.name}</Label>
            <Input placeholder={t.emojiPanel.namePlaceholder} />
          </TextField>
          <Button isDisabled={!file || name.trim().length < 2 || submitting} onPress={ajouter}>
            {submitting ? <Spinner size="sm" /> : t.emojiPanel.add}
          </Button>
        </div>
      </SettingsSection>

      <SettingsSection title={t.emojiPanel.serverEmoji}>
        {!loaded ? (
          <div className="flex justify-center p-8">
            <Spinner size="sm" />
          </div>
        ) : emojis.length === 0 ? (
          <div className="flex flex-col items-center gap-2 p-8 text-center text-sm text-muted">
            <Smile className="size-6" aria-hidden />
            {t.emojiPanel.noEmoji}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 p-3 sm:grid-cols-3">
            {emojis.map((e) => (
              <div key={e.id} className="flex items-center gap-2 rounded-lg bg-surface-2 px-3 py-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={e.imageUrl} alt={e.name} className="size-7 shrink-0 rounded object-cover" />
                <span className="min-w-0 flex-1 truncate text-sm">:{e.name}:</span>
                <Button isIconOnly size="sm" variant="ghost" aria-label={t.emojiPanel.deleteAria} onPress={() => void supprimer(e.id)}>
                  <Trash2 className="size-3.5 text-danger" aria-hidden />
                </Button>
              </div>
            ))}
          </div>
        )}
      </SettingsSection>
    </div>
  );
}
