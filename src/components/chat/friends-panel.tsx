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
import {
  Avatar,
  Button,
  Chip,
  Dropdown,
  InputGroup,
  Popover,
  ScrollShadow,
  Separator,
  Skeleton,
  Tabs,
  Tooltip,
} from '@heroui/react';
import { cn } from '@/lib/utils';
import { api, resolveMediaUrl } from '@/lib/api';
import { socketService } from '@/lib/socket';
import { useMobileNav } from '@/hooks/use-mobile-nav';
import { useAuth } from '@/hooks/use-auth';
import { useUIStyle } from '@/hooks/use-ui-style';
import { notify } from '@/hooks/use-notification';
import { UserProfilePopover } from '@/components/chat/user-profile-popover';
import { useTranslation } from '@/components/locale-provider';

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
  customStatus: 'Statut personnalisé',
  username: "Nom d'utilisateur",
  status: 'Statut en ligne',
};

interface FriendsPanelProps {
  onOpenDM?: (recipientId: string, recipientName: string) => void;
}

const statusConfig: Record<string, { color: string }> = {
  online:    { color: 'bg-green-500' },
  idle:      { color: 'bg-yellow-500' },
  dnd:       { color: 'bg-red-500' },
  invisible: { color: 'bg-gray-500' },
  offline:   { color: 'bg-gray-500' },
};

export function FriendsPanel({ onOpenDM }: FriendsPanelProps) {
  const { isMobile, openSidebar } = useMobileNav();
  const { user: currentUser } = useAuth();
  const prevUserIdRef = useRef<string | null>(null);
  const ui = useUIStyle();
  const { t, tx } = useTranslation();
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
  const [displayFields, setDisplayFields] = useState<DisplayField[]>(() => {
    if (typeof window === 'undefined') return ['customStatus'];
    try {
      const stored = localStorage.getItem('alfychat_friend_row_fields');
      return stored ? (JSON.parse(stored) as DisplayField[]) : ['customStatus'];
    } catch { return ['customStatus']; }
  });

  const toggleDisplayField = (field: DisplayField) => {
    setDisplayFields((prev) => {
      let next: DisplayField[];
      if (prev.includes(field)) {
        next = prev.filter((f) => f !== field);
      } else if (prev.length < 2) {
        next = [...prev, field];
      } else {
        return prev; // max 2 atteint
      }
      localStorage.setItem('alfychat_friend_row_fields', JSON.stringify(next));
      return next;
    });
  };

  useEffect(() => {
    const el = tabsListRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) =>
      setCompactTabs(entry.contentRect.width < 420)
    );
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    loadFriends();
    loadRequests();
    loadBlockedUsers();

    const handleFriendRequest = () => { loadRequests(); };
    const handleFriendAccepted = () => { loadFriends(); loadRequests(); };
    const handlePresenceUpdate = (data: unknown) => {
      const payload = (data as { payload?: Record<string, unknown> })?.payload || data;
      const p = payload as { userId?: string; status?: string; customStatus?: string | null };
      if (p?.userId && p?.status) {
        setFriends((prev) =>
          prev.map((f) =>
            f.id === p.userId
              ? { ...f, status: p.status as Friend['status'], customStatus: p.customStatus ?? f.customStatus, isOnline: p.status !== 'offline' && p.status !== 'invisible' }
              : f
          )
        );
      } else {
        loadFriends();
      }
    };
    const handleFriendRemove = (data: unknown) => {
      const payload = (data as { payload?: Record<string, unknown> })?.payload || data;
      const p = payload as { friendId?: string };
      if (p?.friendId) setFriends((prev) => prev.filter((f) => f.id !== p.friendId));
    };
    const handleProfileUpdate = (data: unknown) => {
      const payload = (data as { payload?: Record<string, unknown> })?.payload || data;
      const p = payload as { userId?: string; displayName?: string; avatarUrl?: string };
      if (!p?.userId) return;
      setFriends((prev) =>
        prev.map((f) =>
          f.id === p.userId ? { ...f, ...(p.displayName && { displayName: p.displayName }), ...(p.avatarUrl !== undefined && { avatarUrl: p.avatarUrl }) } : f
        )
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

  const loadBlockedUsers = async () => {
    try {
      const response = await api.getBlockedUsers();
      if (response.success && response.data) setBlockedUsers(response.data as BlockedUser[]);
    } catch {}
  };

  const loadFriends = async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('alfychat_token') : null;
    if (!token) return;
    try {
      const response = await api.getFriends();
      if (response.success && response.data) {
        const data = response.data as Friend[];

        // Fetch Redis presence first, then render — avoids flicker from stale DB status
        const friendIds = data.map((f) => f.id).filter(Boolean);
        if (friendIds.length > 0) {
          socketService.requestBulkPresence(friendIds, (presence) => {
            const merged = data.map((f) => {
              const p = presence.find((x) => x.userId === f.id);
              if (!p) return f;
              return {
                ...f,
                status: p.status as Friend['status'],
                customStatus: p.customStatus ?? f.customStatus,
                isOnline: p.status !== 'offline' && p.status !== 'invisible',
              };
            });
            setFriends(merged);
          });
        } else {
          setFriends(data);
        }
      }
    } catch {}
  };

  const loadRequests = async () => {
    try {
      const response = await api.getFriendRequests();
      if (response.success && response.data)
        setRequests(response.data as { received: FriendRequest[]; sent: FriendRequest[] });
    } catch {} finally {
      setIsLoading(false);
    }
  };

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
      // Step 1: look up the user by exact username
      const searchRes = await api.searchUsers(username);
      const list: any[] = Array.isArray((searchRes.data as any)?.users)
        ? (searchRes.data as any).users
        : Array.isArray(searchRes.data)
          ? (searchRes.data as any[])
          : [];
      const found = list.find(
        (u: any) => (u.username ?? '').toLowerCase() === username.toLowerCase()
      );
      if (!found) {
        notify.error(t.common.error, `Aucun utilisateur trouvé avec le pseudo « ${username} »`);
        return;
      }
      // Step 2: send request with actual user ID
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
      if (response.success) { loadFriends(); loadRequests(); notify.success(t.friends.friendAdded, t.friends.friendAccepted); }
    } catch { notify.error(t.common.error, t.friends.acceptError); }
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
      } else notify.error(t.common.error, t.friends.removeError);
    } catch { notify.error(t.common.error, t.friends.removeError); }
  };

  const handleBlockUser = async (userId: string, username: string) => {
    try {
      const response = await api.blockUser(userId);
      if (response.success) {
        setFriends((prev) => prev.filter((f) => f.id !== userId));
        loadBlockedUsers();
        notify.success(t.friends.userBlocked, tx(t.friends.userBlockedMsg, { username }));
      } else notify.error(t.common.error, t.friends.blockError);
    } catch { notify.error(t.common.error, t.friends.blockError); }
  };

  const handleUnblockUser = async (userId: string, username: string) => {
    try {
      const response = await api.unblockUser(userId);
      if (response.success) {
        setBlockedUsers((prev) => prev.filter((u) => u.id !== userId));
        notify.success(t.friends.unblocked, tx(t.friends.unblockedMsg, { username }));
      } else notify.error(t.common.error, t.friends.unblockError);
    } catch { notify.error(t.common.error, t.friends.unblockError); }
  };

  const filteredFriends = friends.filter(
    (f) =>
      f.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const onlineFriends = filteredFriends.filter((f) => f.status === 'online' || f.status === 'idle' || f.status === 'dnd');
  const offlineFriends = filteredFriends.filter((f) => f.status !== 'online' && f.status !== 'idle' && f.status !== 'dnd');

  // ── Loading ──────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex h-full flex-1 flex-row">
        <div className="flex flex-1 flex-col">
          <div className="flex h-14 items-center gap-3 border-b border-white/10 px-6">
            <Skeleton className="size-9 rounded-2xl" animationType="shimmer" />
            <Skeleton className="h-4 w-24" animationType="shimmer" />
          </div>
          <div className="flex gap-2 px-6 pt-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-20 rounded-xl" animationType="shimmer" />
            ))}
          </div>
          <div className="space-y-2 p-6">
            <Skeleton className="h-10 w-full rounded-xl" animationType="shimmer" />
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3">
                <Skeleton className="size-10 rounded-full" animationType="shimmer" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-28" animationType="shimmer" />
                  <Skeleton className="h-3 w-20" animationType="shimmer" />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="hidden w-60 flex-col border-l border-white/10 md:flex">
          <div className="flex h-14 items-center gap-2 border-b border-white/10 px-4">
            <Skeleton className="size-2 rounded-full" animationType="shimmer" />
            <Skeleton className="h-3.5 w-24" animationType="shimmer" />
          </div>
          <div className="space-y-2 p-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-2.5 rounded-xl p-2">
                <Skeleton className="size-8 rounded-full" animationType="shimmer" />
                <Skeleton className="h-3 w-20" animationType="shimmer" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Main ──────────────────────────────────────────────────
  return (
    <div data-tour="friends-panel" className="flex h-full flex-1 flex-row overflow-hidden">

      {/* ══ CENTER ══ */}
      <div ref={tabsListRef} className="flex flex-1 flex-col overflow-hidden">

        {/* Header */}
        <div className={`flex h-14 shrink-0 items-center gap-3 px-4 md:px-6 ${ui.header}`}>
          {isMobile && (
            <Button isIconOnly size="sm" variant="ghost" onPress={openSidebar} className="shrink-0 rounded-xl">
              <MenuIcon size={18} />
            </Button>
          )}
          <div className="flex size-9 items-center justify-center rounded-2xl bg-[var(--accent)] shadow-lg shadow-[var(--accent)]/25">
            <UsersIcon size={16} className="text-[var(--accent-foreground)]" />
          </div>
          <span className="text-[15px] font-bold tracking-tight text-[var(--foreground)]">{t.friends.title}</span>
          {requests.received.length > 0 && (
            <Chip color="danger" size="sm" className="ml-auto">
              {requests.received.length}
            </Chip>
          )}
        </div>

        {/* Tabs */}
        <Tabs className="flex flex-1 flex-col overflow-hidden p-0">
          <Tabs.ListContainer className="px-4 pt-3 md:px-6">
            <Tabs.List className="shrink-0">
              <Tooltip delay={0}>
                <Tabs.Tab id="friends">
                  <div className="flex items-center gap-1.5">
                    <UsersIcon size={14} />
                    {!compactTabs && <span>{t.friends.tabFriends}</span>}
                    {!compactTabs && (
                      <Chip size="sm" variant="soft">{friends.length}</Chip>
                    )}
                  </div>
                  <Tabs.Indicator />
                </Tabs.Tab>
                {compactTabs && <Tooltip.Content>{t.friends.tabFriends}</Tooltip.Content>}
              </Tooltip>
              <Tooltip delay={0}>
                <Tabs.Tab id="requests">
                  <div className="flex items-center gap-1.5">
                    <ClockIcon size={14} />
                    {!compactTabs && <span>{t.friends.tabRequests}</span>}
                    {!compactTabs && requests.received.length > 0 && (
                      <Chip color="danger" size="sm">{requests.received.length}</Chip>
                    )}
                  </div>
                  <Tabs.Indicator />
                </Tabs.Tab>
                {compactTabs && <Tooltip.Content>{t.friends.tabRequests}</Tooltip.Content>}
              </Tooltip>
              <Tooltip delay={0}>
                <Tabs.Tab id="blocked">
                  <div className="flex items-center gap-1.5">
                    <ShieldOffIcon size={14} />
                    {!compactTabs && <span>{t.friends.tabBlocked}</span>}
                    {!compactTabs && blockedUsers.length > 0 && (
                      <Chip size="sm" variant="soft">{blockedUsers.length}</Chip>
                    )}
                  </div>
                  <Tabs.Indicator />
                </Tabs.Tab>
                {compactTabs && <Tooltip.Content>{t.friends.tabBlocked}</Tooltip.Content>}
              </Tooltip>
              <Tooltip delay={0}>
                <Tabs.Tab id="add">
                  <div className="flex items-center gap-1.5">
                    <UserPlusIcon size={14} />
                    {!compactTabs && <span>{t.friends.tabAdd}</span>}
                  </div>
                  <Tabs.Indicator />
                </Tabs.Tab>
                {compactTabs && <Tooltip.Content>{t.friends.tabAdd}</Tooltip.Content>}
              </Tooltip>
            </Tabs.List>
          </Tabs.ListContainer>

          {/* ── Friends Tab ── */}
          <Tabs.Panel id="friends" className="flex flex-1 flex-col gap-3 overflow-hidden p-4 md:p-6">
            {/* Search */}
            <InputGroup
              className={`w-full rounded-xl ${ui.isGlass ? 'border-white/15 bg-white/60 dark:bg-white/8' : 'border-[var(--border)] bg-[var(--surface)]'}`}
              variant="secondary"
            >
              <InputGroup.Prefix className="pl-3 pr-0">
                <SearchIcon size={15} className="text-[var(--muted)]/50" />
              </InputGroup.Prefix>
              <InputGroup.Input
                placeholder={t.friends.searchPlaceholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <InputGroup.Suffix className="pr-2">
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="flex size-5 items-center justify-center rounded-md text-[var(--muted)] transition-colors hover:text-[var(--foreground)]"
                  >
                    <XIcon size={12} />
                  </button>
                </InputGroup.Suffix>
              )}
            </InputGroup>

            {filteredFriends.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center">
                <div className={`relative w-full max-w-sm overflow-hidden px-8 py-10 text-center ${ui.emptyCard}`}>
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[var(--accent)]/15 via-transparent to-violet-500/10" />
                  <div className="pointer-events-none absolute left-1/2 top-0 h-32 w-48 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--accent)]/20 " />
                  <div className="relative flex flex-col items-center gap-4">
                    <div className="flex size-14 items-center justify-center rounded-2xl bg-[var(--accent)] shadow-xl shadow-[var(--accent)]/30">
                      <UsersIcon size={26} className="text-[var(--accent-foreground)]" />
                    </div>
                    <div>
                      <p className="text-[15px] font-bold text-[var(--foreground)]">
                        {searchQuery ? t.friends.noResults : t.friends.noFriends}
                      </p>
                      <p className="mt-1 text-[12px] text-[var(--muted)]">
                        {searchQuery ? t.friends.noResultsHint : t.friends.addFriendsHint}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <ScrollShadow className="flex-1">
                {onlineFriends.length > 0 && (
                  <div className="mb-4">
                    <p className="mb-2 px-1 text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]/50">
                      {tx(t.friends.onlineCount, { n: String(onlineFriends.length) })}
                    </p>
                    <div className="space-y-1.5">
                      {onlineFriends.map((friend) => (
                        <FriendRow
                          key={friend.id}
                          friend={friend}
                          displayFields={displayFields}
                          onMessage={() => onOpenDM?.(friend.id, friend.displayName)}
                          onRemove={() => handleRemoveFriend(friend.id)}
                          onBlock={() => handleBlockUser(friend.id, friend.displayName)}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {onlineFriends.length > 0 && offlineFriends.length > 0 && (
                  <div className="px-2 py-2">
                    <Separator className="opacity-20" />
                  </div>
                )}

                {offlineFriends.length > 0 && (
                  <div className="mt-2">
                    <p className="mb-2 px-1 text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]/50">
                      {tx(t.friends.offlineCount, { n: String(offlineFriends.length) })}
                    </p>
                    <div className="space-y-1.5">
                      {offlineFriends.map((friend) => (
                        <FriendRow
                          key={friend.id}
                          friend={friend}
                          displayFields={displayFields}
                          onMessage={() => onOpenDM?.(friend.id, friend.displayName)}
                          onRemove={() => handleRemoveFriend(friend.id)}
                          onBlock={() => handleBlockUser(friend.id, friend.displayName)}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </ScrollShadow>
            )}
          </Tabs.Panel>

          {/* ── Requests Tab ── */}
          <Tabs.Panel id="requests" className="flex flex-1 flex-col overflow-hidden p-4 md:p-6">
            {requests.received.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center">
                <div className={`relative w-full max-w-sm overflow-hidden px-8 py-10 text-center ${ui.emptyCard}`}>
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-yellow-500/15 via-transparent to-amber-500/10" />
                  <div className="pointer-events-none absolute left-1/2 top-0 h-32 w-48 -translate-x-1/2 -translate-y-1/2 rounded-full bg-yellow-400/20 " />
                  <div className="relative flex flex-col items-center gap-4">
                    <div className="flex size-14 items-center justify-center rounded-2xl bg-yellow-500 shadow-xl shadow-yellow-500/30">
                      <ClockIcon size={26} className="text-white" />
                    </div>
                    <div>
                      <p className="text-[15px] font-bold text-[var(--foreground)]">{t.friends.noRequests}</p>
                      <p className="mt-1 text-[12px] text-[var(--muted)]">{t.friends.upToDate}</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <ScrollShadow className="flex-1">
                <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]/50">
                  {tx(t.friends.receivedCount, { n: String(requests.received.length) })}
                </p>
                <div className="space-y-2">
                  {requests.received.map((req) => (
                    <div
                      key={req.id}
                      className={`flex items-center gap-3 px-4 py-3 transition-all ${ui.row}`}
                    >
                      <div className="relative shrink-0">
                        <Avatar className="size-10">
                          <Avatar.Image src={resolveMediaUrl(req.avatarUrl)} />
                          <Avatar.Fallback className="text-xs">{req.username.charAt(0).toUpperCase()}</Avatar.Fallback>
                        </Avatar>
                        <span className="absolute -bottom-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-yellow-500 ring-2 ring-[var(--background)]">
                          <ClockIcon size={9} className="text-white" />
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-semibold">{req.displayName}</p>
                        <p className="truncate text-[11px] text-[var(--muted)]">@{req.username}</p>
                        {req.message && (
                          <p className="mt-0.5 truncate text-[11px] italic text-[var(--muted)]/60">
                            &ldquo;{req.message}&rdquo;
                          </p>
                        )}
                      </div>
                      <div className="flex gap-1.5">
                        <Tooltip delay={0}>
                          <Button
                            isIconOnly size="sm"
                            onPress={() => handleAcceptRequest(req.id)}
                            className="rounded-xl bg-green-600 text-white hover:bg-green-700 shadow-md shadow-green-600/20"
                          >
                            <CheckIcon size={15} />
                          </Button>
                          <Tooltip.Content>{t.friends.accept}</Tooltip.Content>
                        </Tooltip>
                        <Tooltip delay={0}>
                          <Button
                            isIconOnly size="sm" variant="danger"
                            onPress={() => handleDeclineRequest(req.id)}
                            className="rounded-xl shadow-md shadow-red-600/20"
                          >
                            <XIcon size={15} />
                          </Button>
                          <Tooltip.Content>{t.friends.decline}</Tooltip.Content>
                        </Tooltip>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollShadow>
            )}
          </Tabs.Panel>

          {/* ── Blocked Tab ── */}
          <Tabs.Panel id="blocked" className="flex flex-1 flex-col overflow-hidden p-4 md:p-6">
            {blockedUsers.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center">
                <div className={`relative w-full max-w-sm overflow-hidden px-8 py-10 text-center ${ui.emptyCard}`}>
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-red-500/15 via-transparent to-rose-500/10" />
                  <div className="pointer-events-none absolute left-1/2 top-0 h-32 w-48 -translate-x-1/2 -translate-y-1/2 rounded-full bg-red-400/20 " />
                  <div className="relative flex flex-col items-center gap-4">
                    <div className="flex size-14 items-center justify-center rounded-2xl bg-red-500 shadow-xl shadow-red-500/30">
                      <ShieldOffIcon size={26} className="text-white" />
                    </div>
                    <div>
                      <p className="text-[15px] font-bold text-[var(--foreground)]">{t.friends.noBlocked}</p>
                      <p className="mt-1 text-[12px] text-[var(--muted)]">{t.friends.blockedListEmpty}</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <ScrollShadow className="flex-1">
                <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]/50">
                  {tx(t.friends.blockedCount, { n: String(blockedUsers.length) })}
                </p>
                <div className="space-y-2">
                  {blockedUsers.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center gap-3 rounded-2xl border border-white/15 bg-white/30 px-4 py-3 dark:border-white/10 dark:bg-white/5"
                    >
                      <div className="relative shrink-0">
                        <Avatar className="size-10 opacity-50 grayscale">
                          <Avatar.Image src={resolveMediaUrl(user.avatarUrl)} />
                          <Avatar.Fallback className="text-xs">{user.username.charAt(0).toUpperCase()}</Avatar.Fallback>
                        </Avatar>
                        <span className="absolute -bottom-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-red-500 ring-2 ring-[var(--background)]">
                          <BanIcon size={9} className="text-white" />
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-semibold text-[var(--muted)]">{user.displayName}</p>
                        <p className="truncate text-[11px] text-[var(--muted)]/50">@{user.username}</p>
                      </div>
                      <Button
                        size="sm" variant="outline"
                        className="shrink-0 gap-1.5 rounded-xl border-white/20 text-[11px] hover:bg-white/10"
                        onPress={() => handleUnblockUser(user.id, user.displayName)}
                      >
                        <ShieldOffIcon size={13} />
                        {t.friends.unblock}
                      </Button>
                    </div>
                  ))}
                </div>
              </ScrollShadow>
            )}
          </Tabs.Panel>

          {/* ── Add Friend Tab ── */}
          <Tabs.Panel id="add" className="flex flex-1 flex-col overflow-y-auto p-4 md:p-6">
            <div className="mx-auto w-full max-w-md space-y-4">

              {/* Hero banner — same style as login visual panel */}
              <div className="relative overflow-hidden rounded-3xl border border-white/20 bg-white/30 px-6 py-8 text-center dark:border-white/10 dark:bg-white/5">
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[var(--accent)]/20 via-transparent to-violet-600/15" />
                <div className="pointer-events-none absolute left-1/2 top-0 h-28 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--accent)]/25 " />
                <div className="relative flex flex-col items-center gap-4">
                  <div className="flex items-center -space-x-2.5">
                    {[{ l: 'A', bg: '#6366f1' }, { l: 'B', bg: '#8b5cf6' }, { l: 'C', bg: '#a78bfa' }].map(({ l, bg }, i) => (
                      <div
                        key={l}
                        className="flex size-9 items-center justify-center rounded-full border-2 border-white/30 text-[12px] font-bold text-white shadow-md"
                        style={{ backgroundColor: bg, zIndex: 4 - i }}
                      >
                        {l}
                      </div>
                    ))}
                    <div className="flex size-9 items-center justify-center rounded-full border-2 border-white/30 bg-[var(--accent)] shadow-md" style={{ zIndex: 1 }}>
                      <UserPlusIcon size={15} className="text-white" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-[16px] font-bold text-[var(--foreground)]">{t.friends.findFriends}</h3>
                    <p className="mt-1 text-[12px] text-[var(--muted)]">{t.friends.findFriendsSubtitle}</p>
                  </div>
                </div>
              </div>

              {/* Form */}
              <form onSubmit={handleAddFriend} className="space-y-2.5">
                <InputGroup
                  className={`w-full rounded-xl ${ui.isGlass ? 'border-white/15 bg-white/60 dark:bg-white/8' : 'border-[var(--border)] bg-[var(--surface)]'}`}
                  variant="secondary"
                >
                  <InputGroup.Prefix className="pl-3 pr-0">
                    <SearchIcon size={15} className="text-[var(--muted)]/50" />
                  </InputGroup.Prefix>
                  <InputGroup.Input
                    placeholder={t.friends.usernamePlaceholder}
                    value={addFriendInput}
                    onChange={(e) => setAddFriendInput(e.target.value)}
                    required
                  />
                  {addFriendInput.trim() && (
                    <InputGroup.Suffix className="pr-2">
                      <button
                        type="button"
                        onClick={() => setAddFriendInput('')}
                        className="flex size-5 items-center justify-center rounded-md text-[var(--muted)] transition-colors hover:text-[var(--foreground)]"
                      >
                        <XIcon size={12} />
                      </button>
                    </InputGroup.Suffix>
                  )}
                </InputGroup>

                <Button
                  type="submit"
                  fullWidth
                  className="gap-2 rounded-xl font-semibold shadow-lg shadow-[var(--accent)]/20"
                  isDisabled={addFriendLoading || !addFriendInput.trim()}
                >
                  {addFriendLoading ? (
                    <><ClockIcon size={15} className="animate-spin" />{t.friends.sendingRequest}</>
                  ) : (
                    <><UserPlusIcon size={15} />{t.friends.sendRequest}</>
                  )}
                </Button>
              </form>

              {/* Sent requests */}
              {requests.sent.length > 0 && (
                <div>
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]/50">
                    {tx(t.friends.sentCount, { n: String(requests.sent.length) })}
                  </p>
                  <div className="space-y-1.5">
                    {requests.sent.map((req) => (
                      <div
                        key={req.id}
                        className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 ${ui.isGlass ? 'border border-white/15 bg-white/20 dark:border-white/8 dark:bg-white/5' : 'border border-[var(--border)] bg-[var(--surface-secondary)]'}`}
                      >
                        <Avatar className="size-8">
                          <Avatar.Image src={resolveMediaUrl(req.avatarUrl)} />
                          <Avatar.Fallback className="text-xs">{req.username.charAt(0).toUpperCase()}</Avatar.Fallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[12px] font-semibold">{req.displayName}</p>
                          <p className="truncate text-[10px] text-[var(--muted)]">@{req.username}</p>
                        </div>
                        <Chip size="sm" variant="soft" className="shrink-0 text-[10px]">
                          {t.friends.pending}
                        </Chip>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Tabs.Panel>
        </Tabs>
      </div>

      {/* ══ RIGHT SIDEBAR ══ */}
      <div className={`hidden w-56 flex-col border-l md:flex ${ui.isGlass ? 'border-white/10 bg-white/10 dark:bg-white/3' : 'border-[var(--border)] bg-[var(--surface-secondary)]'}`}>
        {/* Header */}
        <div className={`flex h-14 shrink-0 items-center gap-2.5 px-4 ${ui.isGlass ? 'border-b border-white/10' : 'border-b border-[var(--border)]'}`}>
          <span className="size-2 rounded-full bg-green-500 shadow-sm shadow-green-500/50" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]/60">
            {t.friends.onlineSidebar}
          </span>
          <Chip size="sm" variant="soft" className="ml-auto">{onlineFriends.length}</Chip>
          <Popover>
            <Popover.Trigger>
              <Button isIconOnly size="sm" variant="ghost" className="size-6 rounded-lg shrink-0">
                <SettingsIcon size={11} className="text-[var(--muted)]/50" />
              </Button>
            </Popover.Trigger>
            <Popover.Content className="w-52 rounded-xl p-3" placement="bottom end">
              <p className="mb-0.5 text-[11px] font-bold text-[var(--foreground)]">Afficher dans les cartes</p>
              <p className="mb-2.5 text-[10px] text-[var(--muted)]">Max 2 éléments simultanés</p>
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
                        'flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-[11px] transition-colors',
                        active
                          ? 'bg-[var(--accent)]/15 text-[var(--foreground)]'
                          : atMax
                            ? 'opacity-35 cursor-not-allowed text-[var(--muted)]'
                            : 'hover:bg-[var(--surface-secondary)] text-[var(--muted)]',
                      )}
                    >
                      {DISPLAY_FIELD_LABELS[field]}
                      {active && <CheckIcon size={11} className="shrink-0 text-[var(--accent)]" />}
                    </button>
                  );
                })}
              </div>
            </Popover.Content>
          </Popover>
        </div>

        {/* Online list */}
        <ScrollShadow className="flex-1 p-2">
          {onlineFriends.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 pt-10 text-center">
              <div className={`flex size-10 items-center justify-center rounded-2xl ${ui.isGlass ? 'border border-white/15 bg-white/20 dark:border-white/8 dark:bg-white/5' : 'border border-[var(--border)] bg-[var(--surface)]'}`}>
                <UsersIcon size={18} className="text-[var(--muted)]/30" />
              </div>
              <p className="text-[11px] text-[var(--muted)]/40">{t.friends.noOneOnline}</p>
            </div>
          ) : (
            <div className="space-y-0.5">
              {onlineFriends.map((friend) => {
                const st = statusConfig[friend.status] ?? statusConfig.offline;
                const statusLabel = (t.status as Record<string, string>)[friend.status] ?? t.status.offline;
                return (
                  <UserProfilePopover key={friend.id} userId={friend.id} onOpenDM={() => onOpenDM?.(friend.id, friend.displayName)}>
                    <button
                      type="button"
                      className={`flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-left transition-colors duration-150 ${ui.isGlass ? 'hover:bg-white/15 dark:hover:bg-white/5' : 'hover:bg-[var(--surface-secondary)]/70'}`}
                    >
                      <div className="relative shrink-0">
                        <Avatar className="size-7">
                          <Avatar.Image src={resolveMediaUrl(friend.avatarUrl)} />
                          <Avatar.Fallback className="text-[10px]">{friend.username.charAt(0).toUpperCase()}</Avatar.Fallback>
                        </Avatar>
                        <span className={cn('absolute -bottom-0.5 -right-0.5 size-2 rounded-full ring-[1.5px] ring-[var(--background)]', st.color)} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[11px] font-medium leading-tight">{friend.displayName}</p>
                        <p className="truncate text-[9px] text-[var(--muted)]/50">
                          {displayFields[0] === 'username' ? `@${friend.username}` : displayFields[0] === 'status' ? statusLabel : (friend.customStatus || statusLabel)}
                        </p>
                      </div>
                    </button>
                  </UserProfilePopover>
                );
              })}
            </div>
          )}
        </ScrollShadow>
      </div>
    </div>
  );
}

// ── Friend row ────────────────────────────────────────────────
function FriendRow({
  friend,
  onMessage,
  onRemove,
  onBlock,
  displayFields,
}: {
  friend: Friend;
  onMessage: () => void;
  onRemove: () => void;
  onBlock: () => void;
  displayFields: DisplayField[];
}) {
  const { t } = useTranslation();
  const ui = useUIStyle();
  const status = statusConfig[friend.status] ?? statusConfig.offline;
  const statusLabel = (t.status as Record<string, string>)[friend.status] ?? t.status.offline;
  const [profileOpen, setProfileOpen] = useState(false);

  const fieldValue: Record<DisplayField, string | null> = {
    customStatus: friend.customStatus || null,
    username: `@${friend.username}`,
    status: statusLabel,
  };
  const activeFields = displayFields.length > 0 ? displayFields : ['customStatus' as DisplayField];

  return (
    <div className={`flex items-center gap-3 px-4 py-3 transition-all duration-150 ${ui.row}`}>
      <div className="min-w-0 flex-1">
      <UserProfilePopover userId={friend.id} onOpenDM={onMessage} open={profileOpen} onOpenChange={setProfileOpen}>
        <button type="button" className="flex w-full items-center gap-3 text-left">
          <span className="relative shrink-0">
            <Avatar className="size-9 ring-2 ring-white/20 transition-all hover:ring-[var(--accent)]/30">
              <Avatar.Image src={resolveMediaUrl(friend.avatarUrl)} />
              <Avatar.Fallback className="text-xs">{friend.username.charAt(0).toUpperCase()}</Avatar.Fallback>
            </Avatar>
            <span className={cn('absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full ring-[1.5px] ring-[var(--background)]', status.color)} />
          </span>
          <span className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-semibold leading-tight text-[var(--foreground)]">{friend.displayName}</p>
            {activeFields.map((f) => {
              const val = fieldValue[f];
              if (!val) return null;
              return <p key={f} className="truncate text-[10px] leading-snug text-[var(--muted)]/60">{val}</p>;
            })}
          </span>
        </button>
      </UserProfilePopover>
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-0.5">
        <Tooltip delay={0}>
          <Button isIconOnly size="sm" variant="ghost" onPress={onMessage} className="rounded-xl">
            <MessageCircleIcon size={15} />
          </Button>
          <Tooltip.Content placement="top">{t.friends.message}</Tooltip.Content>
        </Tooltip>

        <Dropdown>
          <Dropdown.Trigger aria-label={t.friends.moreActions}>
            <div className="inline-flex size-8 cursor-pointer items-center justify-center rounded-xl text-[var(--muted)] transition-colors hover:bg-[var(--surface-secondary)] hover:text-[var(--foreground)]">
              <MoreVerticalIcon size={14} />
            </div>
          </Dropdown.Trigger>
          <Dropdown.Popover placement="bottom end">
            <Dropdown.Menu aria-label={t.friends.moreActions}>
              <Dropdown.Item id="profile" onPress={() => setProfileOpen(true)} className="gap-2">
                <UserIcon size={15} />Voir le profil
              </Dropdown.Item>
              <Dropdown.Item id="message" onPress={onMessage} className="gap-2">
                <MessageCircleIcon size={15} />{t.friends.sendMessage}
              </Dropdown.Item>
              <Dropdown.Item id="call" className="gap-2">
                <PhoneIcon size={15} />Appel vocal
              </Dropdown.Item>
              <Dropdown.Item id="invite" className="gap-2">
                <ServerIcon size={15} />Inviter sur un serveur
              </Dropdown.Item>
              <Dropdown.Item id="remove" onPress={onRemove} className="gap-2 text-red-500">
                <UserMinusIcon size={15} />{t.friends.removeFriend}
              </Dropdown.Item>
              <Dropdown.Item id="block" onPress={onBlock} className="gap-2 text-red-500">
                <BanIcon size={15} />{t.friends.block}
              </Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown.Popover>
        </Dropdown>
      </div>
    </div>
  );
}
