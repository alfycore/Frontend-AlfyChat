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

/** Pill indicator — visible when active, mini on group-hover */
function Indicator({ active }: { active: boolean }) {
  return (
    <span
      className={cn(
        'pointer-events-none absolute left-0 top-1/2 w-1 -translate-y-1/2 rounded-r-full bg-foreground transition-all duration-200',
        active
          ? 'h-8 opacity-100 shadow-[0_0_8px_2px_rgba(255,255,255,0.25)]'
          : 'h-3 opacity-0 group-hover:opacity-60',
      )}
    />
  );
}

export function ServerList({ selectedServer, onSelectServer, horizontal = false }: ServerListProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const { prefs: layoutPrefs } = useLayoutPrefs();
  const compact = layoutPrefs.compactServerList;
  const btnSize = compact ? 'size-9' : horizontal ? 'size-10' : 'size-12';
  const iconSize = compact ? 16 : horizontal ? 18 : 22;
  const tooltipPlacement = horizontal ? 'bottom' : 'right';

  const [servers, setServers] = useState<Server[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [settingsServerId, setSettingsServerId] = useState<string | null>(null);
  const [nodeOnlineServers, setNodeOnlineServers] = useState<Set<string>>(new Set());
  const [dropdownOpenId, setDropdownOpenId] = useState<string | null>(null);
  const [confirmLeaveServerId, setConfirmLeaveServerId] = useState<string | null>(null);

  const [inviteCode, setInviteCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [joinError, setJoinError] = useState('');
  const [joinSuccess, setJoinSuccess] = useState('');

  // Drag & drop
  const dragIdRef = useRef<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  useEffect(() => { loadServers(); }, []);

  useEffect(() => {
    const handleOnline = (data: any) => {
      const sId = data?.payload?.serverId || data?.serverId;
      if (sId) setNodeOnlineServers((prev) => new Set(prev).add(sId));
    };
    const handleOffline = (data: any) => {
      const sId = data?.payload?.serverId || data?.serverId;
      if (sId) setNodeOnlineServers((prev) => { const s = new Set(prev); s.delete(sId); return s; });
    };
    const handleServerUpdate = (data: any) => {
      const s = data?.payload || data?.updates || data;
      const id = s?.id || s?.serverId;
      if (id) {
        setServers((prev) => prev.map((sv) =>
          sv.id === id
            ? {
                ...sv,
                ...(s.name != null && { name: s.name }),
                ...(s.iconUrl !== undefined && { iconUrl: s.iconUrl || undefined }),
                ...(s.bannerUrl !== undefined && { bannerUrl: s.bannerUrl || undefined }),
              }
            : sv,
        ));
      }
    };
    const handleServerDelete = (data: any) => {
      const sId = data?.payload?.serverId || data?.serverId;
      if (!sId) return;
      setServers((prev) => prev.filter((sv) => sv.id !== sId));
      if (selectedServer === sId) onSelectServer(null);
    };
    const handleServerRemoved = (data: any) => {
      const sId = data?.payload?.serverId || data?.serverId;
      if (!sId) return;
      setServers((prev) => prev.filter((sv) => sv.id !== sId));
      if (selectedServer === sId) onSelectServer(null);
      toast.warning('Vous avez été retiré du serveur.');
    };
    socketService.on('SERVER_NODE_ONLINE', handleOnline);
    socketService.on('SERVER_NODE_OFFLINE', handleOffline);
    socketService.on('SERVER_UPDATE', handleServerUpdate);
    socketService.on('SERVER_DELETE', handleServerDelete);
    socketService.on('SERVER_KICKED', handleServerRemoved);
    socketService.on('SERVER_BANNED', handleServerRemoved);
    return () => {
      socketService.off('SERVER_NODE_ONLINE', handleOnline);
      socketService.off('SERVER_NODE_OFFLINE', handleOffline);
      socketService.off('SERVER_UPDATE', handleServerUpdate);
      socketService.off('SERVER_DELETE', handleServerDelete);
      socketService.off('SERVER_KICKED', handleServerRemoved);
      socketService.off('SERVER_BANNED', handleServerRemoved);
    };
  }, [selectedServer]);

  const loadServers = async () => {
    setIsLoading(true);
    const res = await api.getServers();
    if (res.success && res.data) {
      let list: Server[] = (res.data as any[]).map((s: any) => ({
        id: s.id,
        name: s.name,
        iconUrl: s.iconUrl || s.icon_url,
      }));
      try {
        const saved = JSON.parse(localStorage.getItem('alfychat_server_order') || '[]') as string[];
        if (saved.length > 0) {
          const orderMap = new Map(saved.map((id, i) => [id, i]));
          list = [...list].sort((a, b) =>
            (orderMap.has(a.id) ? orderMap.get(a.id)! : list.length) -
            (orderMap.has(b.id) ? orderMap.get(b.id)! : list.length),
          );
        }
      } catch {}
      setServers(list);
    }
    setIsLoading(false);
  };

  const handleJoinServer = async () => {
    if (!inviteCode.trim() || isJoining) return;
    setIsJoining(true);
    setJoinError('');
    setJoinSuccess('');
    const res = await api.joinServer(inviteCode.trim());
    setIsJoining(false);
    if (res.success && res.data) {
      const s = res.data as any;
      const joined: Server = { id: s.id || s.serverId, name: s.name, iconUrl: s.iconUrl };
      setServers((prev) => [...prev, joined]);
      setJoinSuccess(`Bienvenue sur ${joined.name} !`);
      setTimeout(() => { setIsJoinModalOpen(false); resetJoinForm(); onSelectServer(joined.id); }, 1200);
    } else {
      setJoinError(res.error || 'Code invalide ou serveur introuvable.');
    }
  };

  const handleLeaveServer = async (serverId: string) => {
    const res = await api.leaveServer(serverId);
    if (res.success) {
      setServers((prev) => prev.filter((s) => s.id !== serverId));
      if (selectedServer === serverId) onSelectServer(null);
      toast.success('Serveur quitté.');
    } else {
      toast.warning(res.error || res.message || 'Impossible de quitter le serveur.');
    }
    setConfirmLeaveServerId(null);
  };

  const resetJoinForm = () => {
    setInviteCode('');
    setJoinError('');
    setJoinSuccess('');
  };

  return (
    <>
      {/* ── Sidebar ── */}
      <div className={cn(
        'flex items-center gap-1.5 overflow-hidden bg-[var(--surface)]/60 transition-all duration-200',
        horizontal
          ? 'h-14 w-full flex-row border-b border-[var(--border)]/20 px-2'
          : cn('h-full flex-col py-3', compact ? 'w-13' : 'w-17'),
      )}>

        {/* DMs */}
        <Tooltip delay={0}>
          <Button
            isIconOnly
            variant="ghost"
            className={cn(
              'group relative rounded-2xl transition-all duration-200 shrink-0',
              btnSize,
              selectedServer === null
                ? 'rounded-xl bg-accent text-accent-foreground shadow-lg shadow-accent/20'
                : 'bg-[var(--surface-secondary)]/50 text-muted hover:rounded-xl hover:bg-accent/10 hover:text-accent',
            )}
            onPress={() => onSelectServer(null)}
          >
            <Indicator active={selectedServer === null} />
            <MessageCircleIcon size={iconSize} />
          </Button>
          <Tooltip.Content showArrow placement={tooltipPlacement}>
            <Tooltip.Arrow />
            <p className="text-[11px] font-medium">{t.serverList?.dms || 'Messages directs'}</p>
            <Kbd className="mt-1 text-[10px]"><Kbd.Abbr keyValue="ctrl" /> D</Kbd>
          </Tooltip.Content>
        </Tooltip>

        <Separator className={horizontal ? 'h-8 opacity-30' : 'w-8 opacity-30'} orientation={horizontal ? 'vertical' : 'horizontal'} />

        {/* Server list */}
        <ScrollShadow
          className={cn(
            'flex items-center gap-1.5',
            horizontal
              ? 'h-full flex-1 flex-row overflow-x-auto px-1'
              : 'w-full flex-1 flex-col overflow-y-auto px-2 pb-1',
          )}
          hideScrollBar
          orientation={horizontal ? 'horizontal' : 'vertical'}
        >
          {isLoading
            ? Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className={cn('shrink-0 rounded-2xl', compact ? 'size-9' : horizontal ? 'size-10' : 'size-12')} animationType="shimmer" />
              ))
            : servers.map((server) => (
                <div
                  key={server.id}
                  draggable
                  onDragStart={(e) => {
                    dragIdRef.current = server.id;
                    setDraggingId(server.id);
                    e.dataTransfer.effectAllowed = 'move';
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                    if (dragIdRef.current !== server.id) setDragOverId(server.id);
                  }}
                  onDragLeave={(e) => {
                    if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOverId(null);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    const from = dragIdRef.current;
                    if (!from || from === server.id) { setDragOverId(null); return; }
                    setServers((prev) => {
                      const arr = [...prev];
                      const fromIdx = arr.findIndex((s) => s.id === from);
                      const toIdx = arr.findIndex((s) => s.id === server.id);
                      if (fromIdx === -1 || toIdx === -1) return prev;
                      const [item] = arr.splice(fromIdx, 1);
                      arr.splice(toIdx, 0, item);
                      try { localStorage.setItem('alfychat_server_order', JSON.stringify(arr.map((s) => s.id))); } catch {}
                      return arr;
                    });
                    dragIdRef.current = null;
                    setDraggingId(null);
                    setDragOverId(null);
                  }}
                  onDragEnd={() => { dragIdRef.current = null; setDraggingId(null); setDragOverId(null); }}
                  className={cn(
                    'transition-all duration-150',
                    draggingId === server.id && 'opacity-40 scale-95',
                    dragOverId === server.id && draggingId !== server.id && 'translate-y-0.5 opacity-70',
                  )}
                >
                <Dropdown
                  isOpen={dropdownOpenId === server.id}
                  onOpenChange={(open) => setDropdownOpenId(open ? server.id : null)}
                >
                  <Tooltip delay={0}>
                    <div
                      slot="trigger"
                      className={cn(
                        'group relative flex shrink-0 cursor-pointer items-center justify-center rounded-2xl transition-all duration-200',
                        btnSize,
                        selectedServer === server.id
                          ? 'rounded-xl ring-2 ring-accent/25 ring-offset-1 ring-offset-background'
                          : 'hover:rounded-xl',
                        dragOverId === server.id && 'ring-2 ring-[var(--accent)]/40 ring-offset-1 ring-offset-[var(--background)]',
                      )}
                      onClick={() => onSelectServer(server.id)}
                      onContextMenu={(e) => { e.preventDefault(); setDropdownOpenId(server.id); }}
                    >
                      <Indicator active={selectedServer === server.id} />
                      <Badge.Anchor>
                        <Avatar className={cn('rounded-2xl transition-all duration-200 group-hover:rounded-xl', btnSize)}>
                          <Avatar.Image
                            src={server.iconUrl ? resolveMediaUrl(server.iconUrl) : undefined}
                            alt={server.name}
                          />
                          <Avatar.Fallback className="rounded-2xl bg-surface-secondary text-sm font-semibold transition-all duration-200 group-hover:rounded-xl">
                            {server.name.charAt(0).toUpperCase()}
                          </Avatar.Fallback>
                        </Avatar>
                        {nodeOnlineServers.has(server.id) && (
                          <Badge color="success" size="sm" placement="bottom-right" />
                        )}
                      </Badge.Anchor>
                    </div>

                    <Tooltip.Content showArrow placement={tooltipPlacement}>
                      <Tooltip.Arrow />
                      <p className="text-[11px] font-semibold">{server.name}</p>
                      {nodeOnlineServers.has(server.id) && (
                        <Chip color="success" variant="soft" size="sm" className="mt-1">
                          <Chip.Label className="text-[10px]">Node en ligne</Chip.Label>
                        </Chip>
                      )}
                    </Tooltip.Content>
                  </Tooltip>

                  <Dropdown.Popover placement="right top" className="min-w-47">
                    <Dropdown.Menu
                      aria-label={t.serverList?.serverOptions || 'Options du serveur'}
                      onAction={(key) => {
                        setDropdownOpenId(null);
                        if (key === 'settings') setSettingsServerId(server.id);
                        if (key === 'invite') {
                          navigator.clipboard.writeText(`${window.location.origin}/invite/${server.id}`);
                          toast.success("Lien d'invitation copié !");
                        }
                        if (key === 'leave') setConfirmLeaveServerId(server.id);
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
                        <Label>{t.serverList?.leaveServer || 'Quitter'}</Label>
                      </Dropdown.Item>
                    </Dropdown.Menu>
                  </Dropdown.Popover>
                </Dropdown>
                </div>
              ))}
        </ScrollShadow>

        <Separator className={horizontal ? 'h-8 opacity-30' : 'w-8 opacity-30'} orientation={horizontal ? 'vertical' : 'horizontal'} />

        {/* Join server */}
        <Tooltip delay={0}>
          <Button
            isIconOnly
            variant="ghost"
            className={cn('shrink-0 rounded-2xl bg-[var(--surface-secondary)]/50 text-muted transition-all duration-200 hover:rounded-xl hover:bg-success-soft hover:text-success', btnSize)}
            onPress={() => setIsJoinModalOpen(true)}
          >
            <PlusIcon size={iconSize} />
          </Button>
          <Tooltip.Content showArrow placement={tooltipPlacement}>
            <Tooltip.Arrow />
            <p className="text-[11px] font-medium">{t.serverList?.modal?.joinNav || 'Rejoindre un serveur'}</p>
            <Kbd className="mt-1 text-[10px]"><Kbd.Abbr keyValue="ctrl" /> N</Kbd>
          </Tooltip.Content>
        </Tooltip>

        {/* Discover */}
        <Tooltip delay={0}>
          <Button
            isIconOnly
            variant="ghost"
            className={cn('shrink-0 rounded-2xl bg-[var(--surface-secondary)]/50 text-muted transition-all duration-200 hover:rounded-xl hover:bg-accent-soft hover:text-accent', btnSize)}
            onPress={() => router.push('/channels/discover-server')}
          >
            <CompassIcon size={iconSize} />
          </Button>
          <Tooltip.Content showArrow placement={tooltipPlacement}>
            <Tooltip.Arrow />
            <p className="text-[11px] font-medium">{t.serverList?.discoverServers || 'Découvrir'}</p>
          </Tooltip.Content>
        </Tooltip>

        {/* Welcome page */}
        <Tooltip delay={0}>
          <Button
            isIconOnly
            variant="ghost"
            className={cn('shrink-0 rounded-2xl bg-[var(--surface-secondary)]/50 text-muted transition-all duration-200 hover:rounded-xl hover:bg-accent-soft hover:text-accent', btnSize)}
            onPress={() => router.push('/channels/gotostart')}
          >
            <HomeIcon size={iconSize} />
          </Button>
          <Tooltip.Content showArrow placement={tooltipPlacement}>
            <Tooltip.Arrow />
            <p className="text-[11px] font-medium">Bienvenue</p>
          </Tooltip.Content>
        </Tooltip>
      </div>

      {/* ── Server Settings Dialog ── */}
      {settingsServerId && (
        <ServerSettingsDialog
          serverId={settingsServerId}
          open={!!settingsServerId}
          onOpenChange={(open) => { if (!open) setSettingsServerId(null); }}
          onServerUpdated={loadServers}
        />
      )}

      {/* ── Confirm Leave Modal ── */}
      <Modal.Backdrop
        isOpen={!!confirmLeaveServerId}
        onOpenChange={(open) => { if (!open) setConfirmLeaveServerId(null); }}
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
              <Button variant="secondary" onPress={() => setConfirmLeaveServerId(null)}>
                Annuler
              </Button>
              <Button
                variant="danger"
                onPress={() => confirmLeaveServerId && handleLeaveServer(confirmLeaveServerId)}
              >
                <LogOutIcon size={14} />
                {t.serverList?.leaveServer || 'Quitter'}
              </Button>
            </div>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>

      {/* ── Join Server Modal ── */}
      <Modal.Backdrop
        isOpen={isJoinModalOpen}
        onOpenChange={(open) => { setIsJoinModalOpen(open); if (!open) resetJoinForm(); }}
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
                  <h2 className="text-[15px] font-bold">
                    {t.serverList?.modal?.joinNav || 'Rejoindre un serveur'}
                  </h2>
                  <p className="text-[11px] text-[var(--muted)]/60">
                    Entrez un code ou un lien d&apos;invitation
                  </p>
                </div>
              </div>
              <CloseButton onPress={() => setIsJoinModalOpen(false)} className="shrink-0" />
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

              <Form onSubmit={(e) => { e.preventDefault(); handleJoinServer(); }}>
                <div className="space-y-2">
                  <Label className="text-[13px] font-semibold">Code ou lien d&apos;invitation</Label>
                  <InputGroup>
                    <InputGroup.Input
                      value={inviteCode}
                      onChange={(e) => setInviteCode(e.target.value)}
                      placeholder="https://alfychat.app/invite/... ou ABCD1234"
                      onKeyDown={(e: React.KeyboardEvent) => e.key === 'Enter' && handleJoinServer()}
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
                    onPress={handleJoinServer}
                    isDisabled={!inviteCode.trim() || isJoining}
                    className="min-w-28 shrink-0"
                  >
                    {isJoining
                      ? <Spinner size="sm" color="current" />
                      : <ArrowRightIcon size={14} />}
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
                onPress={() => { setIsJoinModalOpen(false); router.push('/channels/discover-server'); }}
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
