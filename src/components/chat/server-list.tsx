'use client';

import { useEffect, useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  MessageCircleIcon,
  Link2Icon,
  ArrowRightIcon,
  CompassIcon,
  HelpCircleIcon,
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

export function ServerList({ selectedServer, onSelectServer }: ServerListProps) {
  const router = useRouter();
  const { t } = useTranslation();

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
      setServers((res.data as any[]).map((s: any) => ({
        id: s.id,
        name: s.name,
        iconUrl: s.iconUrl || s.icon_url,
      })));
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
      toast.danger('Impossible de quitter le serveur.');
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
      <div className="flex h-full w-17 flex-col items-center gap-1.5 overflow-hidden border-r border-(--border)/20 bg-background py-3">

        {/* DMs */}
        <Tooltip delay={0}>
          <Button
            isIconOnly
            variant="ghost"
            className={cn(
              'group relative size-12 rounded-2xl transition-all duration-200',
              selectedServer === null
                ? 'rounded-xl bg-accent text-accent-foreground shadow-lg shadow-accent/20'
                : 'bg-(--surface-secondary)/50 text-muted hover:rounded-xl hover:bg-accent/10 hover:text-accent',
            )}
            onPress={() => onSelectServer(null)}
          >
            <Indicator active={selectedServer === null} />
            <HugeiconsIcon icon={MessageCircleIcon} size={22} />
          </Button>
          <Tooltip.Content showArrow placement="right">
            <Tooltip.Arrow />
            <p className="text-[11px] font-medium">{t.serverList?.dms || 'Messages directs'}</p>
            <Kbd className="mt-1 text-[10px]"><Kbd.Abbr keyValue="ctrl" /> D</Kbd>
          </Tooltip.Content>
        </Tooltip>

        <Separator className="w-8 opacity-30" />

        {/* Server list */}
        <ScrollShadow
          className="flex w-full flex-1 flex-col items-center gap-1.5 overflow-y-auto px-2 pb-1"
          hideScrollBar
        >
          {isLoading
            ? Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="size-12 rounded-2xl" animationType="shimmer" />
              ))
            : servers.map((server) => (
                <Dropdown
                  key={server.id}
                  isOpen={dropdownOpenId === server.id}
                  onOpenChange={(open) => setDropdownOpenId(open ? server.id : null)}
                >
                  <Tooltip delay={0}>
                    <div
                      slot="trigger"
                      className={cn(
                        'group relative flex size-12 cursor-pointer items-center justify-center rounded-2xl transition-all duration-200',
                        selectedServer === server.id
                          ? 'rounded-xl ring-2 ring-accent/25 ring-offset-1 ring-offset-background'
                          : 'hover:rounded-xl',
                      )}
                      onClick={() => onSelectServer(server.id)}
                      onContextMenu={(e) => { e.preventDefault(); setDropdownOpenId(server.id); }}
                    >
                      <Indicator active={selectedServer === server.id} />
                      <Badge.Anchor>
                        <Avatar className="size-12 rounded-2xl transition-all duration-200 group-hover:rounded-xl">
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

                    <Tooltip.Content showArrow placement="right">
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
                        <HugeiconsIcon icon={SettingsIcon} size={14} className="mr-2 shrink-0 opacity-60" />
                        <Label>Paramètres</Label>
                      </Dropdown.Item>
                      <Dropdown.Item id="invite" textValue="Copier l'invitation">
                        <HugeiconsIcon icon={CopyIcon} size={14} className="mr-2 shrink-0 opacity-60" />
                        <Label>Copier l&apos;invitation</Label>
                      </Dropdown.Item>
                      <Dropdown.Item id="leave" className="text-danger" textValue="Quitter">
                        <HugeiconsIcon icon={LogOutIcon} size={14} className="mr-2 shrink-0" />
                        <Label>{t.serverList?.leaveServer || 'Quitter'}</Label>
                      </Dropdown.Item>
                    </Dropdown.Menu>
                  </Dropdown.Popover>
                </Dropdown>
              ))}
        </ScrollShadow>

        <Separator className="w-8 opacity-30" />

        {/* Join server */}
        <Tooltip delay={0}>
          <Button
            isIconOnly
            variant="ghost"
            className="size-12 rounded-2xl bg-(--surface-secondary)/50 text-muted transition-all duration-200 hover:rounded-xl hover:bg-success-soft hover:text-success"
            onPress={() => setIsJoinModalOpen(true)}
          >
            <HugeiconsIcon icon={PlusIcon} size={20} />
          </Button>
          <Tooltip.Content showArrow placement="right">
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
            className="size-12 rounded-2xl bg-(--surface-secondary)/50 text-muted transition-all duration-200 hover:rounded-xl hover:bg-accent-soft hover:text-accent"
            onPress={() => router.push('/channels/discover-server')}
          >
            <HugeiconsIcon icon={CompassIcon} size={20} />
          </Button>
          <Tooltip.Content showArrow placement="right">
            <Tooltip.Arrow />
            <p className="text-[11px] font-medium">{t.serverList?.discoverServers || 'Découvrir'}</p>
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
          <Modal.Dialog className="overflow-hidden rounded-2xl border border-(--border)/30 p-0 shadow-2xl">
            <div className="px-6 pt-6 pb-5">
              <div className="mb-4 flex size-11 items-center justify-center rounded-xl bg-danger/10 ring-1 ring-danger/20">
                <HugeiconsIcon icon={LogOutIcon} size={20} className="text-danger" />
              </div>
              <h3 className="text-[15px] font-bold">Quitter ce serveur&nbsp;?</h3>
              <p className="mt-1.5 text-[13px] leading-relaxed text-(--muted)/70">
                Vous devrez être réinvité pour le rejoindre à nouveau.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-(--border)/20 bg-(--surface-secondary)/30 px-6 py-4">
              <Button variant="secondary" onPress={() => setConfirmLeaveServerId(null)}>
                Annuler
              </Button>
              <Button
                variant="danger"
                onPress={() => confirmLeaveServerId && handleLeaveServer(confirmLeaveServerId)}
              >
                <HugeiconsIcon icon={LogOutIcon} size={14} />
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
          <Modal.Dialog className="max-w-105 overflow-hidden rounded-2xl border border-(--border)/30 p-0 shadow-2xl">

            {/* Header */}
            <div className="flex items-start justify-between border-b border-(--border)/20 px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent/10 ring-1 ring-accent/20">
                  <HugeiconsIcon icon={Link2Icon} size={18} className="text-accent" />
                </div>
                <div>
                  <h2 className="text-[15px] font-bold">
                    {t.serverList?.modal?.joinNav || 'Rejoindre un serveur'}
                  </h2>
                  <p className="text-[11px] text-(--muted)/60">
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
                  <Description className="text-[11px] text-(--muted)/50">
                    Collez un lien ou saisissez le code court.
                  </Description>
                </div>

                <div className="mt-5 flex items-center justify-between gap-3">
                  <Popover>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 gap-1.5 px-2 text-[11px] text-(--muted)/60 hover:text-muted"
                    >
                      <HugeiconsIcon icon={HelpCircleIcon} size={12} />
                      Où trouver un code&nbsp;?
                    </Button>
                    <Popover.Content className="max-w-56">
                      <Popover.Dialog>
                        <Popover.Arrow />
                        <Popover.Heading className="text-[13px] font-semibold">Trouver un code</Popover.Heading>
                        <p className="mt-1 text-[11px] text-(--muted)/70">
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
                      : <HugeiconsIcon icon={ArrowRightIcon} size={14} />}
                    Rejoindre
                  </Button>
                </div>
              </Form>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between border-t border-(--border)/20 bg-(--surface-secondary)/30 px-6 py-3">
              <p className="text-[11px] text-(--muted)/50">Explorer les serveurs publics</p>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 gap-1.5 px-2 text-[11px] text-accent hover:bg-accent/10"
                onPress={() => { setIsJoinModalOpen(false); router.push('/channels/discover-server'); }}
              >
                <HugeiconsIcon icon={CompassIcon} size={12} />
                Découvrir
              </Button>
            </div>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </>
  );
}
