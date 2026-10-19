'use client';

/**
 * Conversations privées et de groupe — vues complètes.
 *
 *   ┌ en-tête : identité · chiffrement · appels · recherche · panneau ┐
 *   ├ scène d'appel (si appel en cours)                              │
 *   ├ fil (coffre puis réseau)          │ panneau : profil / membres │
 *   └ saisie (chiffrée avant l'envoi)   │                            ┘
 *
 * Aucune donnée n'est rechargée en changeant de conversation : le store et le
 * coffre la gardent. Les boutons d'appel passent par le miroir d'appel, sans
 * s'abonner au contexte (qui change chaque seconde pendant un appel).
 */

import { toast } from '@heroui/react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useAuth } from '@/hooks/use-auth';
import { useMobileNav } from '@/hooks/use-mobile-nav';
import { loadDmBootstrap } from '@/lib/dm-bootstrap';
import { socketService } from '@/lib/socket';
import { DmComposer } from '@/components/alfy/dm/dm-composer';
import { GroupSettingsModal, type GroupMember, type GroupRole } from '@/components/alfy/dm/group-settings-modal';
import { ConversationCallStage } from '@/components/alfy/calls/call-stage';
import { UserDirectoryProvider } from '@/components/alfy/user-directory';
import { callActions } from '@/components/alfy/guild/voice/call-mirror';
import { toAlfyUser } from '@/components/alfy/live/map';
import type { AlfyUser } from '@/components/alfy/mock/types';
import { useTranslation } from '@/components/locale-provider';
import { useGroup, useKeyChange, usePeople, usePresenceOf, useRequestPresence, useThread } from '@/components/alfy/conversation/hooks';
import { loadGroup, sendMessage } from '@/components/alfy/conversation/engine';
import { conversationStore } from '@/components/alfy/conversation/store';
import { dmConversationId, type ConversationRef } from '@/components/alfy/conversation/types';
import { toView } from '@/components/alfy/conversation/view/adapt';
import { SafetyDialog } from '@/components/alfy/conversation/view/e2ee';
import { ConversationHeader } from '@/components/alfy/conversation/view/header';
import { MembersPanel, UserPanel } from '@/components/alfy/conversation/view/panels';
import { ConversationThread } from '@/components/alfy/conversation/view/thread';

/* Panneau de droite : mémorisé par type de conversation, comme Discord. */
function usePanelPref(kind: 'dm' | 'group'): [boolean, () => void] {
  const key = `alfy-conv-panel:${kind}`;
  const [open, setOpen] = useState(() => {
    try {
      return typeof window === 'undefined' ? true : localStorage.getItem(key) !== '0';
    } catch {
      return true;
    }
  });
  const toggle = useCallback(() => {
    setOpen((v) => {
      try {
        localStorage.setItem(key, v ? '0' : '1');
      } catch {
        /* préférence non mémorisée */
      }
      return !v;
    });
  }, [key]);
  return [open, toggle];
}

/** Recherche et réponse : les vues du fil courant (mêmes objets que les lignes). */
function useThreadViews(conversationId: string, me: string) {
  const thread = useThread(conversationId);
  return useMemo(() => thread.messages.map((m) => toView(m, me)), [thread.messages, me]);
}

function Shell({
  header,
  callStage,
  thread,
  composer,
  panel,
  panelOpen,
}: {
  header: React.ReactNode;
  callStage: React.ReactNode;
  thread: React.ReactNode;
  composer: React.ReactNode;
  panel: React.ReactNode;
  panelOpen: boolean;
}) {
  return (
    <div className="flex h-full min-w-0 flex-1 flex-col bg-surface">
      {header}
      {callStage}
      <div className="flex min-h-0 flex-1">
        <div className="flex min-w-0 flex-1 flex-col">
          {thread}
          {composer}
        </div>
        {panelOpen && (
          <aside className="alfy-sidebar alfy-settings-enter hidden w-[340px] shrink-0 border-l border-separator lg:block">{panel}</aside>
        )}
      </div>
    </div>
  );
}

/* ═════════════════════════════════ MP ═════════════════════════════════════ */

export function DmConversation({ peerId }: { peerId: string }) {
  const { t, tx } = useTranslation();
  const { user } = useAuth();
  const me = user?.id ?? '';
  const { isMobile, openSidebar } = useMobileNav();

  const conversation = useMemo<ConversationRef>(() => ({ kind: 'dm', conversationId: dmConversationId(me, peerId), peerId }), [me, peerId]);

  /* Profil complet + blocage, depuis l'amorçage du fil (déjà en vol). */
  const [boot, setBoot] = useState<{ id: string; user: AlfyUser | null; iBlockedThem: boolean; theyBlockedMe: boolean } | null>(null);
  useEffect(() => {
    let alive = true;
    void loadDmBootstrap(peerId).then((b) => {
      if (!alive || !b) return;
      setBoot({ id: peerId, user: b.recipient ? toAlfyUser(b.recipient, peerId) : null, ...b.blockStatus });
    });
    return () => {
      alive = false;
    };
  }, [peerId]);
  const current = boot?.id === peerId ? boot : null;
  const bootUser = current?.user ?? null;
  const extra = useMemo(() => (bootUser ? [bootUser] : []), [bootUser]);
  const people = usePeople(extra);
  useRequestPresence([peerId]);
  const status = usePresenceOf(peerId);
  const peer = people(peerId);
  const blocked = Boolean(current?.iBlockedThem || current?.theyBlockedMe);

  /* Room de la conversation (frappe, messages) — reprise à la reconnexion par la passerelle. */
  useEffect(() => {
    socketService.joinConversation(peerId);
  }, [peerId]);

  const keyChange = useKeyChange(peerId);
  const [safetyOpen, setSafetyOpen] = useState(false);
  const [panelOpen, togglePanel] = usePanelPref('dm');
  const [replyToId, setReplyToId] = useState<string | undefined>();
  const views = useThreadViews(conversation.conversationId, me);
  const replyTo = replyToId ? views.find((v) => v.id === replyToId) : undefined;
  const jump = useRef<(id: string) => boolean>(() => false);

  const onSend = useCallback(
    (content: string, reply?: string) => {
      setReplyToId(undefined);
      void sendMessage(conversation, content, reply);
    },
    [conversation],
  );

  const callable = !blocked;
  const startCall = (type: 'voice' | 'video') => void callActions.current?.initiateCall(peerId, type, undefined, peer.displayName);

  return (
    <UserDirectoryProvider value={people}>
      <Shell
        panelOpen={panelOpen}
        header={
          <ConversationHeader
            kind="dm"
            notifTargetId={peerId}
            title={peer.displayName}
            subtitle={peer.username ? `@${peer.username}` : undefined}
            avatarUrl={peer.avatarUrl}
            status={status}
            messages={views}
            onJump={(id) => jump.current(id)}
            panelOpen={panelOpen}
            onTogglePanel={togglePanel}
            onVerify={() => setSafetyOpen(true)}
            onOpenNav={isMobile ? openSidebar : undefined}
            onVoiceCall={callable ? () => startCall('voice') : undefined}
            onVideoCall={callable ? () => startCall('video') : undefined}
          />
        }
        callStage={<ConversationCallStage target={{ kind: 'dm', userId: peerId }} />}
        thread={
          <ConversationThread
            conversation={conversation}
            me={me}
            title={peer.displayName}
            avatarUrl={peer.avatarUrl}
            people={people}
            unreadKey={peerId}
            keyChanged={Boolean(keyChange)}
            onVerify={() => setSafetyOpen(true)}
            onReply={setReplyToId}
            jumpRef={(fn) => {
              jump.current = fn;
            }}
          />
        }
        composer={
          <DmComposer
            conversationId={peerId}
            recipientName={peer.displayName}
            replyTo={replyTo}
            onCancelReply={() => setReplyToId(undefined)}
            onSend={onSend}
            onTyping={() => socketService.startTyping(conversation.conversationId)}
            encrypted
            isDisabled={blocked}
            disabledMessage={current?.iBlockedThem ? t.chat.blockedByMeComposer : current?.theyBlockedMe ? t.chat.blockedByThemComposer : undefined}
          />
        }
        panel={<UserPanel user={{ ...peer, status }} onVerify={() => setSafetyOpen(true)} />}
      />
      <SafetyDialog isOpen={safetyOpen} onOpenChange={setSafetyOpen} peerId={peerId} peerName={peer.displayName || tx(t.conv.e2ee.theirKey, { name: '' })} />
    </UserDirectoryProvider>
  );
}

/* ═══════════════════════════════ Groupe ═══════════════════════════════════ */

export function GroupConversation({ groupId }: { groupId: string }) {
  const { t, tx } = useTranslation();
  const { user } = useAuth();
  const me = user?.id ?? '';
  const router = useRouter();
  const { isMobile, openSidebar } = useMobileNav();

  const conversation = useMemo<ConversationRef>(() => ({ kind: 'group', conversationId: groupId }), [groupId]);
  const group = useGroup(groupId);
  const people = usePeople();
  useRequestPresence(group?.memberIds ?? []);

  useEffect(() => {
    void loadGroup(groupId);
    socketService.joinConversation(undefined, groupId);
  }, [groupId]);

  /* Groupe supprimé / quitté ailleurs : on part. */
  useEffect(() => {
    const onGone = (data: unknown) => {
      const d = ((data as { payload?: unknown })?.payload ?? data) as { groupId?: string; id?: string };
      if (d?.groupId === groupId || d?.id === groupId) router.push('/channels/me');
    };
    socketService.on('GROUP_DELETE', onGone);
    return () => socketService.off('GROUP_DELETE', onGone);
  }, [groupId, router]);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [panelOpen, togglePanel] = usePanelPref('group');
  const [replyToId, setReplyToId] = useState<string | undefined>();
  const views = useThreadViews(groupId, me);
  const replyTo = replyToId ? views.find((v) => v.id === replyToId) : undefined;
  const jump = useRef<(id: string) => boolean>(() => false);

  const name = group?.name || t.chat.groupFallbackName;
  const count = group?.memberIds.length ?? 0;
  const canAdd = Boolean(group && (group.isOpen || group.ownerId === me));

  const members: GroupMember[] = useMemo(
    () =>
      (group?.memberIds ?? []).map((id) => ({
        user: people(id),
        role: ((group?.roles[id] as GroupRole | undefined) ?? (id === group?.ownerId ? 'owner' : 'member')) as GroupRole,
      })),
    [group, people],
  );

  const onSend = useCallback(
    async (content: string, reply?: string) => {
      setReplyToId(undefined);
      const skipped = await sendMessage(conversation, content, reply);
      if (skipped > 0) toast.warning(tx(t.conv.send.skipped, { n: skipped }));
    },
    [conversation, t, tx],
  );

  return (
    <UserDirectoryProvider value={people}>
      <Shell
        panelOpen={panelOpen}
        header={
          <ConversationHeader
            kind="group"
            notifTargetId={groupId}
            title={name}
            subtitle={count > 0 ? tx(t.conv.header.membersCount, { n: count }) : undefined}
            avatarUrl={group?.avatarUrl}
            messages={views}
            onJump={(id) => jump.current(id)}
            panelOpen={panelOpen}
            onTogglePanel={togglePanel}
            onOpenNav={isMobile ? openSidebar : undefined}
            onVoiceCall={() => void callActions.current?.initiateGroupCall(groupId, 'voice', name)}
            onVideoCall={() => void callActions.current?.initiateGroupCall(groupId, 'video', name)}
            onAddMembers={canAdd ? () => setSettingsOpen(true) : undefined}
            onSettings={() => setSettingsOpen(true)}
          />
        }
        callStage={<ConversationCallStage target={{ kind: 'group', groupId }} />}
        thread={
          <ConversationThread
            conversation={conversation}
            me={me}
            title={name}
            avatarUrl={group?.avatarUrl}
            people={people}
            unreadKey={`group:${groupId}`}
            onReply={setReplyToId}
            jumpRef={(fn) => {
              jump.current = fn;
            }}
          />
        }
        composer={
          <DmComposer
            conversationId={groupId}
            recipientName={name}
            replyTo={replyTo}
            onCancelReply={() => setReplyToId(undefined)}
            onSend={(c, r) => void onSend(c, r)}
            onTyping={() => socketService.startTyping(groupId)}
            encrypted
          />
        }
        panel={<MembersPanel group={group} people={people} me={me} onAddMembers={canAdd ? () => setSettingsOpen(true) : undefined} />}
      />
      <GroupSettingsModal
        isOpen={settingsOpen}
        onOpenChange={(open) => {
          setSettingsOpen(open);
          if (!open) void loadGroup(groupId, true);
        }}
        groupId={groupId}
        name={name}
        avatarUrl={group?.avatarUrl}
        isOpenGroup={group?.isOpen ?? true}
        members={members}
        currentUserId={me}
        onGone={() => {
          conversationStore.forgetGroup(groupId);
          router.push('/channels/me');
        }}
      />
    </UserDirectoryProvider>
  );
}
