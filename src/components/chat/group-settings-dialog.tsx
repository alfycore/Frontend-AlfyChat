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
import {
  Avatar,
  Button,
  Chip,
  InputGroup,
  Modal,
  ScrollShadow,
} from '@heroui/react';

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
      socketService.updateGroup({ groupId: group.id, name: groupName.trim() });
      onUpdate?.();
    } catch (error) {
      console.error('Erreur mise à jour nom:', error);
    }
    setIsSaving(false);
  };

  const handleAddMembers = () => {
    if (!group || selectedFriendIds.size === 0) return;
    socketService.updateGroup({ groupId: group.id, addParticipants: Array.from(selectedFriendIds) });
    setShowAddMembers(false);
    setSelectedFriendIds(new Set());
    onUpdate?.();
  };

  const handleRemoveMember = (userId: string) => {
    if (!group) return;
    socketService.updateGroup({ groupId: group.id, removeParticipants: [userId] });
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
    { id: 'general' as const, label: 'Général', icon: SettingsIcon },
    { id: 'members' as const, label: `Membres (${group?.participants.length || 0})`, icon: UsersRoundIcon },
  ];

  return (
    <Modal isOpen={open} onOpenChange={onOpenChange}>
      <Modal.Backdrop>
      <Modal.Container size="lg">
        <Modal.Dialog className="h-[70vh] max-w-2xl overflow-hidden rounded-2xl border border-[var(--border)]/60 p-0 shadow-2xl">
          <div className="flex h-full">
          {/* ── Sidebar ── */}
          <aside className="flex w-48 shrink-0 flex-col border-r border-[var(--border)]/40 bg-[var(--background)]/80 py-6">
            <div className="mb-4 px-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]/70">Groupe</p>
              <p className="mt-0.5 truncate text-sm font-medium text-[var(--foreground)]">{group?.name || 'Groupe'}</p>
            </div>

            <nav className="flex flex-col gap-0.5 px-2">
              {SECTIONS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setSection(id)}
                  className={cn(
                    'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
                    section === id
                      ? 'bg-[var(--accent)]/10 text-[var(--accent)] shadow-sm'
                      : 'text-[var(--muted)] hover:bg-[var(--surface-secondary)]/80 hover:text-[var(--foreground)]',
                  )}
                >
                  <div
                    className={cn(
                      'flex size-7 items-center justify-center rounded-lg transition-colors',
                      section === id
                        ? 'bg-[var(--accent)]/15 text-[var(--accent)]'
                        : 'bg-[var(--surface-secondary)]/60 text-[var(--muted)] group-hover:bg-[var(--surface-secondary)] group-hover:text-[var(--foreground)]',
                    )}
                  >
                    <Icon size={14} />
                  </div>
                  {label}
                </button>
              ))}
            </nav>

            <div className="mt-auto px-2">
              <div className="mx-2 mb-3 h-px bg-[var(--border)]/40" />
              <button
                onClick={() => onOpenChange(false)}
                className="group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-[var(--muted)] transition-all duration-200 hover:bg-[var(--surface-secondary)]/80 hover:text-[var(--foreground)]"
              >
                <div className="flex size-7 items-center justify-center rounded-lg bg-[var(--surface-secondary)]/60">
                  <XIcon size={14} />
                </div>
                Fermer
              </button>
            </div>
          </aside>

          {/* ── Content ── */}
          <div className="flex flex-1 flex-col overflow-hidden bg-[var(--surface)]/50">
            <div className="flex-1 overflow-y-auto p-6">
              {/* ── Général ── */}
              {section === 'general' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-semibold text-[var(--foreground)]">Paramètres généraux</h2>
                    <p className="mt-1 text-sm text-[var(--muted)]">Gérez les paramètres de votre groupe.</p>
                  </div>

                  <div className="space-y-3 rounded-2xl border border-[var(--border)]/60 bg-[var(--surface-secondary)]/30 p-5">
                    <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]/70">
                      Nom du groupe
                    </span>
                    <div className="flex gap-2">
                      <InputGroup className="flex-1 rounded-xl border-[var(--border)]/60 bg-[var(--background)]/60">
                        <InputGroup.Input
                          value={groupName}
                          onChange={(e) => setGroupName(e.target.value)}
                          placeholder="Nom du groupe"
                        />
                      </InputGroup>
                      <Button
                        onPress={handleSaveName}
                        isDisabled={isSaving || groupName === group?.name}
                        size="sm"
                        className="gap-1.5 rounded-xl"
                      >
                        <PencilIcon size={14} />
                        Sauver
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-3 rounded-2xl border border-red-500/30 bg-red-500/5 p-5">
                    <p className="text-xs font-semibold uppercase tracking-wider text-red-500/70">Zone dangereuse</p>
                    <div className="space-y-2">
                      <Button
                        variant="outline"
                        className="w-full justify-start rounded-xl text-red-500"
                        onPress={() => {
                          onOpenChange(false);
                          onLeave?.();
                        }}
                      >
                        <LogOutIcon size={16} className="mr-2" />
                        Quitter le groupe
                      </Button>
                      {isOwner && (
                        <Button
                          variant="danger"
                          className="w-full justify-start rounded-xl"
                          onPress={handleDeleteGroup}
                        >
                          <Trash2Icon size={16} className="mr-2" />
                          Supprimer le groupe
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
                    <h2 className="text-xl font-semibold text-[var(--foreground)]">Membres</h2>
                    <p className="mt-1 text-sm text-[var(--muted)]">
                      Gérez les membres du groupe ({group?.participants.length || 0}).
                    </p>
                  </div>

                  {canManageMembers && !showAddMembers && (
                    <Button
                      variant="outline"
                      className="w-full justify-start gap-2 rounded-xl"
                      onPress={() => {
                        setShowAddMembers(true);
                        loadFriends();
                      }}
                    >
                      <UserPlusIcon size={16} />
                      Ajouter des membres
                    </Button>
                  )}

                  {showAddMembers && (
                    <div className="space-y-3 rounded-2xl border border-[var(--border)]/60 bg-[var(--surface-secondary)]/30 p-5">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]/70">
                          Ajouter des amis
                        </p>
                        <Button
                          variant="ghost"
                          isIconOnly
                          size="sm"
                          onPress={() => {
                            setShowAddMembers(false);
                            setSelectedFriendIds(new Set());
                          }}
                        >
                          <XIcon size={16} />
                        </Button>
                      </div>

                      <InputGroup className="rounded-xl border-[var(--border)]/60 bg-[var(--background)]/60">
                        <InputGroup.Prefix><SearchIcon size={16} className="text-[var(--muted)]/60" /></InputGroup.Prefix>
                        <InputGroup.Input
                          placeholder="Rechercher..."
                          value={friendSearch}
                          onChange={(e) => setFriendSearch(e.target.value)}
                        />
                      </InputGroup>

                      <ScrollShadow className="max-h-40 overflow-y-auto">
                        <div className="space-y-0.5">
                          {filteredFriends.length === 0 ? (
                            <p className="py-4 text-center text-xs text-[var(--muted)]">
                              {friends.length === 0 ? 'Tous vos amis sont déjà dans le groupe' : 'Aucun résultat'}
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
                                    isSelected ? 'bg-[var(--accent)]/5' : 'hover:bg-[var(--surface-secondary)]/80',
                                  )}
                                >
                                  <Avatar size="sm" className="size-7">
                                    <Avatar.Image src={friend.avatarUrl ? resolveMediaUrl(friend.avatarUrl) : undefined} />
                                    <Avatar.Fallback>{friend.displayName[0]}</Avatar.Fallback>
                                  </Avatar>
                                  <span className="flex-1 text-left text-sm">{friend.displayName}</span>
                                  <div
                                    className={cn(
                                      'flex size-4 items-center justify-center rounded border',
                                      isSelected
                                        ? 'border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-foreground)]'
                                        : 'border-[var(--muted)]/25',
                                    )}
                                  >
                                    {isSelected && <CheckIcon size={12} />}
                                  </div>
                                </button>
                              );
                            })
                          )}
                        </div>
                      </ScrollShadow>

                      {selectedFriendIds.size > 0 && (
                        <Button className="w-full rounded-xl" size="sm" onPress={handleAddMembers}>
                          <UserPlusIcon size={14} className="mr-1" />
                          Ajouter ({selectedFriendIds.size})
                        </Button>
                      )}
                    </div>
                  )}

                  <div className="rounded-2xl border border-[var(--border)]/60 bg-[var(--surface-secondary)]/30">
                    <div className="border-b border-[var(--border)]/60 px-5 py-4">
                      <h3 className="text-base font-semibold">Membres du groupe</h3>
                    </div>
                    <ScrollShadow className="max-h-64 overflow-y-auto">
                      <div className="divide-y divide-[var(--border)]/60">
                        {group?.participants
                          .sort((a, b) => {
                            const order = { owner: 0, admin: 1, member: 2 };
                            return (order[a.role] || 2) - (order[b.role] || 2);
                          })
                          .map((participant) => (
                            <div
                              key={participant.userId}
                              className="flex items-center gap-2.5 px-5 py-3 transition-colors hover:bg-[var(--surface-secondary)]/40"
                            >
                              <Avatar size="sm">
                                <Avatar.Image src={participant.avatarUrl ? resolveMediaUrl(participant.avatarUrl) : undefined} />
                                <Avatar.Fallback>{(participant.displayName || participant.username)?.[0] || '?'}</Avatar.Fallback>
                              </Avatar>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1">
                                  <p className="truncate text-sm font-medium">
                                    {participant.displayName || participant.username}
                                  </p>
                                  {participant.role === 'owner' && (
                                    <CrownIcon size={12} className="shrink-0 text-yellow-500" />
                                  )}
                                  {participant.userId === user?.id && (
                                    <Chip variant="soft" size="sm" className="ml-1 h-4">
                                      <Chip.Label className="text-[9px] px-1">Vous</Chip.Label>
                                    </Chip>
                                  )}
                                </div>
                                <p className="truncate text-xs text-[var(--muted)]">@{participant.username}</p>
                              </div>

                              {canManageMembers &&
                                participant.userId !== user?.id &&
                                participant.role !== 'owner' && (
                                  <Button
                                    variant="ghost"
                                    isIconOnly
                                    size="sm"
                                    className="shrink-0 text-red-500"
                                    onPress={() => handleRemoveMember(participant.userId)}
                                  >
                                    <UserMinusIcon size={16} />
                                  </Button>
                                )}
                            </div>
                          ))}
                      </div>
                    </ScrollShadow>
                  </div>
                </div>
              )}
            </div>
          </div>
          </div>
        </Modal.Dialog>
      </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
