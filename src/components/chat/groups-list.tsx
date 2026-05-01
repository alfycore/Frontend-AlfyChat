'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { UsersRoundIcon, PlusIcon } from '@/components/icons';
import { api, resolveMediaUrl } from '@/lib/api';
import { socketService } from '@/lib/socket';
import { useAuth } from '@/hooks/use-auth';
import { useNotificationStore, clearUnread } from '@/lib/notification-store';
import { groupsStore } from '@/lib/groups-store';
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
} from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Spinner } from '@/components/ui/spinner';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import { UserPanel } from '@/components/chat/user-panel';
import { CallBar } from '@/components/chat/call-bar';
import { GroupCreateDialog } from '@/components/chat/group-create-dialog';
import { useUIStyle } from '@/hooks/use-ui-style';
import { cn } from '@/lib/utils';

interface Group {
  id: string;
  name: string;
  avatarUrl?: string;
  lastMessage?: string;
  lastMessageAt?: string;
  participantCount: number;
}

interface GroupsListProps {
  selectedGroupId: string | null;
  onSelectGroup: (id: string) => void;
}

export function GroupsList({ selectedGroupId, onSelectGroup }: GroupsListProps) {
  const { user } = useAuth();
  const ui = useUIStyle();
  const notifStore = useNotificationStore();

  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const loadGroups = useCallback(async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('alfychat_token') : null;
    if (!token) return;
    try {
      const response = await api.getConversations();
      if (!response.success || !response.data) return;
      const raw = response.data as any[];
      const groupConvs: Group[] = raw
        .filter((conv) => conv.type === 'group')
        .map((conv) => ({
          id: conv.id,
          name: conv.name || 'Groupe',
          avatarUrl: conv.avatarUrl,
          lastMessage: conv.lastMessage,
          lastMessageAt: conv.lastMessageAt || conv.updatedAt,
          participantCount: conv.participants?.length ?? conv.participantCount ?? 0,
        }))
        .sort((a, b) => {
          const aTime = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
          const bTime = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
          return bTime - aTime;
        });
      groupsStore.set(groupConvs);
      setGroups(groupConvs);
    } catch (e) {
      console.error('Erreur chargement groupes:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadGroupsRef = useRef(loadGroups);
  useEffect(() => {
    loadGroupsRef.current = loadGroups;
  }, [loadGroups]);

  useEffect(() => {
    if (groupsStore.isLoaded()) {
      setGroups(groupsStore.get() as Group[]);
      setLoading(false);
    } else {
      loadGroups();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Clear unread when a group is selected
  useEffect(() => {
    if (selectedGroupId) {
      clearUnread(`group:${selectedGroupId}`);
    }
  }, [selectedGroupId]);

  // Reload on user login
  useEffect(() => {
    if (user?.id) loadGroups();
  }, [user?.id, loadGroups]);

  // Socket events
  useEffect(() => {
    const handleRefresh = () => loadGroupsRef.current();

    const handleMessageNew = (message: any) => {
      const convId = message.conversationId;
      const content = message.content || '';
      const createdAt = message.createdAt || new Date().toISOString();
      setGroups((prev) => {
        const idx = prev.findIndex((g) => g.id === convId);
        if (idx === -1) {
          loadGroupsRef.current();
          return prev;
        }
        const updated = [...prev];
        updated[idx] = { ...updated[idx], lastMessage: content, lastMessageAt: createdAt };
        const [moved] = updated.splice(idx, 1);
        groupsStore.updateLastMessage(convId, content, createdAt);
        return [moved, ...updated];
      });
    };

    socketService.on('message:new', handleMessageNew);
    socketService.onGroupCreate(handleRefresh);
    socketService.onGroupLeave(handleRefresh);
    socketService.onGroupDelete(handleRefresh);
    socketService.onGroupMemberAdd(handleRefresh);
    socketService.onGroupMemberRemove(handleRefresh);
    socketService.on('socket:reconnected', handleRefresh);

    return () => {
      socketService.off('message:new', handleMessageNew);
      socketService.off('GROUP_CREATE', handleRefresh);
      socketService.off('GROUP_LEAVE', handleRefresh);
      socketService.off('GROUP_DELETE', handleRefresh);
      socketService.off('GROUP_MEMBER_ADD', handleRefresh);
      socketService.off('GROUP_MEMBER_REMOVE', handleRefresh);
      socketService.off('socket:reconnected', handleRefresh);
    };
  }, []);

  return (
    <div className={cn('flex h-full w-full flex-col overflow-hidden', ui.sidebarBg)}>
      {/* ── Header ── */}
      <div className={cn('flex h-13 shrink-0 items-center justify-between px-3', ui.header)}>
        <span className="font-heading text-[13px] tracking-tight text-foreground">Groupes</span>
        <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              className="size-7 rounded-xl text-muted-foreground hover:text-foreground"
              onClick={() => setShowCreate(true)}
            >
              <PlusIcon size={15} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Nouveau groupe</TooltipContent>
        </Tooltip>
        </TooltipProvider>
      </div>

      {/* ── List ── */}
      <ScrollArea className="flex-1">
        <div className="space-y-0.5 p-2">
          {loading ? (
            <div className="flex justify-center py-8">
              <Spinner className="size-4" />
            </div>
          ) : groups.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-foreground/5 ring-1 ring-border/30">
                <UsersRoundIcon size={20} className="text-muted-foreground" />
              </div>
              <div>
                <p className="text-[13px] font-medium text-foreground">Aucun groupe</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">Créez votre premier groupe</p>
              </div>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setShowCreate(true)}
                className="gap-1.5"
              >
                <PlusIcon size={13} />
                Créer un groupe
              </Button>
            </div>
          ) : (
            groups.map((group) => {
              const isActive = selectedGroupId === group.id;
              const unread = notifStore.unread.get(`group:${group.id}`) ?? 0;

              return (
                <button
                  key={group.id}
                  onClick={() => onSelectGroup(group.id)}
                  className={cn(
                    'group/grp flex w-full items-center gap-2.5 rounded-xl px-2 py-2 text-[13px] font-medium transition-all duration-150',
                    isActive
                      ? 'bg-foreground/8 text-foreground'
                      : 'text-muted-foreground hover:bg-foreground/6 hover:text-foreground',
                  )}
                >
                  {/* Avatar */}
                  {group.avatarUrl ? (
                    <Avatar className={cn('size-9 shrink-0 rounded-xl ring-2 transition-all', isActive ? 'ring-primary/40' : 'ring-transparent group-hover/grp:ring-border/40')}>
                      <AvatarImage src={resolveMediaUrl(group.avatarUrl)} alt={group.name} />
                      <AvatarFallback className="rounded-xl bg-muted text-[11px] font-bold text-muted-foreground">
                        {group.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  ) : (
                    <div
                      className={cn(
                        'flex size-9 shrink-0 items-center justify-center rounded-xl transition-all',
                        isActive
                          ? 'bg-foreground/8 text-foreground'
                          : 'bg-foreground/5 text-muted-foreground group-hover/grp:bg-foreground/8 group-hover/grp:text-foreground',
                      )}
                    >
                      <UsersRoundIcon size={15} />
                    </div>
                  )}

                  {/* Name + member count */}
                  <div className="min-w-0 flex-1 text-left">
                    <p className="truncate text-[13px] font-medium leading-tight">{group.name}</p>
                    <p className="text-[10px] leading-tight text-muted-foreground/50">
                      {group.participantCount} membre{group.participantCount !== 1 ? 's' : ''}
                    </p>
                  </div>

                  {/* Unread badge */}
                  {unread > 0 && (
                    <span className="ml-auto flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-destructive/90 px-1 text-[9px] font-semibold text-white">
                      {unread > 99 ? '99+' : unread}
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
      </ScrollArea>

      {/* ── Footer ── */}
      <div className="shrink-0">
        <CallBar />
        {user && <UserPanel user={user} />}
      </div>

      {/* ── Create dialog ── */}
      <GroupCreateDialog
        open={showCreate}
        onOpenChange={setShowCreate}
        onCreated={(id) => {
          setShowCreate(false);
          if (id) onSelectGroup(id);
          loadGroups();
        }}
      />
    </div>
  );
}
