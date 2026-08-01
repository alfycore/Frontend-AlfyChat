'use client';

import { PageHeader } from '../_shared';
import { ChangelogsPanel } from '../changelogs-panel';

export default function AdminChangelogsPage() {
  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader title="Changelogs" description="Publiez et gérez les notes de version." />
      <ChangelogsPanel />
    </div>
  );
}
