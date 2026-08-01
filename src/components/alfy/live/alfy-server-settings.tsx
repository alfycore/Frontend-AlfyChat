'use client';

/**
 * Container : réglages du serveur, branchés sur les vraies données.
 * Remplace components/chat/server-settings-dialog.tsx.
 *
 * Écritures : rôles via le socket (permissions en bitmask, comme le
 * gateway), salons et invitations via l'API REST.
 */

import { Gavel, Globe, Hash, LayoutDashboard, Link2, Shield, Users } from 'lucide-react';
import { useCallback, useMemo } from 'react';

import { api } from '@/lib/api';
import { socketService } from '@/lib/socket';
import { SettingsOverlay } from '@/components/alfy/settings/settings-overlay';
import { SettingsShell } from '@/components/alfy/settings/settings-shell';
import { OverviewPanel } from '@/components/alfy/settings/server/overview-panel';
import { ChannelsPanel } from '@/components/alfy/settings/server/channels-panel';
import { InvitesPanel } from '@/components/alfy/settings/server/invites-panel';
import { DomainPanel } from '@/components/alfy/settings/server/domain-panel';
import { RolesPanel } from '@/components/alfy/settings/server/roles-panel';
import { MembersPanel } from '@/components/alfy/settings/server/members-panel';
import { ModerationPanel } from '@/components/alfy/settings/server/moderation-panel';
import { UserDirectoryProvider, makeResolver } from '@/components/alfy/user-directory';
import { useAlfyChannels } from '@/components/alfy/live/use-alfy-channels';
import { useAlfyMembers } from '@/components/alfy/live/use-alfy-members';
import { useAlfyInvites } from '@/components/alfy/live/use-alfy-invites';
import type { AlfyServer } from '@/components/alfy/mock/types';

export function AlfyServerSettings({
  serverId,
  isOpen,
  onOpenChange,
}: {
  serverId: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const base = useAlfyChannels(serverId);
  const { members, roles, users } = useAlfyMembers(serverId);
  const { invites, create: createInvite, remove: removeInvite } = useAlfyInvites(
    isOpen ? serverId : null,
  );

  const resolver = useMemo(() => makeResolver(users), [users]);

  const server: AlfyServer | null = useMemo(
    () => (base ? { ...base, members, roles } : null),
    [base, members, roles],
  );

  const createChannel = useCallback(
    async (name: string) => {
      await api.createChannel(serverId, { name, type: 'text' }).catch(() => null);
    },
    [serverId],
  );

  const deleteChannel = useCallback(
    async (channelId: string) => {
      await api.deleteChannel(serverId, channelId).catch(() => null);
    },
    [serverId],
  );

  const saveServer = useCallback(
    async (data: { name?: string; isPublic?: boolean }) => {
      await api.updateServer(serverId, data).catch(() => null);
    },
    [serverId],
  );

  const saveRole = useCallback(
    (role: { id: string; name: string; color: string; emoji?: string; permissions: number }) => {
      // Le socket attend un bitmask — l'UI en manipule déjà un.
      socketService.updateRole(serverId, role.id, {
        name: role.name,
        color: role.color,
        permissions: role.permissions,
        iconEmoji: role.emoji,
      });
    },
    [serverId],
  );

  if (!server) return null;

  return (
    <SettingsOverlay isOpen={isOpen} onOpenChange={onOpenChange}>
      <UserDirectoryProvider value={resolver}>
        <SettingsShell
          title={server.name}
          subtitle="Paramètres du serveur"
          onClose={() => onOpenChange(false)}
          groups={[
            {
              label: 'Général',
              items: [
                {
                  id: 'overview',
                  label: "Vue d'ensemble",
                  icon: LayoutDashboard,
                  content: <OverviewPanel server={server} onSave={saveServer} />,
                },
                {
                  id: 'channels',
                  label: 'Salons',
                  icon: Hash,
                  content: (
                    <ChannelsPanel
                      server={server}
                      onCreateChannel={(name) => void createChannel(name)}
                      onDeleteChannel={(id) => void deleteChannel(id)}
                    />
                  ),
                },
                {
                  id: 'invites',
                  label: 'Invitations',
                  icon: Link2,
                  content: (
                    <InvitesPanel
                      invites={invites}
                      onCreate={() => void createInvite()}
                      onRevoke={(code) => void removeInvite(code)}
                    />
                  ),
                },
                { id: 'domain', label: 'Domaine', icon: Globe, content: <DomainPanel serverId={server.id} /> },
              ],
            },
            {
              label: 'Communauté',
              items: [
                {
                  id: 'roles',
                  label: 'Rôles',
                  icon: Shield,
                  content: <RolesPanel server={server} onSaveRole={saveRole} />,
                },
                { id: 'members', label: 'Membres', icon: Users, content: <MembersPanel server={server} /> },
                { id: 'moderation', label: 'Modération', icon: Gavel, content: <ModerationPanel serverId={serverId} /> },
              ],
            },
          ]}
        />
      </UserDirectoryProvider>
    </SettingsOverlay>
  );
}
