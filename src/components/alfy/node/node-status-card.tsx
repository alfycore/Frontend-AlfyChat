'use client';

import { Card, Chip, Label, Meter } from '@heroui/react';

import type { AlfyNodeStatus } from '@/components/alfy/mock/types';

const formatUptime = (sec: number) => {
  const d = Math.floor(sec / 86_400);
  const h = Math.floor((sec % 86_400) / 3_600);
  return d > 0 ? `${d} j ${h} h` : `${h} h`;
};

export function NodeStatusCard({ status }: { status: AlfyNodeStatus }) {
  const diskPct = Math.round((status.diskUsedMb / status.diskTotalMb) * 100);
  return (
    <Card>
      <Card.Header>
        <div className="flex w-full items-center justify-between">
          <Card.Title className="text-sm">État du nœud</Card.Title>
          {status.online ? (
            <Chip size="sm" color="success" variant="soft">
              <span className="alfy-pulse size-1.5 rounded-full bg-success" aria-hidden />
              <Chip.Label>En ligne</Chip.Label>
            </Chip>
          ) : (
            <Chip size="sm" color="danger" variant="soft">
              Hors ligne
            </Chip>
          )}
        </div>
        <Card.Description>server-node v{status.version}</Card.Description>
      </Card.Header>
      <Card.Content className="flex flex-col gap-4">
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-xs text-muted">Disponibilité</dt>
            <dd className="font-medium tabular-nums">{formatUptime(status.uptimeSec)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">Messages stockés</dt>
            <dd className="font-medium tabular-nums">{status.messagesStored.toLocaleString('fr-FR')}</dd>
          </div>
        </dl>
        <Meter aria-label="Espace disque" value={diskPct}>
          <Label className="text-xs">Espace disque</Label>
          <span className="text-xs text-muted tabular-nums">
            {(status.diskUsedMb / 1024).toFixed(1)} / {(status.diskTotalMb / 1024).toFixed(0)} Go
          </span>
          <Meter.Track>
            <Meter.Fill />
          </Meter.Track>
        </Meter>
      </Card.Content>
    </Card>
  );
}
