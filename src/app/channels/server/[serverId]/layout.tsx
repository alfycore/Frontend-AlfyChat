'use client';

import { useState, useEffect, useCallback, ReactNode } from 'react';
import { useResizablePanel } from '@/hooks/use-resizable-panel';
import { useLayoutPrefs } from '@/hooks/use-layout-prefs';

function ResizeHandle({ onMouseDown }: { onMouseDown: (e: React.MouseEvent) => void }) {
  return (
    <div
      onMouseDown={onMouseDown}
      className="group relative z-10 flex w-1 shrink-0 cursor-col-resize items-center justify-center bg-transparent transition-colors hover:bg-[var(--accent)]/20 active:bg-[var(--accent)]/30"
    >
      <div className="h-8 w-0.5 rounded-full bg-[var(--border)] transition-all group-hover:h-12 group-hover:bg-[var(--accent)]/60 group-active:bg-[var(--accent)]" />
    </div>
  );
}
import { useRouter, usePathname, useParams } from 'next/navigation';
import { Skeleton, Spinner } from '@heroui/react';
import { MessageCircleIcon } from '@/components/icons';
import { useAuth } from '@/hooks/use-auth';
import { CallProvider, useCallContext } from '@/hooks/use-call-context';
import { MobileNavProvider, useMobileNav } from '@/hooks/use-mobile-nav';
import { useNotification } from '@/hooks/use-notification';
import { VoiceProvider } from '@/hooks/use-voice';
import { ServerList } from '@/components/chat/server-list';
import { ChannelList } from '@/components/chat/channel-list';
import { MemberList } from '@/components/chat/member-list';
import { IncomingCallDialog } from '@/components/chat/incoming-call-dialog';
import { ServerSettingsDialog } from '@/components/chat/server-settings-dialog';
import { VoiceControlBar } from '@/components/chat/voice-control-bar';

function LayoutInner({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const { isMobile, showSidebar, showMemberList, closeAll, memberListDesktopVisible } = useMobileNav();

  const { prefs: layoutPrefs } = useLayoutPrefs();

  const { width: channelListWidth, onMouseDown: onChannelResize } = useResizablePanel({
    storageKey: 'alfychat_server_sidebar_width',
    defaultWidth: 240,
    minWidth: 160,
    maxWidth: 400,
    side: 'right',
    disabled: isMobile,
  });

  const { width: memberListWidth, onMouseDown: onMemberResize } = useResizablePanel({
    storageKey: 'alfychat_server_memberlist_width',
    defaultWidth: 224,
    minWidth: 160,
    maxWidth: 360,
    side: 'left',
    disabled: isMobile,
  });

  useNotification();

  const serverId = params?.serverId as string;
  const channelId = params?.channelId as string | undefined;

  const [serverSettingsOpen, setServerSettingsOpen] = useState(false);

  // Vérifier que l'utilisateur est membre du serveur
  useEffect(() => {
    if (!serverId || !user) return;
    const { socketService } = require('@/lib/socket');
    socketService.requestServerInfo(serverId, (data: any) => {
      if (data?.error === 'NOT_MEMBER') {
        router.replace('/channels/me');
      }
    });
  }, [serverId, user, router]);

  // Écouter les événements SERVER_KICKED et SERVER_BANNED
  useEffect(() => {
    const handleKicked = (data: any) => {
      const kickedServerId = data?.payload?.serverId || data?.serverId;
      if (kickedServerId === serverId) {
        router.push('/channels/me');
      }
    };
    const handleBanned = (data: any) => {
      const bannedServerId = data?.payload?.serverId || data?.serverId;
      if (bannedServerId === serverId) {
        router.push('/channels/me');
      }
    };
    const { socketService } = require('@/lib/socket');
    socketService.on('SERVER_KICKED', handleKicked);
    socketService.on('SERVER_BANNED', handleBanned);
    return () => {
      socketService.off('SERVER_KICKED', handleKicked);
      socketService.off('SERVER_BANNED', handleBanned);
    };
  }, [serverId, router]);

  const {
    callStatus,
    callerName,
    callerAvatar,
    callType,
    acceptCall,
    declineCall,
  } = useCallContext();

  const [incomingCall, setIncomingCall] = useState<{
    callerName: string;
    callerAvatar?: string;
    callType: 'voice' | 'video';
  } | null>(null);

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

  // Fermer la sidebar mobile quand on navigue
  useEffect(() => {
    if (isMobile) {
      closeAll();
    }
  }, [pathname, isMobile, closeAll]);

  // Auth guard
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  const handleSelectServer = useCallback((id: string | null) => {
    if (!id) {
      router.push('/channels/me');
    } else {
      router.push(`/channels/server/${id}`);
    }
  }, [router]);

  const handleSelectChannel = useCallback((ch: string | null) => {
    if (!ch) return;
    if (ch === 'friends') {
      router.push('/channels/me');
    } else if (ch.startsWith('dm:')) {
      router.push(`/channels/me/${ch.replace('dm:', '')}`);
    } else {
      // Text/voice channel id
      router.push(`/channels/server/${serverId}/${ch}`);
    }
  }, [router, serverId]);

  if (isLoading || !mounted) {
    return (
      <div className="relative flex h-dvh items-center justify-center overflow-hidden bg-[var(--background)]">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,oklch(0.5_0_280/3%)_1px,transparent_1px),linear-gradient(to_bottom,oklch(0.5_0_280/3%)_1px,transparent_1px)] bg-size-[72px_72px]" />
        <div className="relative z-10 flex flex-col items-center gap-4">
          <Skeleton className="size-16 rounded-2xl" animationType="shimmer" />
          {mounted && <Spinner size="sm" />}
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
          <Spinner size="sm" />
          <p className="text-sm text-[var(--muted)]">Redirection...</p>
        </div>
      </div>
    );
  }

  const { serverListPosition, memberListSide } = layoutPrefs;
  const isTopBottom = serverListPosition === 'top' || serverListPosition === 'bottom';

  const sidebarContent = (
    <>
      <ChannelList
        serverId={serverId}
        selectedChannel={channelId ?? null}
        onSelectChannel={handleSelectChannel}
        onOpenSettings={() => setServerSettingsOpen(true)}
      />
      <VoiceControlBar />
    </>
  );

  return (
    <div data-layout="root" className={`flex h-dvh overflow-hidden bg-[var(--background)] ${isTopBottom ? 'flex-col' : 'flex-row'}`}>
      <IncomingCallDialog
        open={!!incomingCall}
        callerName={incomingCall?.callerName || ''}
        callerAvatar={incomingCall?.callerAvatar}
        callType={incomingCall?.callType || 'voice'}
        onAccept={acceptCall}
        onDecline={declineCall}
      />

      {/* Mobile overlay */}
      {isMobile && (showSidebar || showMemberList) && (
        <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={closeAll} />
      )}

      {/* ── DESKTOP: Server list TOP ── */}
      {!isMobile && serverListPosition === 'top' && (
        <ServerList horizontal selectedServer={serverId} onSelectServer={handleSelectServer} />
      )}

      {/* ── DESKTOP: Inner row ── */}
      {!isMobile && (
        <div className={`flex min-w-0 ${isTopBottom ? 'min-h-0 flex-1 flex-row' : 'h-full w-full flex-row'}`}>

          {/* Member list LEFT */}
          {memberListDesktopVisible && memberListSide === 'left' && (
            <>
              <div data-layout="member-list" style={{ width: memberListWidth }} className="h-full shrink-0">
                <MemberList serverId={serverId} />
              </div>
              <ResizeHandle onMouseDown={onMemberResize} />
            </>
          )}

          {/* Server list LEFT */}
          {serverListPosition === 'left' && (
            <div data-layout="server-list" className="h-full shrink-0">
              <ServerList selectedServer={serverId} onSelectServer={handleSelectServer} />
            </div>
          )}

          {/* Sidebar left (all except right) */}
          {serverListPosition !== 'right' && (
            <>
              <div data-layout="sidebar" style={{ width: channelListWidth }} className="flex h-full shrink-0 flex-col">
                {sidebarContent}
              </div>
              <ResizeHandle onMouseDown={onChannelResize} />
            </>
          )}

          {/* Content */}
          <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
            {children}
          </div>

          {/* Sidebar right */}
          {serverListPosition === 'right' && (
            <>
              <ResizeHandle onMouseDown={onChannelResize} />
              <div data-layout="sidebar" style={{ width: channelListWidth }} className="flex h-full shrink-0 flex-col">
                {sidebarContent}
              </div>
            </>
          )}

          {/* Server list RIGHT */}
          {serverListPosition === 'right' && (
            <div data-layout="server-list" className="h-full shrink-0">
              <ServerList selectedServer={serverId} onSelectServer={handleSelectServer} />
            </div>
          )}

          {/* Member list RIGHT (default) */}
          {memberListDesktopVisible && memberListSide !== 'left' && (
            <>
              <ResizeHandle onMouseDown={onMemberResize} />
              <div data-layout="member-list" style={{ width: memberListWidth }} className="h-full shrink-0">
                <MemberList serverId={serverId} />
              </div>
            </>
          )}
        </div>
      )}

      {/* ── DESKTOP: Server list BOTTOM ── */}
      {!isMobile && serverListPosition === 'bottom' && (
        <ServerList horizontal selectedServer={serverId} onSelectServer={handleSelectServer} />
      )}

      {/* ── MOBILE: content ── */}
      {isMobile && <div className="flex min-w-0 flex-1 flex-col overflow-hidden">{children}</div>}

      {/* ── MOBILE: Sidebar overlay ── */}
      {isMobile && (
        <div className={`fixed inset-y-0 left-0 z-50 flex transition-transform duration-300 ease-in-out ${showSidebar ? 'translate-x-0' : '-translate-x-full'}`}>
          <ServerList selectedServer={serverId} onSelectServer={handleSelectServer} />
          <div className="flex h-full w-60 shrink-0 flex-col">{sidebarContent}</div>
        </div>
      )}

      {/* ── MOBILE: Member list overlay ── */}
      {isMobile && (
        <div className={`fixed inset-y-0 right-0 z-50 transition-transform duration-300 ease-in-out ${showMemberList ? 'translate-x-0' : 'translate-x-full'}`}>
          <MemberList serverId={serverId} />
        </div>
      )}

      {/* Server settings dialog */}
      {serverSettingsOpen && (
        <ServerSettingsDialog
          serverId={serverId}
          open={serverSettingsOpen}
          onOpenChange={setServerSettingsOpen}
          onServerUpdated={() => setServerSettingsOpen(false)}
        />
      )}
    </div>
  );
}

export default function ServerLayout({ children }: { children: ReactNode }) {
  return (
    <CallProvider>
      <MobileNavProvider>
        <VoiceProvider>
          <LayoutInner>{children}</LayoutInner>
        </VoiceProvider>
      </MobileNavProvider>
    </CallProvider>
  );
}
