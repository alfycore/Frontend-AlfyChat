'use client';

import { useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { MessageCircleIcon } from '@/components/icons';
import { useAuth } from '@/hooks/use-auth';
import { useMobileNav } from '@/hooks/use-mobile-nav';
import { useLayoutPrefs, useLayoutPrefsSync } from '@/hooks/use-layout-prefs';
import { useUIStyle } from '@/hooks/use-ui-style';
import { useBackground } from '@/hooks/use-background';
import { useNotification } from '@/hooks/use-notification';
import { useResizablePanel } from '@/hooks/use-resizable-panel';
import { useSwipeDrawer } from '@/hooks/use-swipe-drawer';
import { CallProvider, useCallContext } from '@/hooks/use-call-context';
import { MobileNavProvider } from '@/hooks/use-mobile-nav';
import { VoiceProvider } from '@/hooks/use-voice';
import { setActiveDM, setActiveGroup, setActiveChannel, clearUnread } from '@/lib/notification-store';
import { api, resolveMediaUrl } from '@/lib/api';
import { socketService } from '@/lib/socket';
import { ServerList } from '@/components/chat/server-list';
import { ChannelList } from '@/components/chat/channel-list';
import { MemberList } from '@/components/chat/member-list';
import { VoiceControlBar } from '@/components/chat/voice-control-bar';
import { IncomingCallDialog } from '@/components/chat/incoming-call-dialog';
import { MobileBottomNav } from '@/components/chat/mobile-bottom-nav';
import { MobileNavDrawer } from '@/components/chat/mobile-nav-drawer';
import { ServerSettingsDialog } from '@/components/chat/server-settings-dialog';
import { SettingsDialog } from '@/components/chat/settings-dialog';
import { cn } from '@/lib/utils';

// ── Resize handle ─────────────────────────────────────────────────────────────

function ResizeHandle({ onMouseDown }: { onMouseDown: (e: React.MouseEvent) => void }) {
  return (
    <div
      onMouseDown={onMouseDown}
      className="group relative z-10 flex w-1 shrink-0 cursor-col-resize items-center justify-center bg-transparent transition-colors hover:bg-primary/5"
    >
      <div className="h-8 w-0.5 rounded-full bg-border transition-all group-hover:h-12 group-hover:bg-primary/40 group-active:bg-primary" />
    </div>
  );
}

// ── Loading screen ────────────────────────────────────────────────────────────

function LoadingScreen() {
  return (
    <div className="relative flex h-dvh items-center justify-center overflow-hidden bg-background">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,oklch(0.5_0_280/3%)_1px,transparent_1px),linear-gradient(to_bottom,oklch(0.5_0_280/3%)_1px,transparent_1px)] bg-size-[72px_72px]" />
      <div className="relative z-10 flex flex-col items-center gap-4">
        <div className="flex size-16 animate-pulse items-center justify-center rounded-2xl bg-primary/10">
          <MessageCircleIcon size={32} className="text-primary" />
        </div>
        <p className="text-sm text-muted-foreground">Chargement…</p>
      </div>
    </div>
  );
}

// ── Inner layout ──────────────────────────────────────────────────────────────

function LayoutInner({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const { isMobile, showSidebar, showMemberList, showSettings, memberListDesktopVisible, openSidebar, closeSidebar, closeSettings, closeAll } = useMobileNav();
  const { prefs: layoutPrefs } = useLayoutPrefs();
  useLayoutPrefsSync();
  const ui = useUIStyle();
  const { wallpaper } = useBackground();
  useNotification();

  // ── Parse active route ─────────────────────────────────────────────────────
  const serverMatch = pathname.match(/\/channels\/server\/([^/]+)/);
  const channelMatch = pathname.match(/\/channels\/server\/[^/]+\/([^/]+)/);
  const dmMatch = pathname.match(/\/channels\/me\/([^/]+)/);
  const groupMatch = pathname.match(/\/channels\/(?:me\/g|groups)\/([^/]+)/);

  const activeServerId = serverMatch?.[1] ?? null;
  const activeChannelId = channelMatch?.[1] ?? null;
  const activeDmId = dmMatch?.[1] ?? null;
  const activeGroupId = groupMatch?.[1] ?? null;

  const selectedChannel = activeChannelId
    ?? (activeDmId ? `dm:${activeDmId}` : null)
    ?? (activeGroupId ? `group:${activeGroupId}` : null)
    ?? (pathname === '/channels/me' || pathname === '/channels/me/' ? 'friends' : null);

  // ── Server settings ────────────────────────────────────────────────────────
  const [serverSettingsOpen, setServerSettingsOpen] = useState(false);

  // ── Incoming call ──────────────────────────────────────────────────────────
  const { callType, callStatus, callerName, callerAvatar, acceptCall, declineCall } = useCallContext();
  const [incomingCall, setIncomingCall] = useState<{ callerName: string; callerAvatar?: string; callType: 'voice' | 'video' } | null>(null);
  useEffect(() => {
    if (callStatus === 'ringing') {
      setIncomingCall({ callerName: callerName || 'Utilisateur', callerAvatar, callType: callType || 'voice' });
    } else {
      setIncomingCall(null);
    }
  }, [callStatus, callType, callerName, callerAvatar]);

  // ── Resizable channel list ─────────────────────────────────────────────────
  const { width: channelListWidth, onMouseDown: onChannelResize } = useResizablePanel({
    storageKey: 'alfychat_sidebar_width',
    defaultWidth: 240,
    minWidth: 160,
    maxWidth: 400,
    side: 'right',
    disabled: isMobile,
  });

  // ── Resizable member list ──────────────────────────────────────────────────
  const { width: memberListWidth, onMouseDown: onMemberResize } = useResizablePanel({
    storageKey: 'alfychat_memberlist_width',
    defaultWidth: 224,
    minWidth: 160,
    maxWidth: 360,
    side: 'left',
    disabled: isMobile,
  });

  // ── Mobile swipe drawer ────────────────────────────────────────────────────
  const SIDEBAR_WIDTH = 320;
  const { sidebarRef, backdropRef } = useSwipeDrawer({
    open: showSidebar,
    onOpen: openSidebar,
    onClose: closeSidebar,
    width: SIDEBAR_WIDTH,
    enabled: isMobile,
  });

  // ── Notification sync ──────────────────────────────────────────────────────
  useEffect(() => {
    if (activeGroupId) {
      setActiveGroup(activeGroupId);
      setActiveDM(null);
      setActiveChannel(null);
      api.markNotificationsRead(`group:${activeGroupId}`).catch(() => {});
      socketService.emit('MARK_READ', { key: `group:${activeGroupId}` });
    } else if (activeDmId) {
      setActiveDM(activeDmId);
      setActiveGroup(null);
      setActiveChannel(null);
      api.markNotificationsRead(activeDmId).catch(() => {});
      socketService.emit('MARK_READ', { key: activeDmId });
    } else if (activeChannelId && activeServerId) {
      setActiveChannel(activeChannelId, activeServerId);
      setActiveDM(null);
      setActiveGroup(null);
      clearUnread(`channel:${activeChannelId}`);
      api.markNotificationsRead(`channel:${activeChannelId}`).catch(() => {});
      socketService.emit('MARK_READ', { key: `channel:${activeChannelId}` });
    } else if (pathname === '/channels/me' || pathname === '/channels/me/') {
      setActiveDM(null);
      setActiveGroup(null);
      setActiveChannel(null);
    }
  }, [activeGroupId, activeDmId, activeChannelId, activeServerId, pathname]);

  useEffect(() => () => { setActiveDM(null); setActiveGroup(null); setActiveChannel(null); }, []);

  // ── Navigate handlers ──────────────────────────────────────────────────────
  const handleSelectServer = useCallback((id: string | null) => {
    if (!id) router.push('/channels/me');
    else if (id === 'groups') router.push('/channels/groups');
    else if (id === 'hosting') router.push('/channels/hosting');
    else router.push(`/channels/server/${id}`);
  }, [router]);

  const handleSelectChannel = useCallback((ch: string | null) => {
    if (!ch) return;
    if (ch === 'friends') router.push('/channels/me');
    else if (ch.startsWith('dm:')) router.push(`/channels/me/${ch.replace('dm:', '')}`);
    else if (ch.startsWith('group:')) router.push(`/channels/groups/${ch.replace('group:', '')}`);
    else if (activeServerId) router.push(`/channels/server/${activeServerId}/${ch}`);
  }, [router, activeServerId]);

  // ── Auth guard ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.push('/login');
  }, [isLoading, isAuthenticated, router]);

  // ── Close mobile sidebar on navigate ──────────────────────────────────────
  useEffect(() => { if (isMobile) closeAll(); }, [pathname, isMobile, closeAll]);

  if (!mounted || isLoading) return <LoadingScreen />;
  if (!user) return <LoadingScreen />;

  // ── Glass wallpaper ────────────────────────────────────────────────────────
  const glassBg = wallpaper
    ? (wallpaper.startsWith('linear-gradient') || wallpaper.startsWith('radial-gradient') ? wallpaper : `url(${resolveMediaUrl(wallpaper) ?? wallpaper})`)
    : 'radial-gradient(ellipse 90% 70% at 15% 5%, oklch(0.80 0.14 290 / 55%) 0%, transparent 55%), radial-gradient(ellipse 70% 55% at 85% 85%, oklch(0.75 0.16 230 / 45%) 0%, transparent 55%), radial-gradient(ellipse 55% 45% at 55% 45%, oklch(0.82 0.11 320 / 30%) 0%, transparent 50%), radial-gradient(ellipse 50% 40% at 30% 75%, oklch(0.78 0.13 180 / 25%) 0%, transparent 50%)';

  const isTopBottom = layoutPrefs.serverListPosition === 'top' || layoutPrefs.serverListPosition === 'bottom';

  // ── Sidebar panels ─────────────────────────────────────────────────────────
  const serverListPanel = (
    <div data-layout="server-list" className={cn(
      'shrink-0',
      !isTopBottom && 'h-full',
      ui.sidebarWrapper,
      ui.sidebarTransition,
    )}>
      <ServerList
        selectedServer={activeServerId}
        onSelectServer={handleSelectServer}
        horizontal={isTopBottom}
      />
    </div>
  );

  const channelListPanel = (
    <div
      data-layout="sidebar"
      style={!isTopBottom ? { width: channelListWidth } : undefined}
      className={cn(
        'flex shrink-0 flex-col',
        !isTopBottom && 'h-full',
        ui.sidebarWrapper,
        ui.sidebarTransition,
      )}
    >
      <ChannelList
        serverId={activeServerId}
        selectedChannel={selectedChannel}
        onSelectChannel={handleSelectChannel}
        onOpenSettings={() => setServerSettingsOpen(true)}
      />
      <VoiceControlBar />
    </div>
  );

  // ── Member list ────────────────────────────────────────────────────────────
  const memberListPanel = memberListDesktopVisible && activeServerId && (
    <div
      data-layout="member-list"
      style={{ width: memberListWidth }}
      className={cn('h-full shrink-0', ui.panelWrapper, ui.panelTransition)}
    >
      <MemberList serverId={activeServerId} />
    </div>
  );

  return (
    <div
      data-layout="root"
      data-ui-style={layoutPrefs.uiStyle}
      className={cn(
        'flex h-dvh overflow-hidden',
        !ui.isGlass && 'bg-background',
        ui.rootPadding,
        isTopBottom ? 'flex-col' : 'flex-row',
      )}
      style={ui.isGlass ? { backgroundImage: glassBg, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
    >
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

      {/* ── MOBILE: swipe backdrop ── */}
      {/* Géré directement dans MobileNavDrawer via backdropRef */}

      {/* ── DESKTOP: top server list ── */}
      {!isMobile && layoutPrefs.serverListPosition === 'top' && serverListPanel}

      {/* ── DESKTOP: main row ── */}
      {!isMobile && (
        <div className={cn('flex min-w-0 gap-2', isTopBottom ? 'min-h-0 flex-1 flex-row' : 'h-full w-full flex-row')}>

          {/* Member list LEFT */}
          {memberListDesktopVisible && layoutPrefs.memberListSide === 'left' && activeServerId && (
            <>
              <div data-layout="member-list" style={{ width: memberListWidth }} className={cn('h-full shrink-0', ui.panelWrapper)}>
                <MemberList serverId={activeServerId} />
              </div>
              <ResizeHandle onMouseDown={onMemberResize} />
            </>
          )}

          {/* Server list LEFT */}
          {layoutPrefs.serverListPosition === 'left' && serverListPanel}

          {/* Channel list (left of content, unless right position) */}
          {layoutPrefs.serverListPosition !== 'right' && (
            <>
              {channelListPanel}
              {ui.isGlass && <ResizeHandle onMouseDown={onChannelResize} />}
            </>
          )}

          {/* ── Content ── */}
          <div data-layout="content" className={cn('flex min-w-0 flex-1 flex-col', !ui.isGlass && 'bg-card', ui.panelWrapper, ui.panelTransition)}>
            {children}
          </div>

          {/* Channel list RIGHT */}
          {layoutPrefs.serverListPosition === 'right' && (
            <>
              <ResizeHandle onMouseDown={onChannelResize} />
              {channelListPanel}
            </>
          )}

          {/* Server list RIGHT */}
          {layoutPrefs.serverListPosition === 'right' && serverListPanel}

          {/* Member list RIGHT (default) */}
          {memberListDesktopVisible && layoutPrefs.memberListSide !== 'left' && activeServerId && (
            <>
              <ResizeHandle onMouseDown={onMemberResize} />
              <div data-layout="member-list" style={{ width: memberListWidth }} className={cn('h-full shrink-0', ui.panelWrapper)}>
                <MemberList serverId={activeServerId} />
              </div>
            </>
          )}
        </div>
      )}

      {/* ── DESKTOP: bottom server list ── */}
      {!isMobile && layoutPrefs.serverListPosition === 'bottom' && serverListPanel}

      {/* ── MOBILE: content ── */}
      {isMobile && (
        <div data-layout="content" className={cn('flex min-w-0 flex-1 flex-col overflow-hidden', ui.mobilePanel, ui.panelTransition)} style={{ paddingBottom: 'calc(3.5rem + env(safe-area-inset-bottom, 0px))' }}>
          {children}
        </div>
      )}

      {/* ── MOBILE: tiroir navigation (serveurs + channels) ── */}
      {isMobile && (
        <MobileNavDrawer
          sidebarRef={sidebarRef}
          backdropRef={backdropRef}
          width={SIDEBAR_WIDTH}
          onClose={closeSidebar}
          activeServerId={activeServerId}
          selectedChannel={selectedChannel}
          onSelectServer={handleSelectServer}
          onSelectChannel={handleSelectChannel}
          onOpenSettings={() => setServerSettingsOpen(true)}
        />
      )}

      {/* ── MOBILE: member list overlay (slide depuis la droite) ── */}
        {isMobile && activeServerId && (
        <div
          className={cn(
            'fixed inset-y-0 right-0 z-50 w-[82vw] max-w-xs overflow-hidden shadow-2xl',
            ui.panelWrapper,
            showMemberList ? 'translate-x-0' : 'translate-x-full',
            ui.panelTransition,
          )}
        >
          <MemberList serverId={activeServerId} />
        </div>
      )}

      {/* ── MOBILE: bottom nav ── */}
      {isMobile && <MobileBottomNav />}

      {/* ── Server settings dialog ── */}
      {serverSettingsOpen && activeServerId && (
        <ServerSettingsDialog
          serverId={activeServerId}
          open={serverSettingsOpen}
          onOpenChange={setServerSettingsOpen}
          onServerUpdated={() => setServerSettingsOpen(false)}
        />
      )}

      {/* ── User settings dialog (mobile bottom nav) ── */}
      <SettingsDialog open={showSettings} onOpenChange={(open) => !open && closeSettings()} />
    </div>
  );
}

// ── Root export ───────────────────────────────────────────────────────────────

export default function ChannelsLayout({ children }: { children: ReactNode }) {
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
