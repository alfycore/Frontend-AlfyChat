'use client';

import { useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { useResizablePanel } from '@/hooks/use-resizable-panel';
import { useLayoutPrefs, useLayoutPrefsSync } from '@/hooks/use-layout-prefs';
import { useRouter, usePathname, useParams } from 'next/navigation';
import { MessageCircleIcon } from '@/components/icons';
import { useAuth } from '@/hooks/use-auth';
import { CallProvider, useCallContext } from '@/hooks/use-call-context';
import { MobileNavProvider, useMobileNav } from '@/hooks/use-mobile-nav';
import { useNotification } from '@/hooks/use-notification';
import { useUIStyle } from '@/hooks/use-ui-style';
import { useBackground } from '@/hooks/use-background';
import { setActiveDM, setActiveGroup } from '@/lib/notification-store';
import { api, resolveMediaUrl } from '@/lib/api';
import { ServerList } from '@/components/chat/server-list';
import { ChannelList } from '@/components/chat/channel-list';
import { MemberList } from '@/components/chat/member-list';
import { IncomingCallDialog } from '@/components/chat/incoming-call-dialog';
import { GroupChatArea } from '@/components/chat/group-chat-area';
import { MobileBottomNav } from '@/components/chat/mobile-bottom-nav';
import { useSwipeDrawer } from '@/hooks/use-swipe-drawer';

/**
 * Layout partagé pour /channels/me et /channels/me/[recipientId].
 * Mobile-first : sidebar en overlay avec swipe support.
 */

// ── Poignée de redimensionnement ─────────────────────────────────────────────
function ResizeHandle({ onMouseDown, isResizing }: { onMouseDown: (e: React.MouseEvent) => void; isResizing?: boolean }) {
  return (
    <div
      onMouseDown={onMouseDown}
      className={`group relative z-10 flex w-1 shrink-0 cursor-col-resize items-center justify-center bg-[var(--surface)] transition-colors hover:bg-[var(--accent)]/20 active:bg-[var(--accent)]/30 ${isResizing ? 'bg-[var(--accent)]/30' : ''}`}
    >
      <div className="h-8 w-0.5 rounded-full bg-[var(--border)] transition-all group-hover:h-12 group-hover:bg-[var(--accent)]/60 group-active:bg-[var(--accent)]" />
    </div>
  );
}

function LayoutInner({ children }: { children: ReactNode }) {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const { isMobile, showSidebar, showMemberList, showSettings, closeSettings, closeAll, openSidebar, closeSidebar } = useMobileNav();

  // Discord-style swipe drawer (mobile only)
  const SIDEBAR_WIDTH = 308; // ServerList (~72px) + ChannelList (240px) — approximate
  const { sidebarRef, backdropRef } = useSwipeDrawer({
    open: showSidebar,
    onOpen: openSidebar,
    onClose: closeSidebar,
    width: SIDEBAR_WIDTH,
    enabled: isMobile,
  });

  const { prefs: layoutPrefs } = useLayoutPrefs();
  useLayoutPrefsSync();
  const ui = useUIStyle();
  const { wallpaper } = useBackground();

  const { width: channelListWidth, onMouseDown: onChannelResize } = useResizablePanel({
    storageKey: 'alfychat_me_sidebar_width',
    defaultWidth: 240,
    minWidth: 160,
    maxWidth: 400,
    side: 'right',
    disabled: isMobile,
  });

  // Initialiser le système de notifications
  useNotification();

  // Dériver le recipientId et groupId depuis l'URL
  const recipientId = params?.recipientId as string | undefined;
  const groupId = params?.groupId as string | undefined;

  const handleSelectServer = useCallback((id: string | null) => {
    if (id === 'groups') {
      router.push('/channels/groups');
    } else if (id) {
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

  // Audio persistant : joue l'audio remote UNIQUEMENT quand le CallPanel n'est pas visible
  // (quand l'utilisateur est dans une autre conversation et que le CallBar s'affiche à la place)
  // Si le CallPanel est visible, c'est lui qui gère l'audio via son <video> hidden → évite le double-play
  const persistentAudioRef = useRef<HTMLAudioElement>(null);

  const isInCallConversation = !!(recipientId && (
    recipientId === callRecipientId ||
    callConversationId === `dm_${[recipientId, user?.id || ''].sort().join('_')}`
  ));

  useEffect(() => {
    const el = persistentAudioRef.current;
    if (!el) return;

    // Jouer seulement si l'utilisateur est sur une autre page (CallPanel absent)
    if (!isInCallConversation && remoteStreams.size > 0) {
      const firstStream = remoteStreams.values().next().value as MediaStream | undefined;
      if (firstStream) {
        el.srcObject = firstStream;
        el.volume = 1.0;
        el.play().catch((err) => {
          console.warn('[AUDIO] Autoplay bloqué:', err.message);
        });
      }
    } else {
      // CallPanel visible → il gère l'audio lui-même, on coupe ici
      el.srcObject = null;
    }
  }, [remoteStreams, isInCallConversation]);

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
      api.markNotificationsRead(`group:${groupId}`);
    } else if (recipientId) {
      setSelectedChannel(`dm:${recipientId}`);
      setActiveDM(recipientId);
      setActiveGroup(null);
      api.markNotificationsRead(recipientId);
    } else if (pathname === '/channels/me' || pathname === '/channels/me/') {
      setSelectedChannel('friends');
      setActiveDM(null);
      setActiveGroup(null);
    } else if (pathname === '/channels/me/changelogs') {
      setSelectedChannel('changelogs');
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
      router.push(`/channels/groups/${newGroupId}`);
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
            <MessageCircleIcon size={32} className="text-[var(--accent-foreground)]" />
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
            <MessageCircleIcon size={32} className="text-[var(--accent-foreground)]" />
          </div>
          <p className="text-sm text-[var(--muted)]">Redirection...</p>
        </div>
      </div>
    );
  }

  const { serverListPosition } = layoutPrefs;
  const isTopBottom = serverListPosition === 'top' || serverListPosition === 'bottom';

  // ── Content area (shared between top/bottom and left/right layouts) ──
  const mainContent = (
    <div data-layout="content" className={`flex min-w-0 flex-1 flex-col overflow-hidden ${ui.isGlass ? 'rounded-2xl' : ''} pb-16 md:pb-0`}>
      {selectedChannel?.startsWith('group:') ? (
        <GroupChatArea groupId={selectedChannel.replace('group:', '')} onLeave={() => router.push('/channels/me')} />
      ) : children}
    </div>
  );

  return (
    <div
      data-layout="root"
      data-ui-style={layoutPrefs.uiStyle}
      className={`flex h-dvh overflow-hidden ${ui.isGlass ? '' : 'bg-background'} ${ui.rootPadding} ${isTopBottom ? 'flex-col' : 'flex-row'}`}
      style={ui.isGlass ? {
        backgroundImage: wallpaper
          ? (wallpaper.startsWith('linear-gradient') || wallpaper.startsWith('radial-gradient') ? wallpaper : `url(${resolveMediaUrl(wallpaper) ?? wallpaper})`)
          : 'radial-gradient(ellipse 90% 70% at 15% 5%, oklch(0.80 0.14 290 / 55%) 0%, transparent 55%), radial-gradient(ellipse 70% 55% at 85% 85%, oklch(0.75 0.16 230 / 45%) 0%, transparent 55%), radial-gradient(ellipse 55% 45% at 55% 45%, oklch(0.82 0.11 320 / 30%) 0%, transparent 50%), radial-gradient(ellipse 50% 40% at 30% 75%, oklch(0.78 0.13 180 / 25%) 0%, transparent 50%)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      } : undefined}
    >
      {/* Audio persistant */}
      <audio ref={persistentAudioRef} autoPlay playsInline className="sr-only" />
      <IncomingCallDialog
        open={!!incomingCall}
        callerName={incomingCall?.callerName || ''}
        callerAvatar={incomingCall?.callerAvatar}
        callType={incomingCall?.callType || 'voice'}
        onAccept={acceptCall}
        onDecline={declineCall}
      />

      {/* ── MOBILE: member list backdrop ── */}
      {isMobile && showMemberList && (
        <div className="fixed inset-0 z-40 bg-black/60" onClick={closeAll} />
      )}

      {/* ── MOBILE: swipe-drawer backdrop (opacity controlled by gesture) ── */}
      {isMobile && (
        <div
          ref={backdropRef}
          onClick={closeSidebar}
          className="fixed inset-0 z-40 bg-black will-change-[opacity]"
          style={{ opacity: 0, pointerEvents: 'none' }}
        />
      )}

      {/* ── DESKTOP: Server list TOP ── */}
      {!isMobile && serverListPosition === 'top' && (
        <div data-layout="server-list" className={`shrink-0 ${ui.panelWrapper}`}>
          <ServerList horizontal selectedServer={selectedServer} onSelectServer={handleSelectServer} />
        </div>
      )}

      {/* ── DESKTOP: Inner row (sidebar + content) ── */}
      {!isMobile && (
        <div className={`flex min-w-0 ${ui.isGlass ? 'gap-1.5' : 'gap-0'} ${isTopBottom ? 'min-h-0 flex-1 flex-row' : 'h-full w-full flex-row'}`}>
          {/* Server list LEFT */}
          {serverListPosition === 'left' && (
            <div data-layout="server-list" className={`h-full shrink-0 ${ui.panelWrapper}`}>
              <ServerList selectedServer={selectedServer} onSelectServer={handleSelectServer} />
            </div>
          )}

          {/* Sidebar (left side — all positions except right) */}
          {serverListPosition !== 'right' && (
            <>
              <div data-layout="sidebar" style={{ width: channelListWidth }} className={`h-full shrink-0 ${ui.panelWrapper}`}>
                <ChannelList
                  serverId={selectedServer}
                  selectedChannel={selectedChannel}
                  onSelectChannel={handleSelectChannel}
                />
              </div>
              <ResizeHandle onMouseDown={onChannelResize} />
            </>
          )}

          {/* Content */}
          {mainContent}

          {/* Sidebar (right side — only for right position) */}
          {serverListPosition === 'right' && (
            <>
              <ResizeHandle onMouseDown={onChannelResize} />
              <div data-layout="sidebar" style={{ width: channelListWidth }} className={`h-full shrink-0 ${ui.panelWrapper}`}>
                <ChannelList
                  serverId={selectedServer}
                  selectedChannel={selectedChannel}
                  onSelectChannel={handleSelectChannel}
                />
              </div>
            </>
          )}

          {/* Server list RIGHT */}
          {serverListPosition === 'right' && (
            <div data-layout="server-list" className={`h-full shrink-0 ${ui.panelWrapper}`}>
              <ServerList selectedServer={selectedServer} onSelectServer={handleSelectServer} />
            </div>
          )}
        </div>
      )}

      {/* ── DESKTOP: Server list BOTTOM ── */}
      {!isMobile && serverListPosition === 'bottom' && (
        <div data-layout="server-list" className={`shrink-0 ${ui.panelWrapper}`}>
          <ServerList horizontal selectedServer={selectedServer} onSelectServer={handleSelectServer} />
        </div>
      )}

      {/* ── MOBILE: render content directly (full width, no rounded) ── */}
      {isMobile && mainContent}

      {/* ── MOBILE: swipe-driven sidebar (ServerList + ChannelList) ── */}
      {isMobile && (
        <aside
          ref={sidebarRef}
          className="fixed inset-y-0 left-0 z-50 flex h-dvh shadow-2xl will-change-transform"
          style={{ width: SIDEBAR_WIDTH, transform: `translateX(-${SIDEBAR_WIDTH}px)` }}
        >
          <ServerList selectedServer={selectedServer} onSelectServer={handleSelectServer} />
          <div className="h-full w-60 shrink-0">
            <ChannelList serverId={selectedServer} selectedChannel={selectedChannel} onSelectChannel={handleSelectChannel} />
          </div>
        </aside>
      )}

      {/* ── MOBILE BOTTOM NAV (always visible on mobile) ── */}
      {isMobile && <MobileBottomNav />}
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
