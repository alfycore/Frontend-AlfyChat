'use client';

import { useEffect, useState } from 'react';
import { Button, Chip, Input, Label, Switch, TextField, toast } from '@heroui/react';
import { Database, Lock } from 'lucide-react';

import { api } from '@/lib/api';
import { useAuth } from '@/hooks/use-auth';
import { PanelHeader } from '@/components/alfy/settings/settings-shell';
import { SettingsContent, SettingsRow, SettingsSection } from '@/components/alfy/settings/section';
import { LoadBar } from '@/components/alfy/admin/primitives';
import { useTranslation } from '@/components/locale-provider';

interface ExternalDbConfig {
  host: string;
  port: string;
  user: string;
  password: string;
  database: string;
}

const EMPTY_CONFIG: ExternalDbConfig = { host: '', port: '3306', user: '', password: '', database: '' };

/** Doit rester synchro avec DM_QUOTA_MAX_MESSAGES côté messages/src/types/dm-archive.ts */
const QUOTA_MAX_MESSAGES = 20_000;

interface ConversationQuota {
  id: string;
  name: string;
  messageCount: number;
  quotaUsagePercent: number;
}

export function ArchivesPanel() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [external, setExternal] = useState(false);
  const [configured, setConfigured] = useState(false);
  const [config, setConfig] = useState<ExternalDbConfig>(EMPTY_CONFIG);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [quotas, setQuotas] = useState<ConversationQuota[]>([]);
  const [quotasLoading, setQuotasLoading] = useState(true);

  useEffect(() => {
    api.getArchiveExternalDb().then((res: any) => {
      const data = res?.data ?? res;
      if (data?.configured) {
        setExternal(true);
        setConfigured(true);
        setConfig({ host: data.host ?? '', port: String(data.port ?? '3306'), user: data.user ?? '', password: '', database: data.database ?? '' });
      }
    }).catch(() => {});
  }, []);

  // Quota réel par conversation privée (messages sur le serveur / 20 000).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setQuotasLoading(true);
      try {
        const convRes: any = await api.getConversations();
        const conversations: any[] = convRes?.data ?? convRes ?? [];

        const results = await Promise.all(
          conversations.map(async (c) => {
            const statusRes: any = await api.getArchiveStatus(c.id).catch(() => null);
            const status = statusRes?.data ?? statusRes;
            if (!status) return null;

            const otherParticipant = (c.participants ?? []).find((p: any) => p.userId !== user?.id);
            const name =
              c.type === 'group'
                ? c.name || t.profile.archives.quota.groupFallbackName
                : otherParticipant?.displayName || otherParticipant?.username || t.profile.archives.quota.conversationFallbackName;

            return {
              id: c.id as string,
              name,
              messageCount: Number(status.serverMessageCount ?? 0),
              quotaUsagePercent: Number(status.quotaUsagePercent ?? 0),
            };
          }),
        );

        if (!cancelled) {
          setQuotas(
            results
              .filter((r): r is ConversationQuota => !!r && r.messageCount > 0)
              .sort((a, b) => b.quotaUsagePercent - a.quotaUsagePercent),
          );
        }
      } catch {
        if (!cancelled) setQuotas([]);
      } finally {
        if (!cancelled) setQuotasLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  const toConfigPayload = () => ({
    host: config.host.trim(),
    port: config.port ? parseInt(config.port, 10) : undefined,
    user: config.user.trim(),
    password: config.password,
    database: config.database.trim(),
  });

  const handleTest = async () => {
    if (!config.host || !config.user || !config.password || !config.database) {
      toast.danger(t.profile.archives.toast.fillRequired);
      return;
    }
    setTesting(true);
    try {
      const res: any = await api.testArchiveExternalDb(toConfigPayload());
      const data = res?.data ?? res;
      if (data?.ok) toast.success(t.profile.archives.toast.testSuccess);
      else toast.danger(data?.error || t.profile.archives.toast.testError);
    } catch {
      toast.danger(t.profile.archives.toast.testError);
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    if (!config.host || !config.user || !config.password || !config.database) {
      toast.danger(t.profile.archives.toast.fillRequired);
      return;
    }
    setSaving(true);
    try {
      const res: any = await api.saveArchiveExternalDb(toConfigPayload());
      if (res?.success !== false) {
        setConfigured(true);
        setConfig((c) => ({ ...c, password: '' }));
        toast.success(t.profile.archives.toast.saveSuccess);
      } else {
        toast.danger(res?.error || t.profile.archives.toast.saveError);
      }
    } catch (err: any) {
      toast.danger(err?.message || t.profile.archives.toast.saveError);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleExternal = async (v: boolean) => {
    setExternal(v);
    if (!v && configured) {
      try { await api.deleteArchiveExternalDb(); } catch {}
      setConfigured(false);
      setConfig(EMPTY_CONFIG);
    }
  };

  const handleExportAll = async () => {
    setExporting(true);
    try {
      const res: any = await api.exportMyData();
      if (res?.success) toast(t.profile.archives.toast.exportStarted, { description: t.profile.archives.toast.exportStartedDescription });
      else toast.danger(res?.error || t.profile.archives.toast.exportError);
    } catch {
      toast.danger(t.profile.archives.toast.exportError);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div>
      <PanelHeader
        title={t.profile.archives.title}
        description={t.profile.archives.description}
      />

      <div className="mb-6 flex items-start gap-3 rounded-lg border border-(--alfy-e2e)/25 bg-(--alfy-e2e-soft) p-4">
        <Lock className="mt-0.5 size-4 shrink-0 text-(--alfy-e2e)" aria-hidden />
        <p className="text-xs leading-relaxed text-foreground/80">
          {t.profile.archives.e2eeNotice}
        </p>
      </div>

      <SettingsSection title={t.profile.archives.quota.sectionTitle}>
        <SettingsContent className="flex flex-col gap-4">
          <p className="text-xs text-muted">
            {t.profile.archives.quota.description}
          </p>

          {quotasLoading ? (
            <p className="text-xs text-muted">{t.profile.archives.quota.loading}</p>
          ) : quotas.length === 0 ? (
            <p className="text-xs text-muted">{t.profile.archives.quota.empty}</p>
          ) : (
            <div className="flex max-h-64 flex-col gap-2 overflow-y-auto pr-1">
              {quotas.map((q) => (
                <div
                  key={q.id}
                  className="flex items-center justify-between gap-4 rounded-lg border border-border/60 px-3 py-2"
                >
                  <span className="min-w-0 flex-1 truncate text-xs font-medium">{q.name}</span>
                  <LoadBar
                    value={q.messageCount}
                    max={QUOTA_MAX_MESSAGES}
                    format={(v, m) => `${v.toLocaleString('fr-FR')} / ${m.toLocaleString('fr-FR')}`}
                  />
                </div>
              ))}
            </div>
          )}
        </SettingsContent>
      </SettingsSection>

      <SettingsSection title={t.profile.archives.externalDb.sectionTitle}>
        <SettingsRow
          label={t.profile.archives.externalDb.toggleLabel}
          description={t.profile.archives.externalDb.toggleDescription}
        >
          <Switch isSelected={external} onChange={handleToggleExternal} aria-label={t.profile.archives.externalDb.toggleLabel}>
            <Switch.Content>
              <Switch.Control>
                <Switch.Thumb />
              </Switch.Control>
            </Switch.Content>
          </Switch>
        </SettingsRow>
        {external && (
          <SettingsContent className="flex flex-col gap-3">
            {configured && (
              <Chip size="sm" color="success" variant="soft" className="self-start">
                <Database className="size-2.5" aria-hidden />
                <Chip.Label>{t.profile.archives.externalDb.configuredChip}</Chip.Label>
              </Chip>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              <TextField value={config.host} onChange={(v) => setConfig((c) => ({ ...c, host: v }))} className="max-w-lg">
                <Label>{t.profile.archives.externalDb.hostLabel}</Label>
                <Input placeholder={t.profile.archives.externalDb.hostPlaceholder} className="font-mono text-xs" />
              </TextField>
              <TextField value={config.port} onChange={(v) => setConfig((c) => ({ ...c, port: v.replace(/\D/g, '') }))} className="max-w-lg">
                <Label>{t.profile.archives.externalDb.portLabel}</Label>
                <Input placeholder={t.profile.archives.externalDb.portPlaceholder} className="font-mono text-xs" />
              </TextField>
              <TextField value={config.user} onChange={(v) => setConfig((c) => ({ ...c, user: v }))} className="max-w-lg">
                <Label>{t.profile.archives.externalDb.userLabel}</Label>
                <Input placeholder={t.profile.archives.externalDb.userPlaceholder} className="font-mono text-xs" />
              </TextField>
              <TextField type="password" value={config.password} onChange={(v) => setConfig((c) => ({ ...c, password: v }))} className="max-w-lg">
                <Label>{t.profile.archives.externalDb.passwordLabel}</Label>
                <Input placeholder={configured ? t.profile.archives.externalDb.passwordPlaceholderConfigured : ''} className="font-mono text-xs" />
              </TextField>
              <TextField value={config.database} onChange={(v) => setConfig((c) => ({ ...c, database: v }))} className="max-w-lg sm:col-span-2">
                <Label>{t.profile.archives.externalDb.databaseLabel}</Label>
                <Input placeholder={t.profile.archives.externalDb.databasePlaceholder} className="font-mono text-xs" />
              </TextField>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="secondary" onPress={handleTest} isDisabled={testing}>
                {testing ? t.profile.archives.externalDb.testing : t.profile.archives.externalDb.testButton}
              </Button>
              <Button size="sm" onPress={handleSave} isDisabled={saving}>
                {saving ? t.profile.archives.externalDb.saving : t.profile.archives.externalDb.saveButton}
              </Button>
            </div>
          </SettingsContent>
        )}
      </SettingsSection>

      <div className="flex justify-end">
        <Button variant="secondary" onPress={handleExportAll} isDisabled={exporting}>
          {exporting ? t.profile.archives.exportAll.exporting : t.profile.archives.exportAll.button}
        </Button>
      </div>
    </div>
  );
}
