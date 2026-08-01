'use client';

import { Chip, Label, Meter, Popover } from '@heroui/react';
import { Signal } from 'lucide-react';

import type { AlfyNetworkStats } from '@/components/alfy/mock/types';

type Quality = 'good' | 'medium' | 'poor';

function classify(stats: AlfyNetworkStats): Quality {
  if (stats.latencyMs > 100 || stats.lossPct > 3) return 'poor';
  if (stats.latencyMs > 50 || stats.lossPct > 1) return 'medium';
  return 'good';
}

const QUALITY = {
  good: { color: 'success' as const, label: 'Excellente' },
  medium: { color: 'warning' as const, label: 'Correcte' },
  poor: { color: 'danger' as const, label: 'Dégradée' },
};

/** Chip de qualité réseau ; le détail (latence, perte, débit) s'ouvre en Popover. */
export function NetworkQuality({ stats }: { stats: AlfyNetworkStats }) {
  const q = QUALITY[classify(stats)];
  return (
    <Popover>
      <Popover.Trigger
        aria-label={`Qualité de connexion : ${q.label}. Voir le détail`}
        className="cursor-pointer rounded-full outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--focus)]"
      >
        <Chip size="sm" color={q.color} variant="soft">
          <Signal className="size-3" aria-hidden />
          <Chip.Label>{stats.latencyMs} ms</Chip.Label>
        </Chip>
      </Popover.Trigger>
      <Popover.Content className="w-64">
        <Popover.Dialog aria-label="Détail de la connexion" className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <Popover.Heading className="text-sm font-semibold">Connexion P2P</Popover.Heading>
            <Chip size="sm" color={q.color} variant="soft">
              {q.label}
            </Chip>
          </div>
          <Meter aria-label="Latence" value={Math.min(stats.latencyMs, 200)} maxValue={200}>
            <Label className="text-xs">Latence</Label>
            <span className="text-xs text-muted tabular-nums">{stats.latencyMs} ms</span>
            <Meter.Track>
              <Meter.Fill />
            </Meter.Track>
          </Meter>
          <Meter aria-label="Perte de paquets" value={Math.min(stats.lossPct, 10)} maxValue={10}>
            <Label className="text-xs">Perte de paquets</Label>
            <span className="text-xs text-muted tabular-nums">{stats.lossPct.toFixed(1)} %</span>
            <Meter.Track>
              <Meter.Fill />
            </Meter.Track>
          </Meter>
          <Meter aria-label="Débit" value={Math.min(stats.bitrateKbps, 3000)} maxValue={3000}>
            <Label className="text-xs">Débit</Label>
            <span className="text-xs text-muted tabular-nums">
              {stats.bitrateKbps >= 1000 ? `${(stats.bitrateKbps / 1000).toFixed(1)} Mb/s` : `${stats.bitrateKbps} kb/s`}
            </span>
            <Meter.Track>
              <Meter.Fill />
            </Meter.Track>
          </Meter>
          <p className="text-[10px] text-muted">
            Appel pair-à-pair chiffré — aucun média ne transite par nos serveurs.
          </p>
        </Popover.Dialog>
      </Popover.Content>
    </Popover>
  );
}
