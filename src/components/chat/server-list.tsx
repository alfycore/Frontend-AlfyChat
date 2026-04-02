'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLayoutPrefs } from '@/hooks/use-layout-prefs';
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
} from '@/components/icons';
import {
  Alert,
  Avatar,
  Badge,
  Button,
  Chip,
  CloseButton,
  Description,
  Dropdown,
  Form,
  InputGroup,
  Kbd,
  Label,
  Modal,
  Popover,
  ScrollShadow,
  Skeleton,
  Spinner,
  toast,
  Tooltip,
} from '@heroui/react';
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
  const compact = prefs.compactServerList;

  const btnSize  = compact ? 'size-9' : horizontal ? 'size-10' : 'size-12';
  const iconSize = compact ? 16 : horizontal ? 18 : 22;
  const side     = horizontal ? 'bottom' : 'right';

  // ── State ─────────────────────────────────────────────────────────────────
  const [servers,    setServers   ] = useState<Server[]>([]);
  const [loading,    setLoading   ] = useState(true);
  const [onlineIds,  setOnlineIds ] = useState<Set<string>>(new Set());
  const [contextId,  setContextId ] = useState<string | null>(null);
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
    <>
      <nav
        aria-label="Serveurs"
        className={cn(
          'flex shrink-0 items-center gap-1.5 bg-[var(--background)]',
          horizontal
            ? 'h-14 w-full flex-row border-b border-white/5 px-3'
            : cn('h-full flex-col border-r border-white/5 py-3', compact ? 'w-[56px]' : 'w-[72px]'),
        )}
      >
        {/* ── DMs ── */}
        <Tooltip delay={0}>
          <Button
            isIconOnly
            variant="ghost"
            aria-label={t.serverList?.dms ?? 'Messages directs'}
            className={cn(
              'mx-auto shrink-0 transition-all duration-200',
              btnSize,
              selectedServer === null
                ? '!rounded-[14px] bg-accent text-white shadow-lg shadow-accent/40'
                : '!rounded-full bg-white/5 text-white/50 hover:!rounded-[14px] hover:bg-accent/15 hover:text-accent',
            )}
            onPress={() => onSelectServer(null)}
          >
            <MessageCircleIcon size={iconSize} />
          </Button>
          <Tooltip.Content showArrow placement={side}>
            <Tooltip.Arrow />
            <p className="text-[11px] font-medium">{t.serverList?.dms ?? 'Messages directs'}</p>
            <Kbd className="mt-1 text-[10px]"><Kbd.Abbr keyValue="ctrl" /> D</Kbd>
          </Tooltip.Content>
        </Tooltip>

        <div className={cn('shrink-0 rounded-full bg-white/10', horizontal ? 'h-6 w-px' : 'h-px w-6')} />

        {/* ── Server list ── */}
        <ScrollShadow
          orientation={horizontal ? 'horizontal' : 'vertical'}
          hideScrollBar
          className={cn(
            'flex items-center gap-1',
            horizontal
              ? 'h-full flex-1 flex-row overflow-x-auto px-1'
              : 'w-full flex-1 flex-col items-center overflow-y-auto py-0.5',
          )}
        >
          {loading
            ? Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} animationType="shimmer" className={cn('shrink-0 rounded-full', btnSize)} />
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
                    <Dropdown
                      isOpen={contextId === server.id}
                      onOpenChange={(open) => setContextId(open ? server.id : null)}
                    >
                      <Tooltip delay={0}>
                        <div
                          slot="trigger"
                          role="button"
                          tabIndex={0}
                          aria-label={server.name}
                          aria-pressed={active}
                          onClick={() => onSelectServer(server.id)}
                          onKeyDown={(e) => e.key === 'Enter' && onSelectServer(server.id)}
                          onContextMenu={(e) => { e.preventDefault(); setContextId(server.id); }}
                          className={cn(
                            'group relative flex shrink-0 cursor-pointer select-none items-center justify-center transition-all duration-200',
                            btnSize,
                            active ? 'rounded-[14px]' : 'rounded-full hover:rounded-[14px]',
                          )}
                        >
                          <Badge.Anchor>
                            <Avatar
                              className={cn(
                                'transition-all duration-200',
                                btnSize,
                                active
                                  ? 'rounded-[14px] shadow-lg shadow-black/40 ring-2 ring-white/20 ring-offset-1 ring-offset-[var(--background)]'
                                  : 'rounded-full group-hover:rounded-[14px]',
                                isOver && 'ring-2 ring-accent ring-offset-1 ring-offset-[var(--background)]',
                              )}
                            >
                              <Avatar.Image
                                src={server.iconUrl ? resolveMediaUrl(server.iconUrl) : undefined}
                                alt={server.name}
                              />
                              <Avatar.Fallback
                                className={cn(
                                  'bg-[var(--surface-secondary)] text-sm font-bold transition-all duration-200',
                                  active ? 'rounded-[14px]' : 'rounded-full group-hover:rounded-[14px]',
                                )}
                              >
                                {server.name.charAt(0).toUpperCase()}
                              </Avatar.Fallback>
                            </Avatar>
                            {onlineIds.has(server.id) && (
                              <Badge color="success" size="sm" placement="bottom-right" />
                            )}
                          </Badge.Anchor>
                        </div>

                        <Tooltip.Content showArrow placement={side}>
                          <Tooltip.Arrow />
                          <p className="text-[11px] font-semibold">{server.name}</p>
                          {onlineIds.has(server.id) && (
                            <Chip color="success" variant="soft" size="sm" className="mt-1">
                              <Chip.Label className="text-[10px]">Node en ligne</Chip.Label>
                            </Chip>
                          )}
                        </Tooltip.Content>
                      </Tooltip>

                      <Dropdown.Popover placement="right top" className="min-w-44">
                        <Dropdown.Menu
                          aria-label={t.serverList?.serverOptions ?? 'Options du serveur'}
                          onAction={(key) => {
                            setContextId(null);
                            if (key === 'settings') setSettingsId(server.id);
                            if (key === 'invite') {
                              navigator.clipboard.writeText(`${window.location.origin}/invite/${server.id}`);
                              toast.success("Lien d'invitation copié !");
                            }
                            if (key === 'leave') setLeaveId(server.id);
                          }}
                        >
                          <Dropdown.Item id="settings" textValue="Paramètres">
                            <SettingsIcon size={14} className="mr-2 shrink-0 opacity-60" />
                            <Label>Paramètres</Label>
                          </Dropdown.Item>
                          <Dropdown.Item id="invite" textValue="Copier l'invitation">
                            <CopyIcon size={14} className="mr-2 shrink-0 opacity-60" />
                            <Label>Copier l&apos;invitation</Label>
                          </Dropdown.Item>
                          <Dropdown.Item id="leave" className="text-danger" textValue="Quitter">
                            <LogOutIcon size={14} className="mr-2 shrink-0" />
                            <Label>{t.serverList?.leaveServer ?? 'Quitter'}</Label>
                          </Dropdown.Item>
                        </Dropdown.Menu>
                      </Dropdown.Popover>
                    </Dropdown>
                  </div>
                );
              })}
        </ScrollShadow>

        <div className={cn('shrink-0 rounded-full bg-white/10', horizontal ? 'h-6 w-px' : 'h-px w-6')} />

        {/* ── Join ── */}
        <Tooltip delay={0}>
          <Button
            isIconOnly
            variant="ghost"
            aria-label={t.serverList?.modal?.joinNav ?? 'Rejoindre un serveur'}
            className={cn(
              'mx-auto shrink-0 !rounded-full bg-white/5 text-white/40 transition-all duration-200 hover:!rounded-[14px] hover:bg-success/15 hover:text-success',
              btnSize,
            )}
            onPress={() => setJoinOpen(true)}
          >
            <PlusIcon size={iconSize} />
          </Button>
          <Tooltip.Content showArrow placement={side}>
            <Tooltip.Arrow />
            <p className="text-[11px] font-medium">{t.serverList?.modal?.joinNav ?? 'Rejoindre un serveur'}</p>
            <Kbd className="mt-1 text-[10px]"><Kbd.Abbr keyValue="ctrl" /> N</Kbd>
          </Tooltip.Content>
        </Tooltip>

        {/* ── Discover ── */}
        <Tooltip delay={0}>
          <Button
            isIconOnly
            variant="ghost"
            aria-label={t.serverList?.discoverServers ?? 'Découvrir des serveurs'}
            className={cn(
              'mx-auto shrink-0 !rounded-full bg-white/5 text-white/40 transition-all duration-200 hover:!rounded-[14px] hover:bg-accent/15 hover:text-accent',
              btnSize,
            )}
            onPress={() => router.push('/channels/discover-server')}
          >
            <CompassIcon size={iconSize} />
          </Button>
          <Tooltip.Content showArrow placement={side}>
            <Tooltip.Arrow />
            <p className="text-[11px] font-medium">{t.serverList?.discoverServers ?? 'Découvrir'}</p>
          </Tooltip.Content>
        </Tooltip>

        {/* ── Home ── */}
        <Tooltip delay={0}>
          <Button
            isIconOnly
            variant="ghost"
            aria-label="Bienvenue"
            className={cn(
              'mx-auto shrink-0 !rounded-full bg-white/5 text-white/40 transition-all duration-200 hover:!rounded-[14px] hover:bg-accent/15 hover:text-accent',
              btnSize,
            )}
            onPress={() => router.push('/channels/gotostart')}
          >
            <HomeIcon size={iconSize} />
          </Button>
          <Tooltip.Content showArrow placement={side}>
            <Tooltip.Arrow />
            <p className="text-[11px] font-medium">Bienvenue</p>
          </Tooltip.Content>
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
      <Modal.Backdrop
        isOpen={!!leaveId}
        onOpenChange={(open) => { if (!open) setLeaveId(null); }}
        variant="blur"
      >
        <Modal.Container size="sm">
          <Modal.Dialog className="overflow-hidden rounded-2xl border border-[var(--border)]/30 p-0 shadow-2xl">
            <div className="px-6 pt-6 pb-5">
              <div className="mb-4 flex size-11 items-center justify-center rounded-xl bg-danger/10 ring-1 ring-danger/20">
                <LogOutIcon size={20} className="text-danger" />
              </div>
              <h3 className="text-[15px] font-bold">Quitter ce serveur&nbsp;?</h3>
              <p className="mt-1.5 text-[13px] leading-relaxed text-[var(--muted)]/70">
                Vous devrez être réinvité pour le rejoindre à nouveau.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-[var(--border)]/20 bg-[var(--surface-secondary)]/30 px-6 py-4">
              <Button variant="secondary" onPress={() => setLeaveId(null)}>
                Annuler
              </Button>
              <Button variant="danger" onPress={() => leaveId && handleLeave(leaveId)}>
                <LogOutIcon size={14} />
                {t.serverList?.leaveServer ?? 'Quitter'}
              </Button>
            </div>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>

      {/* ── Join server ── */}
      <Modal.Backdrop
        isOpen={joinOpen}
        onOpenChange={(open) => { setJoinOpen(open); if (!open) resetJoin(); }}
        variant="blur"
      >
        <Modal.Container size="md">
          <Modal.Dialog className="max-w-105 overflow-hidden rounded-2xl border border-[var(--border)]/30 p-0 shadow-2xl">

            <div className="flex items-start justify-between border-b border-[var(--border)]/20 px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent/10 ring-1 ring-accent/20">
                  <Link2Icon size={18} className="text-accent" />
                </div>
                <div>
                  <h2 className="text-[15px] font-bold">{t.serverList?.modal?.joinNav ?? 'Rejoindre un serveur'}</h2>
                  <p className="text-[11px] text-[var(--muted)]/60">Entrez un code ou un lien d&apos;invitation</p>
                </div>
              </div>
              <CloseButton onPress={() => setJoinOpen(false)} className="shrink-0" />
            </div>

            <div className="space-y-4 px-6 py-5">
              {joinErr && (
                <Alert status="danger">
                  <Alert.Indicator />
                  <Alert.Content>
                    <Alert.Title>Erreur</Alert.Title>
                    <Alert.Description>{joinErr}</Alert.Description>
                  </Alert.Content>
                  <CloseButton onPress={() => setJoinErr('')} />
                </Alert>
              )}

              {joinOk && (
                <Alert status="success">
                  <Alert.Indicator />
                  <Alert.Content>
                    <Alert.Title>Succès&nbsp;!</Alert.Title>
                    <Alert.Description>{joinOk}</Alert.Description>
                  </Alert.Content>
                </Alert>
              )}

              <Form onSubmit={(e) => { e.preventDefault(); handleJoin(); }}>
                <div className="space-y-2">
                  <Label className="text-[13px] font-semibold">Code ou lien d&apos;invitation</Label>
                  <InputGroup>
                    <InputGroup.Input
                      value={invite}
                      onChange={(e) => setInvite(e.target.value)}
                      placeholder="https://alfychat.app/invite/... ou ABCD1234"
                      onKeyDown={(e: React.KeyboardEvent) => e.key === 'Enter' && handleJoin()}
                      autoFocus
                    />
                  </InputGroup>
                  <Description className="text-[11px] text-[var(--muted)]/50">
                    Collez un lien ou saisissez le code court.
                  </Description>
                </div>

                <div className="mt-5 flex items-center justify-between gap-3">
                  <Popover>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 gap-1.5 px-2 text-[11px] text-[var(--muted)]/60 hover:text-muted"
                    >
                      <HelpCircleIcon size={12} />
                      Où trouver un code&nbsp;?
                    </Button>
                    <Popover.Content className="max-w-56">
                      <Popover.Dialog>
                        <Popover.Arrow />
                        <Popover.Heading className="text-[13px] font-semibold">Trouver un code</Popover.Heading>
                        <p className="mt-1 text-[11px] text-[var(--muted)]/70">
                          Demandez à un administrateur ou explorez les serveurs publics.
                        </p>
                      </Popover.Dialog>
                    </Popover.Content>
                  </Popover>

                  <Button
                    type="submit"
                    onPress={handleJoin}
                    isDisabled={!invite.trim() || joining}
                    className="min-w-28 shrink-0"
                  >
                    {joining ? <Spinner size="sm" color="current" /> : <ArrowRightIcon size={14} />}
                    Rejoindre
                  </Button>
                </div>
              </Form>
            </div>

            <div className="flex items-center justify-between border-t border-[var(--border)]/20 bg-[var(--surface-secondary)]/30 px-6 py-3">
              <p className="text-[11px] text-[var(--muted)]/50">Explorer les serveurs publics</p>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 gap-1.5 px-2 text-[11px] text-accent hover:bg-accent/10"
                onPress={() => { setJoinOpen(false); router.push('/channels/discover-server'); }}
              >
                <CompassIcon size={12} />
                Découvrir
              </Button>
            </div>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </>
  );
}
