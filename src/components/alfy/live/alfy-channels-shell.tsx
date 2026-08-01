'use client';

/**
 * Shell alfy pour les vraies pages /channels.
 *
 * Conserve verbatim la logique métier de l'ancien shell (garde d'auth,
 * présence, sync notifications, appel entrant, nav mobile, préchargement)
 * mais tout le chrome est alfy, branché sur les vraies données. Le
 * conteneur porte `data-ui="alfy"` : le thème ne s'applique qu'ici.
 *
 * Reste à migrer : les dialogues de réglages (serveur + compte).
 */

import '@/components/alfy/alfy-theme.css';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Spinner } from '@heroui/react';

import { useAuth } from '@/hooks/use-auth';
import { useMobileNav } from '@/hooks/use-mobile-nav';
import { useNotification } from '@/hooks/use-notification';
import { usePresence } from '@/hooks/use-presence';
import { useCallContext } from '@/hooks/use-call-context';
import { setActiveDM, setActiveGroup, setActiveChannel, clearUnread } from '@/lib/notification-store';
import { api } from '@/lib/api';
import { socketService } from '@/lib/socket';

import { AlfyServerSettings } from '@/components/alfy/live/alfy-server-settings';
import { AlfyUserSettings } from '@/components/alfy/live/alfy-user-settings';

import { AlfyMark } from '@/components/alfy/primitives/alfy-mark';
import { AlfyServerRail } from '@/components/alfy/live/alfy-server-rail';
import { AlfySidebar } from '@/components/alfy/live/alfy-sidebar';
import { AlfyMemberList } from '@/components/alfy/live/alfy-member-list';
import { IncomingCall } from '@/components/alfy/calls/incoming-call';
import { AlfyActiveCall } from '@/components/alfy/live/alfy-active-call';
import type { AlfyUser } from '@/components/alfy/mock/types';

/** Analyse l'URL active : serveur, canal, DM, groupe. */
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

    const selectedChannel =
      activeChannelId ??
      (activeDmId ? `dm:${activeDmId}` : null) ??
      (activeGroupId ? `group:${activeGroupId}` : null) ??
      (pathname === '/channels/me' || pathname === '/channels/me/' ? 'friends' : null);

    return { activeServerId, activeChannelId, activeDmId, activeGroupId, selectedChannel };
  }, [pathname]);
}

/** Synchronise la conversation active avec le store de notifications. */
function useNotificationSync(route: ReturnType<typeof useActiveRoute>, pathname: string) {
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

  useEffect(
    () => () => {
      setActiveDM(null);
      setActiveGroup(null);
      setActiveChannel(null);
    },
    [],
  );
}

function LoadingScreen() {
  return (
    <div data-ui="alfy" className="flex h-dvh items-center justify-center">
      <div className="flex flex-col items-center gap-5">
        <AlfyMark className="size-14" />
        <div className="flex items-center gap-2.5 text-muted">
          <Spinner size="sm" />
          <p className="text-sm">Chargement…</p>
        </div>
      </div>
    </div>
  );
}

export function AlfyChannelsShell({ children }: { children: ReactNode }) {
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
  const route = useActiveRoute(pathname);
  const { activeServerId, activeChannelId, activeDmId, activeGroupId, selectedChannel } = route;

  const {
    isMobile,
    showSidebar,
    showMemberList,
    showSettings,
    memberListDesktopVisible,
    closeSidebar,
    openSettings,
    closeSettings,
    closeAll,
  } = useMobileNav();
  useNotification();
  useNotificationSync(route, pathname);

  const [serverSettingsOpen, setServerSettingsOpen] = useState(false);

  /* Appel entrant */
  const { callType, callStatus, callerName, callerAvatar, isGroup, acceptCall, joinCall, declineCall } = useCallContext();
  const incomingOpen = callStatus === 'ringing';
  const caller: AlfyUser = {
    id: 'caller',
    username: (callerName || 'utilisateur').toLowerCase(),
    displayName: callerName || 'Utilisateur',
    avatarUrl: callerAvatar,
    status: 'online',
    badges: [],
    createdAt: new Date().toISOString(),
  };

  /* Préchargement */
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      if (!cancelled) setLayoutReady(true);
    }, 5000);
    Promise.all([api.getServers(), api.getConversations()]).finally(() => {
      if (!cancelled) {
        clearTimeout(timer);
        setLayoutReady(true);
      }
    });
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  /* Garde d'authentification */
  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.push('/login');
  }, [isLoading, isAuthenticated, router]);

  useEffect(() => {
    if (isMobile) closeAll();
  }, [pathname, isMobile, closeAll]);

  if (!mounted || isLoading || !user || !layoutReady) return <LoadingScreen />;

  const showMembers = memberListDesktopVisible && !!activeServerId;

  return (
    <div data-ui="alfy" className="relative flex h-dvh flex-row overflow-hidden bg-background">
      <IncomingCall
        caller={caller}
        callType={(callType as 'voice' | 'video') || 'voice'}
        isOpen={incomingOpen}
        onOpenChange={(open) => !open && declineCall()}
        onAccept={isGroup ? joinCall : acceptCall}
        onDecline={declineCall}
      />

      {/* Rail alfy — vraies données */}
      {!isMobile && (
        <div className="flex h-full shrink-0 border-r border-separator">
          <AlfyServerRail activeServerId={activeServerId} />
        </div>
      )}

      {/* Sidebar alfy — vraies données (salons ou DM selon la route) */}
      {!isMobile && (
        <aside className="h-full w-66 shrink-0 overflow-hidden border-r border-separator">
          <AlfySidebar
            serverId={activeServerId}
            activeChannelId={activeChannelId}
            activeDmId={activeDmId}
            friendsActive={selectedChannel === 'friends'}
            onOpenServerSettings={() => setServerSettingsOpen(true)}
            onOpenUserSettings={openSettings}
          />
        </aside>
      )}

      {/* Contenu réel des pages */}
      <main className="relative flex min-w-0 flex-1 flex-col bg-surface">
        {!isMobile && <AlfyActiveCall />}
        {children}
      </main>

      {/* Membres */}
      {!isMobile && showMembers && (
        <div className="h-full w-62 shrink-0 overflow-hidden border-l border-separator bg-surface">
          <AlfyMemberList serverId={activeServerId!} />
        </div>
      )}

      {/* Mobile : contenu plein écran + nav / membres en slide-over */}
      {isMobile && (
        <>
          <div className="flex min-w-0 flex-1 flex-col overflow-hidden bg-surface">
            <AlfyActiveCall />
            {children}
          </div>

          {/* Fond semi-transparent commun aux deux panneaux mobiles */}
          {(showSidebar || showMemberList) && (
            <div
              className="fixed inset-0 z-40 bg-black/50"
              onClick={closeAll}
              aria-hidden
            />
          )}

          {/* Rail serveurs + salons/DM, en slide-over depuis la gauche */}
          <div
            className={
              'fixed inset-y-0 left-0 z-50 flex h-full w-[85vw] max-w-sm overflow-hidden bg-surface transition-transform duration-300 ease-out ' +
              (showSidebar ? 'translate-x-0' : '-translate-x-full')
            }
          >
            <AlfyServerRail activeServerId={activeServerId} />
            <div className="min-w-0 flex-1 overflow-hidden border-l border-separator">
              <AlfySidebar
                serverId={activeServerId}
                activeChannelId={activeChannelId}
                activeDmId={activeDmId}
                friendsActive={selectedChannel === 'friends'}
                onOpenServerSettings={() => {
                  closeSidebar();
                  setServerSettingsOpen(true);
                }}
                onOpenUserSettings={() => {
                  closeSidebar();
                  openSettings();
                }}
              />
            </div>
          </div>

          {activeServerId && (
            <div
              className={
                'fixed inset-y-0 right-0 z-50 w-[82vw] max-w-xs overflow-hidden bg-surface transition-transform duration-300 ease-out ' +
                (showMemberList ? 'translate-x-0' : 'translate-x-full')
              }
            >
              <AlfyMemberList serverId={activeServerId} />
            </div>
          )}
        </>
      )}

      {/* Dialogues */}
      {activeServerId && (
        <AlfyServerSettings
          serverId={activeServerId}
          isOpen={serverSettingsOpen}
          onOpenChange={setServerSettingsOpen}
        />
      )}
      <AlfyUserSettings isOpen={showSettings} onOpenChange={(open) => !open && closeSettings()} />
    </div>
  );
}
