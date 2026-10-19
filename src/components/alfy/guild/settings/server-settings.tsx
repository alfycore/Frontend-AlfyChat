'use client';

/** Réglages du serveur (plein écran), sections filtrées par les droits du membre. */

import { Button, Input, Label, Modal, TextField, toast } from '@heroui/react';
import {
  Ban,
  Bot,
  Globe,
  LayoutDashboard,
  Link2,
  ScrollText,
  Shield,
  ShieldCheck,
  Smile,
  Trash2,
  Users,
  Webhook,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

import { api } from '@/lib/api';
import { useTranslation } from '@/components/locale-provider';
import type { AlfyServer } from '@/components/alfy/mock/types';
import { EmojiPanel } from '@/components/alfy/settings/server/emoji-panel';
import { AuditLogPanel } from '@/components/alfy/settings/server/audit-log-panel';
import { ServerSecurityPanel } from '@/components/alfy/settings/server/security-panel';
import { IntegrationsPanel } from '@/components/alfy/settings/server/integrations-panel';
import { ModerationPanel } from '@/components/alfy/settings/server/moderation-panel';
import { DomainPanel } from '@/components/alfy/settings/server/domain-panel';
import { PageTitle } from '@/components/alfy/guild/kit';
import { deleteServer } from '@/components/alfy/guild/actions';
import { useGuildChannels, useGuildInfo, useMyPerms } from '@/components/alfy/guild/hooks';
import { guildUi, useGuildUi, type ServerSettingsTab } from '@/components/alfy/guild/ui';
import { SettingsLayer, type SettingsNavGroup } from '@/components/alfy/guild/settings/settings-layer';
import { OverviewPage } from '@/components/alfy/guild/settings/server/overview-page';
import { RolesPage } from '@/components/alfy/guild/settings/server/roles-page';
import { MembersPage } from '@/components/alfy/guild/settings/server/members-page';
import { InvitesPage } from '@/components/alfy/guild/settings/server/invites-page';
import { AutomodPage } from '@/components/alfy/guild/settings/server/automod-page';

type Tab = ServerSettingsTab | 'domain';

export function ServerSettingsDialog() {
  const req = useGuildUi((s) => s.serverSettings);
  if (!req) return null;
  return <ServerSettings key={req.serverId} serverId={req.serverId} initialTab={req.tab} roleId={req.roleId} />;
}

function ServerSettings({ serverId, initialTab, roleId }: { serverId: string; initialTab: Tab; roleId?: string }) {
  const { t } = useTranslation();
  const info = useGuildInfo(serverId);
  const perms = useMyPerms(serverId);
  const channels = useGuildChannels(serverId);
  const [tab, setTab] = useState<Tab>(initialTab);
  const [deleting, setDeleting] = useState(false);

  const groups: SettingsNavGroup[] = [
    {
      id: 'server',
      items: [
        perms.can('MANAGE_SERVER') && { id: 'overview', label: t.guild.settings.overview, icon: LayoutDashboard },
        perms.can('MANAGE_ROLES') && { id: 'roles', label: t.guild.settings.roles, icon: Shield },
        perms.can('MANAGE_EMOJIS') && { id: 'emoji', label: t.guild.settings.emoji, icon: Smile },
      ],
    },
    {
      id: 'apps',
      title: t.guild.settings.groupApps,
      items: [perms.can('MANAGE_WEBHOOKS') && { id: 'integrations', label: t.guild.settings.integrations, icon: Webhook }],
    },
    {
      id: 'moderation',
      title: t.guild.settings.groupModeration,
      items: [
        perms.can('MANAGE_SERVER') && { id: 'safety', label: t.guild.settings.safety, icon: ShieldCheck },
        perms.can('MANAGE_SERVER') && { id: 'automod', label: t.guild.settings.automod, icon: Bot },
        perms.can('VIEW_AUDIT_LOG') && { id: 'audit', label: t.guild.settings.audit, icon: ScrollText },
        perms.can('BAN_MEMBERS') && { id: 'bans', label: t.guild.settings.bans, icon: Ban },
      ],
    },
    {
      id: 'members',
      title: t.guild.settings.groupMembers,
      items: [
        (perms.can('MANAGE_ROLES') || perms.can('KICK_MEMBERS') || perms.can('BAN_MEMBERS')) && { id: 'members', label: t.guild.settings.members, icon: Users },
        perms.can('MANAGE_SERVER') && { id: 'invites', label: t.guild.settings.invites, icon: Link2 },
        perms.isOwner && info?.hostingType !== 'self_hosted' && { id: 'domain', label: t.guild.settings.domain, icon: Globe },
      ],
    },
    { id: 'danger', items: [perms.isOwner && { id: 'delete', label: t.guild.settings.deleteServer, icon: Trash2, danger: true }] },
  ];

  /* Ancien format attendu par les panneaux repris tels quels (webhooks). */
  const legacyServer = useMemo<AlfyServer>(
    () => ({
      id: serverId,
      name: info?.name ?? '',
      iconUrl: info?.iconUrl,
      isPublic: Boolean(info?.isPublic),
      ownerId: info?.ownerId ?? '',
      nodeOnline: info?.nodeOnline ?? true,
      selfHosted: Boolean(info?.selfHosted),
      categories: [],
      channels: channels
        .filter((c) => c.type !== 'category')
        .map((c) => ({ id: c.id, serverId, name: c.name, type: c.type as never, categoryId: c.parentId, unreadCount: 0, mentionCount: 0 })),
      roles: [],
      members: [],
      mentionCount: 0,
      unread: false,
    }),
    [serverId, info, channels],
  );

  const saveSecurity = async (data: Parameters<typeof api.updateServer>[1]) => {
    const res = await api.updateServer(serverId, data).catch(() => null);
    if (!res?.success) {
      toast.danger(t.guild.settings.saveFailed, { description: res?.error });
      return false;
    }
    toast.success(t.guild.settings.saved);
    return true;
  };

  return (
    <>
      <SettingsLayer
        isOpen
        onClose={() => guildUi.close('serverSettings')}
        title={info?.name}
        groups={groups}
        active={tab}
        onSelect={(id) => (id === 'delete' ? setDeleting(true) : setTab(id as Tab))}
      >
        {tab === 'overview' && <OverviewPage serverId={serverId} />}
        {tab === 'roles' && <RolesPage serverId={serverId} initialRoleId={roleId} />}
        {tab === 'emoji' && (
          <>
            <PageTitle>{t.guild.settings.emoji}</PageTitle>
            <EmojiPanel serverId={serverId} />
          </>
        )}
        {tab === 'integrations' && (
          <>
            <PageTitle>{t.guild.settings.integrations}</PageTitle>
            <IntegrationsPanel server={legacyServer} />
          </>
        )}
        {tab === 'safety' && (
          <>
            <PageTitle>{t.guild.settings.safety}</PageTitle>
            <ServerSecurityPanel serverId={serverId} onSave={saveSecurity} />
          </>
        )}
        {tab === 'automod' && <AutomodPage serverId={serverId} />}
        {tab === 'audit' && (
          <>
            <PageTitle>{t.guild.settings.audit}</PageTitle>
            <AuditLogPanel serverId={serverId} />
          </>
        )}
        {tab === 'bans' && (
          <>
            <PageTitle>{t.guild.settings.bans}</PageTitle>
            <ModerationPanel serverId={serverId} />
          </>
        )}
        {tab === 'members' && <MembersPage serverId={serverId} />}
        {tab === 'invites' && <InvitesPage serverId={serverId} />}
        {tab === 'domain' && (
          <>
            <PageTitle>{t.guild.settings.domain}</PageTitle>
            <DomainPanel serverId={serverId} />
          </>
        )}
      </SettingsLayer>
      <DeleteServerModal serverId={serverId} name={info?.name ?? ''} isOpen={deleting} onClose={() => setDeleting(false)} />
    </>
  );
}

function DeleteServerModal({ serverId, name, isOpen, onClose }: { serverId: string; name: string; isOpen: boolean; onClose: () => void }) {
  const { t, tx } = useTranslation();
  const router = useRouter();
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const ok = typed.trim() === name.trim();

  const confirm = async () => {
    if (!ok) return;
    setBusy(true);
    const done = await deleteServer(serverId);
    setBusy(false);
    if (!done) return;
    onClose();
    guildUi.close('serverSettings');
    router.push('/channels/me');
  };

  return (
    <Modal isOpen={isOpen} onOpenChange={(o) => !o && onClose()}>
      <Modal.Backdrop>
        <Modal.Container>
          <Modal.Dialog className="sm:max-w-md">
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Heading>{tx(t.guild.settings.deleteTitle, { name })}</Modal.Heading>
            </Modal.Header>
            <Modal.Body className="flex flex-col gap-4">
              <p className="rounded-md bg-warning/12 px-3 py-2 text-sm text-(--warning)">{tx(t.guild.settings.deleteWarning, { name })}</p>
              <TextField value={typed} onChange={setTyped}>
                <Label className="text-xs font-bold tracking-[0.02em] text-muted uppercase">{t.guild.settings.deleteType}</Label>
                <Input autoFocus onKeyDown={(e) => e.key === 'Enter' && void confirm()} />
              </TextField>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="tertiary" onPress={onClose}>
                {t.common.cancel}
              </Button>
              <Button variant="danger" isDisabled={!ok} isPending={busy} onPress={() => void confirm()}>
                {t.guild.settings.deleteServer}
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
