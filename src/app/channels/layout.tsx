'use client';

import { useState, useEffect, useCallback, useMemo, type ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  motion,
  AnimatePresence,
  useAnimationControls,
  useReducedMotion,
} from 'motion/react';
import { Button, Spinner } from '@heroui/react';
import { ChevronLeftIcon } from '@/components/icons';
import { useAuth } from '@/hooks/use-auth';
import { useMobileNav, MobileNavProvider } from '@/hooks/use-mobile-nav';
import { useLayoutPrefs, useLayoutPrefsSync } from '@/hooks/use-layout-prefs';
import { useUIStyle } from '@/hooks/use-ui-style';
import { useBackground } from '@/hooks/use-background';
import { useNotification } from '@/hooks/use-notification';
import { useResizablePanel } from '@/hooks/use-resizable-panel';
import { useSwipeDrawer } from '@/hooks/use-swipe-drawer';
import { CallProvider, useCallContext } from '@/hooks/use-call-context';
import { GlobalCallAudio } from '@/components/chat/global-call-audio';
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

/* ════════════════════════════════════════════════════════════════════════
   Constantes d'animation — une seule courbe, partout
   ════════════════════════════════════════════════════════════════════════ */

const EASE = [0.25, 0.46, 0.45, 0.94] as const;
const SPRING = { type: 'spring' as const, stiffness: 380, damping: 36 };

/* ════════════════════════════════════════════════════════════════════════
   Hooks internes — chaque responsabilité isolée
   ════════════════════════════════════════════════════════════════════════ */

/** Analyse l'URL active : serveur, canal, DM, groupe, page amis. */
function useActiveRoute(pathname: string) {
  return useMemo(() => {
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

    return { activeServerId, activeChannelId, activeDmId, activeGroupId, selectedChannel };
  }, [pathname]);
}

/** Sidebar repliable, persistée dans localStorage. */
function useCollapsedSidebar() {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try { if (localStorage.getItem('alfychat_sidebar_collapsed') === '1') setCollapsed(true); } catch {}
  }, []);

  const toggle = useCallback(() => {
    setCollapsed((c) => {
      const next = !c;
      try { localStorage.setItem('alfychat_sidebar_collapsed', next ? '1' : '0'); } catch {}
      return next;
    });
  }, []);

  return { collapsed, toggle };
}

/** Synchronise la conversation active avec le store de notifications. */
function useNotificationSync(
  route: ReturnType<typeof useActiveRoute>,
  pathname: string,
) {
  const { activeGroupId, activeDmId, activeChannelId, activeServerId } = route;

  useEffect(() => {
    const sync = async () => {
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
    sync();
  }, [activeGroupId, activeDmId, activeChannelId, activeServerId, pathname]);

  // Reset à la sortie du layout
  useEffect(() => () => { setActiveDM(null); setActiveGroup(null); setActiveChannel(null); }, []);
}

/** Dérive l'appel entrant depuis le contexte d'appel. */
function useIncomingCall() {
  const { callType, callStatus, callerName, callerAvatar, isGroup, callCategory, acceptCall, joinCall, declineCall } = useCallContext();

  const incomingCall = useMemo(() => {
    if (callStatus !== 'ringing') return null;
    return {
      callerName: callerName || 'Utilisateur',
      callerAvatar,
      callType: callType || ('voice' as const),
      isGroup: !!isGroup,
      isServerCall: callCategory === 'server',
    };
  }, [callStatus, callType, callerName, callerAvatar, isGroup, callCategory]);

  return { incomingCall, acceptCall, joinCall, declineCall };
}

/* ════════════════════════════════════════════════════════════════════════
   Sous-composants visuels
   ════════════════════════════════════════════════════════════════════════ */

/** Écran de chargement — logo + spinner, fondu doux. */
function LoadingScreen() {
  const reduce = useReducedMotion();
  return (
    <div className="flex h-dvh items-center justify-center bg-background">
      <motion.div
        initial={reduce ? false : { opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: EASE }}
        className="flex flex-col items-center gap-5"
      >
        <div className="flex size-16 items-center justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo/Alfychat.svg" alt="AlfyChat" className="dark:hidden" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo/Alfychatlogowihte.svg" alt="AlfyChat" className="hidden dark:block" />
        </div>
        <div className="flex items-center gap-2.5 text-muted">
          <Spinner size="sm" />
          <p className="text-sm">Chargement…</p>
        </div>
      </motion.div>
    </div>
  );
}

/** Poignée de redimensionnement — grandit au survol, accent au drag. */
function ResizeHandle({ onMouseDown }: { onMouseDown: (e: React.MouseEvent) => void }) {
  return (
    <div
      onMouseDown={onMouseDown}
      className="group relative z-10 flex w-1.5 shrink-0 cursor-col-resize items-center justify-center bg-transparent"
    >
      <div className="h-9 w-1 rounded-full bg-muted/20 transition-all duration-200 group-hover:h-14 group-hover:bg-accent/40 group-active:h-16 group-active:bg-accent" />
    </div>
  );
}

/** Bouton replier/déplier — chevron qui pivote. */
function CollapseToggle({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  return (
    <Button
      isIconOnly
      size="sm"
      variant="ghost"
      onPress={onToggle}
      aria-label={collapsed ? 'Déplier la sidebar' : 'Replier la sidebar'}
      className="mt-1 shrink-0 text-muted hover:text-foreground"
    >
      <motion.span
        animate={{ rotate: collapsed ? 180 : 0 }}
        transition={{ duration: 0.3, ease: EASE }}
        className="flex"
      >
        <ChevronLeftIcon size={15} />
      </motion.span>
    </Button>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   Layout interne
   ════════════════════════════════════════════════════════════════════════ */

function LayoutInner({ children }: { children: ReactNode }) {
  const reduce = useReducedMotion();

  // ── Hydratation & préchargement ──────────────────────────────────────────
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const [layoutReady, setLayoutReady] = useState(false);

  // ── Auth & présence ──────────────────────────────────────────────────────
  const { user, isLoading, isAuthenticated } = useAuth();
  usePresence({
    chosenStatus: (user?.status as 'online' | 'idle' | 'dnd' | 'invisible') ?? 'online',
    customStatus: user?.customStatus,
    emoji: user?.emoji,
  });

  // ── Navigation & route active ────────────────────────────────────────────
  const router = useRouter();
  const pathname = usePathname();
  const route = useActiveRoute(pathname);
  const { activeServerId, activeChannelId, activeDmId, activeGroupId, selectedChannel } = route;

  // ── UI : préférences, style, fond, notifications ─────────────────────────
  const {
    isMobile, showSidebar, showMemberList, showSettings, memberListDesktopVisible,
    openSidebar, closeSidebar, closeSettings, closeAll,
  } = useMobileNav();
  const { prefs: layoutPrefs } = useLayoutPrefs();
  useLayoutPrefsSync();
  const ui = useUIStyle();
  const { wallpaper } = useBackground();
  useNotification();
  useNotificationSync(route, pathname);

  // ── États locaux ─────────────────────────────────────────────────────────
  const [serverSettingsOpen, setServerSettingsOpen] = useState(false);
  const { collapsed, toggle: toggleCollapsed } = useCollapsedSidebar();
  const { incomingCall, acceptCall, joinCall, declineCall } = useIncomingCall();

  // ── Panneaux redimensionnables ───────────────────────────────────────────
  const { width: channelListWidth, onMouseDown: onChannelResize } = useResizablePanel({
    storageKey: 'alfychat_sidebar_width',
    defaultWidth: 240,
    minWidth: 160,
    maxWidth: 400,
    side: 'right',
    disabled: isMobile,
  });
  const { width: memberListWidth } = useResizablePanel({
    storageKey: 'alfychat_memberlist_width',
    defaultWidth: 224,
    minWidth: 160,
    maxWidth: 360,
    side: 'left',
    disabled: isMobile,
  });

  // ── Drawer mobile (swipe) ────────────────────────────────────────────────
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

  // ── Handlers de navigation ───────────────────────────────────────────────
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

  // ── Préchargement des données avant affichage ────────────────────────────
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    preloadEmojiImages();
    const timer = setTimeout(() => { if (!cancelled) setLayoutReady(true); }, 5000);
    Promise.all([api.getServers(), api.getConversations()]).finally(() => {
      if (!cancelled) { clearTimeout(timer); setLayoutReady(true); }
    });
    return () => { cancelled = true; clearTimeout(timer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // ── Garde d'authentification ─────────────────────────────────────────────
  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.push('/login');
  }, [isLoading, isAuthenticated, router]);

  // ── Fermer la nav mobile à chaque navigation ─────────────────────────────
  useEffect(() => { if (isMobile) closeAll(); }, [pathname, isMobile, closeAll]);

  // ── Micro-fondu du contenu à chaque changement de route ──────────────────
  const contentControls = useAnimationControls();
  useEffect(() => {
    if (reduce) return;
    contentControls.set({ opacity: 0.5, y: 6 });
    contentControls.start({ opacity: 1, y: 0, transition: { duration: 0.28, ease: EASE } });
  }, [pathname, contentControls, reduce]);

  if (!mounted || isLoading || !user || !layoutReady) return <LoadingScreen />;

  // ── Fond du mode verre ───────────────────────────────────────────────────
  const glassBg = wallpaper
    ? (wallpaper.startsWith('linear-gradient') || wallpaper.startsWith('radial-gradient') ? wallpaper : `url(${resolveMediaUrl(wallpaper) ?? wallpaper})`)
    : 'radial-gradient(ellipse 90% 70% at 15% 5%, oklch(0.80 0.14 290 / 55%) 0%, transparent 55%), radial-gradient(ellipse 70% 55% at 85% 85%, oklch(0.75 0.16 230 / 45%) 0%, transparent 55%), radial-gradient(ellipse 55% 45% at 55% 45%, oklch(0.82 0.11 320 / 30%) 0%, transparent 50%), radial-gradient(ellipse 50% 40% at 30% 75%, oklch(0.78 0.13 180 / 25%) 0%, transparent 50%)';

  const showMembers = memberListDesktopVisible && !!activeServerId;

  /* ── Rail des serveurs — colonne d'icônes toujours visible ─────────────── */
  const serverRail = (
    <motion.div
      initial={reduce ? false : { opacity: 0, x: -14 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.45, ease: EASE }}
      className="flex h-full shrink-0 flex-col items-center"
    >
      <div className={cn('min-h-0 flex-1 overflow-hidden', ui.sidebarWrapper)}>
        <ServerList selectedServer={activeServerId} onSelectServer={handleSelectServer} />
      </div>
      <CollapseToggle collapsed={collapsed} onToggle={toggleCollapsed} />
    </motion.div>
  );

  /* ── Panneau des canaux — se replie en largeur 0 (ressort) ─────────────── */
  const channelPanel = (
    <AnimatePresence initial={false}>
      {!collapsed && (
        <motion.aside
          key="channels"
          data-layout="sidebar"
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: channelListWidth + 8, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={reduce ? { duration: 0 } : SPRING}
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
      {/* Appel entrant */}
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

      {/* ════════ DESKTOP — rail + canaux repliables + contenu + membres ════ */}
      {!isMobile && (
        <div className="flex h-full w-full min-w-0 flex-row gap-2">
          <div className="flex h-full shrink-0 flex-row">
            {serverRail}
            {channelPanel}
          </div>

          {!collapsed && <ResizeHandle onMouseDown={onChannelResize} />}

          {/* Contenu — micro-fondu à chaque navigation */}
          <motion.div
            data-layout="content"
            initial={reduce ? false : { opacity: 0, y: 10 }}
            animate={contentControls}
            className={cn('relative flex min-w-0 flex-1 flex-col', ui.panelWrapper, ui.panelTransition)}
          >
            {children}
          </motion.div>

          {/* Liste des membres — panneau flottant (glisse depuis la droite) */}
          {activeServerId && (
            <motion.div
              data-layout="member-list"
              style={{ width: memberListWidth }}
              initial={false}
              animate={{ x: showMembers ? 0 : 24, opacity: showMembers ? 1 : 0 }}
              transition={reduce ? { duration: 0 } : SPRING}
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

      {/* ════════ MOBILE — contenu + nav basse + drawers ════════ */}
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

      {/* MOBILE — fond assombri derrière la liste des membres */}
      <AnimatePresence>
        {isMobile && showMemberList && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/60"
            onClick={closeAll}
          />
        )}
      </AnimatePresence>

      {/* MOBILE — drawer de navigation (serveurs + canaux) */}
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

      {/* MOBILE — liste des membres en slide-over */}
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

      {/* Dialogues */}
      {serverSettingsOpen && activeServerId && (
        <ServerSettingsDialog
          serverId={activeServerId}
          open={serverSettingsOpen}
          onOpenChange={setServerSettingsOpen}
          onServerUpdated={() => setServerSettingsOpen(false)}
        />
      )}
      <SettingsDialog open={showSettings} onOpenChange={(open) => !open && closeSettings()} />

      {/* Permissions mobiles */}
      {isMobile && <MobilePermissionPrompt />}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   Export racine — providers globaux
   ════════════════════════════════════════════════════════════════════════ */

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
