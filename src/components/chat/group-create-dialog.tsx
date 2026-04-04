'use client';

import { useEffect, useRef, useState } from 'react';
import { UsersRoundIcon, SearchIcon, CheckIcon, XIcon, UserPlusIcon, PencilIcon, ArrowRightIcon } from '@/components/icons';
import { api, resolveMediaUrl } from '@/lib/api';
import { socketService } from '@/lib/socket';
import { cn } from '@/lib/utils';
import {
  Avatar,
  Button,
  Chip,
  InputGroup,
  Modal,
  ScrollShadow,
} from '@heroui/react';

interface Friend {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  status: string;
}

interface GroupCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (groupId?: string) => void;
}

export function GroupCreateDialog({ open, onOpenChange, onCreated }: GroupCreateDialogProps) {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [groupName, setGroupName] = useState('');
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [step, setStep] = useState<'select' | 'customize'>('select');

  useEffect(() => {
    if (open) {
      loadFriends();
      setSelectedIds(new Set());
      setGroupName('');
      setSearch('');
      setStep('select');
    }
  }, [open]);

  const groupCreateListenerRef = useRef<((data: any) => void) | null>(null);
  const createTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (groupCreateListenerRef.current) {
        socketService.off('GROUP_CREATE', groupCreateListenerRef.current);
        groupCreateListenerRef.current = null;
      }
      if (createTimeoutRef.current) {
        clearTimeout(createTimeoutRef.current);
        createTimeoutRef.current = null;
      }
    };
  }, []);

  const loadFriends = async () => {
    setIsLoading(true);
    try {
      const response = await api.getFriends();
      if (response.success && response.data) {
        setFriends(response.data as Friend[]);
      }
    } catch (error) {
      console.error('Erreur chargement amis:', error);
    }
    setIsLoading(false);
  };

  const toggleFriend = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const removeFriend = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const handleCreate = async () => {
    if (selectedIds.size < 1) return;
    setIsCreating(true);

    if (groupCreateListenerRef.current) {
      socketService.off('GROUP_CREATE', groupCreateListenerRef.current);
    }

    const handleGroupCreate = (data: any) => {
      const payload = data?.payload || data;
      if (payload?.id) {
        socketService.off('GROUP_CREATE', handleGroupCreate);
        groupCreateListenerRef.current = null;
        if (createTimeoutRef.current) { clearTimeout(createTimeoutRef.current); createTimeoutRef.current = null; }
        setIsCreating(false);
        onOpenChange(false);
        onCreated?.(payload.id);
      }
    };
    groupCreateListenerRef.current = handleGroupCreate;
    socketService.onGroupCreate(handleGroupCreate);

    createTimeoutRef.current = setTimeout(() => {
      console.warn('[GROUP] Création timeout — aucune réponse après 10s');
      socketService.off('GROUP_CREATE', handleGroupCreate);
      groupCreateListenerRef.current = null;
      setIsCreating(false);
    }, 10_000);

    try {
      const selectedFriends = friends.filter((f) => selectedIds.has(f.id));
      const defaultName =
        groupName.trim() ||
        selectedFriends.map((f) => f.displayName || f.username).slice(0, 3).join(', ') +
          (selectedFriends.length > 3 ? '...' : '');
      socketService.createGroup({ name: defaultName, participantIds: Array.from(selectedIds) });
    } catch (error) {
      console.error('Erreur création groupe:', error);
      socketService.off('GROUP_CREATE', handleGroupCreate);
      groupCreateListenerRef.current = null;
      if (createTimeoutRef.current) { clearTimeout(createTimeoutRef.current); createTimeoutRef.current = null; }
      setIsCreating(false);
    }
  };

  const filteredFriends = friends.filter(
    (f) =>
      f.displayName.toLowerCase().includes(search.toLowerCase()) ||
      f.username.toLowerCase().includes(search.toLowerCase()),
  );

  const selectedFriends = friends.filter((f) => selectedIds.has(f.id));

  const STEPS = [
    { id: 'select' as const, label: 'Sélectionner', icon: UserPlusIcon },
    { id: 'customize' as const, label: 'Personnaliser', icon: PencilIcon },
  ];

  return (
    <Modal isOpen={open} onOpenChange={onOpenChange}>
      <Modal.Backdrop>
      <Modal.Container size="lg">
        <Modal.Dialog className="h-[70vh] max-w-2xl overflow-hidden rounded-2xl border border-[var(--border)]/60 p-0 shadow-2xl">
          <div className="flex h-full">
          {/* ── Left navigation ── */}
          <aside className="flex w-52 shrink-0 flex-col border-r border-[var(--border)]/40 bg-[var(--background)]/80 py-6">
            <div className="mb-4 px-5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]/70">
                Nouveau groupe
              </p>
              <p className="mt-0.5 text-sm font-medium text-[var(--foreground)]">
                {selectedIds.size} membre{selectedIds.size !== 1 ? 's' : ''} sélectionné{selectedIds.size !== 1 ? 's' : ''}
              </p>
            </div>

            <nav className="flex flex-col gap-0.5 px-3">
              {STEPS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => {
                    if (id === 'customize' && selectedIds.size < 1) return;
                    setStep(id);
                  }}
                  className={cn(
                    'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
                    step === id
                      ? 'bg-[var(--accent)]/10 text-[var(--accent)] shadow-sm'
                      : 'text-[var(--muted)] hover:bg-[var(--surface-secondary)]/80 hover:text-[var(--foreground)]',
                    id === 'customize' && selectedIds.size < 1 && 'pointer-events-none opacity-40',
                  )}
                >
                  <div
                    className={cn(
                      'flex size-7 items-center justify-center rounded-lg transition-colors',
                      step === id
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

            {selectedIds.size > 0 && (
              <>
                <div className="mx-5 my-4 h-px bg-[var(--border)]/40" />
                <div className="px-5">
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]/70">
                    Membres
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {selectedFriends.slice(0, 6).map((f) => (
                      <Avatar
                        key={f.id}
                        size="sm"
                        className="size-7 ring-2 ring-[var(--background)]"
                      >
                        <Avatar.Image src={f.avatarUrl ? resolveMediaUrl(f.avatarUrl) : undefined} />
                        <Avatar.Fallback>{f.displayName[0]}</Avatar.Fallback>
                      </Avatar>
                    ))}
                    {selectedFriends.length > 6 && (
                      <div className="flex size-7 items-center justify-center rounded-full bg-[var(--surface-secondary)] text-[10px] font-medium text-[var(--muted)] ring-2 ring-[var(--background)]">
                        +{selectedFriends.length - 6}
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            <div className="mt-auto px-3">
              <div className="mx-2 mb-3 h-px bg-[var(--border)]/40" />
              <button
                onClick={() => onOpenChange(false)}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-[var(--muted)] transition-all duration-200 hover:bg-[var(--surface-secondary)]/80 hover:text-[var(--foreground)]"
              >
                <div className="flex size-7 items-center justify-center rounded-lg bg-[var(--surface-secondary)]/60">
                  <XIcon size={14} />
                </div>
                Fermer
              </button>
            </div>
          </aside>

          {/* ── Right content ── */}
          <div className="flex flex-1 flex-col overflow-hidden bg-[var(--surface)]/50">
            <div className="flex-1 overflow-y-auto p-8">
              {/* ── STEP 1: SELECT FRIENDS ── */}
              {step === 'select' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-bold tracking-tight">Sélectionner des amis</h2>
                    <p className="mt-1 text-sm text-[var(--muted)]">
                      Choisissez les personnes à ajouter au groupe.
                    </p>
                  </div>

                  {selectedIds.size > 0 && (
                    <div className="rounded-2xl border border-[var(--border)]/60 bg-[var(--surface-secondary)]/30 p-4">
                      <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]/70">
                        Sélectionnés ({selectedIds.size})
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedFriends.map((f) => (
                          <Chip
                            key={f.id}
                            variant="soft"
                            size="sm"
                          >
                            <Avatar
                              size="sm"
                              className="size-5"
                            >
                              <Avatar.Image src={f.avatarUrl ? resolveMediaUrl(f.avatarUrl) : undefined} />
                              <Avatar.Fallback>{f.displayName[0]}</Avatar.Fallback>
                            </Avatar>
                            <Chip.Label>{f.displayName}</Chip.Label>
                            <button type="button" className="ml-1 text-[var(--muted)] hover:text-[var(--foreground)]" onClick={() => removeFriend(f.id)}>
                              <XIcon size={12} />
                            </button>
                          </Chip>
                        ))}
                      </div>
                    </div>
                  )}

                  <InputGroup className="rounded-xl border-[var(--border)]/60 bg-[var(--background)]/60">
                    <InputGroup.Prefix><SearchIcon size={16} className="text-[var(--muted)]/60" /></InputGroup.Prefix>
                    <InputGroup.Input
                      placeholder="Rechercher des amis..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      autoFocus
                    />
                  </InputGroup>

                  <div className="rounded-2xl border border-[var(--border)]/60 bg-[var(--surface-secondary)]/30 p-2">
                    <ScrollShadow className="h-52 overflow-y-auto">
                      <div className="space-y-0.5">
                        {isLoading ? (
                          <div className="flex items-center justify-center py-8">
                            <div className="size-6 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
                          </div>
                        ) : filteredFriends.length === 0 ? (
                          <p className="py-8 text-center text-sm text-[var(--muted)]">
                            {friends.length === 0 ? 'Aucun ami à ajouter' : 'Aucun résultat'}
                          </p>
                        ) : (
                          filteredFriends.map((friend) => {
                            const isSelected = selectedIds.has(friend.id);
                            return (
                              <button
                                key={friend.id}
                                type="button"
                                onClick={() => toggleFriend(friend.id)}
                                className={cn(
                                  'flex w-full items-center gap-3 rounded-xl p-2.5 text-left transition-all duration-200',
                                  isSelected ? 'bg-[var(--accent)]/10 shadow-sm' : 'hover:bg-[var(--background)]/60',
                                )}
                              >
                                <Avatar size="sm">
                                  <Avatar.Image src={friend.avatarUrl ? resolveMediaUrl(friend.avatarUrl) : undefined} />
                                  <Avatar.Fallback>{friend.displayName?.[0] || '?'}</Avatar.Fallback>
                                </Avatar>
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-sm font-medium">{friend.displayName}</p>
                                  <p className="truncate text-xs text-[var(--muted)]">@{friend.username}</p>
                                </div>
                                <div
                                  className={cn(
                                    'flex size-5 shrink-0 items-center justify-center rounded-lg border-2 transition-all',
                                    isSelected
                                      ? 'border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-foreground)]'
                                      : 'border-[var(--muted)]/25',
                                  )}
                                >
                                  {isSelected && <CheckIcon size={14} />}
                                </div>
                              </button>
                            );
                          })
                        )}
                      </div>
                    </ScrollShadow>
                  </div>

                  <div className="flex justify-end">
                    <Button
                      onPress={() => setStep('customize')}
                      isDisabled={selectedIds.size < 1}
                      className="gap-2 rounded-xl"
                    >
                      Suivant
                      <ArrowRightIcon size={16} />
                    </Button>
                  </div>
                </div>
              )}

              {/* ── STEP 2: CUSTOMIZE ── */}
              {step === 'customize' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-bold tracking-tight">Personnaliser le groupe</h2>
                    <p className="mt-1 text-sm text-[var(--muted)]">
                      Donnez un nom à votre groupe avant de le créer.
                    </p>
                  </div>

                  <div className="space-y-4 rounded-2xl border border-[var(--border)]/60 bg-[var(--surface-secondary)]/30 p-5">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]/70">
                      Informations
                    </p>
                    <div className="space-y-1">
                      <span className="text-xs font-medium">Nom du groupe</span>
                      <InputGroup className="rounded-xl border-[var(--border)]/60 bg-[var(--background)]/60">
                        <InputGroup.Input
                          placeholder={
                            selectedFriends.map((f) => f.displayName).slice(0, 3).join(', ') +
                            (selectedFriends.length > 3 ? '...' : '')
                          }
                          value={groupName}
                          onChange={(e) => setGroupName(e.target.value)}
                          autoFocus
                        />
                      </InputGroup>
                      <p className="text-[11px] text-[var(--muted)]/70">Laissez vide pour utiliser les noms des participants</p>
                    </div>
                  </div>

                  <div className="space-y-3 rounded-2xl border border-[var(--border)]/60 bg-[var(--surface-secondary)]/30 p-5">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]/70">
                      Membres ({selectedIds.size})
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedFriends.map((f) => (
                        <Chip
                          key={f.id}
                          variant="soft"
                          size="sm"
                        >
                          <Avatar
                            size="sm"
                            className="size-5"
                          >
                            <Avatar.Image src={f.avatarUrl ? resolveMediaUrl(f.avatarUrl) : undefined} />
                            <Avatar.Fallback>{f.displayName[0]}</Avatar.Fallback>
                          </Avatar>
                          <Chip.Label>{f.displayName}</Chip.Label>
                        </Chip>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <Button variant="ghost" onPress={() => setStep('select')} className="rounded-xl">
                      Retour
                    </Button>
                    <Button
                      onPress={handleCreate}
                      isDisabled={isCreating}
                      className="gap-2 rounded-xl"
                    >
                      <UsersRoundIcon size={16} />
                      {isCreating ? 'Création...' : 'Créer le groupe'}
                    </Button>
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
