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
import { useCallback, useEffect, useMemo } from 'react';

import { useAuth } from '@/hooks/use-auth';
import { computeMemberPerms } from '@/lib/server-perms';

import { api } from '@/lib/api';
import { socketService } from '@/lib/socket';
import { SettingsOverlay } from '@/components/alfy/settings/settings-overlay';
import { SettingsShell } from '@/components/alfy/settings/settings-shell';
import { OverviewPanel } from '@/components/alfy/settings/server/overview-panel';
import { ChannelsPanel, type CreateChannelInput } from '@/components/alfy/settings/server/channels-panel';
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
import { useTranslation } from '@/components/locale-provider';

export function AlfyServerSettings({
  serverId,
  isOpen,
  onOpenChange,
  initialTab,
}: {
  serverId: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  /** Onglet à ouvrir directement — ex. « invites » depuis le menu du serveur. */
  initialTab?: string;
}) {
  const { t } = useTranslation();
  const { user } = useAuth();
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

  // Droits réels du membre courant, calculés sur les rôles déjà chargés.
  // Le serveur refuse de toute façon les actions non autorisées ; ce calcul sert
  // à ne pas proposer d'onglets ni de boutons qui échoueraient.
  const perms = useMemo(() => computeMemberPerms(server, user?.id), [server, user?.id]);

  // Création réelle : nom, type (texte / vocal / annonce) et catégorie viennent
  // de la boîte de dialogue. Le succès n'est annoncé qu'après réponse du serveur.
  const createChannel = useCallback(
    async ({ name, type, parentId }: CreateChannelInput) => {
      const res = await api
        .createChannel(serverId, { name, type, parentId })
        .catch(() => null);
      if (!res?.success) {
        toast.danger(t.common.error, { description: res?.error ?? name });
        return false;
      }
      return true;
    },
    [serverId, t],
  );

  const deleteChannel = useCallback(
    async (channelId: string) => {
      const res = await api.deleteChannel(serverId, channelId).catch(() => null);
      if (!res?.success) {
        toast.danger(t.common.error, { description: res?.error });
        return false;
      }
      return true;
    },
    [serverId, t],
  );

  // Les écritures de rôles passent par le socket : sans écoute de ROLE_ERROR,
  // un refus du gateway (PERMISSION_DENIED) restait totalement silencieux.
  useEffect(() => {
    function onRoleError(payload: any) {
      toast.danger(t.common.error, { description: payload?.message ?? payload?.error });
    }
    function onChannelError(payload: any) {
      toast.danger(t.common.error, { description: payload?.message ?? payload?.error });
    }
    socketService.on('ROLE_ERROR', onRoleError);
    socketService.on('CHANNEL_ERROR', onChannelError);
    return () => {
      socketService.off('ROLE_ERROR', onRoleError);
      socketService.off('CHANNEL_ERROR', onChannelError);
    };
  }, [t]);

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
        toast.danger(t.chatUI.serverSettings.saveErrorTitle, {
          description: res?.error ?? t.chatUI.serverSettings.saveErrorDefaultDesc,
        });
        return false;
      }
      return true;
    },
    [serverId],
  );

  const createRole = useCallback(
    (data: { name: string; color?: string; permissions?: number }) => {
      socketService.createRole(serverId, data);
    },
    [serverId],
  );

  const deleteRole = useCallback(
    (roleId: string) => {
      socketService.deleteRole(serverId, roleId);
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

  // Onglets filtrés par droits. Chaque entrée porte la permission qu'exige
  // réellement la route derrière elle (cf. servers/src/index.ts).
  const groups = useMemo(() => {
    if (!server) return [];
    const all = [
      {
        items: [
          {
            id: 'overview',
            label: t.chatUI.serverSettings.navOverview,
            icon: LayoutDashboard,
            content: <OverviewPanel server={server} onSave={saveServer} />,
            show: true,
          },
        ],
      },
      {
        label: t.chatUI.serverSettings.groupPeople,
        items: [
          {
            id: 'members',
            label: t.chatUI.serverSettings.navMembers,
            icon: Users,
            content: <MembersPanel server={server} perms={perms} />,
            show: true,
          },
          {
            id: 'roles',
            label: t.chatUI.serverSettings.navRoles,
            icon: Shield,
            content: (
              <RolesPanel
                server={server}
                perms={perms}
                onSaveRole={saveRole}
                onCreateRole={createRole}
                onDeleteRole={deleteRole}
              />
            ),
            show: perms.canManageRoles,
          },
          {
            id: 'invites',
            label: t.chatUI.serverSettings.navInvites,
            icon: Link2,
            content: (
              <InvitesPanel
                invites={invites}
                onCreate={() => void createInvite()}
                onRevoke={(code) => void removeInvite(code)}
              />
            ),
            show: true,
          },
        ],
      },
      {
        label: t.chatUI.serverSettings.groupExpression,
        items: [
          {
            id: 'emoji',
            label: t.chatUI.serverSettings.navEmoji,
            icon: Smile,
            content: <EmojiPanel serverId={serverId} />,
            show: perms.canManageChannels,
          },
        ],
      },
      {
        label: t.chatUI.serverSettings.groupApplications,
        items: [
          {
            id: 'integrations',
            label: t.chatUI.serverSettings.navIntegrations,
            icon: Webhook,
            content: <IntegrationsPanel server={server} />,
            show: perms.canManageChannels,
          },
        ],
      },
      {
        label: t.chatUI.serverSettings.groupModeration,
        items: [
          {
            id: 'security',
            label: t.chatUI.serverSettings.navSecurity,
            icon: ShieldCheck,
            content: <ServerSecurityPanel serverId={serverId} onSave={saveServer} />,
            show: perms.isAdmin,
          },
          {
            id: 'audit-log',
            label: t.chatUI.serverSettings.navAuditLog,
            icon: ScrollText,
            content: <AuditLogPanel serverId={serverId} />,
            show: perms.isAdmin,
          },
          {
            id: 'moderation',
            label: t.chatUI.serverSettings.navModeration,
            icon: Gavel,
            content: <ModerationPanel serverId={serverId} />,
            show: perms.isAdmin,
          },
        ],
      },
      {
        label: t.chatUI.serverSettings.groupServer,
        items: [
          {
            id: 'channels',
            label: t.chatUI.serverSettings.navChannels,
            icon: Hash,
            content: (
              <ChannelsPanel
                server={server}
                onCreateChannel={createChannel}
                onDeleteChannel={deleteChannel}
              />
            ),
            show: perms.canManageChannels,
          },
          {
            id: 'domain',
            label: t.chatUI.serverSettings.navDomain,
            icon: Globe,
            content: <DomainPanel serverId={server.id} />,
            show: perms.isAdmin,
          },
        ],
      },
    ];

    return all
      .map((g) => ({ ...g, items: g.items.filter((i) => i.show).map(({ show, ...i }) => i) }))
      .filter((g) => g.items.length > 0);
  }, [
    server, perms, t, serverId, invites,
    saveServer, saveRole, createRole, deleteRole,
    createChannel, deleteChannel, createInvite, removeInvite,
  ]);

  if (!server) return null;

  return (
    <SettingsOverlay isOpen={isOpen} onOpenChange={onOpenChange}>
      <UserDirectoryProvider value={resolver}>
        <SettingsShell
          key={initialTab ?? 'default'}
          initialTabId={initialTab}
          title={server.name}
          subtitle={t.chatUI.serverSettings.subtitle}
          onClose={() => onOpenChange(false)}
          groups={groups}
        />
      </UserDirectoryProvider>
    </SettingsOverlay>
  );
}
