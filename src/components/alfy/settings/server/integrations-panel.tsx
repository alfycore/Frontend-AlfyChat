'use client';

import { Button, Input, Label, ListBox, Select, Spinner, TextField, toast } from '@heroui/react';
import { Check, Copy, Link2, Trash2, Webhook } from 'lucide-react';
import { useEffect, useState } from 'react';

import { api } from '@/lib/api';
import type { AlfyServer } from '@/components/alfy/mock/types';
import { PanelHeader } from '@/components/alfy/settings/settings-shell';
import { SettingsSection } from '@/components/alfy/settings/section';
import { useTranslation } from '@/components/locale-provider';

interface Webhook {
  id: string;
  channelId: string;
  name: string;
  token: string;
}

function CopyButton({ value, copyLabel, copiedLabel }: { value: string; copyLabel: string; copiedLabel: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      size="sm"
      variant="ghost"
      onPress={() => {
        void navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
    >
      {copied ? <Check className="size-3.5 text-success" aria-hidden /> : <Copy className="size-3.5" aria-hidden />}
      {copied ? copiedLabel : copyLabel}
    </Button>
  );
}

export function IntegrationsPanel({ server }: { server: AlfyServer }) {
  const { t } = useTranslation();
  const textChannels = server.channels.filter((c) => c.type === 'text' || c.type === 'announcement');
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [name, setName] = useState('');
  const [channelId, setChannelId] = useState<string>(textChannels[0]?.id ?? '');
  const [submitting, setSubmitting] = useState(false);

  const reload = () => {
    api.getServerWebhooks(server.id).then((res) => {
      if (res.success && res.data) setWebhooks(res.data);
      setLoaded(true);
    });
  };

  useEffect(reload, [server.id]);

  const creer = async () => {
    if (!name.trim() || !channelId || submitting) return;
    setSubmitting(true);
    try {
      const res = await api.createServerWebhook(server.id, channelId, { name: name.trim() });
      if (!res.success) {
        toast.danger(t.integrationsPanel.createError, { description: res.error ?? t.integrationsPanel.retry });
        return;
      }
      setName('');
      reload();
      toast(t.integrationsPanel.webhookCreated, { description: name.trim() });
    } finally {
      setSubmitting(false);
    }
  };

  const supprimer = async (id: string) => {
    const res = await api.deleteServerWebhook(server.id, id);
    if (!res.success) {
      toast.danger(t.integrationsPanel.deleteError, { description: res.error });
      return;
    }
    setWebhooks((prev) => prev.filter((w) => w.id !== id));
  };

  const webhookUrl = (w: Webhook) => `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/servers/webhooks/${w.id}/${w.token}`;

  return (
    <div>
      <PanelHeader
        title={t.integrationsPanel.panelTitle}
        description={t.integrationsPanel.panelDescription}
      />

      {textChannels.length === 0 ? (
        <SettingsSection>
          <p className="p-4 text-sm text-muted">{t.integrationsPanel.needTextChannel}</p>
        </SettingsSection>
      ) : (
        <SettingsSection title={t.integrationsPanel.newWebhook}>
          <div className="flex flex-wrap items-end gap-3 p-4">
            <TextField value={name} onChange={setName} className="max-w-52">
              <Label>{t.integrationsPanel.name}</Label>
              <Input placeholder={t.integrationsPanel.namePlaceholder} />
            </TextField>
            <Select
              className="max-w-48"
              selectedKey={channelId}
              onSelectionChange={(k) => setChannelId(String(k))}
              aria-label={t.integrationsPanel.channel}
            >
              <Label>{t.integrationsPanel.channel}</Label>
              <Select.Trigger>
                <Select.Value />
                <Select.Indicator />
              </Select.Trigger>
              <Select.Popover>
                <ListBox>
                  {textChannels.map((c) => (
                    <ListBox.Item key={c.id} id={c.id} textValue={c.name}>
                      #{c.name}
                      <ListBox.ItemIndicator />
                    </ListBox.Item>
                  ))}
                </ListBox>
              </Select.Popover>
            </Select>
            <Button isDisabled={!name.trim() || !channelId || submitting} onPress={creer}>
              {submitting ? <Spinner size="sm" /> : t.common.create}
            </Button>
          </div>
        </SettingsSection>
      )}

      <SettingsSection title={t.integrationsPanel.activeWebhooks}>
        {!loaded ? (
          <div className="flex justify-center p-8">
            <Spinner size="sm" />
          </div>
        ) : webhooks.length === 0 ? (
          <div className="flex flex-col items-center gap-2 p-8 text-center text-sm text-muted">
            <Webhook className="size-6" aria-hidden />
            {t.integrationsPanel.noWebhooks}
          </div>
        ) : (
          <div className="flex flex-col">
            {webhooks.map((w) => {
              const ch = server.channels.find((c) => c.id === w.channelId);
              return (
                <div key={w.id} className="flex flex-wrap items-center gap-3 px-4 py-3 not-last:border-b not-last:border-separator">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-surface-secondary text-muted">
                    <Link2 className="size-4" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{w.name}</p>
                    <p className="text-xs text-muted">#{ch?.name ?? t.integrationsPanel.deletedChannel}</p>
                  </div>
                  <CopyButton value={webhookUrl(w)} copyLabel={t.integrationsPanel.copyUrl} copiedLabel={t.integrationsPanel.copied} />
                  <Button isIconOnly size="sm" variant="ghost" aria-label={t.integrationsPanel.deleteAria} onPress={() => void supprimer(w.id)}>
                    <Trash2 className="size-3.5 text-danger" aria-hidden />
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </SettingsSection>
    </div>
  );
}
