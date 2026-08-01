'use client';

import { PageHeader } from '../_shared';
import { HelpDeskPanel } from '../helpdesk-panel';

export default function AdminHelpdeskPage() {
  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader title="Helpdesk" description="Tickets de support client." />
      <HelpDeskPanel />
    </div>
  );
}
