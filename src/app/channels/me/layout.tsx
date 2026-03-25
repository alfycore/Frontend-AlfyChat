'use client';

import { useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { useRouter, usePathname, useParams } from 'next/navigation';
import { HugeiconsIcon } from '@hugeicons/react';
import { MessageCircleIcon } from '@/components/icons';
import { useAuth } from '@/hooks/use-auth';
import { CallProvider, useCallContext } from '@/hooks/use-call-context';
import { MobileNavProvider, useMobileNav } from '@/hooks/use-mobile-nav';
import { useNotification } from '@/hooks/use-notification';
import { setActiveDM, setActiveGroup } from '@/lib/notification-store';
import { ServerList } from '@/components/chat/server-list';
import { ChannelList } from '@/components/chat/channel-list';
import { MemberList } from '@/components/chat/member-list';
import { CallBar } from '@/components/chat/call-bar';
import { IncomingCallDialog } from '@/components/chat/incoming-call-dialog';
import { GroupChatArea } from '@/components/chat/group-chat-area';
import { MobileBottomNav } from '@/components/chat/mobile-bottom-nav';
import { SettingsDialog } from '@/components/chat/settings-dialog';

/**
 * Layout partagé pour /channels/me et /channels/me/[recipientId].
 * Mobile-first : sidebar en overlay avec swipe support.
 */

function LayoutInner({ children }: { children: ReactNode }) {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const { isMobile, showSidebar, showMemberList, showSettings, closeSidebar, closeMemberList, closeSettings, closeAll } = useMobileNav();

  // Initialiser le système de notifications
  useNotification();

  // Dériver le recipientId et groupId depuis l'URL
  const recipientId = params?.recipientId as string | undefined;
  const groupId = params?.groupId as string | undefined;

  const handleSelectServer = useCallback((id: string | null) => {
    if (id) {
      router.push(`/channels/server/${id}`);
    }
  }, [router]);

  const [selectedServer] = useState<string | null>(null);
  const [selectedChannel, setSelectedChannel] = useState<string | null>(
    groupId ? `group:${groupId}` : recipientId ? `dm:${recipientId}` : 'friends'
  );

  // Appels (depuis le context global)
  const {
    callType,
    callStatus,
    callerName,
    callerAvatar,
    callConversationId,
    callRecipientId,
    remoteStreams,
    acceptCall,
    declineCall,
  } = useCallContext();

  // Audio persistant : survit aux changements de page
  const persistentAudioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (remoteStreams.size > 0 && persistentAudioRef.current) {
      const firstStream = remoteStreams.values().next().value as MediaStream | undefined;
      if (firstStream) {
        const audioTracks = firstStream.getAudioTracks();
        console.log('[AUDIO] Remote stream tracks:', audioTracks.length, 'enabled:', audioTracks.map(t => t.enabled));

        // Toujours rattacher — certains navigateurs perdent le srcObject
        persistentAudioRef.current.srcObject = firstStream;
        persistentAudioRef.current.volume = 1.0;

        const playPromise = persistentAudioRef.current.play();
        if (playPromise) {
          playPromise.catch((err) => {
            console.warn('[AUDIO] Autoplay bloqué:', err.message, '— sera relu au prochain geste utilisateur');
          });
        }
      }
    } else if (persistentAudioRef.current) {
      persistentAudioRef.current.srcObject = null;
    }
  }, [remoteStreams]);

  const [incomingCall, setIncomingCall] = useState<{
    callerName: string;
    callerAvatar?: string;
    callType: 'voice' | 'video';
  } | null>(null);

  // Synchroniser selectedChannel avec l'URL + mettre à jour le store de notifications
  useEffect(() => {
    if (groupId) {
      setSelectedChannel(`group:${groupId}`);
      setActiveGroup(groupId);
      setActiveDM(null);
    } else if (recipientId) {
      setSelectedChannel(`dm:${recipientId}`);
      setActiveDM(recipientId);
      setActiveGroup(null);
    } else if (pathname === '/channels/me' || pathname === '/channels/me/') {
      setSelectedChannel('friends');
      setActiveDM(null);
      setActiveGroup(null);
    }
  }, [groupId, recipientId, pathname]);

  // Nettoyage quand le layout est démonté (navigation vers server, etc.)
  useEffect(() => {
    return () => {
      setActiveDM(null);
      setActiveGroup(null);
    };
  }, []);

  // Fermer la sidebar mobile quand on navigue
  useEffect(() => {
    if (isMobile) {
      closeAll();
    }
  }, [pathname, isMobile, closeAll]);

  // Handle incoming call status
  useEffect(() => {
    if (callStatus === 'ringing') {
      setIncomingCall({
        callerName: callerName || 'Utilisateur',
        callerAvatar: callerAvatar,
        callType: callType || 'voice',
      });
    } else {
      setIncomingCall(null);
    }
  }, [callStatus, callType, callerName, callerAvatar]);

  const handleSelectChannel = useCallback((channel: string | null) => {
    if (channel === 'friends') {
      router.push('/channels/me');
    } else if (channel?.startsWith('dm:')) {
      const newRecipientId = channel.replace('dm:', '');
      router.push(`/channels/me/${newRecipientId}`);
    } else if (channel?.startsWith('group:')) {
      const newGroupId = channel.replace('group:', '');
      router.push(`/channels/me/g/${newGroupId}`);
    } else {
      setSelectedChannel(channel);
    }
  }, [router]);

  // Auth guard
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return (
      <div className="relative flex h-dvh items-center justify-center overflow-hidden bg-[var(--background)]">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,oklch(0.5_0_280/3%)_1px,transparent_1px),linear-gradient(to_bottom,oklch(0.5_0_280/3%)_1px,transparent_1px)] bg-size-[72px_72px]" />
        <div className="relative z-10 flex flex-col items-center gap-4">
          <div className="flex size-16 animate-pulse items-center justify-center rounded-2xl bg-[var(--accent)]">
            <HugeiconsIcon icon={MessageCircleIcon} size={32} className="text-[var(--accent-foreground)]" />
          </div>
          <p className="text-sm text-[var(--muted)]">Chargement...</p>
        </div>
      </div>
    );
  }

  // Non authentifié : afficher le spinner pendant la redirection (useEffect)
  // Ne jamais retourner null — cela peut déclencher un 404 Next.js App Router
  if (!user) {
    return (
      <div className="relative flex h-dvh items-center justify-center overflow-hidden bg-[var(--background)]">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,oklch(0.5_0_280/3%)_1px,transparent_1px),linear-gradient(to_bottom,oklch(0.5_0_280/3%)_1px,transparent_1px)] bg-size-[72px_72px]" />
        <div className="relative z-10 flex flex-col items-center gap-4">
          <div className="flex size-16 animate-pulse items-center justify-center rounded-2xl bg-[var(--accent)]">
            <HugeiconsIcon icon={MessageCircleIcon} size={32} className="text-[var(--accent-foreground)]" />
          </div>
          <p className="text-sm text-[var(--muted)]">Redirection...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-dvh overflow-hidden bg-[var(--background)]">
      {/* Audio persistant — sr-only (pas display:none) pour compatibilité autoplay navigateurs */}
      <audio ref={persistentAudioRef} autoPlay playsInline className="sr-only" />

      {/* Incoming call dialog global */}
      <IncomingCallDialog
        open={!!incomingCall}
        callerName={incomingCall?.callerName || ''}
        callerAvatar={incomingCall?.callerAvatar}
        callType={incomingCall?.callType || 'voice'}
        onAccept={acceptCall}
        onDecline={declineCall}
      />

      {/* ── MOBILE: Overlay backdrop ── */}
      {isMobile && (showSidebar || showMemberList) && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity"
          onClick={closeAll}
        />
      )}

      {/* ── SIDEBAR (ServerList + ChannelList) ── */}
      {/* Desktop: toujours visible | Mobile: overlay slide-in */}
      <div
        className={`
          ${isMobile
            ? `fixed inset-y-0 left-0 z-50 flex transition-transform duration-300 ease-in-out ${
                showSidebar ? 'translate-x-0' : '-translate-x-full'
              }`
            : 'flex'
          }
        `}
      >
        <ServerList selectedServer={selectedServer} onSelectServer={handleSelectServer} />
        <ChannelList
          serverId={selectedServer}
          selectedChannel={selectedChannel}
          onSelectChannel={handleSelectChannel}
        />
      </div>

      {/* ── CONTENU PRINCIPAL ── */}
      <div className={`flex min-w-0 flex-1 flex-col ${recipientId ? '' : 'pb-16'} md:pb-0`}>
        {/* Mini barre verte d'appel */}
        {callStatus !== 'idle' && callStatus !== 'ended' && callStatus !== 'ringing' && (() => {
          const isInCallConversation = recipientId && (
            recipientId === callRecipientId ||
            callConversationId === (recipientId ? `dm_${[recipientId, user?.id || ''].sort().join('_')}` : null)
          );
          return !isInCallConversation ? <CallBar /> : null;
        })()}

        {/* Afficher le chat de groupe si un groupe est sélectionné, sinon les children (DM/friends) */}
        {selectedChannel?.startsWith('group:') ? (
          <GroupChatArea
            groupId={selectedChannel.replace('group:', '')}
            onLeave={() => router.push('/channels/me')}
          />
        ) : (
          children
        )}
      </div>

      {/* ── MEMBER LIST ── */}
      {/* Desktop: toujours visible | Mobile: overlay slide-in depuis la droite */}
      {selectedServer && (
        <div
          className={`
            ${isMobile
              ? `fixed inset-y-0 right-0 z-50 transition-transform duration-300 ease-in-out ${
                  showMemberList ? 'translate-x-0' : 'translate-x-full'
                }`
              : ''
            }
          `}
        >
          <MemberList serverId={selectedServer} />
        </div>
      )}

      {/* ── MOBILE BOTTOM NAV ── masqué dans les MP ── */}
      {!recipientId && <MobileBottomNav />}

      {/* ── SETTINGS DIALOG (mobile: ouvre depuis la bottom nav) ── */}
      <SettingsDialog open={showSettings} onOpenChange={(open) => { if (!open) closeSettings(); }} />
    </div>
  );
}

export default function MeLayout({ children }: { children: ReactNode }) {
  return (
    <CallProvider>
      <MobileNavProvider>
        <LayoutInner>{children}</LayoutInner>
      </MobileNavProvider>
    </CallProvider>
  );
}
