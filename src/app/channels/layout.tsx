'use client';

import { useState, useEffect, useCallback, type ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { Button } from '@heroui/react';
import { ChevronLeftIcon, ChevronRightIcon } from '@/components/icons';
import { useAuth } from '@/hooks/use-auth';
import { useMobileNav } from '@/hooks/use-mobile-nav';
import { useLayoutPrefs, useLayoutPrefsSync } from '@/hooks/use-layout-prefs';
import { useUIStyle } from '@/hooks/use-ui-style';
import { useBackground } from '@/hooks/use-background';
import { useNotification } from '@/hooks/use-notification';
import { useResizablePanel } from '@/hooks/use-resizable-panel';
import { useSwipeDrawer } from '@/hooks/use-swipe-drawer';
import { CallProvider, useCallContext } from '@/hooks/use-call-context';
import { GlobalCallAudio } from '@/components/chat/global-call-audio';
import { MobileNavProvider } from '@/hooks/use-mobile-nav';
import { VoiceProvider } from '@/hooks/use-voice';
import { usePresence } from '@/hooks/use-presence';
import { setActiveDM, setActiveGroup, setActiveChannel, clearUnread } from '@/lib/notification-store';
import { api, resolveMediaUrl } from '@/lib/api';
import { preloadEmojiImages } from '@/components/chat/emoji-picker';
import { socketService } from '@/lib/socket';
import { ServerList } from '@/components/chat/server-list';
import { ChannelList } from '@/components/chat/channel-list';
import { MemberList } from '@/components/chat/member-list';
import { VoiceControlBar } from '@/components/chat/voice-control-bar';
import { IncomingCallDialog } from '@/components/chat/incoming-call-dialog';
import { MobileBottomNav } from '@/components/chat/mobile-bottom-nav';
import { MobileNavDrawer } from '@/components/chat/mobile-nav-drawer';
import { MobilePermissionPrompt } from '@/components/chat/mobile-permission-prompt';
import { ServerSettingsDialog } from '@/components/chat/server-settings-dialog';
import { SettingsDialog } from '@/components/chat/settings-dialog';
import { cn } from '@/lib/utils';

// ── Resize grip — Apple flat, borderless ───────────────────────────────────

function ResizeHandle({ onMouseDown }: { onMouseDown: (e: React.MouseEvent) => void }) {
  return (
    <div
      onMouseDown={onMouseDown}
      className="group relative z-10 flex w-1.5 shrink-0 cursor-col-resize items-center justify-center bg-transparent"
    >
      <div className="h-9 w-1 rounded-full bg-muted/20 transition-all duration-200 group-hover:h-14 group-hover:bg-accent/40 group-active:bg-accent" />
    </div>
  );
}

// ── Loading screen ──────────────────────────────────────────────────────────

function LoadingScreen() {
  const reduce = useReducedMotion();
  return (
    <div className="flex h-dvh items-center justify-center bg-background">
      <motion.div
        initial={reduce ? false : { opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="flex flex-col items-center gap-4"
      >
        <div className="flex size-16 animate-pulse items-center justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo/Alfychat.svg" alt="AlfyChat" className="dark:hidden" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo/Alfychatlogowihte.svg" alt="AlfyChat" className="hidden dark:block" />
        </div>
        <p className="text-sm text-muted">Chargement…</p>
      </motion.div>
    </div>
  );
}

// ── Inner layout ─────────────────────────────────────────────────────────────

function LayoutInner({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [layoutReady, setLayoutReady] = useState(false);

  const { user, isLoading, isAuthenticated } = useAuth();

  usePresence({
    chosenStatus: (user?.status as 'online' | 'idle' | 'dnd' | 'invisible') ?? 'online',
    customStatus: user?.customStatus,
    emoji: user?.emoji,
  });

  const router = useRouter();
  const pathname = usePathname();

  const {
    isMobile, showSidebar, showMemberList, showSettings, memberListDesktopVisible,
    openSidebar, closeSidebar, closeSettings, closeAll,
  } = useMobileNav();
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

  // ── Server settings ──────────────────────────────────────────────────────
  const [serverSettingsOpen, setServerSettingsOpen] = useState(false);

  // ── Collapsible sidebar (Linear/Notion style, persisted) ────────────────────
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    try { if (localStorage.getItem('alfychat_sidebar_collapsed') === '1') setCollapsed(true); } catch {}
  }, []);
  const toggleCollapsed = useCallback(() => {
    setCollapsed((c) => {
      const next = !c;
      try { localStorage.setItem('alfychat_sidebar_collapsed', next ? '1' : '0'); } catch {}
      return next;
    });
  }, []);

  // ── Incoming call ──────────────────────────────────────────────────────────
  const { callType, callStatus, callerName, callerAvatar, isGroup, callCategory, acceptCall, joinCall, declineCall } = useCallContext();
  const [incomingCall, setIncomingCall] = useState<{ callerName: string; callerAvatar?: string; callType: 'voice' | 'video'; isGroup: boolean; isServerCall: boolean } | null>(null);
  useEffect(() => {
    if (callStatus === 'ringing') {
      setIncomingCall({ callerName: callerName || 'Utilisateur', callerAvatar, callType: callType || 'voice', isGroup: !!isGroup, isServerCall: callCategory === 'server' });
    } else {
      setIncomingCall(null);
    }
  }, [callStatus, callType, callerName, callerAvatar, isGroup, callCategory]);

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
  const [sidebarWidth, setSidebarWidth] = useState(320);
  useEffect(() => {
    const update = () => setSidebarWidth(window.innerWidth);
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const { sidebarRef, backdropRef } = useSwipeDrawer({
    open: showSidebar,
    onOpen: openSidebar,
    onClose: closeSidebar,
    width: sidebarWidth,
    enabled: isMobile,
  });

  // ── Notification sync ──────────────────────────────────────────────────────
  useEffect(() => {
    const syncNotifications = async () => {
      try {
        if (activeGroupId) {
          setActiveGroup(activeGroupId);
          setActiveDM(null);
          setActiveChannel(null);
          const key = `group:${activeGroupId}`;
          await api.markNotificationsRead(key);
          socketService.emit('MARK_READ', { key });
        } else if (activeDmId) {
          setActiveDM(activeDmId);
          setActiveGroup(null);
          setActiveChannel(null);
          await api.markNotificationsRead(activeDmId);
          socketService.emit('MARK_READ', { key: activeDmId });
        } else if (activeChannelId && activeServerId) {
          setActiveChannel(activeChannelId, activeServerId);
          setActiveDM(null);
          setActiveGroup(null);
          const key = `channel:${activeChannelId}`;
          clearUnread(key);
          await api.markNotificationsRead(key);
          socketService.emit('MARK_READ', { key });
        } else if (pathname === '/channels/me' || pathname === '/channels/me/') {
          setActiveDM(null);
          setActiveGroup(null);
          setActiveChannel(null);
        }
      } catch (error) {
        console.error('Notification sync error:', error);
      }
    };
    syncNotifications();
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

  // ── Prefetch initial data before revealing UI ──────────────────────────────
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    preloadEmojiImages();
    const timer = setTimeout(() => { if (!cancelled) setLayoutReady(true); }, 5000);
    Promise.all([api.getServers(), api.getConversations()]).finally(() => {
      if (!cancelled) { clearTimeout(timer); setLayoutReady(true); }
    });
    return () => { cancelled = true; clearTimeout(timer); };
  }, [user?.id]);

  // ── Auth guard ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.push('/login');
  }, [isLoading, isAuthenticated, router]);

  // ── Close mobile sidebar on navigate ───────────────────────────────────────
  useEffect(() => { if (isMobile) closeAll(); }, [pathname, isMobile, closeAll]);

  if (!mounted || isLoading || !user || !layoutReady) return <LoadingScreen />;

  // ── Glass wallpaper ─────────────────────────────────────────────────────────
  const glassBg = wallpaper
    ? (wallpaper.startsWith('linear-gradient') || wallpaper.startsWith('radial-gradient') ? wallpaper : `url(${resolveMediaUrl(wallpaper) ?? wallpaper})`)
    : 'radial-gradient(ellipse 90% 70% at 15% 5%, oklch(0.80 0.14 290 / 55%) 0%, transparent 55%), radial-gradient(ellipse 70% 55% at 85% 85%, oklch(0.75 0.16 230 / 45%) 0%, transparent 55%), radial-gradient(ellipse 55% 45% at 55% 45%, oklch(0.82 0.11 320 / 30%) 0%, transparent 50%), radial-gradient(ellipse 50% 40% at 30% 75%, oklch(0.78 0.13 180 / 25%) 0%, transparent 50%)';

  const showMembers = memberListDesktopVisible && !!activeServerId;

  // ── Server rail — always visible icon column + collapse toggle ──────────────
  const serverRail = (
    <div className="flex h-full shrink-0 flex-col items-center">
      <div className={cn('min-h-0 flex-1 overflow-hidden', ui.sidebarWrapper)}>
        <ServerList selectedServer={activeServerId} onSelectServer={handleSelectServer} />
      </div>
      <Button
        isIconOnly
        size="sm"
        variant="ghost"
        onPress={toggleCollapsed}
        aria-label={collapsed ? 'Déplier la sidebar' : 'Replier la sidebar'}
        className="mt-1 shrink-0 text-muted hover:text-foreground"
      >
        {collapsed ? <ChevronRightIcon size={15} /> : <ChevronLeftIcon size={15} />}
      </Button>
    </div>
  );

  // ── Channel panel — collapses to width 0 ────────────────────────────────────
  const channelPanel = (
    <AnimatePresence initial={false}>
      {!collapsed && (
        <motion.aside
          key="channels"
          data-layout="sidebar"
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: channelListWidth + 8, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="h-full shrink-0 overflow-hidden pl-2"
        >
          <div
            style={{ width: channelListWidth }}
            className={cn('flex h-full flex-col overflow-hidden', ui.sidebarWrapper, ui.sidebarBg)}
          >
            <div className="min-h-0 flex-1">
              <ChannelList
                serverId={activeServerId}
                selectedChannel={selectedChannel}
                onSelectChannel={handleSelectChannel}
                onOpenSettings={() => setServerSettingsOpen(true)}
              />
            </div>
            <VoiceControlBar />
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );

  return (
    <div
      data-layout="root"
      data-ui-style={layoutPrefs.uiStyle}
      className={cn(
        'relative flex h-dvh flex-row overflow-hidden',
        !ui.isGlass && 'bg-background',
        !isMobile && ui.rootPadding,
      )}
      style={ui.isGlass ? { backgroundImage: glassBg, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
    >
      <IncomingCallDialog
        open={!!incomingCall}
        callerName={incomingCall?.callerName || ''}
        callerAvatar={incomingCall?.callerAvatar}
        callType={incomingCall?.callType || 'voice'}
        isGroup={incomingCall?.isGroup}
        isServerCall={incomingCall?.isServerCall}
        onAccept={incomingCall?.isGroup ? joinCall : acceptCall}
        onDecline={declineCall}
      />

      {/* MOBILE — member list backdrop */}
      {isMobile && showMemberList && (
        <div className="fixed inset-0 z-40 bg-black/60" onClick={closeAll} />
      )}

      {/* DESKTOP — collapsible sidebar + content + floating members */}
      {!isMobile && (
        <div className="flex h-full w-full min-w-0 flex-row gap-2">
          {/* Sidebar group : server rail + collapsible channels */}
          <div className="flex h-full shrink-0 flex-row">
            {serverRail}
            {channelPanel}
          </div>

          {!collapsed && <ResizeHandle onMouseDown={onChannelResize} />}

          {/* Content */}
          <div data-layout="content" className={cn('relative flex min-w-0 flex-1 flex-col', ui.panelWrapper, ui.panelTransition)}>
            {children}
          </div>

          {/* Member list — floating overlay (slides from the right) */}
          {activeServerId && (
            <motion.div
              data-layout="member-list"
              style={{ width: memberListWidth }}
              initial={false}
              animate={{
                x: showMembers ? 0 : 24,
                opacity: showMembers ? 1 : 0,
              }}
              transition={{ duration: 0.28, ease: [0.25, 0.46, 0.45, 0.94] }}
              className={cn(
                'absolute inset-y-2 right-2 z-40 overflow-hidden shadow-2xl shadow-black/20',
                !showMembers && 'pointer-events-none',
                ui.panelWrapper,
                ui.panelTransition,
              )}
            >
              <MemberList serverId={activeServerId} />
            </motion.div>
          )}
        </div>
      )}

      {/* MOBILE — content + bottom nav */}
      {isMobile && (() => {
        const showNav = !showSidebar && (showSettings || (!activeDmId && !activeGroupId && !activeChannelId));
        return (
          <>
            <div
              data-layout="content"
              className={cn('flex min-w-0 flex-1 flex-col overflow-hidden', ui.mobilePanel, ui.panelTransition)}
              style={showNav ? { paddingBottom: 'calc(3.5rem + env(safe-area-inset-bottom, 0px))' } : undefined}
            >
              {children}
            </div>
            {showNav && <MobileBottomNav />}
          </>
        );
      })()}

      {/* MOBILE — nav drawer (servers + channels) */}
      {isMobile && (
        <MobileNavDrawer
          sidebarRef={sidebarRef}
          backdropRef={backdropRef}
          width={sidebarWidth}
          onClose={closeSidebar}
          activeServerId={activeServerId}
          selectedChannel={selectedChannel}
          onSelectServer={handleSelectServer}
          onSelectChannel={handleSelectChannel}
          onOpenSettings={() => setServerSettingsOpen(true)}
        />
      )}

      {/* MOBILE — member list slide-over */}
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

      {/* Server settings dialog */}
      {serverSettingsOpen && activeServerId && (
        <ServerSettingsDialog
          serverId={activeServerId}
          open={serverSettingsOpen}
          onOpenChange={setServerSettingsOpen}
          onServerUpdated={() => setServerSettingsOpen(false)}
        />
      )}

      {/* User settings dialog */}
      <SettingsDialog open={showSettings} onOpenChange={(open) => !open && closeSettings()} />

      {/* Mobile permission prompt */}
      {isMobile && <MobilePermissionPrompt />}
    </div>
  );
}

// ── Root export ───────────────────────────────────────────────────────────────

export default function ChannelsLayout({ children }: { children: ReactNode }) {
  return (
    <CallProvider>
      <GlobalCallAudio />
      <MobileNavProvider>
        <VoiceProvider>
          <LayoutInner>{children}</LayoutInner>
        </VoiceProvider>
      </MobileNavProvider>
    </CallProvider>
  );
}
