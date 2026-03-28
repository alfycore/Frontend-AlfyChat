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
} from '@/components/icons';
import {
  Avatar,
  Button,
  Chip,
  Dropdown,
  InputGroup,
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

    const handleFriendRequest = () => {
      loadRequests();
    };
    const handleFriendAccepted = () => {
      loadFriends();
      loadRequests();
    };
    const handlePresenceUpdate = (data: unknown) => {
      const payload = (data as { payload?: Record<string, unknown> })?.payload || data;
      const p = payload as { userId?: string; status?: string; customStatus?: string | null };
      if (p?.userId && p?.status) {
        setFriends((prev) =>
          prev.map((f) =>
            f.id === p.userId
              ? { ...f, status: p.status as Friend['status'], customStatus: p.customStatus ?? f.customStatus, isOnline: p.status === 'online' }
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

    socketService.onFriendRequest(handleFriendRequest);
    socketService.onFriendAccepted(handleFriendAccepted);
    socketService.onPresenceUpdate(handlePresenceUpdate);
    socketService.on('FRIEND_REMOVE', handleFriendRemove);
    socketService.onProfileUpdate(handleProfileUpdate);

    return () => {
      socketService.off('FRIEND_REQUEST', handleFriendRequest as any);
      socketService.off('FRIEND_ACCEPT', handleFriendAccepted as any);
      socketService.off('PRESENCE_UPDATE', handlePresenceUpdate as any);
      socketService.off('FRIEND_REMOVE', handleFriendRemove as any);
      socketService.off('PROFILE_UPDATE', handleProfileUpdate as any);
    };
  }, []);

  const loadBlockedUsers = async () => {
    try {
      const response = await api.getBlockedUsers();
      if (response.success && response.data) {
        setBlockedUsers(response.data as BlockedUser[]);
      }
    } catch (error) {
      console.error('Erreur chargement bloqués:', error);
    }
  };

  const loadFriends = async () => {
    try {
      const response = await api.getFriends();
      if (response.success && response.data) {
        setFriends(response.data as Friend[]);
      }
    } catch (error) {
      console.error('Erreur chargement amis:', error);
    }
  };

  const loadRequests = async () => {
    try {
      const response = await api.getFriendRequests();
      if (response.success && response.data) {
        setRequests(response.data as { received: FriendRequest[]; sent: FriendRequest[] });
      }
    } catch (error) {
      console.error('Erreur chargement demandes:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddFriend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addFriendInput.trim() || addFriendLoading) return;
    if (currentUser?.username && addFriendInput.trim().toLowerCase() === currentUser.username.toLowerCase()) {
      notify.error(t.common.error, t.friends.selfRequestError);
      return;
    }
    setAddFriendLoading(true);
    try {
      const response = await api.sendFriendRequest(addFriendInput.trim());
      if (response.success) {
        setAddFriendInput('');
        loadRequests();
        notify.success(t.friends.requestSent, tx(t.friends.requestSentTo, { username: addFriendInput.trim() }));
      } else {
        notify.error(t.common.error, (response as any).error || t.friends.requestError);
      }
    } catch (error) {
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
    } catch (error) {
      notify.error(t.common.error, t.friends.acceptError);
    }
  };

  const handleDeclineRequest = async (requestId: string) => {
    try {
      const response = await api.declineFriendRequest(requestId);
      if (response.success) {
        loadRequests();
      }
    } catch (error) {
      console.error('Erreur refus:', error);
    }
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
    } catch (error) {
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
    } catch (error) {
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
    } catch (error) {
      notify.error(t.common.error, t.friends.unblockError);
    }
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
        {/* Center skeleton */}
        <div className="flex flex-1 flex-col">
          <div className="flex h-12 items-center gap-2.5 border-b border-[var(--border)]/40 px-4">
            <Skeleton className="h-4 w-4 rounded" />
            <Skeleton className="h-4 w-16" />
          </div>
          <div className="flex gap-2 px-4 pt-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-20 rounded-lg" />
            ))}
          </div>
          <div className="space-y-2 p-4">
            <Skeleton className="h-9 w-full rounded-xl" />
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 rounded-xl p-2">
                <Skeleton className="size-9 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-28" />
                  <Skeleton className="h-3 w-20" />
                </div>
                <Skeleton className="size-8 rounded-lg" />
              </div>
            ))}
          </div>
        </div>
        {/* Right sidebar skeleton */}
        <div className="hidden w-60 flex-col border-l border-[var(--border)]/40 md:flex">
          <div className="flex h-12 items-center gap-2 border-b border-[var(--border)]/40 px-4">
            <Skeleton className="size-2 rounded-full" />
            <Skeleton className="h-3.5 w-24" />
          </div>
          <div className="space-y-2 p-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-2.5 rounded-lg p-1.5">
                <Skeleton className="size-8 rounded-full" />
                <Skeleton className="h-3 w-20" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Main ──────────────────────────────────────────────────
  return (
    <div data-tour="friends-panel" className="flex h-full flex-1 flex-row">
      {/* ══════════════════════════════════════════════════════
          CENTER — Header + Tabs
         ══════════════════════════════════════════════════════ */}
      <div ref={tabsListRef} className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <div className="flex h-12 shrink-0 items-center gap-2.5 border-b border-[var(--border)]/40 bg-[var(--background)]/60 px-2 backdrop-blur-sm md:px-4">
          {isMobile && (
            <Button isIconOnly size="sm" variant="ghost" onPress={openSidebar} className="shrink-0">
              <MenuIcon size={20} />
            </Button>
          )}
          <div className="flex size-7 items-center justify-center rounded-lg bg-[var(--accent)]/10">
            <UsersIcon size={14} className="text-[var(--accent)]" />
          </div>
          <span className="text-sm font-bold">{t.friends.title}</span>
          {requests.received.length > 0 && (
            <Chip color="danger" size="sm" className="ml-auto">
              {requests.received.length}
            </Chip>
          )}
        </div>

        {/* Tabs */}
        <Tabs className="p-3">
          <Tabs.ListContainer>
            <Tabs.List className="shrink-0 ">
              <Tooltip delay={0}>
                <Tabs.Tab id="friends">
                  <div className="flex items-center gap-1.5">
                    <UsersIcon size={14} />
                    {!compactTabs && <span>{t.friends.tabFriends}</span>}
                    {!compactTabs && (
                      <Chip size="sm" variant="soft">
                        {friends.length}
                      </Chip>
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
                      <Chip color="danger" size="sm">
                        {requests.received.length}
                      </Chip>
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
                      <Chip size="sm" variant="soft">
                        {blockedUsers.length}
                      </Chip>
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

          {/* ── Friends Tab ─────────────────────────────── */}
          <Tabs.Panel id="friends" className="flex flex-1 flex-col gap-3 overflow-hidden p-3 md:p-4">
            {/* Search */}
            <InputGroup className="w-full rounded-xl" variant="secondary">
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
              <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
                <div className="relative overflow-hidden rounded-2xl border border-[var(--border)]/40 bg-[var(--surface-secondary)] px-8 py-8">
                  <div className="pointer-events-none absolute inset-0 bg-linear-to-br from-[var(--accent)]/10 via-transparent to-transparent" />
                  <div className="relative flex flex-col items-center gap-3">
                    <div className="flex size-14 items-center justify-center rounded-2xl bg-[var(--accent)]/10">
                      <UsersIcon size={26} className="text-[var(--accent)]" />
                    </div>
                    <div>
                      <p className="text-[14px] font-bold">
                      {searchQuery ? t.friends.noResults : t.friends.noFriends}
                      </p>
                      <p className="mt-0.5 text-[11px] text-[var(--muted)]">
                        {searchQuery ? t.friends.noResultsHint : t.friends.addFriendsHint}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <ScrollShadow className="flex-1">
                {/* Online */}
                {onlineFriends.length > 0 && (
                  <div className="mb-3">
                    <p className="mb-1.5 px-1 text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]/50">
                      {tx(t.friends.onlineCount, { n: String(onlineFriends.length) })}
                    </p>
                    <div className="space-y-0.5">
                      {onlineFriends.map((friend) => (
                        <FriendRow
                          key={friend.id}
                          friend={friend}
                          onMessage={() => onOpenDM?.(friend.id, friend.displayName)}
                          onRemove={() => handleRemoveFriend(friend.id)}
                          onBlock={() => handleBlockUser(friend.id, friend.displayName)}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {onlineFriends.length > 0 && offlineFriends.length > 0 && (
                  <div className="px-2 py-1">
                    <Separator />
                  </div>
                )}

                {/* Offline */}
                {offlineFriends.length > 0 && (
                  <div className="mt-2">
                    <p className="mb-1.5 px-1 text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]/50">
                      {tx(t.friends.offlineCount, { n: String(offlineFriends.length) })}
                    </p>
                    <div className="space-y-0.5">
                      {offlineFriends.map((friend) => (
                        <FriendRow
                          key={friend.id}
                          friend={friend}
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

          {/* ── Requests Tab ──────────────────────────────── */}
          <Tabs.Panel id="requests" className="flex flex-1 flex-col overflow-hidden p-3 md:p-4">
            {requests.received.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center">
                <div className="relative w-full max-w-xs overflow-hidden rounded-2xl border border-[var(--border)]/40 bg-[var(--surface-secondary)] px-8 py-8 text-center">
                  <div className="pointer-events-none absolute inset-0 bg-linear-to-br from-yellow-500/8 via-transparent to-transparent" />
                  <div className="relative flex flex-col items-center gap-3">
                    <div className="flex size-14 items-center justify-center rounded-2xl bg-yellow-500/10">
                      <ClockIcon size={26} className="text-yellow-400" />
                    </div>
                    <div>
                      <p className="text-[14px] font-bold">{t.friends.noRequests}</p>
                      <p className="mt-0.5 text-[11px] text-[var(--muted)]">{t.friends.upToDate}</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <ScrollShadow className="flex-1">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]/50">
                  {tx(t.friends.receivedCount, { n: String(requests.received.length) })}
                </p>
                <div className="space-y-2">
                  {requests.received.map((req) => (
                    <div
                      key={req.id}
                      className="flex items-center gap-3 rounded-xl border border-[var(--border)]/30 bg-[var(--surface-secondary)]/50 px-3 py-2.5 transition-colors hover:bg-[var(--surface-secondary)]/80"
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
                          <p className="mt-0.5 truncate text-[11px] italic text-[var(--muted)]/70">
                            &ldquo;{req.message}&rdquo;
                          </p>
                        )}
                      </div>

                      <div className="flex gap-1.5">
                        <Tooltip delay={0}>
                          <Button
                            isIconOnly
                            size="sm"
                            onPress={() => handleAcceptRequest(req.id)}
                            className="rounded-lg bg-green-600 text-white hover:bg-green-700"
                          >
                            <CheckIcon size={15} />
                          </Button>
                          <Tooltip.Content>{t.friends.accept}</Tooltip.Content>
                        </Tooltip>
                        <Tooltip delay={0}>
                          <Button
                            isIconOnly
                            size="sm"
                            variant="danger"
                            onPress={() => handleDeclineRequest(req.id)}
                            className="rounded-lg"
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

          {/* ── Blocked Tab ─────────────────────────────── */}
          <Tabs.Panel id="blocked" className="flex flex-1 flex-col overflow-hidden p-3 md:p-4">
            {blockedUsers.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center">
                <div className="w-full max-w-xs overflow-hidden rounded-2xl border border-[var(--border)]/40 bg-[var(--surface-secondary)] px-8 py-8 text-center">
                  <div className="pointer-events-none absolute inset-0 bg-linear-to-br from-red-500/8 via-transparent to-transparent" />
                  <div className="relative flex flex-col items-center gap-3">
                    <div className="flex size-14 items-center justify-center rounded-2xl bg-red-500/10">
                      <ShieldOffIcon size={26} className="text-red-400" />
                    </div>
                    <div>
                      <p className="text-[14px] font-bold">{t.friends.noBlocked}</p>
                      <p className="mt-0.5 text-[11px] text-[var(--muted)]">{t.friends.blockedListEmpty}</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <ScrollShadow className="flex-1">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]/50">
                  {tx(t.friends.blockedCount, { n: String(blockedUsers.length) })}
                </p>
                <div className="space-y-2">
                  {blockedUsers.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center gap-3 rounded-xl border border-[var(--border)]/30 bg-[var(--surface-secondary)]/50 px-3 py-2.5 transition-colors hover:bg-[var(--surface-secondary)]/80"
                    >
                      <div className="relative shrink-0">
                        <Avatar className="size-10 opacity-60 grayscale">
                          <Avatar.Image src={resolveMediaUrl(user.avatarUrl)} />
                          <Avatar.Fallback className="text-xs">{user.username.charAt(0).toUpperCase()}</Avatar.Fallback>
                        </Avatar>
                        <span className="absolute -bottom-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-red-500 ring-2 ring-[var(--background)]">
                          <BanIcon size={9} className="text-white" />
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-semibold text-[var(--muted)]">{user.displayName}</p>
                        <p className="truncate text-[11px] text-[var(--muted)]/60">@{user.username}</p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="shrink-0 gap-1.5 rounded-lg text-[11px]"
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

          {/* ── Add Friend Tab ───────────────────────────── */}
          <Tabs.Panel id="add" className="flex flex-1 flex-col overflow-y-auto p-3 md:p-4">
            <div className="mx-auto w-full max-w-md space-y-4">
              {/* Hero banner */}
              <div className="relative overflow-hidden rounded-2xl border border-[var(--accent)]/20 bg-[var(--surface-secondary)] px-6 py-7 text-center">
                {/* Gradient overlay */}
                <div className="pointer-events-none absolute inset-0 bg-linear-to-br from-[var(--accent)]/15 via-transparent to-violet-500/10" />
                {/* Glow blob */}
                <div className="pointer-events-none absolute left-1/2 top-0 h-24 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--accent)]/20 blur-3xl" />

                <div className="relative flex flex-col items-center gap-3">
                  {/* Avatar stack */}
                  <div className="flex items-center -space-x-2.5">
                    {[
                      { l: 'A', bg: '#6366f1' },
                      { l: 'B', bg: '#8b5cf6' },
                      { l: 'C', bg: '#a78bfa' },
                    ].map(({ l, bg }, i) => (
                      <div
                        key={l}
                        className="flex size-9 items-center justify-center rounded-full border-2 border-[var(--background)] text-[12px] font-bold text-white shadow-md"
                        style={{ backgroundColor: bg, zIndex: 4 - i }}
                      >
                        {l}
                      </div>
                    ))}
                    <div
                      className="flex size-9 items-center justify-center rounded-full border-2 border-[var(--background)] bg-[var(--accent)] shadow-md"
                      style={{ zIndex: 1 }}
                    >
                      <UserPlusIcon size={15} className="text-white" />
                    </div>
                  </div>

                  <div>
                    <h3 className="text-[15px] font-bold">{t.friends.findFriends}</h3>
                    <p className="mt-0.5 text-[11px] text-[var(--muted)]">
                      {t.friends.findFriendsSubtitle}
                    </p>
                  </div>
                </div>
              </div>

              {/* Form */}
              <form onSubmit={handleAddFriend} className="space-y-2.5">
                <div className="relative">

                  <InputGroup className="w-full rounded-xl" variant="secondary">
                    <InputGroup.Prefix className="pl-3 pr-0">
                      <SearchIcon size={15} className="text-[var(--muted)]/50" />
                    </InputGroup.Prefix>
                    <InputGroup.Input
                      id="add-friend"
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
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  className="w-full gap-2 rounded-xl font-semibold"
                  isDisabled={addFriendLoading || !addFriendInput.trim()}
                >
                  {addFriendLoading ? (
                    <>
                      <ClockIcon size={15} className="animate-spin" />
                      {t.friends.sendingRequest}
                    </>
                  ) : (
                    <>
                      <UserPlusIcon size={15} />
                      {t.friends.sendRequest}
                    </>
                  )}
                </Button>
              </form>

              {/* Sent requests */}
              {requests.sent.length > 0 && (
                <div>
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]/60">
                    {tx(t.friends.sentCount, { n: String(requests.sent.length) })}
                  </p>
                  <div className="space-y-1.5">
                    {requests.sent.map((req) => (
                      <div
                        key={req.id}
                        className="flex items-center gap-3 rounded-xl bg-[var(--surface-secondary)]/50 px-3 py-2"
                      >
                        <Avatar className="size-8">
                          <Avatar.Image src={resolveMediaUrl(req.avatarUrl)} />
                          <Avatar.Fallback className="text-xs">
                            {req.username.charAt(0).toUpperCase()}
                          </Avatar.Fallback>
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

      {/* ══════════════════════════════════════════════════════
          RIGHT — Online friends sidebar
         ══════════════════════════════════════════════════════ */}
      <div className="hidden w-52 flex-col border-l border-[var(--border)]/30 bg-[var(--background)]/80 backdrop-blur-xl md:flex">
        {/* Sidebar header */}
        <div className="flex h-12 shrink-0 items-center gap-2 border-b border-[var(--border)]/30 px-3">
          <span className="size-1.5 rounded-full bg-green-500" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]/50">
            {t.friends.onlineSidebar}
          </span>
          <Chip size="sm" variant="soft" className="ml-auto  ">
            {onlineFriends.length}
          </Chip>
        </div>

        {/* Online friends list */}
        <ScrollShadow className="flex-1 p-1.5">
          {onlineFriends.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 pt-10 text-center">
              <div className="flex size-10 items-center justify-center rounded-2xl bg-[var(--surface-secondary)]/40">
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
                  <UserProfilePopover
                    key={friend.id}
                    userId={friend.id}
                    onOpenDM={() => onOpenDM?.(friend.id, friend.displayName)}
                  >
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors duration-150 hover:bg-[var(--surface-secondary)]/30"
                    >
                      <div className="relative shrink-0">
                        <Avatar className="size-7">
                          <Avatar.Image src={resolveMediaUrl(friend.avatarUrl)} />
                          <Avatar.Fallback className="text-[10px]">
                            {friend.username.charAt(0).toUpperCase()}
                          </Avatar.Fallback>
                        </Avatar>
                        <span
                          className={cn(
                            'absolute -bottom-0.5 -right-0.5 size-2 rounded-full ring-[1.5px] ring-[var(--background)]',
                            st.color,
                          )}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[11px] font-medium leading-tight">
                          {friend.displayName}
                        </p>
                        <p className="truncate text-[9px] text-[var(--muted)]/50">
                          {friend.customStatus || statusLabel}
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
}: {
  friend: Friend;
  onMessage: () => void;
  onRemove: () => void;
  onBlock: () => void;
}) {
  const { t } = useTranslation();
  const status = statusConfig[friend.status] ?? statusConfig.offline;
  const statusLabel = (t.status as Record<string, string>)[friend.status] ?? t.status.offline;

  return (
    <div className="group flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors duration-150 hover:bg-[var(--surface-secondary)]/30">
      <UserProfilePopover userId={friend.id} onOpenDM={() => onMessage()}>
        <button type="button" className="relative shrink-0">
          <Avatar className="size-9">
            <Avatar.Image src={resolveMediaUrl(friend.avatarUrl)} />
            <Avatar.Fallback className="text-xs">
              {friend.username.charAt(0).toUpperCase()}
            </Avatar.Fallback>
          </Avatar>
          <span
            className={cn(
              'absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full ring-[1.5px] ring-[var(--background)]',
              status.color,
            )}
          />
        </button>
      </UserProfilePopover>

      <div className="min-w-0 flex-1">
        <p className="truncate text-[12px] font-semibold leading-tight">{friend.displayName}</p>
        <p className="truncate text-[10px] text-[var(--muted)]/60">
          {friend.customStatus || statusLabel}
        </p>
      </div>

      <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
        <Tooltip delay={0}>
          <Button isIconOnly size="sm" variant="ghost" onPress={onMessage} className="rounded-lg">
            <MessageCircleIcon size={15} />
          </Button>
          <Tooltip.Content placement="top">{t.friends.message}</Tooltip.Content>
        </Tooltip>

        <Dropdown>
          <Dropdown.Trigger>
            <div
              role="button"
              tabIndex={0}
              aria-label={t.friends.moreActions}
              className="inline-flex size-7 cursor-pointer items-center justify-center rounded-md text-[var(--muted)] transition-colors hover:bg-[var(--surface-secondary)]/40"
            >
              <MoreVerticalIcon size={14} />
            </div>
          </Dropdown.Trigger>
          <Dropdown.Popover placement="bottom end">
            <Dropdown.Menu aria-label={t.friends.moreActions}>
              <Dropdown.Item id="message" onPress={onMessage} className="gap-2">
                <MessageCircleIcon size={15} />
                {t.friends.sendMessage}
              </Dropdown.Item>
              <Dropdown.Item id="remove" onPress={onRemove} className="gap-2 text-red-500">
                <UserMinusIcon size={15} />
                {t.friends.removeFriend}
              </Dropdown.Item>
              <Dropdown.Item id="block" onPress={onBlock} className="gap-2 text-red-500">
                <BanIcon size={15} />
                {t.friends.block}
              </Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown.Popover>
        </Dropdown>
      </div>
    </div>
  );
}
