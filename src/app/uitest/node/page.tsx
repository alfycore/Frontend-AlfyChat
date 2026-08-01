'use client';

/** /uitest/node — tableau de bord du nœud auto-hébergé. */

import { NODE_STATUS } from '@/components/alfy/mock/data';
import { TrustBadges } from '@/components/alfy/primitives/trust-badges';
import { NodeStatusCard } from '@/components/alfy/node/node-status-card';
import { NodeLogs } from '@/components/alfy/node/node-logs';
import { DockerCard } from '@/components/alfy/node/docker-card';
import { DomainCard } from '@/components/alfy/node/domain-card';
import { TokenCard } from '@/components/alfy/node/token-card';

export default function UitestNodePage() {
  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-4xl px-6 py-10">
        <header className="alfy-enter mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold">Auto-hébergement</h1>
            <p className="mt-1 text-sm text-muted">
              Votre serveur « AlfyChat · Communauté » tourne sur votre propre machine.
            </p>
          </div>
          <TrustBadges compact />
        </header>

        <div className="grid gap-4 md:grid-cols-2">
          <NodeStatusCard status={NODE_STATUS} />
          <DomainCard status={NODE_STATUS} />
          <DockerCard />
          <TokenCard />
          <NodeLogs />
        </div>
      </div>
    </div>
  );
}
