'use client';

import { Card, Chip, Label, Meter } from '@heroui/react';

import type { AlfyNodeStatus } from '@/components/alfy/mock/types';
import { useTranslation } from '@/components/locale-provider';

export function NodeStatusCard({ status }: { status: AlfyNodeStatus }) {
  const { t, tx } = useTranslation();
  const diskPct = Math.round((status.diskUsedMb / status.diskTotalMb) * 100);

  const formatUptime = (sec: number) => {
    const d = Math.floor(sec / 86_400);
    const h = Math.floor((sec % 86_400) / 3_600);
    return d > 0
      ? tx(t.node.status.uptimeDaysHours, { d, h })
      : tx(t.node.status.uptimeHoursOnly, { h });
  };

  return (
    <Card>
      <Card.Header>
        <div className="flex w-full items-center justify-between">
          <Card.Title className="text-sm">{t.node.status.title}</Card.Title>
          {status.online ? (
            <Chip size="sm" color="success" variant="soft">
              <span className="alfy-pulse size-1.5 rounded-full bg-success" aria-hidden />
              <Chip.Label>{t.common.online}</Chip.Label>
            </Chip>
          ) : (
            <Chip size="sm" color="danger" variant="soft">
              {t.common.offline}
            </Chip>
          )}
        </div>
        <Card.Description>server-node v{status.version}</Card.Description>
      </Card.Header>
      <Card.Content className="flex flex-col gap-4">
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-xs text-muted">{t.node.status.uptimeLabel}</dt>
            <dd className="font-medium tabular-nums">{formatUptime(status.uptimeSec)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">{t.node.status.messagesStoredLabel}</dt>
            <dd className="font-medium tabular-nums">{status.messagesStored.toLocaleString('fr-FR')}</dd>
          </div>
        </dl>
        <Meter aria-label={t.node.status.diskSpaceLabel} value={diskPct}>
          <Label className="text-xs">{t.node.status.diskSpaceLabel}</Label>
          <span className="text-xs text-muted tabular-nums">
            {tx(t.node.status.diskUsage, {
              used: (status.diskUsedMb / 1024).toFixed(1),
              total: (status.diskTotalMb / 1024).toFixed(0),
            })}
          </span>
          <Meter.Track>
            <Meter.Fill />
          </Meter.Track>
        </Meter>
      </Card.Content>
    </Card>
  );
}
