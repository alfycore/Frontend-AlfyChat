'use client';

/**
 * Coquille des pages /channels (disposition Discord) :
 *
 *   rail | salons ou MP | contenu (fil, scène vocale…) | membres
 *   [ Voix connectée + panneau utilisateur, sous rail + salons ]
 *
 * La logique métier (garde d'auth, présence, synchronisation des
 * notifications, appel entrant, préchargement) est inchangée. Le module
 * serveur (`GuildRoot`) apporte menu contextuel, temps réel, présence vocale
 * et toutes les fenêtres. Le conteneur porte `data-ui="alfy"`.
 */

import '@/components/alfy/alfy-theme.css';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Spinner } from '@heroui/react';

import { useAuth } from '@/hooks/use-auth';
import { useMobileNav } from '@/hooks/use-mobile-nav';
import { useNotification } from '@/hooks/use-notification';
import { usePresence } from '@/hooks/use-presence';
import { loadBootstrap } from '@/lib/bootstrap-store';
import { useCallContext } from '@/hooks/use-call-context';
import { setActiveDM, setActiveGroup, setActiveChannel, clearUnread } from '@/lib/notification-store';
import { api } from '@/lib/api';
import { loadCustomEmojis } from '@/lib/custom-emoji-store';
import { socketService } from '@/lib/socket';

import { AlfyUserSettings } from '@/components/alfy/live/alfy-user-settings';

import { AlfyMark } from '@/components/alfy/primitives/alfy-mark';
import { AppTitleBar } from '@/components/alfy/shell/app-title-bar';
import { AlfySidebar } from '@/components/alfy/live/alfy-sidebar';
import { IncomingCall } from '@/components/alfy/calls/incoming-call';
import { GuildRoot } from '@/components/alfy/guild/guild-root';
import { GuildRail } from '@/components/alfy/guild/rail/guild-rail';
import { GuildSidebar } from '@/components/alfy/guild/sidebar/guild-sidebar';
import { GuildDock } from '@/components/alfy/guild/panel/guild-dock';
import { GuildMemberList } from '@/components/alfy/guild/members/member-list';
import { useGuildChannel } from '@/components/alfy/guild/hooks';
import { isVoiceType } from '@/components/alfy/guild/channel-icons';
import type { AlfyUser } from '@/components/alfy/mock/types';
import { useTranslation } from '@/components/locale-provider';

/**
 * Analyse l'URL active : serveur, canal, DM, groupe.
 *
 * Le motif des MP exclut explicitement les segments qui n'en sont pas :
 * `/channels/me/g/<id>` (groupe) donnait un destinataire « g » et
 * `/channels/me/changelogs` un destinataire « changelogs ». La sidebar
 * surlignait donc une conversation inexistante, et la synchronisation des
 * notifications marquait comme lue une clé fantôme.
 */
function useActiveRoute(pathname: string) {
  return useMemo(() => {
    const serverMatch = pathname.match(/\/channels\/server\/([^/]+)/);
    const channelMatch = pathname.match(/\/channels\/server\/[^/]+\/([^/]+)/);
    const dmMatch = pathname.match(/\/channels\/me\/(?!g(?:\/|$)|changelogs(?:\/|$))([^/]+)/);
    const groupMatch = pathname.match(/\/channels\/(?:me\/g|groups)\/([^/]+)/);

    const activeServerId = serverMatch?.[1] ?? null;
    const activeChannelId = channelMatch?.[1] ?? null;
    const activeDmId = dmMatch?.[1] ?? null;
    const activeGroupId = groupMatch?.[1] ?? null;

    /* `??` ne saute pas une branche qui vaut `null` par calcul : chaîner
       `(x ? … : null) ?? …` évaluait toujours la première expression. Une
       cascade explicite lève l'ambiguïté et donne la priorité au groupe. */
    const selectedChannel =
      activeChannelId ||
      (activeGroupId ? `group:${activeGroupId}` : null) ||
      (activeDmId ? `dm:${activeDmId}` : null) ||
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
  const { t } = useTranslation();
  return (
    <div data-ui="alfy" className="flex h-dvh items-center justify-center">
      <div className="flex flex-col items-center gap-5">
        <AlfyMark className="size-14" />
        <div className="flex items-center gap-2.5 text-muted">
          <Spinner size="sm" />
          <p className="text-sm">{t.common.loading}</p>
        </div>
      </div>
    </div>
  );
}

export function AlfyChannelsShell({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
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

  /* Appel entrant */
  const { callType, callStatus, callerName, callerAvatar, isGroup, acceptCall, joinCall, declineCall } = useCallContext();
  const incomingOpen = callStatus === 'ringing';
  const caller: AlfyUser = {
    id: 'caller',
    username: (callerName || t.chatUI.unknownUsername).toLowerCase(),
    displayName: callerName || t.chatUI.unknownUserDisplay,
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
    // Une seule requête : elle rapporte utilisateur, serveurs, conversations
    // (profils résolus), amis, demandes, blocages et notifications. Les hooks
    // de la barre latérale et de la page Amis consomment le même résultat —
    // la requête en vol est mutualisée, ils n'en déclenchent aucune de plus.
    loadBootstrap().finally(() => {
      if (!cancelled) {
        clearTimeout(timer);
        setLayoutReady(true);
      }
    });
    void loadCustomEmojis();
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

  return (
    <GuildRoot>
      <ShellLayout
        route={route}
        isMobile={isMobile}
        showSidebar={showSidebar}
        showMemberList={showMemberList}
        memberListDesktopVisible={memberListDesktopVisible}
        closeAll={closeAll}
        closeSidebar={closeSidebar}
        openSettings={openSettings}
        incoming={
          <IncomingCall
            caller={caller}
            callType={(callType as 'voice' | 'video') || 'voice'}
            isOpen={incomingOpen}
            onOpenChange={(open) => !open && declineCall()}
            onAccept={isGroup ? joinCall : acceptCall}
            onDecline={declineCall}
          />
        }
      >
        {children}
      </ShellLayout>
      <AlfyUserSettings isOpen={showSettings} onOpenChange={(open) => !open && closeSettings()} />
    </GuildRoot>
  );
}

interface ShellLayoutProps {
  route: ReturnType<typeof useActiveRoute>;
  isMobile: boolean;
  showSidebar: boolean;
  showMemberList: boolean;
  memberListDesktopVisible: boolean;
  closeAll: () => void;
  closeSidebar: () => void;
  openSettings: () => void;
  incoming: ReactNode;
  children: ReactNode;
}

function ShellLayout({
  route,
  isMobile,
  showSidebar,
  showMemberList,
  memberListDesktopVisible,
  closeAll,
  closeSidebar,
  openSettings,
  incoming,
  children,
}: ShellLayoutProps) {
  const { activeServerId, activeChannelId, activeDmId, activeGroupId, selectedChannel } = route;
  const activeChannel = useGuildChannel(activeServerId, activeChannelId);
  // La scène vocale a sa propre colonne (chat du salon) : pas de liste des membres.
  const membersAvailable = !!activeServerId && !(activeChannel && isVoiceType(activeChannel.type));
  const homeActive = !activeServerId && (selectedChannel === 'friends' || !!activeDmId || !!activeGroupId);

  const openUserSettings = () => {
    if (isMobile) closeSidebar();
    openSettings();
  };

  const column = activeServerId ? (
    <GuildSidebar serverId={activeServerId} activeChannelId={activeChannelId} />
  ) : (
    <AlfySidebar activeDmId={activeDmId} friendsActive={selectedChannel === 'friends'} />
  );

  /* Rail + colonne + dock : un seul bloc, partagé par le bureau et le tiroir mobile. */
  const navigation = (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <div className="flex min-h-0 flex-1">
        <GuildRail activeServerId={activeServerId} homeActive={homeActive} />
        <div className="alfy-sidebar flex min-w-0 flex-1 flex-col overflow-hidden rounded-tl-lg border-t border-l border-separator">{column}</div>
      </div>
      <div className="alfy-sidebar-dock pt-2">
        <GuildDock onOpenSettings={openUserSettings} />
      </div>
    </div>
  );

  return (
    <div data-ui="alfy" className="flex h-dvh flex-col overflow-hidden bg-background">
      <AppTitleBar serverId={activeServerId} />

      <div className="relative flex min-h-0 flex-1 flex-row overflow-hidden">
        {incoming}

        {!isMobile && <div className="h-full w-[312px] shrink-0">{navigation}</div>}

        <main className="relative flex min-w-0 flex-1 flex-col overflow-hidden border-t border-separator bg-surface">{children}</main>

        {!isMobile && membersAvailable && memberListDesktopVisible && (
          <div className="alfy-enter h-full w-60 shrink-0 overflow-hidden border-t border-l border-separator">
            <GuildMemberList serverId={activeServerId!} />
          </div>
        )}

        {isMobile && (
          <>
            {(showSidebar || showMemberList) && <div className="fixed inset-0 z-40 bg-black/50" onClick={closeAll} aria-hidden />}
            <div
              className={
                'fixed inset-y-0 left-0 z-50 h-full w-[min(92vw,360px)] overflow-hidden transition-transform duration-300 ease-out ' +
                (showSidebar ? 'translate-x-0' : '-translate-x-full')
              }
            >
              {navigation}
            </div>
            {membersAvailable && (
              <div
                className={
                  'fixed inset-y-0 right-0 z-50 w-[82vw] max-w-xs overflow-hidden transition-transform duration-300 ease-out ' +
                  (showMemberList ? 'translate-x-0' : 'translate-x-full')
                }
              >
                <GuildMemberList serverId={activeServerId!} />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

