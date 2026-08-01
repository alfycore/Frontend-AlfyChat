'use client';

import { useEffect, useState } from 'react';
import { Button, Chip, Input, Label, Switch, TextField, toast } from '@heroui/react';
import { Database, Lock } from 'lucide-react';

import { api } from '@/lib/api';
import { useAuth } from '@/hooks/use-auth';
import { PanelHeader } from '@/components/alfy/settings/settings-shell';
import { SettingsContent, SettingsRow, SettingsSection } from '@/components/alfy/settings/section';
import { LoadBar } from '@/components/alfy/admin/primitives';

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
                ? c.name || 'Groupe'
                : otherParticipant?.displayName || otherParticipant?.username || 'Conversation';

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
      toast.danger('Renseignez au moins hôte, utilisateur, mot de passe et base.');
      return;
    }
    setTesting(true);
    try {
      const res: any = await api.testArchiveExternalDb(toConfigPayload());
      const data = res?.data ?? res;
      if (data?.ok) toast.success('Connexion réussie');
      else toast.danger(data?.error || 'Connexion échouée');
    } catch {
      toast.danger('Connexion échouée');
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    if (!config.host || !config.user || !config.password || !config.database) {
      toast.danger('Renseignez au moins hôte, utilisateur, mot de passe et base.');
      return;
    }
    setSaving(true);
    try {
      const res: any = await api.saveArchiveExternalDb(toConfigPayload());
      if (res?.success !== false) {
        setConfigured(true);
        setConfig((c) => ({ ...c, password: '' }));
        toast.success('Configuration enregistrée');
      } else {
        toast.danger(res?.error || 'Échec de la connexion');
      }
    } catch (err: any) {
      toast.danger(err?.message || 'Échec de la connexion');
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
      if (res?.success) toast('Export lancé', { description: 'Vous recevrez un lien de téléchargement.' });
      else toast.danger(res?.error || "Échec de l'export");
    } catch {
      toast.danger("Échec de l'export");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div>
      <PanelHeader
        title="Archives"
        description="Vos messages privés sont chiffrés de bout en bout : nous n'en gardons qu'une copie chiffrée limitée. Archivez-les où vous voulez."
      />

      <div className="mb-6 flex items-start gap-3 rounded-lg border border-(--alfy-e2e)/25 bg-(--alfy-e2e-soft) p-4">
        <Lock className="mt-0.5 size-4 shrink-0 text-(--alfy-e2e)" aria-hidden />
        <p className="text-xs leading-relaxed text-foreground/80">
          Les archives sont chiffrées avec vos clés. Même exportées vers une base externe, elles
          restent illisibles sans votre appareil.
        </p>
      </div>

      <SettingsSection title="Quota côté serveur">
        <SettingsContent className="flex flex-col gap-4">
          <p className="text-xs text-muted">
            Chaque conversation privée conserve jusqu&apos;à 20 000 messages chiffrés ou 30 jours d&apos;historique
            sur nos serveurs. Au-delà, les plus anciens messages sont supprimés côté serveur (jamais des
            appareils qui les ont archivés).
          </p>

          {quotasLoading ? (
            <p className="text-xs text-muted">Calcul de l&apos;usage…</p>
          ) : quotas.length === 0 ? (
            <p className="text-xs text-muted">Aucune conversation privée à afficher pour l&apos;instant.</p>
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

      <SettingsSection title="Base de données externe">
        <SettingsRow
          label="Archiver vers ma propre base"
          description="Déportez l'historique chiffré vers votre propre base MySQL."
        >
          <Switch isSelected={external} onChange={handleToggleExternal} aria-label="Archiver vers ma propre base">
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
                <Chip.Label>Configurée</Chip.Label>
              </Chip>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              <TextField value={config.host} onChange={(v) => setConfig((c) => ({ ...c, host: v }))} className="max-w-lg">
                <Label>Hôte</Label>
                <Input placeholder="db.example.com" className="font-mono text-xs" />
              </TextField>
              <TextField value={config.port} onChange={(v) => setConfig((c) => ({ ...c, port: v.replace(/\D/g, '') }))} className="max-w-lg">
                <Label>Port</Label>
                <Input placeholder="3306" className="font-mono text-xs" />
              </TextField>
              <TextField value={config.user} onChange={(v) => setConfig((c) => ({ ...c, user: v }))} className="max-w-lg">
                <Label>Utilisateur</Label>
                <Input placeholder="alfychat" className="font-mono text-xs" />
              </TextField>
              <TextField type="password" value={config.password} onChange={(v) => setConfig((c) => ({ ...c, password: v }))} className="max-w-lg">
                <Label>Mot de passe</Label>
                <Input placeholder={configured ? '••••••••' : ''} className="font-mono text-xs" />
              </TextField>
              <TextField value={config.database} onChange={(v) => setConfig((c) => ({ ...c, database: v }))} className="max-w-lg sm:col-span-2">
                <Label>Base de données</Label>
                <Input placeholder="alfychat_archives" className="font-mono text-xs" />
              </TextField>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="secondary" onPress={handleTest} isDisabled={testing}>
                {testing ? 'Test en cours…' : 'Tester la connexion'}
              </Button>
              <Button size="sm" onPress={handleSave} isDisabled={saving}>
                {saving ? 'Enregistrement…' : 'Enregistrer'}
              </Button>
            </div>
          </SettingsContent>
        )}
      </SettingsSection>

      <div className="flex justify-end">
        <Button variant="secondary" onPress={handleExportAll} isDisabled={exporting}>
          {exporting ? 'Export en cours…' : 'Exporter toutes mes archives'}
        </Button>
      </div>
    </div>
  );
}
