'use client';

/**
 * Container : réglages du serveur, branchés sur les vraies données.
 * Remplace components/chat/server-settings-dialog.tsx.
 *
 * Écritures : rôles via le socket (permissions en bitmask, comme le
 * gateway), salons et invitations via l'API REST.
 */

import { Gavel, Globe, Hash, LayoutDashboard, Link2, ScrollText, Shield, ShieldCheck, Smile, Users, Webhook } from 'lucide-react';
import { toast } from '@heroui/react';
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
import { EmojiPanel } from '@/components/alfy/settings/server/emoji-panel';
import { AuditLogPanel } from '@/components/alfy/settings/server/audit-log-panel';
import { ServerSecurityPanel } from '@/components/alfy/settings/server/security-panel';
import { IntegrationsPanel } from '@/components/alfy/settings/server/integrations-panel';
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
    async (data: {
      name?: string;
      description?: string;
      iconUrl?: string;
      bannerUrl?: string;
      isPublic?: boolean;
      category?: 'standard' | 'community';
      verificationLevel?: 'none' | 'low' | 'medium' | 'high';
      require2faModeration?: boolean;
    }) => {
      const res = await api.updateServer(serverId, data).catch(() => null);
      if (!res?.success) {
        toast.danger('Enregistrement impossible', { description: res?.error ?? 'Réessayez dans un instant.' });
        return false;
      }
      return true;
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
              items: [
                {
                  id: 'overview',
                  label: 'Profil du serveur',
                  icon: LayoutDashboard,
                  content: <OverviewPanel server={server} onSave={saveServer} />,
                },
              ],
            },
            {
              label: 'Personnes',
              items: [
                { id: 'members', label: 'Membres', icon: Users, content: <MembersPanel server={server} /> },
                {
                  id: 'roles',
                  label: 'Rôles',
                  icon: Shield,
                  content: <RolesPanel server={server} onSaveRole={saveRole} />,
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
              ],
            },
            {
              label: 'Expression',
              items: [
                { id: 'emoji', label: 'Émoji', icon: Smile, content: <EmojiPanel serverId={serverId} /> },
              ],
            },
            {
              label: 'Applications',
              items: [
                { id: 'integrations', label: 'Intégrations', icon: Webhook, content: <IntegrationsPanel server={server} /> },
              ],
            },
            {
              label: 'Modération',
              items: [
                { id: 'security', label: 'Configuration de sécurité', icon: ShieldCheck, content: <ServerSecurityPanel serverId={serverId} onSave={saveServer} /> },
                { id: 'audit-log', label: 'Logs du serveur', icon: ScrollText, content: <AuditLogPanel serverId={serverId} /> },
                { id: 'moderation', label: 'Modération', icon: Gavel, content: <ModerationPanel serverId={serverId} /> },
              ],
            },
            {
              label: 'Serveur',
              items: [
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
                { id: 'domain', label: 'Domaine', icon: Globe, content: <DomainPanel serverId={server.id} /> },
              ],
            },
          ]}
        />
      </UserDirectoryProvider>
    </SettingsOverlay>
  );
}
