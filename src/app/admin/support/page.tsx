'use client';

import { PageHeader } from '../_shared';
import { SupportContentPanel } from '../support-content-panel';

export default function AdminSupportPage() {
  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader title="Centre d'aide" description="Gestion du contenu éditorial du support." />
      <SupportContentPanel />
    </div>
  );
}
