'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useLayoutPrefs, densityCls } from '@/hooks/use-layout-prefs';
import { useTranslation } from '@/components/locale-provider';
import { api, resolveMediaUrl } from '@/lib/api';
import { socketService } from '@/lib/socket';
import { cn } from '@/lib/utils';
import {
  ArrowRightIcon,
  CompassIcon,
  CopyIcon,
  HelpCircleIcon,
  HomeIcon,
  Link2Icon,
  LogOutIcon,
  MessageCircleIcon,
  PlusIcon,
  SettingsIcon,
  UsersRoundIcon,
  XIcon,
} from '@/components/icons';
import { Avatar, AvatarImage, AvatarFallback, AvatarBadge } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogMedia,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
} from '@/components/ui/context-menu';
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
} from '@/components/ui/popover';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import { Input } from '@/components/ui/input';
import { Kbd } from '@/components/ui/kbd';
import { Label } from '@/components/ui/label';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { ServerSettingsDialog } from '@/components/chat/server-settings-dialog';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Server {
  id: string;
  name: string;
  iconUrl?: string;
}

interface ServerListProps {
  selectedServer: string | null;
  onSelectServer: (id: string | null) => void;
  horizontal?: boolean;
}

// ─── ServerList ───────────────────────────────────────────────────────────────

export function ServerList({ selectedServer, onSelectServer, horizontal = false }: ServerListProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const { prefs } = useLayoutPrefs();
  const d = densityCls(prefs.density);

  const btnSize  = d.serverBtn;
  const iconSize = d.serverIcon;
  const side: 'bottom' | 'right' = horizontal ? 'bottom' : 'right';

  // ── State ─────────────────────────────────────────────────────────────────
  const [servers,    setServers   ] = useState<Server[]>([]);
  const [loading,    setLoading   ] = useState(true);
  const [onlineIds,  setOnlineIds ] = useState<Set<string>>(new Set());
  const [settingsId, setSettingsId] = useState<string | null>(null);
  const [leaveId,    setLeaveId   ] = useState<string | null>(null);
  const [joinOpen,   setJoinOpen  ] = useState(false);
  const [invite,     setInvite    ] = useState('');
  const [joining,    setJoining   ] = useState(false);
  const [joinErr,    setJoinErr   ] = useState('');
  const [joinOk,     setJoinOk    ] = useState('');

  // ── Drag & drop refs ──────────────────────────────────────────────────────
  const dragId  = useRef<string | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);

  // ── Load servers ──────────────────────────────────────────────────────────
  const loadServers = useCallback(async () => {
    setLoading(true);
    const res = await api.getServers();
    if (res.success && res.data) {
      let list: Server[] = (res.data as any[]).map((s: any) => ({
        id: s.id,
        name: s.name,
        iconUrl: s.iconUrl ?? s.icon_url ?? undefined,
      }));
      try {
        const order = JSON.parse(localStorage.getItem('alfychat_server_order') ?? '[]') as string[];
        if (order.length) {
          const rank = new Map(order.map((id, i) => [id, i]));
          list = list.sort((a, b) => (rank.get(a.id) ?? list.length) - (rank.get(b.id) ?? list.length));
        }
      } catch { /* ignore */ }
      setServers(list);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadServers(); }, [loadServers]);

  // ── Socket events ─────────────────────────────────────────────────────────
  useEffect(() => {
    const getId = (d: any): string | null => d?.payload?.serverId ?? d?.serverId ?? null;

    const onOnline  = (d: any) => { const id = getId(d); if (id) setOnlineIds(p => new Set(p).add(id)); };
    const onOffline = (d: any) => { const id = getId(d); if (id) setOnlineIds(p => { const s = new Set(p); s.delete(id); return s; }); };

    const onUpdate = (d: any) => {
      const p = d?.payload ?? d?.updates ?? d;
      const id = p?.id ?? p?.serverId;
      if (!id) return;
      setServers(prev => prev.map(sv =>
        sv.id === id
          ? { ...sv, ...(p.name != null ? { name: p.name } : {}), ...(p.iconUrl !== undefined ? { iconUrl: p.iconUrl || undefined } : {}) }
          : sv,
      ));
    };

    const onGone = (d: any, warn?: string) => {
      const id = getId(d);
      if (!id) return;
      setServers(p => p.filter(sv => sv.id !== id));
      if (selectedServer === id) onSelectServer(null);
      if (warn) toast.warning(warn);
    };

    socketService.on('SERVER_NODE_ONLINE',  onOnline);
    socketService.on('SERVER_NODE_OFFLINE', onOffline);
    socketService.on('SERVER_UPDATE',       onUpdate);
    socketService.on('SERVER_DELETE',       (d) => onGone(d));
    socketService.on('SERVER_KICKED',       (d) => onGone(d, 'Vous avez été retiré du serveur.'));
    socketService.on('SERVER_BANNED',       (d) => onGone(d, 'Vous avez été banni du serveur.'));

    return () => {
      socketService.off('SERVER_NODE_ONLINE',  onOnline);
      socketService.off('SERVER_NODE_OFFLINE', onOffline);
      socketService.off('SERVER_UPDATE',       onUpdate);
      socketService.off('SERVER_DELETE',       onGone);
      socketService.off('SERVER_KICKED',       onGone);
      socketService.off('SERVER_BANNED',       onGone);
    };
  }, [selectedServer, onSelectServer]);

  // ── Join ──────────────────────────────────────────────────────────────────
  const resetJoin = () => { setInvite(''); setJoinErr(''); setJoinOk(''); };

  const handleJoin = async () => {
    if (!invite.trim() || joining) return;
    setJoining(true);
    setJoinErr('');
    setJoinOk('');
    const res = await api.joinServer(invite.trim());
    setJoining(false);
    if (res.success && res.data) {
      const s = res.data as any;
      const newServer: Server = { id: s.id ?? s.serverId, name: s.name, iconUrl: s.iconUrl };
      setServers(p => [...p, newServer]);
      setJoinOk(`Bienvenue sur ${newServer.name} !`);
      setTimeout(() => { setJoinOpen(false); resetJoin(); onSelectServer(newServer.id); }, 1200);
    } else {
      setJoinErr(res.error ?? 'Code invalide ou serveur introuvable.');
    }
  };

  // ── Leave ─────────────────────────────────────────────────────────────────
  const handleLeave = async (id: string) => {
    const res = await api.leaveServer(id);
    if (res.success) {
      setServers(p => p.filter(s => s.id !== id));
      if (selectedServer === id) onSelectServer(null);
      toast.success('Serveur quitté.');
    } else {
      toast.warning((res as any).error ?? (res as any).message ?? 'Impossible de quitter le serveur.');
    }
    setLeaveId(null);
  };

  // ── Context menu actions ──────────────────────────────────────────────────
  const handleContextAction = (serverId: string, action: string) => {
    if (action === 'settings') setSettingsId(serverId);
    if (action === 'invite') {
      navigator.clipboard.writeText(`${window.location.origin}/invite/${serverId}`);
      toast.success("Lien d'invitation copié !");
    }
    if (action === 'leave') setLeaveId(serverId);
  };

  // ── Drag & drop ───────────────────────────────────────────────────────────
  const handleDragStart = (id: string) => (e: React.DragEvent) => {
    dragId.current = id;
    setDragging(id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (id: string) => (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragId.current !== id) setDragOver(id);
  };

  const handleDrop = (targetId: string) => (e: React.DragEvent) => {
    e.preventDefault();
    const fromId = dragId.current;
    if (!fromId || fromId === targetId) { setDragOver(null); return; }
    setServers(prev => {
      const next = [...prev];
      const from = next.findIndex(s => s.id === fromId);
      const to   = next.findIndex(s => s.id === targetId);
      if (from === -1 || to === -1) return prev;
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      try { localStorage.setItem('alfychat_server_order', JSON.stringify(next.map(s => s.id))); } catch { /* ignore */ }
      return next;
    });
    dragId.current = null;
    setDragging(null);
    setDragOver(null);
  };

  const handleDragEnd = () => { dragId.current = null; setDragging(null); setDragOver(null); };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <TooltipProvider>
      <nav
        aria-label="Serveurs"
        className={cn(
          'flex shrink-0 items-center gap-1.5 bg-background',
          horizontal
            ? 'h-14 w-full flex-row border-b border-white/5 px-3'
            : cn('h-full flex-col border-r border-white/5 py-3', prefs.density === 'compact' ? 'w-14' : prefs.density === 'comfortable' ? 'w-20' : 'w-18'),
        )}
      >
        {/* ── DMs ── */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              aria-label={t.serverList?.dms ?? 'Messages directs'}
              className={cn(
                'mx-auto flex shrink-0 cursor-pointer items-center justify-center transition-all duration-200',
                btnSize,
                selectedServer === null
                  ? 'rounded-[14px] bg-accent text-white shadow-lg shadow-accent/40'
                  : 'rounded-full bg-white/5 text-white/50 hover:rounded-[14px] hover:bg-accent/15 hover:text-accent',
              )}
              onClick={() => onSelectServer(null)}
            >
              <MessageCircleIcon size={iconSize} />
            </button>
          </TooltipTrigger>
          <TooltipContent side={side}>
            {t.serverList?.dms ?? 'Messages directs'}
            <Kbd>Ctrl D</Kbd>
          </TooltipContent>
        </Tooltip>

        {/* ── Groups ── */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              aria-label="Groupes"
              className={cn(
                'mx-auto flex shrink-0 cursor-pointer items-center justify-center transition-all duration-200',
                btnSize,
                selectedServer === 'groups'
                  ? 'rounded-[14px] bg-indigo-500 text-white shadow-lg shadow-indigo-500/40'
                  : 'rounded-full bg-white/5 text-white/50 hover:rounded-[14px] hover:bg-indigo-500/15 hover:text-indigo-400',
              )}
              onClick={() => onSelectServer('groups')}
            >
              <UsersRoundIcon size={iconSize} />
            </button>
          </TooltipTrigger>
          <TooltipContent side={side}>Groupes</TooltipContent>
        </Tooltip>

        <div className={cn('shrink-0 rounded-full bg-white/10', horizontal ? 'h-6 w-px' : 'h-px w-6')} />

        {/* ── Server list ── */}
        <ScrollArea
          className={cn(
            horizontal
              ? 'h-full flex-1 overflow-x-auto'
              : 'w-full flex-1 overflow-y-auto',
          )}
        >
          <div
            className={cn(
              'flex items-center gap-1',
              horizontal ? 'flex-row px-1' : 'flex-col py-0.5',
            )}
          >
            {loading
              ? Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className={cn('shrink-0 rounded-full', btnSize)} />
                ))
              : servers.map((server) => {
                  const active    = selectedServer === server.id;
                  const isDragged = dragging === server.id;
                  const isOver    = dragOver  === server.id;

                  return (
                    <div
                      key={server.id}
                      draggable
                      onDragStart={handleDragStart(server.id)}
                      onDragOver={handleDragOver(server.id)}
                      onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOver(null); }}
                      onDrop={handleDrop(server.id)}
                      onDragEnd={handleDragEnd}
                      className={cn(
                        'transition-all duration-150',
                        isDragged && 'scale-90 opacity-40',
                        isOver && !isDragged && 'scale-105 opacity-80',
                      )}
                    >
                      <ContextMenu>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <ContextMenuTrigger asChild>
                              <button
                                type="button"
                                aria-label={server.name}
                                aria-pressed={active}
                                onClick={() => onSelectServer(server.id)}
                                onKeyDown={(e) => e.key === 'Enter' && onSelectServer(server.id)}
                                className={cn(
                                  'group relative flex shrink-0 cursor-pointer select-none items-center justify-center transition-all duration-200',
                                  btnSize,
                                  active ? 'rounded-[14px]' : 'rounded-full hover:rounded-[14px]',
                                )}
                              >
                                <Avatar
                                  className={cn(
                                    'transition-all duration-200',
                                    btnSize,
                                    active
                                      ? 'rounded-[14px] shadow-lg shadow-black/40 ring-2 ring-white/20 ring-offset-1 ring-offset-background'
                                      : 'rounded-full group-hover:rounded-[14px]',
                                    isOver && 'ring-2 ring-accent ring-offset-1 ring-offset-background',
                                  )}
                                >
                                  <AvatarImage
                                    src={server.iconUrl ? resolveMediaUrl(server.iconUrl) : undefined}
                                    alt={server.name}
                                    className={cn(active ? 'rounded-[14px]' : 'rounded-full group-hover:rounded-[14px]')}
                                  />
                                  <AvatarFallback
                                    className={cn(
                                      'bg-surface-secondary text-sm font-bold transition-all duration-200',
                                      active ? 'rounded-[14px]' : 'rounded-full group-hover:rounded-[14px]',
                                    )}
                                  >
                                    {server.name.charAt(0).toUpperCase()}
                                  </AvatarFallback>
                                  {onlineIds.has(server.id) && (
                                    <AvatarBadge className="bg-emerald-500" />
                                  )}
                                </Avatar>
                              </button>
                            </ContextMenuTrigger>
                          </TooltipTrigger>
                          <TooltipContent side={side}>
                            <span className="font-semibold">{server.name}</span>
                            {onlineIds.has(server.id) && (
                              <Badge variant="secondary" className="ml-1.5 bg-emerald-500/15 text-[10px] text-emerald-400">
                                Node en ligne
                              </Badge>
                            )}
                          </TooltipContent>
                        </Tooltip>

                        <ContextMenuContent className="min-w-44">
                          <ContextMenuItem onClick={() => handleContextAction(server.id, 'settings')}>
                            <SettingsIcon size={14} className="mr-2 shrink-0 opacity-60" />
                            Paramètres
                          </ContextMenuItem>
                          <ContextMenuItem onClick={() => handleContextAction(server.id, 'invite')}>
                            <CopyIcon size={14} className="mr-2 shrink-0 opacity-60" />
                            Copier l&apos;invitation
                          </ContextMenuItem>
                          <ContextMenuItem
                            variant="destructive"
                            onClick={() => handleContextAction(server.id, 'leave')}
                          >
                            <LogOutIcon size={14} className="mr-2 shrink-0" />
                            {t.serverList?.leaveServer ?? 'Quitter'}
                          </ContextMenuItem>
                        </ContextMenuContent>
                      </ContextMenu>
                    </div>
                  );
                })}
          </div>
          <ScrollBar orientation={horizontal ? 'horizontal' : 'vertical'} className="hidden" />
        </ScrollArea>

        <div className={cn('shrink-0 rounded-full bg-white/10', horizontal ? 'h-6 w-px' : 'h-px w-6')} />

        {/* ── Join ── */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              aria-label={t.serverList?.modal?.joinNav ?? 'Rejoindre un serveur'}
              className={cn(
                'mx-auto flex shrink-0 cursor-pointer items-center justify-center rounded-full bg-white/5 text-white/40 transition-all duration-200 hover:rounded-[14px] hover:bg-emerald-500/15 hover:text-emerald-400',
                btnSize,
              )}
              onClick={() => setJoinOpen(true)}
            >
              <PlusIcon size={iconSize} />
            </button>
          </TooltipTrigger>
          <TooltipContent side={side}>
            {t.serverList?.modal?.joinNav ?? 'Rejoindre un serveur'}
            <Kbd>Ctrl N</Kbd>
          </TooltipContent>
        </Tooltip>

        {/* ── Discover ── */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              aria-label={t.serverList?.discoverServers ?? 'Découvrir des serveurs'}
              className={cn(
                'mx-auto flex shrink-0 cursor-pointer items-center justify-center rounded-full bg-white/5 text-white/40 transition-all duration-200 hover:rounded-[14px] hover:bg-accent/15 hover:text-accent',
                btnSize,
              )}
              onClick={() => router.push('/channels/discover-server')}
            >
              <CompassIcon size={iconSize} />
            </button>
          </TooltipTrigger>
          <TooltipContent side={side}>{t.serverList?.discoverServers ?? 'Découvrir'}</TooltipContent>
        </Tooltip>

        {/* ── Home ── */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              aria-label="Bienvenue"
              className={cn(
                'mx-auto flex shrink-0 cursor-pointer items-center justify-center rounded-full bg-white/5 text-white/40 transition-all duration-200 hover:rounded-[14px] hover:bg-accent/15 hover:text-accent',
                btnSize,
              )}
              onClick={() => router.push('/channels/gotostart')}
            >
              <HomeIcon size={iconSize} />
            </button>
          </TooltipTrigger>
          <TooltipContent side={side}>Bienvenue</TooltipContent>
        </Tooltip>
      </nav>

      {/* ── Server settings ── */}
      {settingsId && (
        <ServerSettingsDialog
          serverId={settingsId}
          open={!!settingsId}
          onOpenChange={(open) => { if (!open) setSettingsId(null); }}
          onServerUpdated={loadServers}
        />
      )}

      {/* ── Leave confirmation ── */}
      <AlertDialog open={!!leaveId} onOpenChange={(open) => { if (!open) setLeaveId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-destructive/10">
              <LogOutIcon size={20} className="text-destructive" />
            </AlertDialogMedia>
            <AlertDialogTitle>Quitter ce serveur&nbsp;?</AlertDialogTitle>
            <AlertDialogDescription>
              Vous devrez être réinvité pour le rejoindre à nouveau.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => leaveId && handleLeave(leaveId)}
            >
              <LogOutIcon size={14} />
              {t.serverList?.leaveServer ?? 'Quitter'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Join server ── */}
      <Dialog open={joinOpen} onOpenChange={(open) => { setJoinOpen(open); if (!open) resetJoin(); }}>
        <DialogContent className="sm:max-w-md" showCloseButton>
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent/10 ring-1 ring-accent/20">
                <Link2Icon size={18} className="text-accent" />
              </div>
              <div>
                <DialogTitle>{t.serverList?.modal?.joinNav ?? 'Rejoindre un serveur'}</DialogTitle>
                <DialogDescription>Entrez un code ou un lien d&apos;invitation</DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4">
            {joinErr && (
              <Alert variant="destructive">
                <AlertTitle>Erreur</AlertTitle>
                <AlertDescription>{joinErr}</AlertDescription>
              </Alert>
            )}

            {joinOk && (
              <Alert>
                <AlertTitle>Succès&nbsp;!</AlertTitle>
                <AlertDescription>{joinOk}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={(e) => { e.preventDefault(); handleJoin(); }} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-[13px] font-semibold">Code ou lien d&apos;invitation</Label>
                <Input
                  value={invite}
                  onChange={(e) => setInvite(e.target.value)}
                  placeholder="https://alfychat.app/invite/... ou ABCD1234"
                  onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
                  autoFocus
                />
                <p className="text-[11px] text-muted-foreground/50">
                  Collez un lien ou saisissez le code court.
                </p>
              </div>

              <div className="flex items-center justify-between gap-3">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 gap-1.5 px-2 text-[11px] text-muted-foreground/60 hover:text-muted-foreground"
                    >
                      <HelpCircleIcon size={12} />
                      Où trouver un code&nbsp;?
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="max-w-56">
                    <PopoverHeader>
                      <PopoverTitle className="text-[13px] font-semibold">Trouver un code</PopoverTitle>
                    </PopoverHeader>
                    <p className="text-[11px] text-muted-foreground/70">
                      Demandez à un administrateur ou explorez les serveurs publics.
                    </p>
                  </PopoverContent>
                </Popover>

                <Button
                  type="submit"
                  disabled={!invite.trim() || joining}
                  className="min-w-28 shrink-0"
                >
                  {joining ? <Spinner size="sm" /> : <ArrowRightIcon size={14} />}
                  Rejoindre
                </Button>
              </div>
            </form>
          </div>

          <DialogFooter className="sm:justify-between">
            <p className="text-[11px] text-muted-foreground/50">Explorer les serveurs publics</p>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1.5 px-2 text-[11px] text-accent hover:bg-accent/10"
              onClick={() => { setJoinOpen(false); router.push('/channels/discover-server'); }}
            >
              <CompassIcon size={12} />
              Découvrir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}
