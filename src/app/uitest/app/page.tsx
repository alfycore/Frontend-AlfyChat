'use client';

/**
 * /uitest/app — écran principal : rail serveurs, sidebar canaux/DMs,
 * chat, fils, liste des membres. 100 % mock data.
 */

import {
  Archive,
  Bell,
  Eye,
  Gavel,
  Globe,
  Hash,
  KeyRound,
  Languages,
  LayoutDashboard,
  LayoutTemplate,
  Link2,
  Lock,
  Mic,
  MonitorSmartphone,
  Palette,
  Shield,
  UserRound,
  Users,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertDialog, Button, toast } from '@heroui/react';

import {
  CURRENT_USER,
  DMS,
  MESSAGES,
  SERVERS,
  THREAD_MESSAGES,
  userById,
} from '@/components/alfy/mock/data';
import { CallBar } from '@/components/alfy/calls/call-bar';
import type { AlfyChannel, AlfyMessage, AlfyServer } from '@/components/alfy/mock/types';
import { AppShell } from '@/components/alfy/shell/app-shell';
import { ServerRail } from '@/components/alfy/servers/server-rail';
import { ChannelSidebar } from '@/components/alfy/servers/channel-sidebar';
import { CreateChannelDialog } from '@/components/alfy/servers/create-channel-dialog';
import { RenameDialog } from '@/components/alfy/servers/rename-dialog';
import { DmSidebar } from '@/components/alfy/servers/dm-sidebar';
import { ChatView } from '@/components/alfy/chat/chat-view';
import { SpecialChannel } from '@/components/alfy/chat/special-channel';
import { SPECIAL_VIEWS } from '@/components/alfy/chat/special-views';
import { ThreadPanel } from '@/components/alfy/chat/thread-panel';
import { MemberList } from '@/components/alfy/members/member-list';
import { FriendsView } from '@/components/alfy/people/friends-view';
import { SettingsOverlay } from '@/components/alfy/settings/settings-overlay';
import { SettingsShell } from '@/components/alfy/settings/settings-shell';
import { OverviewPanel } from '@/components/alfy/settings/server/overview-panel';
import { RolesPanel } from '@/components/alfy/settings/server/roles-panel';
import { InvitesPanel } from '@/components/alfy/settings/server/invites-panel';
import { MembersPanel } from '@/components/alfy/settings/server/members-panel';
import { ModerationPanel } from '@/components/alfy/settings/server/moderation-panel';
import { ChannelsPanel } from '@/components/alfy/settings/server/channels-panel';
import { DomainPanel } from '@/components/alfy/settings/server/domain-panel';
import { AccountPanel } from '@/components/alfy/settings/user/account-panel';
import { PrivacyPanel } from '@/components/alfy/settings/user/privacy-panel';
import { SecurityPanel } from '@/components/alfy/settings/user/security-panel';
import { KeysPanel } from '@/components/alfy/settings/user/keys-panel';
import { SessionsPanel } from '@/components/alfy/settings/user/sessions-panel';
import { AppearancePanel } from '@/components/alfy/settings/user/appearance-panel';
import { VoicePanel } from '@/components/alfy/settings/user/voice-panel';
import { NotificationsPanel } from '@/components/alfy/settings/user/notifications-panel';
import { LanguagePanel } from '@/components/alfy/settings/user/language-panel';
import { LayoutPanel } from '@/components/alfy/settings/user/layout-panel';
import { ArchivesPanel } from '@/components/alfy/settings/user/archives-panel';

export default function UitestAppPage() {
  const router = useRouter();
  const [inVoice, setInVoice] = useState(true);
  const [callMuted, setCallMuted] = useState(false);
  const [activeServerId, setActiveServerId] = useState<string | null>('s-alfy');
  const [activeChannelId, setActiveChannelId] = useState<string | null>('ch-frontend');
  const [activeDmId, setActiveDmId] = useState<string | null>('dm-1');
  const [friendsView, setFriendsView] = useState(false);
  const [messages, setMessages] = useState<AlfyMessage[]>(MESSAGES);
  const [openThreadId, setOpenThreadId] = useState<string | null>(null);
  const [membersOpen, setMembersOpen] = useState(true);
  const [navOpen, setNavOpen] = useState(false);
  const [railHorizontal, setRailHorizontal] = useState(false);
  const [serverSettingsOpen, setServerSettingsOpen] = useState(false);
  const [userSettingsOpen, setUserSettingsOpen] = useState(false);

  // Copie locale mutable — SERVERS reste la source figée, on ne modifie que
  // ce state pour tester création/renommage/suppression/réordonnancement de
  // salons et catégories sans backend.
  const [servers, setServers] = useState<AlfyServer[]>(SERVERS);
  const [createOpen, setCreateOpen] = useState(false);
  const [createMode, setCreateMode] = useState<'channel' | 'category'>('channel');
  const [createParentId, setCreateParentId] = useState<string | null>(null);
  const [renameTarget, setRenameTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string; kind: 'channel' | 'category' } | null>(null);

  const updateActiveServer = (fn: (s: AlfyServer) => AlfyServer) => {
    setServers((prev) => prev.map((s) => (s.id === activeServerId ? fn(s) : s)));
  };

  const handleCreateChannel = ({ name, type, parentId }: { name: string; type: string; parentId: string | null }) => {
    if (type === 'category') {
      updateActiveServer((s) => ({ ...s, categories: [...s.categories, { id: `cat-local-${Date.now()}`, name }] }));
      return;
    }
    const newChannel: AlfyChannel = {
      id: `ch-local-${Date.now()}`,
      serverId: activeServerId!,
      name,
      type: type as AlfyChannel['type'],
      categoryId: parentId,
      unreadCount: 0,
      mentionCount: 0,
    };
    updateActiveServer((s) => ({ ...s, channels: [...s.channels, newChannel] }));
  };

  const handleRenameTarget = (name: string) => {
    if (!renameTarget) return;
    updateActiveServer((s) => ({
      ...s,
      channels: s.channels.map((c) => (c.id === renameTarget.id ? { ...c, name } : c)),
      categories: s.categories.map((c) => (c.id === renameTarget.id ? { ...c, name } : c)),
    }));
  };

  const handleDeleteTarget = () => {
    if (!deleteTarget) return;
    updateActiveServer((s) => ({
      ...s,
      channels: s.channels.filter((c) => c.id !== deleteTarget.id),
      categories: s.categories.filter((c) => c.id !== deleteTarget.id),
    }));
    setDeleteTarget(null);
  };

  const handleMoveChannel = (id: string, direction: 'up' | 'down') => {
    updateActiveServer((s) => {
      const catId = s.channels.find((c) => c.id === id)?.categoryId ?? null;
      const indices = s.channels.map((c, idx) => (c.categoryId === catId ? idx : -1)).filter((idx) => idx >= 0);
      const group = indices.map((idx) => s.channels[idx]);
      const i = group.findIndex((c) => c.id === id);
      const j = direction === 'up' ? i - 1 : i + 1;
      if (i < 0 || j < 0 || j >= group.length) return s;
      [group[i], group[j]] = [group[j], group[i]];
      const channels = [...s.channels];
      indices.forEach((idx, k) => {
        channels[idx] = group[k];
      });
      return { ...s, channels };
    });
  };

  const handleMoveCategory = (id: string, direction: 'up' | 'down') => {
    updateActiveServer((s) => {
      const cats = s.categories.filter((c) => c.id !== '__root__');
      const i = cats.findIndex((c) => c.id === id);
      const j = direction === 'up' ? i - 1 : i + 1;
      if (i < 0 || j < 0 || j >= cats.length) return s;
      const next = [...cats];
      [next[i], next[j]] = [next[j], next[i]];
      return { ...s, categories: next };
    });
  };

  const server = servers.find((s) => s.id === activeServerId);
  const channel = server?.channels.find((c) => c.id === activeChannelId && c.type !== 'voice')
    ?? server?.channels.find((c) => c.type !== 'voice');
  const dm = DMS.find((d) => d.id === activeDmId);

  const dmChannel = useMemo(() => {
    if (!dm) return null;
    const user = userById(dm.recipientId);
    return {
      id: dm.id,
      serverId: '',
      name: user.displayName,
      type: 'text' as const,
      topic: `Conversation privée avec @${user.username}`,
      categoryId: null,
      unreadCount: 0,
      mentionCount: 0,
    };
  }, [dm]);

  const threadOrigin = openThreadId ? messages.find((m) => m.threadId === openThreadId) : undefined;

  const handleSend = (content: string) => {
    if (!channel && !dmChannel) return;
    setMessages((prev) => [
      ...prev,
      {
        id: `m-local-${Date.now()}`,
        channelId: channel?.id ?? dmChannel!.id,
        authorId: CURRENT_USER.id,
        content,
        createdAt: new Date().toISOString(),
        encrypted: true,
        reactions: [],
        attachments: [],
        mentions: [],
      },
    ]);
  };

  const handleSendGif = (url: string) => {
    if (!channel && !dmChannel) return;
    setMessages((prev) => [
      ...prev,
      {
        id: `m-gif-${Date.now()}`,
        channelId: channel?.id ?? dmChannel!.id,
        authorId: CURRENT_USER.id,
        content: '',
        createdAt: new Date().toISOString(),
        encrypted: true,
        reactions: [],
        attachments: [
          { id: `a-gif-${Date.now()}`, name: 'gif.gif', size: 0, mimeType: 'image/gif', url, width: 220, height: 160 },
        ],
        mentions: [],
      },
    ]);
  };

  const handleToggleReaction = (messageId: string, emoji: string) => {
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== messageId) return m;
        const reactions = m.reactions.map((r) =>
          r.emoji === emoji ? { ...r, me: !r.me, count: r.me ? r.count - 1 : r.count + 1 } : r,
        );
        return { ...m, reactions: reactions.filter((r) => r.count > 0) };
      }),
    );
  };

  const isServerView = activeServerId !== null && server && channel;
  const activeChannel = isServerView ? channel : dmChannel;
  const dmUnreadCount = DMS.reduce((acc, d) => acc + d.unreadCount, 0);

  return (
    <>
      <AppShell
        navOpen={navOpen}
        onNavOpenChange={setNavOpen}
        membersOpen={membersOpen}
        onMembersOpenChange={setMembersOpen}
        banner={
          inVoice ? (
            <CallBar
              label="Salon principal"
              durationSeconds={0}
              isMuted={callMuted}
              onToggleMute={() => setCallMuted((m) => !m)}
              onOpen={() => router.push('/uitest/call')}
              onLeave={() => setInVoice(false)}
            />
          ) : undefined
        }
        rail={
          <ServerRail
            servers={servers}
            activeServerId={activeServerId}
            orientation="vertical"
            onToggleOrientation={() => setRailHorizontal(true)}
            onSelectServer={(id) => {
              setActiveServerId(id);
              setOpenThreadId(null);
              if (id !== null) setFriendsView(false);
              setNavOpen(false);
            }}
            dmUnreadCount={dmUnreadCount}
          />
        }
        topRail={
          railHorizontal ? (
            <ServerRail
              servers={servers}
              activeServerId={activeServerId}
              orientation="horizontal"
              onToggleOrientation={() => setRailHorizontal(false)}
              onSelectServer={(id) => {
                setActiveServerId(id);
                setOpenThreadId(null);
                if (id !== null) setFriendsView(false);
              }}
              dmUnreadCount={dmUnreadCount}
            />
          ) : undefined
        }
        sidebar={
          isServerView ? (
            <ChannelSidebar
              server={server}
              currentUser={CURRENT_USER}
              activeChannelId={channel.id}
              onSelectChannel={(id) => {
                const target = server.channels.find((c) => c.id === id);
                if (target?.type === 'voice') return; // le vocal vit sur /uitest/call
                setActiveChannelId(id);
                setOpenThreadId(null);
                setNavOpen(false);
              }}
              onOpenServerSettings={() => setServerSettingsOpen(true)}
              onOpenUserSettings={() => setUserSettingsOpen(true)}
              connectedVoiceChannel={inVoice ? 'Salon principal' : null}
              canManage
              onCreateChannel={(parentId) => {
                setCreateMode('channel');
                setCreateParentId(parentId);
                setCreateOpen(true);
              }}
              onCreateCategory={() => {
                setCreateMode('category');
                setCreateParentId(null);
                setCreateOpen(true);
              }}
              onRenameChannel={(id) => {
                const ch = server.channels.find((c) => c.id === id);
                if (ch) setRenameTarget({ id, name: ch.name });
              }}
              onDeleteChannel={(id) => {
                const ch = server.channels.find((c) => c.id === id);
                setDeleteTarget({ id, name: ch?.name ?? 'ce salon', kind: 'channel' });
              }}
              onMoveChannel={handleMoveChannel}
              onRenameCategory={(id) => {
                const cat = server.categories.find((c) => c.id === id);
                if (cat) setRenameTarget({ id, name: cat.name });
              }}
              onDeleteCategory={(id) => {
                const cat = server.categories.find((c) => c.id === id);
                setDeleteTarget({ id, name: cat?.name ?? 'cette catégorie', kind: 'category' });
              }}
              onMoveCategory={handleMoveCategory}
            />
          ) : (
            <DmSidebar
              dms={DMS}
              currentUser={CURRENT_USER}
              activeDmId={activeDmId}
              onSelectDm={(id) => {
                setActiveDmId(id);
                setFriendsView(false);
                setNavOpen(false);
              }}
              onOpenFriends={() => {
                setFriendsView(true);
                setNavOpen(false);
              }}
              friendsActive={friendsView}
              pendingCount={2}
              onOpenUserSettings={() => setUserSettingsOpen(true)}
            />
          )
        }
        members={isServerView ? <MemberList server={server} /> : undefined}
        rightPanel={
          threadOrigin && (
            <ThreadPanel
              origin={threadOrigin}
              messages={THREAD_MESSAGES}
              currentUserId={CURRENT_USER.id}
              onClose={() => setOpenThreadId(null)}
            />
          )
        }
      >
        {!isServerView && friendsView ? (
          <FriendsView
            onMessage={(userId) => {
              const targetDm = DMS.find((d) => d.recipientId === userId);
              if (targetDm) setActiveDmId(targetDm.id);
              setFriendsView(false);
            }}
          />
        ) : isServerView && channel && channel.type in SPECIAL_VIEWS ? (
          <SpecialChannel
            channel={channel}
            onToggleMembers={() => setMembersOpen((o) => !o)}
            membersOpen={membersOpen}
            onOpenNav={() => setNavOpen(true)}
          />
        ) : activeChannel ? (
          <ChatView
            channel={activeChannel}
            messages={
              isServerView
                ? messages.filter((m) => m.channelId === activeChannel.id)
                : messages.slice(0, 4).map((m) => ({ ...m, channelId: activeChannel.id }))
            }
            server={isServerView ? server : undefined}
            currentUserId={CURRENT_USER.id}
            typingNames={isServerView ? ['Léa'] : []}
            onSend={handleSend}
            onSendGif={handleSendGif}
            onOpenThread={(id) => setOpenThreadId(id)}
            onToggleReaction={handleToggleReaction}
            onToggleMembers={() => setMembersOpen((o) => !o)}
            membersOpen={membersOpen}
            onOpenNav={() => setNavOpen(true)}
          />
        ) : null}
      </AppShell>

      {server && (
        <>
          <CreateChannelDialog
            isOpen={createOpen}
            onOpenChange={setCreateOpen}
            mode={createMode}
            categories={server.categories.filter((c) => c.id !== '__root__')}
            defaultCategoryId={createParentId}
            onCreate={(data) => {
              handleCreateChannel(data);
              toast(createMode === 'category' ? 'Catégorie créée' : 'Salon créé', { description: data.name });
            }}
          />
          <RenameDialog
            isOpen={!!renameTarget}
            onOpenChange={(open) => !open && setRenameTarget(null)}
            title="Renommer"
            fieldLabel="Nom"
            initialValue={renameTarget?.name ?? ''}
            onSave={handleRenameTarget}
          />
          <AlertDialog isOpen={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
            <AlertDialog.Backdrop>
              <AlertDialog.Container>
                <AlertDialog.Dialog className="sm:max-w-100">
                  <AlertDialog.Header>
                    <AlertDialog.Icon status="danger" />
                    <AlertDialog.Heading>
                      Supprimer {deleteTarget?.kind === 'category' ? 'la catégorie' : 'le salon'} « {deleteTarget?.name} » ?
                    </AlertDialog.Heading>
                  </AlertDialog.Header>
                  <AlertDialog.Body>
                    <p>
                      {deleteTarget?.kind === 'category'
                        ? 'Ses salons deviendront non classés — ils ne seront pas supprimés.'
                        : 'Les messages de ce salon seront définitivement perdus.'}
                    </p>
                  </AlertDialog.Body>
                  <AlertDialog.Footer>
                    <Button slot="close" variant="tertiary">
                      Annuler
                    </Button>
                    <Button variant="danger" onPress={handleDeleteTarget}>
                      Supprimer
                    </Button>
                  </AlertDialog.Footer>
                </AlertDialog.Dialog>
              </AlertDialog.Container>
            </AlertDialog.Backdrop>
          </AlertDialog>
        </>
      )}

      {server && (
        <SettingsOverlay isOpen={serverSettingsOpen} onOpenChange={setServerSettingsOpen}>
          <SettingsShell
            title={server.name}
            subtitle="Paramètres du serveur"
            onClose={() => setServerSettingsOpen(false)}
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
        </SettingsOverlay>
      )}

      <SettingsOverlay isOpen={userSettingsOpen} onOpenChange={setUserSettingsOpen}>
        <SettingsShell
          title={CURRENT_USER.displayName}
          subtitle="Paramètres du compte"
          onClose={() => setUserSettingsOpen(false)}
          navFooter={
            <p className="text-[10px] text-muted select-none">
              AlfyChat · atelier alfy
              <br />
              HeroUI v3 · mock data
            </p>
          }
          groups={[
            {
              label: 'Compte',
              items: [
                { id: 'account', label: 'Mon compte', icon: UserRound, content: <AccountPanel /> },
                { id: 'privacy', label: 'Confidentialité', icon: Eye, content: <PrivacyPanel /> },
              ],
            },
            {
              label: 'Sécurité',
              items: [
                { id: 'security', label: 'Connexion & 2FA', icon: Lock, content: <SecurityPanel /> },
                { id: 'keys', label: 'Clés de chiffrement', icon: KeyRound, content: <KeysPanel /> },
                { id: 'sessions', label: 'Sessions actives', icon: MonitorSmartphone, content: <SessionsPanel /> },
                { id: 'archives', label: 'Archives', icon: Archive, content: <ArchivesPanel /> },
              ],
            },
            {
              label: 'Application',
              items: [
                { id: 'voice', label: 'Voix & vidéo', icon: Mic, content: <VoicePanel /> },
                { id: 'notifications', label: 'Notifications', icon: Bell, content: <NotificationsPanel /> },
                { id: 'appearance', label: 'Apparence', icon: Palette, content: <AppearancePanel /> },
                { id: 'layout', label: 'Mise en page', icon: LayoutTemplate, content: <LayoutPanel /> },
                { id: 'language', label: 'Langue', icon: Languages, content: <LanguagePanel /> },
              ],
            },
          ]}
        />
      </SettingsOverlay>
    </>
  );
}
