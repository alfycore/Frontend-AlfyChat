'use client';

import { useEffect, useState } from 'react';
import { Button, Table, toast } from '@heroui/react';

import { api } from '@/lib/api';
import { PanelHeader } from '@/components/alfy/settings/settings-shell';
import { EmptyState } from '@/components/alfy/primitives/empty-state';
import { Gavel } from 'lucide-react';
import { useTranslation } from '@/components/locale-provider';

interface BannedMember {
  userId: string;
  username: string;
  displayName: string | null;
  banReason: string | null;
}

export function ModerationPanel({ serverId }: { serverId: string }) {
  const { t } = useTranslation();
  const [bans, setBans] = useState<BannedMember[] | null>(null);
  const [revoking, setRevoking] = useState<string | null>(null);

  const load = () => {
    api.get<BannedMember[]>(`/api/servers/${serverId}/members?showBanned=true`).then((res: any) => {
      const members = Array.isArray(res?.data) ? res.data : [];
      setBans(members.filter((m: any) => m?.isBanned));
    }).catch(() => setBans([]));
  };

  useEffect(() => { load(); }, [serverId]);

  const handleRevoke = async (userId: string) => {
    setRevoking(userId);
    try {
      const res: any = await api.delete(`/api/servers/${serverId}/members/${userId}/ban`);
      if (res?.success) {
        toast.success(t.moderationPanel.revoked);
        load();
      } else {
        toast.danger(res?.error || t.moderationPanel.revokeError);
      }
    } catch {
      toast.danger(t.moderationPanel.revokeError);
    } finally {
      setRevoking(null);
    }
  };

  return (
    <div>
      <PanelHeader
        title={t.moderationPanel.panelTitle}
        description={t.moderationPanel.panelDescription}
      />

      {bans === null ? (
        <p className="text-sm text-muted">{t.common.loading}</p>
      ) : bans.length === 0 ? (
        <EmptyState icon={Gavel} title={t.moderationPanel.emptyTitle} description={t.moderationPanel.emptyDescription} />
      ) : (
        <Table>
          <Table.ScrollContainer>
            <Table.Content aria-label={t.moderationPanel.panelTitle}>
              <Table.Header>
                <Table.Column isRowHeader>{t.moderationPanel.columnMember}</Table.Column>
                <Table.Column>{t.moderationPanel.columnReason}</Table.Column>
                <Table.Column aria-label="Actions" />
              </Table.Header>
              <Table.Body>
                {bans.map((ban) => (
                  <Table.Row key={ban.userId}>
                    <Table.Cell>{ban.displayName || ban.username}</Table.Cell>
                    <Table.Cell className="max-w-56 truncate text-muted">{ban.banReason || '—'}</Table.Cell>
                    <Table.Cell>
                      <div className="flex justify-end">
                        <Button size="sm" variant="tertiary" isDisabled={revoking === ban.userId} onPress={() => handleRevoke(ban.userId)}>
                          {revoking === ban.userId ? t.moderationPanel.revoking : t.moderationPanel.revoke}
                        </Button>
                      </div>
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Content>
          </Table.ScrollContainer>
        </Table>
      )}
    </div>
  );
}
