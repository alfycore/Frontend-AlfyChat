'use client';

/** /uitest/settings/server — paramètres du serveur mock « AlfyChat · Communauté ». */

import { Gavel, Globe, Hash, LayoutDashboard, Link2, Shield, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { SERVERS } from '@/components/alfy/mock/data';
import { SettingsShell } from '@/components/alfy/settings/settings-shell';
import { OverviewPanel } from '@/components/alfy/settings/server/overview-panel';
import { RolesPanel } from '@/components/alfy/settings/server/roles-panel';
import { InvitesPanel } from '@/components/alfy/settings/server/invites-panel';
import { MembersPanel } from '@/components/alfy/settings/server/members-panel';
import { ModerationPanel } from '@/components/alfy/settings/server/moderation-panel';
import { ChannelsPanel } from '@/components/alfy/settings/server/channels-panel';
import { DomainPanel } from '@/components/alfy/settings/server/domain-panel';

export default function UitestServerSettingsPage() {
  const router = useRouter();
  const server = SERVERS[0];
  return (
    <SettingsShell
      title={server.name}
      subtitle="Paramètres du serveur"
      onClose={() => router.push('/uitest/app')}
      groups={[
        {
          label: 'Général',
          items: [
            { id: 'overview', label: "Vue d'ensemble", icon: LayoutDashboard, content: <OverviewPanel server={server} /> },
            { id: 'channels', label: 'Salons', icon: Hash, content: <ChannelsPanel server={server} /> },
            { id: 'invites', label: 'Invitations', icon: Link2, content: <InvitesPanel /> },
            { id: 'domain', label: 'Domaine', icon: Globe, content: <DomainPanel serverId={server.id} /> },
          ],
        },
        {
          label: 'Communauté',
          items: [
            { id: 'roles', label: 'Rôles', icon: Shield, content: <RolesPanel server={server} /> },
            { id: 'members', label: 'Membres', icon: Users, content: <MembersPanel server={server} /> },
            { id: 'moderation', label: 'Modération', icon: Gavel, content: <ModerationPanel serverId={server.id} /> },
          ],
        },
      ]}
    />
  );
}
