'use client';

import { useEffect, useRef, useState } from 'react';
import { UsersRoundIcon, SearchIcon, CheckIcon, XIcon, UserPlusIcon, PencilIcon, ArrowRightIcon } from '@/components/icons';
import { api, resolveMediaUrl } from '@/lib/api';
import { socketService } from '@/lib/socket';
import { cn } from '@/lib/utils';
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="h-[70vh] w-full max-w-3xl sm:max-w-3xl overflow-hidden rounded-2xl p-0 shadow-2xl">
          <DialogHeader className="sr-only">
            <DialogTitle>Créer un nouveau groupe</DialogTitle>
          </DialogHeader>
          <div className="flex h-full">
          {/* ── Left navigation ── */}
          <aside className="flex w-52 shrink-0 flex-col border-r border-border/40 bg-background/80 py-6">
            <div className="mb-4 px-5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                Nouveau groupe
              </p>
              <p className="mt-0.5 text-sm font-medium text-foreground">
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
                      ? 'bg-primary/10 text-primary shadow-sm'
                      : 'text-muted-foreground hover:bg-surface-secondary/80 hover:text-foreground',
                    id === 'customize' && selectedIds.size < 1 && 'pointer-events-none opacity-40',
                  )}
                >
                  <div
                    className={cn(
                      'flex size-7 items-center justify-center rounded-lg transition-colors',
                      step === id
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

            {selectedIds.size > 0 && (
              <>
                <div className="mx-5 my-4 h-px bg-border/40" />
                <div className="px-5">
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                    Membres
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {selectedFriends.slice(0, 6).map((f) => (
                      <Avatar
                        key={f.id}
                        className="size-7 ring-2 ring-background"
                      >
                        <AvatarImage src={f.avatarUrl ? resolveMediaUrl(f.avatarUrl) : undefined} />
                        <AvatarFallback>{f.displayName[0]}</AvatarFallback>
                      </Avatar>
                    ))}
                    {selectedFriends.length > 6 && (
                      <div className="flex size-7 items-center justify-center rounded-full bg-surface-secondary text-[10px] font-medium text-muted-foreground ring-2 ring-background">
                        +{selectedFriends.length - 6}
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            <div className="mt-auto px-3">
              <div className="mx-2 mb-3 h-px bg-border/40" />
              <button
                onClick={() => onOpenChange(false)}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-all duration-200 hover:bg-surface-secondary/80 hover:text-foreground"
              >
                <div className="flex size-7 items-center justify-center rounded-lg bg-surface-secondary/60">
                  <XIcon size={14} />
                </div>
                Fermer
              </button>
            </div>
          </aside>

          {/* ── Right content ── */}
          <div className="flex flex-1 flex-col overflow-hidden bg-surface/50">
            <div className="flex-1 overflow-y-auto p-8">
              {/* ── STEP 1: SELECT FRIENDS ── */}
              {step === 'select' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-bold tracking-tight">Sélectionner des amis</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Choisissez les personnes à ajouter au groupe.
                    </p>
                  </div>

                  {selectedIds.size > 0 && (
                    <div className="rounded-2xl border border-border/60 bg-surface-secondary/30 p-4">
                      <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                        Sélectionnés ({selectedIds.size})
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedFriends.map((f) => (
                          <Badge
                            key={f.id}
                            variant="secondary"
                            className="gap-1.5 pr-1"
                          >
                            <Avatar className="size-5">
                              <AvatarImage src={f.avatarUrl ? resolveMediaUrl(f.avatarUrl) : undefined} />
                              <AvatarFallback>{f.displayName[0]}</AvatarFallback>
                            </Avatar>
                            {f.displayName}
                            <button type="button" className="ml-1 text-muted-foreground hover:text-foreground" onClick={() => removeFriend(f.id)}>
                              <XIcon size={12} />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="relative">
                    <SearchIcon size={16} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/60" />
                    <Input
                      placeholder="Rechercher des amis..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      autoFocus
                      className="pl-8"
                    />
                  </div>

                  <div className="rounded-2xl border border-border/60 bg-surface-secondary/30 p-2">
                    <ScrollArea className="h-52">
                      <div className="space-y-0.5">
                        {isLoading ? (
                          <div className="flex items-center justify-center py-8">
                            <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                          </div>
                        ) : filteredFriends.length === 0 ? (
                          <p className="py-8 text-center text-sm text-muted-foreground">
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
                                  isSelected ? 'bg-primary/10 shadow-sm' : 'hover:bg-background/60',
                                )}
                              >
                                <Avatar size="sm">
                                  <AvatarImage src={friend.avatarUrl ? resolveMediaUrl(friend.avatarUrl) : undefined} />
                                  <AvatarFallback>{friend.displayName?.[0] || '?'}</AvatarFallback>
                                </Avatar>
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-sm font-medium">{friend.displayName}</p>
                                  <p className="truncate text-xs text-muted-foreground">@{friend.username}</p>
                                </div>
                                <div
                                  className={cn(
                                    'flex size-5 shrink-0 items-center justify-center rounded-lg border-2 transition-all',
                                    isSelected
                                      ? 'border-primary bg-primary text-primary-foreground'
                                      : 'border-muted-foreground/25',
                                  )}
                                >
                                  {isSelected && <CheckIcon size={14} />}
                                </div>
                              </button>
                            );
                          })
                        )}
                      </div>
                    </ScrollArea>
                  </div>

                  <div className="flex justify-end">
                    <Button
                      onClick={() => setStep('customize')}
                      disabled={selectedIds.size < 1}
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
                    <p className="mt-1 text-sm text-muted-foreground">
                      Donnez un nom à votre groupe avant de le créer.
                    </p>
                  </div>

                  <div className="space-y-4 rounded-2xl border border-border/60 bg-surface-secondary/30 p-5">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                      Informations
                    </p>
                    <div className="space-y-1">
                      <span className="text-xs font-medium">Nom du groupe</span>
                      <Input
                          placeholder={
                            selectedFriends.map((f) => f.displayName).slice(0, 3).join(', ') +
                            (selectedFriends.length > 3 ? '...' : '')
                          }
                          value={groupName}
                          onChange={(e) => setGroupName(e.target.value)}
                          autoFocus
                        />
                      <p className="text-[11px] text-muted-foreground/70">Laissez vide pour utiliser les noms des participants</p>
                    </div>
                  </div>

                  <div className="space-y-3 rounded-2xl border border-border/60 bg-surface-secondary/30 p-5">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                      Membres ({selectedIds.size})
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedFriends.map((f) => (
                        <Badge
                          key={f.id}
                          variant="secondary"
                          className="gap-1.5"
                        >
                          <Avatar className="size-5">
                            <AvatarImage src={f.avatarUrl ? resolveMediaUrl(f.avatarUrl) : undefined} />
                            <AvatarFallback>{f.displayName[0]}</AvatarFallback>
                          </Avatar>
                          {f.displayName}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <Button variant="ghost" onClick={() => setStep('select')} className="rounded-xl">
                      Retour
                    </Button>
                    <Button
                      onClick={handleCreate}
                      disabled={isCreating}
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
      </DialogContent>
    </Dialog>
  );
}
