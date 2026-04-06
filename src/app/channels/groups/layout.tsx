'use client';

import { useState, useEffect, useCallback, ReactNode } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { CallProvider, useCallContext } from '@/hooks/use-call-context';
import { MobileNavProvider, useMobileNav } from '@/hooks/use-mobile-nav';
import { useNotification } from '@/hooks/use-notification';
import { useResizablePanel } from '@/hooks/use-resizable-panel';
import { useLayoutPrefs } from '@/hooks/use-layout-prefs';
import { setActiveGroup } from '@/lib/notification-store';
import { ServerList } from '@/components/chat/server-list';
import { GroupsList } from '@/components/chat/groups-list';
import { GroupChatArea } from '@/components/chat/group-chat-area';
import { IncomingCallDialog } from '@/components/chat/incoming-call-dialog';
import { Spinner } from '@/components/ui/spinner';
import { MessageCircleIcon } from '@/components/icons';

function ResizeHandle({ onMouseDown }: { onMouseDown: (e: React.MouseEvent) => void }) {
  return (
    <div
      onMouseDown={onMouseDown}
      className="group relative z-10 flex w-1 shrink-0 cursor-col-resize items-center justify-center bg-transparent transition-colors hover:bg-accent-soft-hover active:bg-(--accent)/30"
    >
      <div className="h-8 w-0.5 rounded-full bg-border transition-all group-hover:h-12 group-hover:bg-(--accent)/60 group-active:bg-(--accent)" />
    </div>
  );
}

function LayoutInner({ children }: { children: ReactNode }) {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const params = useParams();
  const { isMobile, showSidebar } = useMobileNav();
  const { prefs: layoutPrefs } = useLayoutPrefs();
  const isTopBottom = layoutPrefs.serverListPosition === 'top' || layoutPrefs.serverListPosition === 'bottom';

  const { width: sidebarWidth, onMouseDown: onSidebarResize } = useResizablePanel({
    storageKey: 'alfychat_groups_sidebar_width',
    defaultWidth: 240,
    minWidth: 160,
    maxWidth: 400,
    side: 'right',
    disabled: isMobile,
  });

  useNotification();

  const groupId = params?.groupId as string | undefined;

  const {
    callType,
    callStatus,
    callerName,
    callerAvatar,
  } = useCallContext();

  const [incomingCall, setIncomingCall] = useState<{
    callerName: string; callerAvatar?: string; callType: 'voice' | 'video';
  } | null>(null);

  useEffect(() => {
    if (callStatus === 'ringing') {
      setIncomingCall({ callerName: callerName || 'Utilisateur', callerAvatar, callType: callType || 'voice' });
    } else {
      setIncomingCall(null);
    }
  }, [callStatus, callType, callerName, callerAvatar]);

  useEffect(() => {
    if (groupId) setActiveGroup(groupId);
    return () => setActiveGroup(null);
  }, [groupId]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.push('/login');
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return (
      <div className="flex h-dvh items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="flex size-16 animate-pulse items-center justify-center rounded-2xl bg-(--accent)">
            <MessageCircleIcon size={28} className="text-white" />
          </div>
          <Spinner className="size-4" />
        </div>
      </div>
    );
  }

  const serverList = <ServerList selectedServer="groups" onSelectServer={(id) => {
    if (id === null) router.push('/channels/me');
    else if (id === 'groups') router.push('/channels/groups');
    else router.push(`/channels/server/${id}`);
  }} />;

  const groupsSidebar = (
    <div style={{ width: isMobile ? undefined : sidebarWidth }} className={`${isMobile ? 'w-full' : ''} shrink-0`}>
      <GroupsList
        selectedGroupId={groupId ?? null}
        onSelectGroup={(id: string) => router.push(`/channels/groups/${id}`)}
      />
    </div>
  );

  const mainContent = (
    <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
      {groupId ? (
        <GroupChatArea groupId={groupId} onLeave={() => router.push('/channels/groups')} />
      ) : (
        <GroupsEmptyState />
      )}
    </div>
  );

  return (
    <div
      className={`flex h-dvh overflow-hidden bg-background ${isTopBottom ? 'flex-col' : 'flex-row'}`}
      data-groups-layout
    >
      {/* Server list */}
      {(layoutPrefs.serverListPosition === 'left' || layoutPrefs.serverListPosition === 'top') && serverList}

      {/* Main area */}
      <div className={`flex min-w-0 flex-1 overflow-hidden ${isTopBottom ? 'flex-row' : 'flex-col'}`}>
        <div className={`flex min-w-0 flex-1 flex-row overflow-hidden`}>
          {/* Groups sidebar — desktop full, mobile overlay */}
          {!isMobile ? (
            <>
              {groupsSidebar}
              <ResizeHandle onMouseDown={onSidebarResize} />
            </>
          ) : (
            showSidebar && (
              <div className="absolute inset-y-0 left-0 z-30 w-72 shadow-2xl">
                {groupsSidebar}
              </div>
            )
          )}

          {mainContent}
        </div>
      </div>

      {/* Server list — right / bottom */}
      {(layoutPrefs.serverListPosition === 'right' || layoutPrefs.serverListPosition === 'bottom') && serverList}

      {/* Incoming call */}
      {incomingCall && (
        <IncomingCallDialog
          open={!!incomingCall}
          callerName={incomingCall.callerName}
          callerAvatar={incomingCall.callerAvatar}
          callType={incomingCall.callType}
          onAccept={() => setIncomingCall(null)}
          onDecline={() => setIncomingCall(null)}
        />
      )}
    </div>
  );
}

function GroupsEmptyState() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
      <div className="flex size-16 items-center justify-center rounded-2xl bg-(--accent)/10">
        <MessageCircleIcon size={28} className="text-(--accent)" />
      </div>
      <div>
        <p className="text-[15px] font-semibold text-(--foreground)">Vos groupes</p>
        <p className="mt-1 text-[13px] text-muted">Sélectionnez un groupe ou créez-en un nouveau.</p>
      </div>
    </div>
  );
}

export default function GroupsLayout({ children }: { children: ReactNode }) {
  return (
    <MobileNavProvider>
      <CallProvider>
        <LayoutInner>{children}</LayoutInner>
      </CallProvider>
    </MobileNavProvider>
  );
}
