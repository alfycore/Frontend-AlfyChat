'use client';

import { Avatar, Button, Spinner } from '@heroui/react';
import { ScrollText } from 'lucide-react';
import { useEffect, useState } from 'react';

import { api, resolveMediaUrl } from '@/lib/api';
import { PanelHeader } from '@/components/alfy/settings/settings-shell';
import { SettingsSection } from '@/components/alfy/settings/section';

interface AuditEntry {
  id: string;
  action: string;
  targetType: string | null;
  targetId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  actor: { id: string; username: string; displayName?: string; avatarUrl?: string };
}

const ACTION_LABELS: Record<string, string> = {
  member_kick: 'a expulsé un membre',
  member_ban: 'a banni un membre',
  member_unban: 'a levé un bannissement',
  role_create: 'a créé un rôle',
  role_update: 'a modifié un rôle',
  role_delete: 'a supprimé un rôle',
  member_role_update: 'a changé les rôles d’un membre',
  channel_create: 'a créé un salon',
  channel_delete: 'a supprimé un salon',
  server_update: 'a modifié les réglages du serveur',
  emoji_create: 'a ajouté un émoji',
  emoji_delete: 'a supprimé un émoji',
  webhook_create: 'a créé un webhook',
  webhook_delete: 'a supprimé un webhook',
};

const dateFormat = new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

function detail(entry: AuditEntry): string | null {
  const m = entry.metadata;
  if (!m) return null;
  if (typeof m.name === 'string') return `« ${m.name} »`;
  if (Array.isArray(m.fields)) return (m.fields as string[]).join(', ');
  return null;
}

export function AuditLogPanel({ serverId }: { serverId: string }) {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const load = (offset: number) => {
    api.getAuditLogs(serverId, { limit: 50, offset }).then((res) => {
      if (res.success && res.data) {
        const mapped = res.data.map((e) => ({
          ...e,
          actor: { ...e.actor, avatarUrl: resolveMediaUrl(e.actor.avatarUrl) },
        }));
        setEntries((prev) => (offset === 0 ? mapped : [...prev, ...mapped]));
        setHasMore(res.data.length === 50);
      }
      setLoaded(true);
      setLoadingMore(false);
    });
  };

  useEffect(() => load(0), [serverId]);

  return (
    <div>
      <PanelHeader title="Journal d'audit" description="Historique des actions de modération et d'administration sur ce serveur." />

      <SettingsSection>
        {!loaded ? (
          <div className="flex justify-center p-8">
            <Spinner size="sm" />
          </div>
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center gap-2 p-8 text-center text-sm text-muted">
            <ScrollText className="size-6" aria-hidden />
            Aucune action enregistrée pour l&apos;instant.
          </div>
        ) : (
          <div className="flex flex-col">
            {entries.map((e) => (
              <div key={e.id} className="flex items-center gap-3 px-4 py-3 not-last:border-b not-last:border-separator">
                <Avatar size="sm">
                  {e.actor.avatarUrl && <Avatar.Image src={e.actor.avatarUrl} alt="" />}
                  <Avatar.Fallback>{(e.actor.displayName || e.actor.username || '?')[0]?.toUpperCase()}</Avatar.Fallback>
                </Avatar>
                <p className="min-w-0 flex-1 text-sm">
                  <span className="font-semibold">{e.actor.displayName || e.actor.username}</span>{' '}
                  <span className="text-muted">{ACTION_LABELS[e.action] ?? e.action}</span>
                  {detail(e) && <span className="text-muted"> {detail(e)}</span>}
                </p>
                <span className="shrink-0 text-[11px] text-muted tabular-nums">{dateFormat.format(new Date(e.createdAt))}</span>
              </div>
            ))}
          </div>
        )}
      </SettingsSection>

      {loaded && hasMore && (
        <div className="flex justify-center">
          <Button
            variant="ghost"
            size="sm"
            isDisabled={loadingMore}
            onPress={() => {
              setLoadingMore(true);
              load(entries.length);
            }}
          >
            {loadingMore ? <Spinner size="sm" /> : 'Charger plus'}
          </Button>
        </div>
      )}
    </div>
  );
}
