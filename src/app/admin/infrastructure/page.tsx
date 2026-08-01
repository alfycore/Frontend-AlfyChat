'use client';

import { PageHeader } from '../_shared';
import { LBPanel } from '../lb-panel';

export default function AdminInfrastructurePage() {
  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader title="Infrastructure" description="Load balancer et topologie réseau." />
      <LBPanel />
    </div>
  );
}
