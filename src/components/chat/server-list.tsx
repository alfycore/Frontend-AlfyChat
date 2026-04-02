'use client';

import { useEffect, useRef, useState } from 'react';
import { useLayoutPrefs } from '@/hooks/use-layout-prefs';
import {
  MessageCircleIcon,
  Link2Icon,
  ArrowRightIcon,
  CompassIcon,
  HelpCircleIcon,
  HomeIcon,
  SettingsIcon,
  LogOutIcon,
  CopyIcon,
  PlusIcon,
} from '@/components/icons';
import { api, resolveMediaUrl } from '@/lib/api';
import { socketService } from '@/lib/socket';
import { useRouter } from 'next/navigation';
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
  Separator,
  Skeleton,
  Spinner,
  toast,
  Tooltip,
} from '@heroui/react';
import { cn } from '@/lib/utils';
import { ServerSettingsDialog } from '@/components/chat/server-settings-dialog';
import { useTranslation } from '@/components/locale-provider';

//  Types 

interface Server {
  id: string;
  name: string;
  iconUrl?: string;
}

interface ServerListProps {
  selectedServer: string | null;
  onSelectServer: (serverId: string | null) => void;
  horizontal?: boolean;
}

//  Pill indicator (left edge, visible when active) 

function Indicator({ active }: { active: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        'pointer-events-none absolute -left-0.5 top-1/2 w-[3px] -translate-y-1/2 rounded-r-full bg-white transition-all duration-200',
        active ? 'h-9 opacity-100 shadow-[0_0_6px_1px_rgba(255,255,255,0.4)]' : 'h-2 opacity-0 group-hover:opacity-50',
      )}
    />
  );
}

//  ServerList 

export function ServerList({ selectedServer, onSelectServer, horizontal = false }: ServerListProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const { prefs: layoutPrefs } = useLayoutPrefs();
  const compact = layoutPrefs.compactServerList;

  const btnSize  = compact ? 'size-9' : horizontal ? 'size-10' : 'size-12';
  const iconSize = compact ? 16 : horizontal ? 18 : 22;
  const side     = horizontal ? 'bottom' : 'right';

  //  State 

  const [servers,     setServers    ] = useState<Server[]>([]);
  const [loading,     setLoading    ] = useState(true);
  const [joinModal,   setJoinModal  ] = useState(false);
  const [settingsId,  setSettingsId ] = useState<string | null>(null);
  const [nodeOnline,  setNodeOnline ] = useState<Set<string>>(new Set());
  const [contextId,   setContextId  ] = useState<string | null>(null);
  const [leaveId,     setLeaveId    ] = useState<string | null>(null);

  const [inviteCode,  setInviteCode ] = useState('');
  const [isJoining,   setIsJoining  ] = useState(false);
  const [joinError,   setJoinError  ] = useState('');
  const [joinSuccess, setJoinSuccess] = useState('');

  // Drag & drop
  const dragRef = useRef<string | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);

  //  Effects 

  useEffect(() => { loadServers(); }, []);

  useEffect(() => {
    const onOnline  = (d: any) => { const id = d?.payload?.serverId ?? d?.serverId; if (id) setNodeOnline((p) => new Set(p).add(id)); };
    const onOffline = (d: any) => { const id = d?.payload?.serverId ?? d?.serverId; if (id) setNodeOnline((p) => { const s = new Set(p); s.delete(id); return s; }); };
    const onUpdate  = (d: any) => {
      const s  = d?.payload ?? d?.updates ?? d;
      const id = s?.id ?? s?.serverId;
      if (!id) return;
      setServers((p) => p.map((sv) =>
        sv.id === id
          ? { ...sv, ...(s.name != null && { name: s.name }), ...(s.iconUrl !== undefined && { iconUrl: s.iconUrl || undefined }) }
          : sv,
      ));
    };
    const onDelete  = (d: any) => { const id = d?.payload?.serverId ?? d?.serverId; if (id) { setServers((p) => p.filter((sv) => sv.id !== id)); if (selectedServer === id) onSelectServer(null); } };
    const onRemoved = (d: any) => { const id = d?.payload?.serverId ?? d?.serverId; if (id) { setServers((p) => p.filter((sv) => sv.id !== id)); if (selectedServer === id) onSelectServer(null); toast.warning('Vous avez été retiré du serveur.'); } };

    socketService.on('SERVER_NODE_ONLINE',  onOnline);
    socketService.on('SERVER_NODE_OFFLINE', onOffline);
    socketService.on('SERVER_UPDATE',       onUpdate);
    socketService.on('SERVER_DELETE',       onDelete);
    socketService.on('SERVER_KICKED',       onRemoved);
    socketService.on('SERVER_BANNED',       onRemoved);

    return () => {
      socketService.off('SERVER_NODE_ONLINE',  onOnline);
      socketService.off('SERVER_NODE_OFFLINE', onOffline);
      socketService.off('SERVER_UPDATE',       onUpdate);
      socketService.off('SERVER_DELETE',       onDelete);
      socketService.off('SERVER_KICKED',       onRemoved);
      socketService.off('SERVER_BANNED',       onRemoved);
    };
  }, [selectedServer]);

  //  API calls 

  const loadServers = async () => {
    setLoading(true);
    const res = await api.getServers();
    if (res.success && res.data) {
      let list: Server[] = (res.data as any[]).map((s: any) => ({ id: s.id, name: s.name, iconUrl: s.iconUrl || s.icon_url }));
      try {
        const saved = JSON.parse(localStorage.getItem('alfychat_server_order') || '[]') as string[];
        if (saved.length > 0) {
          const idx = new Map(saved.map((id, i) => [id, i]));
          list = list.sort((a, b) => (idx.get(a.id) ?? list.length) - (idx.get(b.id) ?? list.length));
        }
      } catch {}
      setServers(list);
    }
    setLoading(false);
  };

  const handleJoin = async () => {
    if (!inviteCode.trim() || isJoining) return;
    setIsJoining(true);
    setJoinError('');
    setJoinSuccess('');
    const res = await api.joinServer(inviteCode.trim());
    setIsJoining(false);
    if (res.success && res.data) {
      const s = res.data as any;
      const joined: Server = { id: s.id ?? s.serverId, name: s.name, iconUrl: s.iconUrl };
      setServers((p) => [...p, joined]);
      setJoinSuccess(`Bienvenue sur ${joined.name} !`);
      setTimeout(() => { setJoinModal(false); resetJoin(); onSelectServer(joined.id); }, 1200);
    } else {
      setJoinError(res.error ?? 'Code invalide ou serveur introuvable.');
    }
  };

  const handleLeave = async (id: string) => {
    const res = await api.leaveServer(id);
    if (res.success) {
      setServers((p) => p.filter((s) => s.id !== id));
      if (selectedServer === id) onSelectServer(null);
      toast.success('Serveur quitté.');
    } else {
      toast.warning((res as any).error ?? (res as any).message ?? 'Impossible de quitter le serveur.');
    }
    setLeaveId(null);
  };

  const resetJoin = () => { setInviteCode(''); setJoinError(''); setJoinSuccess(''); };

  //  Drag & drop 

  const handleDragStart = (id: string) => (e: React.DragEvent) => {
    dragRef.current = id;
    setDragging(id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (id: string) => (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragRef.current !== id) setDragOver(id);
  };

  const handleDrop = (id: string) => (e: React.DragEvent) => {
    e.preventDefault();
    const from = dragRef.current;
    if (!from || from === id) { setDragOver(null); return; }
    setServers((prev) => {
      const arr = [...prev];
      const fi  = arr.findIndex((s) => s.id === from);
      const ti  = arr.findIndex((s) => s.id === id);
      if (fi === -1 || ti === -1) return prev;
      const [item] = arr.splice(fi, 1);
      arr.splice(ti, 0, item);
      try { localStorage.setItem('alfychat_server_order', JSON.stringify(arr.map((s) => s.id))); } catch {}
      return arr;
    });
    dragRef.current = null;
    setDragging(null);
    setDragOver(null);
  };

  const handleDragEnd = () => { dragRef.current = null; setDragging(null); setDragOver(null); };

  //  Render 

  return (
    <>
      {/* ─────────────────────────────── BAR ─────────────────────────────── */}
      <nav
        aria-label="Serveurs"
        className={cn(
          'flex shrink-0 items-center gap-1.5 bg-[var(--background)]',
          horizontal
            ? 'h-14 w-full flex-row border-b border-white/5 px-3'
            : cn(
                'h-full flex-col border-r border-white/5 py-3',
                compact ? 'w-[56px]' : 'w-[72px]',
              ),
        )}
      >
        {/* ── DMs ── */}
        <Tooltip delay={0}>
          <div className="group relative mx-auto flex shrink-0 items-center justify-center">
            <Indicator active={selectedServer === null} />
            <Button
              isIconOnly
              variant="ghost"
              aria-label={t.serverList?.dms ?? 'Messages directs'}
              className={cn(
                'shrink-0 transition-all duration-200',
                btnSize,
                selectedServer === null
                  ? '!rounded-[14px] bg-accent text-white shadow-lg shadow-accent/40'
                  : '!rounded-full bg-white/5 text-white/50 hover:!rounded-[14px] hover:bg-accent/15 hover:text-accent',
              )}
              onPress={() => onSelectServer(null)}
            >
              <MessageCircleIcon size={iconSize} />
            </Button>
          </div>
          <Tooltip.Content showArrow placement={side}>
            <Tooltip.Arrow />
            <p className="text-[11px] font-medium">{t.serverList?.dms ?? 'Messages directs'}</p>
            <Kbd className="mt-1 text-[10px]"><Kbd.Abbr keyValue="ctrl" /> D</Kbd>
          </Tooltip.Content>
        </Tooltip>

        <div className={cn('shrink-0 rounded-full bg-white/10', horizontal ? 'h-6 w-px' : 'h-px w-6')} />

        {/* ── Server scroll list ── */}
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
                      'flex items-center justify-center transition-all duration-150',
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
                          <Indicator active={active} />
                          <Badge.Anchor>
                            <Avatar
                              className={cn(
                                'transition-all duration-200',
                                btnSize,
                                active ? 'rounded-[14px] shadow-lg shadow-black/40' : 'rounded-full group-hover:rounded-[14px]',
                                isOver && 'ring-2 ring-accent ring-offset-1 ring-offset-[var(--background)]',
                              )}
                            >
                              <Avatar.Image src={server.iconUrl ? resolveMediaUrl(server.iconUrl) : undefined} alt={server.name} />
                              <Avatar.Fallback
                                className={cn(
                                  'bg-[var(--surface-secondary)] text-sm font-bold transition-all duration-200',
                                  active ? 'rounded-[14px]' : 'rounded-full group-hover:rounded-[14px]',
                                )}
                              >
                                {server.name.charAt(0).toUpperCase()}
                              </Avatar.Fallback>
                            </Avatar>
                            {nodeOnline.has(server.id) && (
                              <Badge color="success" size="sm" placement="bottom-right" />
                            )}
                          </Badge.Anchor>
                          {/* Glow ring on active */}
                          {active && (
                            <span className="pointer-events-none absolute inset-0 rounded-[14px] ring-2 ring-white/20 ring-offset-1 ring-offset-[var(--background)]" />
                          )}
                        </div>

                        <Tooltip.Content showArrow placement={side}>
                          <Tooltip.Arrow />
                          <p className="text-[11px] font-semibold">{server.name}</p>
                          {nodeOnline.has(server.id) && (
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
                            if (key === 'invite') { navigator.clipboard.writeText(`${window.location.origin}/invite/${server.id}`); toast.success("Lien d'invitation copié !"); }
                            if (key === 'leave')    setLeaveId(server.id);
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

        {/* ── Rejoindre ── */}
        <Tooltip delay={0}>
          <Button
            isIconOnly
            variant="ghost"
            aria-label={t.serverList?.modal?.joinNav ?? 'Rejoindre un serveur'}
            className={cn(
              'mx-auto shrink-0 !rounded-full bg-white/5 text-white/40 transition-all duration-200 hover:!rounded-[14px] hover:bg-success/15 hover:text-success',
              btnSize,
            )}
            onPress={() => setJoinModal(true)}
          >
            <PlusIcon size={iconSize} />
          </Button>
          <Tooltip.Content showArrow placement={side}>
            <Tooltip.Arrow />
            <p className="text-[11px] font-medium">{t.serverList?.modal?.joinNav ?? 'Rejoindre un serveur'}</p>
            <Kbd className="mt-1 text-[10px]"><Kbd.Abbr keyValue="ctrl" /> N</Kbd>
          </Tooltip.Content>
        </Tooltip>

        {/* ── Découvrir ── */}
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

        {/* ── Accueil ── */}
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

      {/*  SERVER SETTINGS  */}
      {settingsId && (
        <ServerSettingsDialog
          serverId={settingsId}
          open={!!settingsId}
          onOpenChange={(open) => { if (!open) setSettingsId(null); }}
          onServerUpdated={loadServers}
        />
      )}

      {/*  CONFIRM LEAVE  */}
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

      {/*  JOIN SERVER  */}
      <Modal.Backdrop
        isOpen={joinModal}
        onOpenChange={(open) => { setJoinModal(open); if (!open) resetJoin(); }}
        variant="blur"
      >
        <Modal.Container size="md">
          <Modal.Dialog className="max-w-105 overflow-hidden rounded-2xl border border-[var(--border)]/30 p-0 shadow-2xl">

            {/* Header */}
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
              <CloseButton onPress={() => setJoinModal(false)} className="shrink-0" />
            </div>

            {/* Body */}
            <div className="space-y-4 px-6 py-5">
              {joinError && (
                <Alert status="danger">
                  <Alert.Indicator />
                  <Alert.Content>
                    <Alert.Title>Erreur</Alert.Title>
                    <Alert.Description>{joinError}</Alert.Description>
                  </Alert.Content>
                  <CloseButton onPress={() => setJoinError('')} />
                </Alert>
              )}

              {joinSuccess && (
                <Alert status="success">
                  <Alert.Indicator />
                  <Alert.Content>
                    <Alert.Title>Succès&nbsp;!</Alert.Title>
                    <Alert.Description>{joinSuccess}</Alert.Description>
                  </Alert.Content>
                </Alert>
              )}

              <Form onSubmit={(e) => { e.preventDefault(); handleJoin(); }}>
                <div className="space-y-2">
                  <Label className="text-[13px] font-semibold">Code ou lien d&apos;invitation</Label>
                  <InputGroup>
                    <InputGroup.Input
                      value={inviteCode}
                      onChange={(e) => setInviteCode(e.target.value)}
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
                    isDisabled={!inviteCode.trim() || isJoining}
                    className="min-w-28 shrink-0"
                  >
                    {isJoining ? <Spinner size="sm" color="current" /> : <ArrowRightIcon size={14} />}
                    Rejoindre
                  </Button>
                </div>
              </Form>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between border-t border-[var(--border)]/20 bg-[var(--surface-secondary)]/30 px-6 py-3">
              <p className="text-[11px] text-[var(--muted)]/50">Explorer les serveurs publics</p>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 gap-1.5 px-2 text-[11px] text-accent hover:bg-accent/10"
                onPress={() => { setJoinModal(false); router.push('/channels/discover-server'); }}
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