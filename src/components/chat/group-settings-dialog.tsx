'use client';

import { useState, useEffect } from 'react';
import {
  UsersRoundIcon,
  CrownIcon,
  UserMinusIcon,
  UserPlusIcon,
  SearchIcon,
  CheckIcon,
  XIcon,
  PencilIcon,
  Trash2Icon,
  LogOutIcon,
  SettingsIcon,
} from '@/components/icons';
import { api, resolveMediaUrl } from '@/lib/api';
import { socketService } from '@/lib/socket';
import { useAuth } from '@/hooks/use-auth';
import { cn } from '@/lib/utils';
import { useUIStyle } from '@/hooks/use-ui-style';
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
} from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useTranslation } from '@/components/locale-provider';

interface Participant {
  userId: string;
  role: 'owner' | 'admin' | 'member';
  username?: string;
  displayName?: string;
  avatarUrl?: string;
  isOnline?: boolean;
}

interface GroupInfo {
  id: string;
  name: string;
  avatarUrl?: string;
  ownerId?: string;
  participants: Participant[];
  participantIds: string[];
}

interface Friend {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
}

interface GroupSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  group: GroupInfo | null;
  isOwner: boolean;
  myRole?: string;
  initialSection?: 'general' | 'members';
  onUpdate?: () => void;
  onLeave?: () => void;
}

export function GroupSettingsDialog({
  open,
  onOpenChange,
  group,
  isOwner,
  myRole,
  initialSection,
  onUpdate,
  onLeave,
}: GroupSettingsDialogProps) {
  const { user } = useAuth();
  const ui = useUIStyle();
  const { t } = useTranslation();
  const [section, setSection] = useState<'general' | 'members'>('general');
  const [groupName, setGroupName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showAddMembers, setShowAddMembers] = useState(false);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendSearch, setFriendSearch] = useState('');
  const [selectedFriendIds, setSelectedFriendIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (open && group) {
      setGroupName(group.name);
      setSection(initialSection || 'general');
      setFriendSearch('');
      setSelectedFriendIds(new Set());
      if (initialSection === 'members') {
        setShowAddMembers(true);
        // loadFriends will be called by the showAddMembers button handler; trigger here too
        api.getFriends().then((response) => {
          if (response.success && response.data) {
            setFriends(
              (response.data as Friend[]).filter(
                (f) => !group?.participantIds.includes(f.id),
              ),
            );
          }
        }).catch(() => {});
      } else {
        setShowAddMembers(false);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, group?.id, initialSection]);

  useEffect(() => {
    if (!open || !group) return;
    const handleGroupChange = (data: any) => {
      const payload = data?.payload || data;
      if (payload?.groupId === group.id || payload?.id === group.id) {
        onUpdate?.();
      }
    };
    const handleGroupDelete = (data: any) => {
      const payload = data?.payload || data;
      if (payload?.groupId === group.id || payload?.id === group.id) {
        onOpenChange(false);
        onLeave?.();
      }
    };
    socketService.on('GROUP_UPDATE', handleGroupChange);
    socketService.on('GROUP_DELETE', handleGroupDelete);
    socketService.on('GROUP_MEMBER_ADD', handleGroupChange);
    socketService.on('GROUP_MEMBER_REMOVE', handleGroupChange);
    return () => {
      socketService.off('GROUP_UPDATE', handleGroupChange);
      socketService.off('GROUP_DELETE', handleGroupDelete);
      socketService.off('GROUP_MEMBER_ADD', handleGroupChange);
      socketService.off('GROUP_MEMBER_REMOVE', handleGroupChange);
    };
  }, [open, group, onUpdate, onLeave, onOpenChange]);

  const loadFriends = async () => {
    try {
      const response = await api.getFriends();
      if (response.success && response.data) {
        const friendsList = (response.data as Friend[]).filter(
          (f) => !group?.participantIds.includes(f.id),
        );
        setFriends(friendsList);
      }
    } catch (error) {
      console.error('Erreur chargement amis:', error);
    }
  };

  const handleSaveName = async () => {
    if (!group || !groupName.trim()) return;
    setIsSaving(true);
    try {
      await api.updateConversation(group.id, { name: groupName.trim() });
      onUpdate?.();
    } catch (error) {
      console.error('Erreur mise à jour nom:', error);
    }
    setIsSaving(false);
  };

  const handleAddMembers = async () => {
    if (!group || selectedFriendIds.size === 0) return;
    setShowAddMembers(false);
    const ids = Array.from(selectedFriendIds);
    setSelectedFriendIds(new Set());
    await Promise.all(ids.map((userId) => api.addGroupParticipant(group.id, userId)));
    onUpdate?.();
  };

  const handleRemoveMember = async (userId: string) => {
    if (!group) return;
    await api.removeGroupParticipant(group.id, userId);
    onUpdate?.();
  };

  const handleDeleteGroup = () => {
    if (!group) return;
    socketService.deleteGroup(group.id);
    onOpenChange(false);
    onLeave?.();
  };

  const filteredFriends = friends.filter(
    (f) =>
      f.displayName.toLowerCase().includes(friendSearch.toLowerCase()) ||
      f.username.toLowerCase().includes(friendSearch.toLowerCase()),
  );

  const canManageMembers = isOwner || myRole === 'admin';

  const SECTIONS = [
    { id: 'general' as const, label: t.group.general, icon: SettingsIcon },
    { id: 'members' as const, label: t.group.membersTab.replace('{n}', String(group?.participants.length || 0)), icon: UsersRoundIcon },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className={cn('h-[70vh] w-full max-w-3xl sm:max-w-3xl overflow-hidden rounded-2xl border border-border/50 p-0 shadow-2xl shadow-black/30', ui.glassModal)}>
          <DialogHeader className="sr-only">
            <DialogTitle>{t.group.settings}</DialogTitle>
          </DialogHeader>
          <div className="flex h-full">
          {/* ── Sidebar ── */}
          <aside className="flex w-48 shrink-0 flex-col border-r border-border/40 bg-background/80 py-6">
            <div className="mb-4 px-4">
              <p className="text-[11px] font-medium text-muted-foreground/50">{t.group.sectionLabel}</p>
              <p className="mt-1 truncate font-heading text-sm tracking-tight text-foreground">{group?.name || t.group.defaultName}</p>
            </div>

            <nav className="flex flex-col gap-0.5 px-2">
              {SECTIONS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setSection(id)}
                  className={cn(
                    'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
                    section === id
                      ? 'bg-primary/10 text-primary shadow-sm'
                      : 'text-muted-foreground hover:bg-surface-secondary/80 hover:text-foreground',
                  )}
                >
                  <div
                    className={cn(
                      'flex size-7 items-center justify-center rounded-lg transition-colors',
                      section === id
                        ? 'bg-primary/15 text-primary'
                        : 'bg-surface-secondary/60 text-muted-foreground group-hover:bg-surface-secondary group-hover:text-foreground',
                    )}
                  >
                    <Icon size={14} />
                  </div>
                  {label}
                </button>
              ))}
            </nav>

            <div className="mt-auto px-2">
              <div className="mx-2 mb-3 h-px bg-border/40" />
              <button
                onClick={() => onOpenChange(false)}
                className="group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-all duration-200 hover:bg-surface-secondary/80 hover:text-foreground"
              >
                <div className="flex size-7 items-center justify-center rounded-lg bg-surface-secondary/60">
                  <XIcon size={14} />
                </div>
                {t.group.close}
              </button>
            </div>
          </aside>

          {/* ── Content ── */}
          <div className="flex flex-1 flex-col overflow-hidden bg-surface/50">
            <div className="flex-1 overflow-y-auto p-6">
              {/* ── Général ── */}
              {section === 'general' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="font-heading text-xl tracking-tight text-foreground">{t.group.generalSettings}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">{t.group.generalSettingsDesc}</p>
                  </div>

                  <div className="space-y-3 rounded-2xl border border-border/60 bg-surface-secondary/30 p-5">
                    <span className="text-[11px] font-medium text-muted-foreground/50">
                      {t.group.groupName}
                    </span>
                    <div className="flex gap-2">
                      <Input
                          value={groupName}
                          onChange={(e) => setGroupName(e.target.value)}
                          placeholder={t.group.groupName}
                          className="flex-1"
                        />
                      <Button
                        onClick={handleSaveName}
                        disabled={isSaving || groupName === group?.name}
                        size="sm"
                        className="gap-1.5 rounded-xl"
                      >
                        <PencilIcon size={14} />
                        {t.group.save}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-5">
                    <p className="text-[11px] font-medium text-destructive/70">{t.group.dangerZone}</p>
                    <div className="space-y-2">
                      <Button
                        variant="outline"
                        className="w-full justify-start rounded-xl text-destructive"
                        onClick={() => {
                          onOpenChange(false);
                          onLeave?.();
                        }}
                      >
                        <LogOutIcon size={16} className="mr-2" />
                        {t.group.leave}
                      </Button>
                      {isOwner && (
                        <Button
                          variant="destructive"
                          className="w-full justify-start rounded-xl"
                          onClick={handleDeleteGroup}
                        >
                          <Trash2Icon size={16} className="mr-2" />
                          {t.group.deleteGroup}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ── Membres ── */}
              {section === 'members' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="font-heading text-xl tracking-tight text-foreground">{t.group.sectionLabel}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {t.group.manageMembers.replace('{n}', String(group?.participants.length || 0))}
                    </p>
                  </div>

                  {canManageMembers && !showAddMembers && (
                    <Button
                      variant="outline"
                      className="w-full justify-start gap-2 rounded-xl"
                      onClick={() => {
                        setShowAddMembers(true);
                        loadFriends();
                      }}
                    >
                      <UserPlusIcon size={16} />
                      {t.group.addMembers}
                    </Button>
                  )}

                  {showAddMembers && (
                    <div className="space-y-3 rounded-2xl border border-border/60 bg-surface-secondary/30 p-5">
                      <div className="flex items-center justify-between">
                        <p className="text-[11px] font-medium text-muted-foreground/50">
                          {t.group.addFriends}
                        </p>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => {
                            setShowAddMembers(false);
                            setSelectedFriendIds(new Set());
                          }}
                        >
                          <XIcon size={16} />
                        </Button>
                      </div>

                      <div className="relative">
                        <SearchIcon size={16} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/60" />
                        <Input
                          placeholder={t.group.search}
                          value={friendSearch}
                          onChange={(e) => setFriendSearch(e.target.value)}
                          className="pl-8"
                        />
                      </div>

                      <div className="max-h-40 overflow-y-auto">
                        <div className="space-y-0.5">
                          {filteredFriends.length === 0 ? (
                            <p className="py-4 text-center text-xs text-muted-foreground">
                              {friends.length === 0 ? t.group.allFriendsAdded : t.group.noResults}
                            </p>
                          ) : (
                            filteredFriends.map((friend) => {
                              const isSelected = selectedFriendIds.has(friend.id);
                              return (
                                <button
                                  key={friend.id}
                                  type="button"
                                  onClick={() => {
                                    setSelectedFriendIds((prev) => {
                                      const next = new Set(prev);
                                      if (next.has(friend.id)) next.delete(friend.id);
                                      else next.add(friend.id);
                                      return next;
                                    });
                                  }}
                                  className={cn(
                                    'flex w-full items-center gap-2.5 rounded-xl p-2 transition-colors',
                                    isSelected ? 'bg-primary/5' : 'hover:bg-muted/80',
                                  )}
                                >
                                  <Avatar className="size-7 rounded-lg">
                                    <AvatarImage src={friend.avatarUrl ? resolveMediaUrl(friend.avatarUrl) : undefined} className="rounded-lg" />
                                    <AvatarFallback className="rounded-lg bg-muted text-[11px] font-semibold text-muted-foreground">{friend.displayName[0]}</AvatarFallback>
                                  </Avatar>
                                  <span className="flex-1 text-left text-sm">{friend.displayName}</span>
                                  <div
                                    className={cn(
                                      'flex size-4 items-center justify-center rounded border',
                                      isSelected
                                        ? 'border-primary bg-primary text-primary-foreground'
                                        : 'border-muted-foreground/25',
                                    )}
                                  >
                                    {isSelected && <CheckIcon size={12} />}
                                  </div>
                                </button>
                              );
                            })
                          )}
                        </div>
                      </div>

                      {selectedFriendIds.size > 0 && (
                        <Button className="w-full rounded-xl" size="sm" onClick={handleAddMembers}>
                          <UserPlusIcon size={14} className="mr-1" />
                          {t.group.addCount.replace('{n}', String(selectedFriendIds.size))}
                        </Button>
                      )}
                    </div>
                  )}

                  <div className="rounded-2xl border border-border/60 bg-surface-secondary/30">
                    <div className="border-b border-border/60 px-5 py-4">
                      <h3 className="font-heading text-base tracking-tight">{t.group.groupMembersTitle}</h3>
                    </div>
                    <ScrollArea className="max-h-64 overflow-hidden">
                      <div className="divide-y divide-border/60">
                        {group?.participants
                          .sort((a, b) => {
                            const order = { owner: 0, admin: 1, member: 2 };
                            return (order[a.role] || 2) - (order[b.role] || 2);
                          })
                          .map((participant) => (
                            <div
                              key={participant.userId}
                              className="flex items-center gap-2.5 px-5 py-3 transition-colors hover:bg-muted/40"
                            >
                              <Avatar size="sm" className="rounded-lg">
                                <AvatarImage src={participant.avatarUrl ? resolveMediaUrl(participant.avatarUrl) : undefined} className="rounded-lg" />
                                <AvatarFallback className="rounded-lg bg-muted text-[11px] font-semibold text-muted-foreground">{(participant.displayName || participant.username)?.[0] || '?'}</AvatarFallback>
                              </Avatar>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1">
                                  <p className="truncate text-sm font-medium">
                                    {participant.displayName || participant.username}
                                  </p>
                                  {participant.role === 'owner' && (
                                    <CrownIcon size={12} className="shrink-0 text-amber-500" />
                                  )}
                                  {participant.userId === user?.id && (
                                    <Badge variant="secondary" className="ml-1 h-4 text-[9px] px-1">{t.group.you}</Badge>
                                  )}
                                </div>
                                <p className="truncate text-xs text-muted-foreground">@{participant.username}</p>
                              </div>

                              {canManageMembers &&
                                participant.userId !== user?.id &&
                                participant.role !== 'owner' && (
                                  <Button
                                    variant="ghost"
                                    size="icon-sm"
                                    className="shrink-0 text-destructive"
                                    onClick={() => handleRemoveMember(participant.userId)}
                                  >
                                    <UserMinusIcon size={16} />
                                  </Button>
                                )}
                            </div>
                          ))}
                      </div>
                    </ScrollArea>
                  </div>
                </div>
              )}
            </div>
          </div>
          </div>
      </DialogContent>
    </Dialog>
  );
}
