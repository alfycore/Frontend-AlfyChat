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

import {
  CURRENT_USER,
  DMS,
  MESSAGES,
  SERVERS,
  THREAD_MESSAGES,
  userById,
} from '@/components/alfy/mock/data';
import { CallBar } from '@/components/alfy/calls/call-bar';
import type { AlfyMessage } from '@/components/alfy/mock/types';
import { AppShell } from '@/components/alfy/shell/app-shell';
import { ServerRail } from '@/components/alfy/servers/server-rail';
import { ChannelSidebar } from '@/components/alfy/servers/channel-sidebar';
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

  const server = SERVERS.find((s) => s.id === activeServerId);
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
            servers={SERVERS}
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
              servers={SERVERS}
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
