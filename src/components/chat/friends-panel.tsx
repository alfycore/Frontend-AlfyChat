'use client';

import { useEffect, useRef, useState } from 'react';
import {
  UsersIcon,
  UserPlusIcon,
  ClockIcon,
  CheckIcon,
  XIcon,
  MessageCircleIcon,
  SearchIcon,
  MenuIcon,
  MoreVerticalIcon,
  UserMinusIcon,
  BanIcon,
  ShieldOffIcon,
  PhoneIcon,
  UserIcon,
  ServerIcon,
  SettingsIcon,
} from '@/components/icons';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardTitle, CardDescription } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { api, resolveMediaUrl } from '@/lib/api';
import { socketService } from '@/lib/socket';
import { useMobileNav } from '@/hooks/use-mobile-nav';
import { useAuth } from '@/hooks/use-auth';
import { useUIStyle } from '@/hooks/use-ui-style';
import { useLayoutPrefs, densityCls } from '@/hooks/use-layout-prefs';
import { notify } from '@/hooks/use-notification';
import { useNotificationStore } from '@/lib/notification-store';
import { friendsStore } from '@/lib/friends-store';
import { UserProfilePopover } from '@/components/chat/user-profile-popover';
import { useTranslation } from '@/components/locale-provider';
import { statusColor, statusLabel, isVisibleOnline } from '@/lib/status';

/* --- Types ---------------------------------------------------------------- */

interface Friend {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  status: 'online' | 'idle' | 'dnd' | 'invisible' | 'offline';
  customStatus?: string | null;
  isOnline: boolean;
}

interface FriendRequest {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  message?: string;
}

interface BlockedUser {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
}

type DisplayField = 'customStatus' | 'username' | 'status';

const DISPLAY_FIELD_LABELS: Record<DisplayField, string> = {
  customStatus: 'Statut personnalis\u00e9',
  username: "Nom d'utilisateur",
  status: 'Statut en ligne',
};

interface FriendsPanelProps {
  onOpenDM?: (recipientId: string, recipientName: string) => void;
}


/* --- Main component ------------------------------------------------------- */

export function FriendsPanel({ onOpenDM }: FriendsPanelProps) {
  const { isMobile, openSidebar } = useMobileNav();
  const { user: currentUser } = useAuth();
  const prevUserIdRef = useRef<string | null>(null);
  const ui = useUIStyle();
  const { t, tx } = useTranslation();
  const notifStore = useNotificationStore();

  const tabsListRef = useRef<HTMLDivElement>(null);
  const [compactTabs, setCompactTabs] = useState(false);

  const [friends, setFriends] = useState<Friend[]>([]);
  const [requests, setRequests] = useState<{ received: FriendRequest[]; sent: FriendRequest[] }>({
    received: [],
    sent: [],
  });
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [addFriendInput, setAddFriendInput] = useState('');
  const [addFriendLoading, setAddFriendLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('friends');

  const [displayFields, setDisplayFields] = useState<DisplayField[]>(() => {
    if (typeof window === 'undefined') return ['customStatus'];
    try {
      const stored = localStorage.getItem('alfychat_friend_row_fields');
      return stored ? (JSON.parse(stored) as DisplayField[]) : ['customStatus'];
    } catch {
      return ['customStatus'];
    }
  });

  const toggleDisplayField = (field: DisplayField) => {
    setDisplayFields((prev) => {
      let next: DisplayField[];
      if (prev.includes(field)) {
        next = prev.filter((f) => f !== field);
      } else if (prev.length < 2) {
        next = [...prev, field];
      } else {
        return prev;
      }
      localStorage.setItem('alfychat_friend_row_fields', JSON.stringify(next));
      return next;
    });
  };

  /* -- Compact tabs observer -- */
  useEffect(() => {
    const el = tabsListRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) =>
      setCompactTabs(entry.contentRect.width < 420),
    );
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /* -- Socket listeners -- */
  useEffect(() => {
    // Utiliser le cache si disponible
    if (friendsStore.isLoaded()) {
      setFriends(friendsStore.getFriends() as Friend[]);
      setRequests(friendsStore.getRequests() as { received: FriendRequest[]; sent: FriendRequest[] });
      setBlockedUsers(friendsStore.getBlocked() as BlockedUser[]);
      setIsLoading(false);
    } else {
      loadFriends();
      loadRequests();
      loadBlockedUsers();
    }

    const handleFriendRequest = () => loadRequests();
    const handleFriendAccepted = () => {
      loadFriends();
      loadRequests();
    };
    const handlePresenceUpdate = (data: unknown) => {
      const payload = (data as { payload?: Record<string, unknown> })?.payload || data;
      const p = payload as { userId?: string; status?: string; customStatus?: string | null };
      if (p?.userId && p?.status) {
        friendsStore.updateFriendPresence(p.userId, p.status, p.customStatus);
        setFriends((prev) =>
          prev.map((f) =>
            f.id === p.userId
              ? {
                  ...f,
                  status: p.status as Friend['status'],
                  customStatus: p.customStatus ?? f.customStatus,
                  isOnline: isVisibleOnline(p.status),
                }
              : f,
          ),
        );
      } else {
        loadFriends();
      }
    };
    const handleFriendRemove = (data: unknown) => {
      const payload = (data as { payload?: Record<string, unknown> })?.payload || data;
      const p = payload as { friendId?: string };
      if (p?.friendId) {
        friendsStore.removeFriend(p.friendId);
        setFriends((prev) => prev.filter((f) => f.id !== p.friendId));
      }
    };
    const handleProfileUpdate = (data: unknown) => {
      const payload = (data as { payload?: Record<string, unknown> })?.payload || data;
      const p = payload as { userId?: string; displayName?: string; avatarUrl?: string };
      if (!p?.userId) return;
      const updates = {
        ...(p.displayName && { displayName: p.displayName }),
        ...(p.avatarUrl !== undefined && { avatarUrl: p.avatarUrl }),
      };
      friendsStore.updateFriendProfile(p.userId, updates);
      setFriends((prev) =>
        prev.map((f) =>
          f.id === p.userId ? { ...f, ...updates } : f,
        ),
      );
    };
    const handleReconnect = () => loadFriends();

    socketService.onFriendRequest(handleFriendRequest);
    socketService.onFriendAccepted(handleFriendAccepted);
    socketService.onPresenceUpdate(handlePresenceUpdate);
    socketService.on('FRIEND_REMOVE', handleFriendRemove);
    socketService.onProfileUpdate(handleProfileUpdate);
    socketService.on('socket:reconnected', handleReconnect);

    return () => {
      socketService.off('FRIEND_REQUEST', handleFriendRequest as any);
      socketService.off('FRIEND_ACCEPT', handleFriendAccepted as any);
      socketService.off('PRESENCE_UPDATE', handlePresenceUpdate as any);
      socketService.off('FRIEND_REMOVE', handleFriendRemove as any);
      socketService.off('PROFILE_UPDATE', handleProfileUpdate as any);
      socketService.off('socket:reconnected', handleReconnect as any);
    };
  }, []);

  useEffect(() => {
    if (currentUser?.id && currentUser.id !== prevUserIdRef.current) {
      prevUserIdRef.current = currentUser.id;
      loadFriends();
      loadRequests();
    }
  }, [currentUser?.id]);

  /* -- Data loaders -- */

  const loadBlockedUsers = async () => {
    try {
      const response = await api.getBlockedUsers();
      if (response.success && response.data) {
        const list = response.data as BlockedUser[];
        friendsStore.setBlocked(list);
        setBlockedUsers(list);
      }
    } catch {}
  };

  const loadFriends = async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('alfychat_token') : null;
    if (!token) return;
    try {
      const response = await api.getFriends();
      if (response.success && response.data) {
        const data = response.data as Friend[];
        friendsStore.setFriends(data);
        setFriends(data);

        const friendIds = data.map((f) => f.id).filter(Boolean);
        if (friendIds.length > 0) {
          socketService.requestBulkPresence(friendIds, (presence) => {
            if (presence.length === 0) return;
            setFriends((prev) =>
              prev.map((f) => {
                const p = presence.find((x) => x.userId === f.id);
                if (!p) return f;
                return {
                  ...f,
                  status: p.status as Friend['status'],
                  customStatus: p.customStatus ?? f.customStatus,
                  isOnline: isVisibleOnline(p.status),
                };
              }),
            );
          });
        }
      }
    } catch {}
  };

  const loadRequests = async () => {
    try {
      const response = await api.getFriendRequests();
      if (response.success && response.data) {
        const r = response.data as { received: FriendRequest[]; sent: FriendRequest[] };
        friendsStore.setRequests(r);
        setRequests(r);
      }
    } catch {} finally {
      setIsLoading(false);
    }
  };

  /* -- Actions -- */

  const handleAddFriend = async (e: React.FormEvent) => {
    e.preventDefault();
    const username = addFriendInput.trim();
    if (!username || addFriendLoading) return;
    if (currentUser?.username && username.toLowerCase() === currentUser.username.toLowerCase()) {
      notify.error(t.common.error, t.friends.selfRequestError);
      return;
    }
    setAddFriendLoading(true);
    try {
      const searchRes = await api.searchUsers(username);
      const list: any[] = Array.isArray((searchRes.data as any)?.users)
        ? (searchRes.data as any).users
        : Array.isArray(searchRes.data)
          ? (searchRes.data as any[])
          : [];
      const found = list.find(
        (u: any) => (u.username ?? '').toLowerCase() === username.toLowerCase(),
      );
      if (!found) {
        notify.error(t.common.error, `Aucun utilisateur trouv\u00e9 avec le pseudo \u00ab ${username} \u00bb`);
        return;
      }
      const response = await api.sendFriendRequest(found.id);
      if (response.success) {
        setAddFriendInput('');
        loadRequests();
        notify.success(t.friends.requestSent, tx(t.friends.requestSentTo, { username }));
      } else {
        notify.error(t.common.error, (response as any).error || t.friends.requestError);
      }
    } catch {
      notify.error(t.common.error, t.friends.requestError);
    } finally {
      setAddFriendLoading(false);
    }
  };

  const handleAcceptRequest = async (requestId: string) => {
    try {
      const response = await api.acceptFriendRequest(requestId);
      if (response.success) {
        loadFriends();
        loadRequests();
        notify.success(t.friends.friendAdded, t.friends.friendAccepted);
      }
    } catch {
      notify.error(t.common.error, t.friends.acceptError);
    }
  };

  const handleDeclineRequest = async (requestId: string) => {
    try {
      const response = await api.declineFriendRequest(requestId);
      if (response.success) loadRequests();
    } catch {}
  };

  const handleRemoveFriend = async (friendId: string) => {
    try {
      const response = await api.removeFriend(friendId);
      if (response.success) {
        setFriends((prev) => prev.filter((f) => f.id !== friendId));
        notify.success(t.friends.friendRemoved, t.friends.friendRemoveMsg);
      } else {
        notify.error(t.common.error, t.friends.removeError);
      }
    } catch {
      notify.error(t.common.error, t.friends.removeError);
    }
  };

  const handleBlockUser = async (userId: string, username: string) => {
    try {
      const response = await api.blockUser(userId);
      if (response.success) {
        setFriends((prev) => prev.filter((f) => f.id !== userId));
        loadBlockedUsers();
        notify.success(t.friends.userBlocked, tx(t.friends.userBlockedMsg, { username }));
      } else {
        notify.error(t.common.error, t.friends.blockError);
      }
    } catch {
      notify.error(t.common.error, t.friends.blockError);
    }
  };

  const handleUnblockUser = async (userId: string, username: string) => {
    try {
      const response = await api.unblockUser(userId);
      if (response.success) {
        setBlockedUsers((prev) => prev.filter((u) => u.id !== userId));
        notify.success(t.friends.unblocked, tx(t.friends.unblockedMsg, { username }));
      } else {
        notify.error(t.common.error, t.friends.unblockError);
      }
    } catch {
      notify.error(t.common.error, t.friends.unblockError);
    }
  };

  /* -- Derived data -- */

  const filteredFriends = friends.filter(
    (f) =>
      f.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.username.toLowerCase().includes(searchQuery.toLowerCase()),
  );
  const onlineFriends = filteredFriends.filter((f) => isVisibleOnline(f.status));
  const offlineFriends = filteredFriends.filter((f) => !isVisibleOnline(f.status));

  /* -- Loading skeleton -- */

  if (isLoading) {
    return (
      <div className="flex h-full flex-1 flex-row">
        <div className="flex flex-1 flex-col">
          <div className={`flex h-14 items-center gap-3 px-4 md:px-6 ${ui.header}`}>
            <Skeleton className="size-8 rounded-full" />
            <Skeleton className="h-4 w-24 rounded-md" />
          </div>
          <div className="flex gap-2 px-4 pt-4 md:px-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-20 rounded-lg" />
            ))}
          </div>
          <div className="space-y-1.5 px-4 pt-4 md:px-6">
            <Skeleton className="h-9 w-full rounded-lg" />
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-2.5 rounded-xl px-2 py-2" style={{ opacity: 0.4 + i * 0.12 }}>
                <Skeleton className="size-9 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-28 rounded" />
                  <Skeleton className="h-2.5 w-20 rounded" />
                </div>
                <Skeleton className="size-7 rounded-lg" />
              </div>
            ))}
          </div>
        </div>
        <div className="hidden w-56 flex-col border-l border-border md:flex">
          <div className={`flex h-14 items-center gap-2 px-4 ${ui.header}`}>
            <Skeleton className="size-2 rounded-full" />
            <Skeleton className="h-3 w-16 rounded" />
          </div>
          <div className="space-y-1 p-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-2 rounded-xl px-2 py-1.5" style={{ opacity: 0.4 + i * 0.2 }}>
                <Skeleton className="size-7 rounded-full" />
                <Skeleton className="h-3 w-20 rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  /* -- Render -- */

  return (
    <div data-tour="friends-panel" className={`flex h-full flex-1 flex-row overflow-hidden ${ui.isGlass ? 'bg-white/20 backdrop-blur-2xl dark:bg-black/25' : ''}`}>
      {/* ===== CENTER ===== */}
      <div ref={tabsListRef} className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <div className={`flex h-14 shrink-0 items-center gap-3 px-4 md:px-6 ${ui.header}`}>
          {isMobile && (
            <Button size="icon-sm" variant="ghost" onClick={openSidebar} className="shrink-0">
              <MenuIcon size={18} />
            </Button>
          )}
          <div className="flex size-8 items-center justify-center rounded-full bg-primary/10">
            <UsersIcon size={14} className="text-primary" />
          </div>
          <span className="text-[13px] font-bold tracking-tight text-foreground">
            {t.friends.title}
          </span>
          {requests.received.length > 0 && (
            <Badge variant="destructive" className="ml-1 px-1.5 text-[10px]">
              {requests.received.length}
            </Badge>
          )}
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-1 flex-col overflow-hidden">
          <div className="flex items-center gap-3 px-4 pt-2 md:px-6">
            <TabsList className="h-8 shrink-0">
              <TabsTrigger value="friends" className="gap-1.5 text-xs">
                <UsersIcon size={13} />
                {!compactTabs && t.friends.tabFriends}
                {!compactTabs && (
                  <span className="ml-0.5 text-[10px] text-muted-foreground">{friends.length}</span>
                )}
              </TabsTrigger>
              <TabsTrigger value="requests" className="gap-1.5 text-xs">
                <ClockIcon size={13} />
                {!compactTabs && t.friends.tabRequests}
                {!compactTabs && requests.received.length > 0 && (
                  <span className="ml-0.5 flex size-4 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-destructive-foreground">
                    {requests.received.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="blocked" className="gap-1.5 text-xs">
                <ShieldOffIcon size={13} />
                {!compactTabs && t.friends.tabBlocked}
              </TabsTrigger>
              <TabsTrigger value="add" className="gap-1.5 text-xs">
                <UserPlusIcon size={13} />
                {!compactTabs && t.friends.tabAdd}
              </TabsTrigger>
            </TabsList>
            {activeTab === 'friends' && (
              <div className="relative min-w-0 flex-1">
                <SearchIcon size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/40" />
                <Input
                  className="h-8 rounded-lg border-border bg-muted/50 pl-8 pr-7 text-[13px] placeholder:text-muted-foreground/40 focus-visible:border-primary/40 focus-visible:bg-background"
                  placeholder={t.friends.searchPlaceholder}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-foreground"
                  >
                    <XIcon size={12} />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* --- Friends Tab --- */}
          <TabsContent value="friends" className="flex flex-1 flex-col gap-2 overflow-hidden px-4 pt-3 md:px-6">
            {filteredFriends.length === 0 ? (
              <div className="flex flex-1 items-center justify-center">
                <Card className="flex flex-col items-center gap-4 border-border/30 bg-card px-8 py-6 shadow-none">
                  <div className="flex size-14 items-center justify-center rounded-full bg-muted">
                    <UsersIcon size={24} className="text-muted-foreground" />
                  </div>
                  <CardTitle className="text-sm font-medium">
                    {searchQuery ? t.friends.noResults : t.friends.noFriends}
                  </CardTitle>
                  <CardDescription className="text-center text-xs text-muted-foreground">
                    {searchQuery ? t.friends.noResultsHint : t.friends.addFriendsHint}
                  </CardDescription>
                </Card>
              </div>
            ) : (
              <ScrollArea className="flex-1 -mx-1 px-1">
                {onlineFriends.length > 0 && (
                  <div className="mb-3">
                    <p className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">
                      {tx(t.friends.onlineCount, { n: String(onlineFriends.length) })}
                    </p>
                    <div className="space-y-0.5">
                      {onlineFriends.map((friend) => (
                        <FriendRow
                          key={friend.id}
                          friend={friend}
                          displayFields={displayFields}
                          unreadCount={notifStore.unread.get(friend.id) ?? 0}
                          onMessage={() => onOpenDM?.(friend.id, friend.displayName)}
                          onRemove={() => handleRemoveFriend(friend.id)}
                          onBlock={() => handleBlockUser(friend.id, friend.displayName)}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {onlineFriends.length > 0 && offlineFriends.length > 0 && (
                  <Separator className="mx-2 my-2 opacity-30" />
                )}

                {offlineFriends.length > 0 && (
                  <div>
                    <p className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">
                      {tx(t.friends.offlineCount, { n: String(offlineFriends.length) })}
                    </p>
                    <div className="space-y-0.5">
                      {offlineFriends.map((friend) => (
                        <FriendRow
                          key={friend.id}
                          friend={friend}
                          displayFields={displayFields}
                          unreadCount={notifStore.unread.get(friend.id) ?? 0}
                          onMessage={() => onOpenDM?.(friend.id, friend.displayName)}
                          onRemove={() => handleRemoveFriend(friend.id)}
                          onBlock={() => handleBlockUser(friend.id, friend.displayName)}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </ScrollArea>
            )}
          </TabsContent>

          {/* --- Requests Tab --- */}
          <TabsContent value="requests" className="flex flex-1 flex-col overflow-hidden px-4 pt-3 md:px-6">
            {requests.received.length === 0 ? (
              <div className="flex flex-1 items-center justify-center">
                <Card className="flex flex-col items-center gap-4 border-border/30 bg-card px-8 py-6 shadow-none">
                  <div className="flex size-14 items-center justify-center rounded-full bg-yellow-500/10">
                    <ClockIcon size={24} className="text-yellow-500" />
                  </div>
                  <CardTitle className="text-sm font-medium">{t.friends.noRequests}</CardTitle>
                  <CardDescription className="text-center text-xs text-muted-foreground">
                    {t.friends.upToDate}
                  </CardDescription>
                </Card>
              </div>
            ) : (
              <ScrollArea className="flex-1">
                <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">
                  {tx(t.friends.receivedCount, { n: String(requests.received.length) })}
                </p>
                <div className="space-y-1.5">
                  {requests.received.map((req) => (
                    <div
                      key={req.id}
                      className="group flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-surface-secondary/60"
                    >
                      <div className="relative shrink-0">
                        <Avatar className="size-9">
                          <AvatarImage src={resolveMediaUrl(req.avatarUrl)} />
                          <AvatarFallback className="bg-yellow-500/15 text-xs font-semibold text-yellow-600">
                            {req.username.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-medium leading-tight">{req.displayName}</p>
                        <p className="truncate text-[10px] leading-tight text-muted-foreground/50">@{req.username}</p>
                        {req.message && (
                          <p className="mt-0.5 truncate text-[10px] italic text-muted-foreground/40">
                            &ldquo;{req.message}&rdquo;
                          </p>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="icon-sm"
                                variant="ghost"
                                onClick={() => handleAcceptRequest(req.id)}
                                className="size-7 rounded-lg bg-green-500/10 text-green-500 hover:bg-green-500/20 hover:text-green-600"
                              >
                                <CheckIcon size={14} />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>{t.friends.accept}</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="icon-sm"
                                variant="ghost"
                                onClick={() => handleDeclineRequest(req.id)}
                                className="size-7 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                              >
                                <XIcon size={14} />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>{t.friends.decline}</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </TabsContent>

          {/* --- Blocked Tab --- */}
          <TabsContent value="blocked" className="flex flex-1 flex-col overflow-hidden px-4 pt-3 md:px-6">
            {blockedUsers.length === 0 ? (
              <div className="flex flex-1 items-center justify-center">
                <Card className="flex flex-col items-center gap-4 border-border/30 bg-card px-8 py-6 shadow-none">
                  <div className="flex size-14 items-center justify-center rounded-full bg-muted">
                    <ShieldOffIcon size={24} className="text-muted-foreground" />
                  </div>
                  <CardTitle className="text-sm font-medium">{t.friends.noBlocked}</CardTitle>
                  <CardDescription className="text-center text-xs text-muted-foreground">
                    {t.friends.blockedListEmpty}
                  </CardDescription>
                </Card>
              </div>
            ) : (
              <ScrollArea className="flex-1">
                <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">
                  {tx(t.friends.blockedCount, { n: String(blockedUsers.length) })}
                </p>
                <div className="space-y-1">
                  {blockedUsers.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center gap-3 rounded-xl px-3 py-2.5 opacity-60 transition-opacity hover:opacity-80"
                    >
                      <Avatar className="size-9 grayscale">
                        <AvatarImage src={resolveMediaUrl(user.avatarUrl)} />
                        <AvatarFallback className="bg-muted text-xs">{user.username.charAt(0).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-medium leading-tight text-muted-foreground">{user.displayName}</p>
                        <p className="truncate text-[10px] leading-tight text-muted-foreground/40">@{user.username}</p>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 gap-1.5 rounded-lg text-[11px] text-muted-foreground hover:text-foreground"
                        onClick={() => handleUnblockUser(user.id, user.displayName)}
                      >
                        <ShieldOffIcon size={12} />
                        {t.friends.unblock}
                      </Button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </TabsContent>

          {/* --- Add Friend Tab --- */}
          <TabsContent value="add" className="flex flex-1 flex-col overflow-y-auto px-4 pt-3 md:px-6">
            <div className="mx-auto w-full max-w-sm space-y-4">
              <Card className="flex flex-col items-center gap-5 border-border/30 bg-card px-8 py-8 shadow-sm">
                <div className="flex size-16 items-center justify-center rounded-full bg-primary/10">
                  <UserPlusIcon size={28} className="text-primary" />
                </div>
                <div className="text-center">
                  <CardTitle className="text-base font-bold">{t.friends.findFriends}</CardTitle>
                  <CardDescription className="mt-1 text-xs text-muted-foreground">
                    {t.friends.findFriendsSubtitle}
                  </CardDescription>
                </div>

                <form onSubmit={handleAddFriend} className="w-full space-y-2.5">
                  <Input
                    className="h-9 rounded-lg text-[13px] focus-visible:border-primary/40"
                    placeholder={t.friends.usernamePlaceholder}
                    value={addFriendInput}
                    onChange={(e) => setAddFriendInput(e.target.value)}
                  />
                  <Button
                    type="submit"
                    className="w-full gap-2 rounded-lg text-[13px] font-semibold"
                    disabled={addFriendLoading || !addFriendInput.trim()}
                  >
                    {addFriendLoading ? (
                      <>
                        <span className="flex gap-0.5">
                          <span className="inline-block size-1.5 animate-bounce rounded-full bg-primary-foreground [animation-delay:0ms]" />
                          <span className="inline-block size-1.5 animate-bounce rounded-full bg-primary-foreground [animation-delay:150ms]" />
                          <span className="inline-block size-1.5 animate-bounce rounded-full bg-primary-foreground [animation-delay:300ms]" />
                        </span>
                        {t.friends.sendingRequest}
                      </>
                    ) : (
                      <>
                        <UserPlusIcon size={14} />
                        {t.friends.sendRequest}
                      </>
                    )}
                  </Button>
                </form>
              </Card>

              {/* Sent requests */}
              {requests.sent.length > 0 && (
                <div>
                  <p className="mb-1.5 px-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">
                    {tx(t.friends.sentCount, { n: String(requests.sent.length) })}
                  </p>
                  <div className="space-y-1">
                    {requests.sent.map((req) => (
                      <div
                        key={req.id}
                        className="flex items-center gap-2.5 rounded-xl px-3 py-2"
                      >
                        <Avatar className="size-7">
                          <AvatarImage src={resolveMediaUrl(req.avatarUrl)} />
                          <AvatarFallback className="bg-muted text-[10px]">{req.username.charAt(0).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[12px] font-medium">{req.displayName}</p>
                          <p className="truncate text-[10px] text-muted-foreground/40">@{req.username}</p>
                        </div>
                        <span className="shrink-0 rounded-md bg-muted px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground">
                          {t.friends.pending}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* ===== RIGHT SIDEBAR ===== */}
      <div className={`hidden w-56 flex-col border-l border-border md:flex ${ui.sidebarBg}`}>
        <div className={`flex h-14 shrink-0 items-center gap-2 px-4 ${ui.header}`}>
          <span className="size-1.5 rounded-full bg-green-500" />
          <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">
            {t.friends.onlineSidebar}
          </span>
          <span className="ml-auto text-[10px] font-medium text-muted-foreground/40">
            {onlineFriends.length}
          </span>

          <Popover>
            <PopoverTrigger asChild>
              <Button size="icon-sm" variant="ghost" className="size-6 text-muted-foreground/40 hover:text-foreground">
                <SettingsIcon size={11} />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-48 rounded-lg p-2" align="end">
              <p className="mb-1.5 px-1.5 text-[10px] font-semibold text-foreground">
                Afficher dans les cartes
              </p>
              <p className="mb-2 px-1.5 text-[9px] text-muted-foreground">
                Max 2 \u00e9l\u00e9ments
              </p>
              <div className="flex flex-col gap-0.5">
                {(Object.keys(DISPLAY_FIELD_LABELS) as DisplayField[]).map((field) => {
                  const active = displayFields.includes(field);
                  const atMax = displayFields.length >= 2 && !active;
                  return (
                    <button
                      key={field}
                      type="button"
                      disabled={atMax}
                      onClick={() => toggleDisplayField(field)}
                      className={cn(
                        'flex w-full items-center justify-between rounded-md px-1.5 py-1 text-[11px] transition-colors',
                        active
                          ? 'bg-accent/12 text-accent'
                          : atMax
                            ? 'cursor-not-allowed text-muted-foreground/30'
                            : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground',
                      )}
                    >
                      {DISPLAY_FIELD_LABELS[field]}
                      {active && <CheckIcon size={10} className="shrink-0 text-accent" />}
                    </button>
                  );
                })}
              </div>
            </PopoverContent>
          </Popover>
        </div>

        <ScrollArea className="flex-1 p-2">
          {onlineFriends.length === 0 ? (
            <div className="flex flex-col items-center gap-2 pt-12 text-center">
              <div className="flex size-10 items-center justify-center rounded-full bg-muted">
                <UsersIcon size={16} className="text-muted-foreground/30" />
              </div>
              <p className="text-[10px] text-muted-foreground/30">{t.friends.noOneOnline}</p>
            </div>
          ) : (
            <div className="space-y-0.5">
              {onlineFriends.map((friend) => {
                const dotCls = statusColor(friend.status);
                const sLabel = statusLabel(friend.status);
                return (
                  <UserProfilePopover
                    key={friend.id}
                    userId={friend.id}
                    onOpenDM={() => onOpenDM?.(friend.id, friend.displayName)}
                  >
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-left transition-colors duration-150 hover:bg-surface-secondary/60"
                    >
                      <div className="relative shrink-0">
                        <Avatar className="size-7 ring-2 ring-transparent">
                          <AvatarImage src={resolveMediaUrl(friend.avatarUrl)} />
                          <AvatarFallback className="bg-surface-secondary text-[10px]">
                            {friend.username.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className={cn('absolute -bottom-0.5 -right-0.5 size-2 rounded-full ring-[1.5px] ring-background', dotCls)} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[11px] font-medium leading-tight">{friend.displayName}</p>
                        <p className="truncate text-[9px] leading-tight text-muted-foreground/40">
                          {displayFields[0] === 'username'
                            ? `@${friend.username}`
                            : displayFields[0] === 'status'
                              ? sLabel
                              : friend.customStatus || sLabel}
                        </p>
                      </div>
                    </button>
                  </UserProfilePopover>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
}

/* --- Friend row ----------------------------------------------------------- */

function FriendRow({
  friend,
  onMessage,
  onRemove,
  onBlock,
  displayFields,
  unreadCount,
}: {
  friend: Friend;
  onMessage: () => void;
  onRemove: () => void;
  onBlock: () => void;
  displayFields: DisplayField[];
  unreadCount?: number;
}) {
  const { t } = useTranslation();
  const { prefs } = useLayoutPrefs();
  const d = densityCls(prefs.density);
  const dot = statusColor(friend.status);
  const sLabel = statusLabel(friend.status);
  const [profileOpen, setProfileOpen] = useState(false);

  const fieldValue: Record<DisplayField, string | null> = {
    customStatus: friend.customStatus || null,
    username: `@${friend.username}`,
    status: sLabel,
  };
  const activeFields = displayFields.length > 0 ? displayFields : (['customStatus'] as DisplayField[]);
  const hasUnread = (unreadCount ?? 0) > 0;

  return (
    <div
      className={cn(
        'group flex items-center rounded-xl transition-all duration-150 hover:bg-surface-secondary/60',
        hasUnread && 'bg-accent/5',
        d.rowGap, d.rowPx, d.rowPy,
      )}
      onDoubleClick={onMessage}
    >
      <UserProfilePopover
        userId={friend.id}
        onOpenDM={onMessage}
        open={profileOpen}
        onOpenChange={setProfileOpen}
      >
        <button type="button" className="relative shrink-0">
          <Avatar className={cn('ring-2 transition-all ring-transparent group-hover:ring-border/30', d.rowAvatar)}>
            <AvatarImage src={resolveMediaUrl(friend.avatarUrl)} />
            <AvatarFallback className="bg-surface-secondary text-xs">{friend.username.charAt(0).toUpperCase()}</AvatarFallback>
          </Avatar>
          <span className={cn('absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full ring-[1.5px] ring-background', dot)} />
        </button>
      </UserProfilePopover>

      <button type="button" className={cn('flex min-w-0 flex-1 items-center text-left', d.rowGap)}>
        <span className="min-w-0 flex-1">
          <p className={cn('truncate font-medium leading-tight', hasUnread ? 'text-foreground font-bold' : 'text-foreground', d.rowName)}>{friend.displayName}</p>
          {activeFields.map((f) => {
            const val = fieldValue[f];
            if (!val) return null;
            return (
              <p key={f} className={cn('truncate leading-tight text-muted-foreground/50', d.rowSub)}>
                {val}
              </p>
            );
          })}
        </span>
      </button>

      {hasUnread && (
        <Badge variant="destructive" className="shrink-0 min-w-5 h-5 text-[10px]">
          {unreadCount! > 99 ? '99+' : unreadCount}
        </Badge>
      )}

      <div className="ml-auto flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="icon-sm" variant="ghost" onClick={onMessage} className="size-7 rounded-lg text-muted-foreground hover:text-foreground">
                <MessageCircleIcon size={14} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">{t.friends.message}</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="icon-sm" variant="ghost" className="size-7 rounded-lg text-muted-foreground hover:text-foreground">
              <MoreVerticalIcon size={13} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-40">
            <DropdownMenuItem className="gap-2 text-xs" onClick={() => setProfileOpen(true)}>
              <UserIcon size={14} />
              Voir le profil
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-2 text-xs" onClick={onMessage}>
              <MessageCircleIcon size={14} />
              {t.friends.sendMessage}
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-2 text-xs">
              <PhoneIcon size={14} />
              Appel vocal
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-2 text-xs">
              <ServerIcon size={14} />
              Inviter sur un serveur
            </DropdownMenuItem>
            <DropdownMenuItem variant="destructive" className="gap-2 text-xs" onClick={onRemove}>
              <UserMinusIcon size={14} />
              {t.friends.removeFriend}
            </DropdownMenuItem>
            <DropdownMenuItem variant="destructive" className="gap-2 text-xs" onClick={onBlock}>
              <BanIcon size={14} />
              {t.friends.block}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
