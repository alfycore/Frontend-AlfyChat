'use client';

/**
 * Carte du bas de colonne (sous le rail ET la liste des salons, comme Discord) :
 *
 *  ┌ Voix connectée ─────────────────── [bruit] [raccrocher] ┐  ← tout appel en cours
 *  │ Salon / Serveur (ou @contact, ou groupe)        00:03    │     (salon vocal, MP, groupe)
 *  │ [caméra] [écran] [main levée] [ouvrir l'appel]           │
 *  ├──────────────────────────────────────────────────────────┤
 *  │ (avatar) Pseudo / statut        [micro ▾] [casque ▾] [⚙] │  ← panneau utilisateur
 *  └──────────────────────────────────────────────────────────┘
 */

import { Avatar, Button, Dropdown, Header, Label, Separator, Tooltip, toast } from '@heroui/react';
import {
  AudioLines,
  Check,
  ChevronDown,
  Copy,
  Hand,
  HeadphoneOff,
  Headphones,
  Maximize2,
  Mic,
  MicOff,
  MonitorUp,
  PhoneOff,
  Settings,
  Signal,
  Video,
  VideoOff,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/hooks/use-auth';
import { useCallContext } from '@/hooks/use-call-context';
import { getAudioPreferences, setAudioPreferences } from '@/hooks/use-call';
import { resolveMediaUrl } from '@/lib/api';
import { socketService } from '@/lib/socket';
import { useTranslation } from '@/components/locale-provider';
import { cn } from '@/lib/utils';
import { StatusDot, usePresenceLabels } from '@/components/alfy/primitives/status-dot';
import type { AlfyPresence } from '@/components/alfy/mock/types';
import { useGuildChannel, useGuildInfo } from '@/components/alfy/guild/hooks';
import { copyText } from '@/components/alfy/guild/actions';
import { useGuildVoice } from '@/components/alfy/guild/voice/use-guild-voice';
import { useVoicePrefs } from '@/components/alfy/guild/voice/voice-prefs';

const ACTIVE = new Set(['calling', 'connecting', 'connected']);

function formatDuration(total: number): string {
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mmss = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return h > 0 ? `${h}:${mmss}` : mmss;
}

function IconButton({
  label,
  onPress,
  active,
  danger,
  disabled,
  children,
  className,
}: {
  label: string;
  onPress: () => void;
  active?: boolean;
  danger?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Tooltip delay={250} closeDelay={0}>
      <Button
        isIconOnly
        size="sm"
        variant="ghost"
        aria-label={label}
        aria-pressed={active}
        isDisabled={disabled}
        onPress={onPress}
        className={cn(
          'size-8 min-w-8 transition-colors duration-(--dur-1)',
          danger ? 'text-foreground hover:bg-danger/15 hover:text-danger' : 'text-muted hover:bg-foreground/8 hover:text-foreground',
          className,
        )}
      >
        {children}
      </Button>
      <Tooltip.Content>
        <p>{label}</p>
      </Tooltip.Content>
    </Tooltip>
  );
}

/** Grand bouton de la rangée d'actions vocales. */
function TileButton({
  label,
  onPress,
  active,
  disabled,
  children,
}: {
  label: string;
  onPress: () => void;
  active?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Tooltip delay={250} closeDelay={0}>
      <Button
        size="sm"
        variant={active ? 'primary' : 'secondary'}
        aria-label={label}
        aria-pressed={active}
        isDisabled={disabled}
        onPress={onPress}
        className="h-8 min-w-0 flex-1 px-0"
      >
        {children}
      </Button>
      <Tooltip.Content>
        <p>{label}</p>
      </Tooltip.Content>
    </Tooltip>
  );
}

/* ── Voix connectée — tous les appels ─────────────────────────────────────── */

function VoicePanel() {
  const { t } = useTranslation();
  const router = useRouter();
  const call = useCallContext();
  const voice = useGuildVoice();
  const serverChannel = useGuildChannel(voice.serverId, voice.channelId);
  const serverInfo = useGuildInfo(voice.serverId);
  const [noise, setNoise] = useState(() => getAudioPreferences().noiseSuppression);

  const active = ACTIVE.has(call.callStatus);
  if (!active) return null;

  const isServer = call.callCategory === 'server';
  const multi = isServer || call.isGroup;
  const connecting = call.callStatus !== 'connected';

  /* Libellé et destination, selon le type d'appel. */
  const title = isServer
    ? `${serverChannel?.name ?? call.callerName ?? ''}${serverInfo?.name ? ` / ${serverInfo.name}` : ''}`
    : call.isGroup
      ? call.callerName || t.guild.voice.groupCall
      : `@${call.callerName || t.guild.voice.directCall}`;
  const open = () => {
    if (isServer && voice.serverId && voice.channelId) router.push(`/channels/server/${voice.serverId}/${voice.channelId}`);
    else if (call.isGroup && (call.callConversationId || call.callChannelId)) router.push(`/channels/groups/${call.callConversationId || call.callChannelId}`);
    else if (call.callRecipientId) router.push(`/channels/me/${call.callRecipientId}`);
  };
  const hangUp = () => (multi ? call.leaveCall() : call.endCall());

  /* Réduction de bruit appliquée à chaud sur la piste micro. */
  const toggleNoise = () => {
    const next = !noise;
    setNoise(next);
    setAudioPreferences({ noiseSuppression: next });
    const track = call.localStream?.getAudioTracks()[0];
    void track?.applyConstraints({ noiseSuppression: next }).catch(() => {});
  };

  return (
    <div className="alfy-enter flex flex-col gap-2 border-b border-separator px-2 pt-2 pb-2">
      <div className="flex items-center gap-1.5">
        <Tooltip delay={250} closeDelay={0}>
          <span className={cn('flex size-6 shrink-0 items-center justify-center', connecting ? 'text-warning' : 'text-success')}>
            <Signal className={cn('size-4.5', connecting && 'alfy-pulse')} strokeWidth={2.5} aria-hidden />
          </span>
          <Tooltip.Content>
            <p>{connecting ? t.guild.voice.connecting : call.tierLabel || t.guild.voice.connected}</p>
          </Tooltip.Content>
        </Tooltip>
        <button type="button" onClick={open} className="group/vc min-w-0 flex-1 cursor-pointer text-left outline-none focus-visible:ring-2 focus-visible:ring-focus">
          <p className={cn('truncate text-sm leading-tight font-semibold', connecting ? 'text-warning' : 'text-success')}>
            {connecting ? (call.callStatus === 'calling' && !multi ? t.guild.voice.ringing : t.guild.voice.connecting) : t.guild.voice.connected}
          </p>
          <p className="flex min-w-0 items-center gap-1.5 text-xs leading-tight text-muted">
            <span className="min-w-0 truncate group-hover/vc:underline">{title}</span>
            {!connecting && <span className="shrink-0 tabular-nums">{formatDuration(call.callDuration)}</span>}
          </p>
        </button>
        <IconButton label={noise ? t.guild.voice.noiseOn : t.guild.voice.noiseOff} onPress={toggleNoise} active={noise} className={noise ? 'text-foreground' : undefined}>
          <AudioLines className="size-4.5" aria-hidden />
        </IconButton>
        <IconButton label={t.guild.voice.disconnect} onPress={hangUp} danger>
          <PhoneOff className="size-4.5" aria-hidden />
        </IconButton>
      </div>
      <div className="flex gap-1.5">
        <TileButton label={call.isVideoOff ? t.guild.voice.cameraTurnOn : t.guild.voice.cameraTurnOff} onPress={() => void call.toggleVideo()} active={!call.isVideoOff} disabled={connecting}>
          {call.isVideoOff ? <VideoOff className="size-4.5" aria-hidden /> : <Video className="size-4.5" aria-hidden />}
        </TileButton>
        <TileButton
          label={call.isScreenSharing ? t.guild.voice.stopShare : t.guild.voice.share}
          onPress={() => void (call.isScreenSharing ? call.stopScreenShare() : call.startScreenShare())}
          active={call.isScreenSharing}
          disabled={connecting}
        >
          <MonitorUp className="size-4.5" aria-hidden />
        </TileButton>
        <TileButton label={call.handRaised ? t.guild.voice.lowerHand : t.guild.voice.raiseHand} onPress={call.toggleHand} active={call.handRaised} disabled={connecting || !multi}>
          <Hand className="size-4.5" aria-hidden />
        </TileButton>
        <TileButton label={t.guild.voice.openCall} onPress={open}>
          <Maximize2 className="size-4.5" aria-hidden />
        </TileButton>
      </div>
    </div>
  );
}

/* ── Choix des périphériques (chevrons micro / casque) ────────────────────── */

function useDevices(kind: MediaDeviceKind, enabled: boolean) {
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const refresh = useCallback(() => {
    void navigator.mediaDevices
      ?.enumerateDevices()
      .then((list) => setDevices(list.filter((d) => d.kind === kind)))
      .catch(() => setDevices([]));
  }, [kind]);
  useEffect(() => {
    if (!enabled) return;
    refresh();
    navigator.mediaDevices?.addEventListener?.('devicechange', refresh);
    return () => navigator.mediaDevices?.removeEventListener?.('devicechange', refresh);
  }, [enabled, refresh]);
  return devices;
}

function DeviceMenu({ kind, onOpenSettings }: { kind: 'audioinput' | 'audiooutput'; onOpenSettings: () => void }) {
  const { t } = useTranslation();
  const call = useCallContext();
  const [open, setOpen] = useState(false);
  const devices = useDevices(kind, open);
  const prefs = getAudioPreferences();
  const current = kind === 'audioinput' ? prefs.inputDeviceId : prefs.outputDeviceId;

  const pick = (id: string) => {
    if (kind === 'audioinput') {
      setAudioPreferences({ inputDeviceId: id });
      if (ACTIVE.has(call.callStatus)) void call.switchAudioInput(id);
    } else {
      setAudioPreferences({ outputDeviceId: id });
      useVoicePrefs.getState().bumpOutput();
    }
  };

  return (
    <Dropdown isOpen={open} onOpenChange={setOpen}>
      <Dropdown.Trigger
        aria-label={kind === 'audioinput' ? t.guild.dock.inputDevice : t.guild.dock.outputDevice}
        className="flex h-8 w-4 cursor-pointer items-center justify-center rounded-sm text-muted outline-none transition-colors duration-(--dur-1) hover:bg-foreground/8 hover:text-foreground focus-visible:ring-2 focus-visible:ring-focus"
      >
        <ChevronDown className={cn('size-3.5 transition-transform duration-(--dur-2)', open && 'rotate-180')} aria-hidden />
      </Dropdown.Trigger>
      <Dropdown.Popover placement="top" className="w-72">
        <Dropdown.Menu aria-label={kind === 'audioinput' ? t.guild.dock.inputDevice : t.guild.dock.outputDevice}>
          <Dropdown.Section>
            <Header>{kind === 'audioinput' ? t.guild.dock.inputDevice : t.guild.dock.outputDevice}</Header>
            {(devices.length ? devices : [{ deviceId: 'default', label: '' } as MediaDeviceInfo]).map((d, i) => {
              const id = d.deviceId || 'default';
              const label = d.label || (id === 'default' ? t.guild.dock.defaultDevice : `${t.guild.dock.device} ${i + 1}`);
              return (
                <Dropdown.Item key={id} id={`dev-${id}`} textValue={label} onAction={() => pick(id)}>
                  <Label className="min-w-0 truncate">{label}</Label>
                  {current === id && <Check className="ms-auto size-4 shrink-0 text-accent" aria-hidden />}
                </Dropdown.Item>
              );
            })}
          </Dropdown.Section>
          <Separator />
          <Dropdown.Section>
            <Dropdown.Item id="voice-settings" textValue={t.guild.dock.voiceSettings} onAction={onOpenSettings}>
              <Settings className="size-4" aria-hidden />
              <Label>{t.guild.dock.voiceSettings}</Label>
            </Dropdown.Item>
          </Dropdown.Section>
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  );
}

/* ── Panneau utilisateur ──────────────────────────────────────────────────── */

const STATUSES: Exclude<AlfyPresence, 'offline'>[] = ['online', 'idle', 'dnd', 'invisible'];

function UserPanel({ onOpenSettings }: { onOpenSettings: () => void }) {
  const { t } = useTranslation();
  const { user, updateUser } = useAuth();
  const labels = usePresenceLabels();
  const voice = useGuildVoice();
  if (!user) return null;

  const status = ((user.status as AlfyPresence) ?? 'online') as AlfyPresence;
  const avatar = user.avatarUrl ? resolveMediaUrl(user.avatarUrl) : undefined;
  const display = user.displayName || user.username;
  const sub = user.customStatus || labels[status];

  const setStatus = (next: (typeof STATUSES)[number]) => {
    if (next === status) return;
    // Le serveur ne renvoie pas l'écho de son propre changement : écriture locale.
    updateUser({ status: next });
    socketService.updatePresence(next, user.customStatus ?? null, (user as { emoji?: string }).emoji ?? null);
  };

  const STATUS_DESC: Partial<Record<AlfyPresence, string>> = {
    dnd: t.guild.dock.dndDesc,
    invisible: t.guild.dock.invisibleDesc,
  };

  return (
    <div className="flex h-13 items-center gap-0.5 px-2">
      <Dropdown>
        <Dropdown.Trigger
          aria-label={t.guild.dock.statusMenu}
          className="group/me flex min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-md py-1 pr-1 pl-0.5 text-left outline-none transition-colors duration-(--dur-1) hover:bg-foreground/8 focus-visible:ring-2 focus-visible:ring-focus"
        >
          <span className="relative shrink-0">
            <Avatar className="size-8">
              {avatar && <Avatar.Image src={avatar} alt="" />}
              <Avatar.Fallback>{display.slice(0, 1).toUpperCase()}</Avatar.Fallback>
            </Avatar>
            <span className="absolute -right-0.5 -bottom-0.5">
              <StatusDot status={status} ringClass="ring-(--alfy-dock)" />
            </span>
          </span>
          <span className="flex min-w-0 flex-1 flex-col leading-tight">
            <span className="truncate text-sm font-semibold text-foreground">{display}</span>
            <span className="relative h-4 overflow-hidden text-xs text-muted">
              <span className="absolute inset-0 truncate transition-transform duration-(--dur-2) ease-out-quart group-hover/me:-translate-y-full">
                {sub}
              </span>
              <span className="absolute inset-0 translate-y-full truncate transition-transform duration-(--dur-2) ease-out-quart group-hover/me:translate-y-0">
                {user.username}
              </span>
            </span>
          </span>
        </Dropdown.Trigger>
        <Dropdown.Popover placement="top start" offset={10} className="min-w-64">
          <Dropdown.Menu aria-label={t.guild.dock.statusMenu}>
            <Dropdown.Section>
              <Header>{display}</Header>
              {STATUSES.map((s) => (
                <Dropdown.Item key={s} id={s} textValue={labels[s]} onAction={() => setStatus(s)}>
                  <StatusDot status={s} size="sm" ringClass="ring-overlay" />
                  <div className="flex min-w-0 flex-col">
                    <Label>{labels[s]}</Label>
                    {STATUS_DESC[s] && <span className="text-xs text-muted">{STATUS_DESC[s]}</span>}
                  </div>
                  {s === status && <Check className="ms-auto size-4 shrink-0 text-accent" aria-hidden />}
                </Dropdown.Item>
              ))}
            </Dropdown.Section>
            <Separator />
            <Dropdown.Section>
              <Dropdown.Item id="copy" textValue={t.guild.member.copyUserId} onAction={() => void copyText(user.id, t.guild.menu.copied)}>
                <Copy className="size-4" aria-hidden />
                <Label>{t.guild.member.copyUserId}</Label>
              </Dropdown.Item>
            </Dropdown.Section>
          </Dropdown.Menu>
        </Dropdown.Popover>
      </Dropdown>

      <div className="flex items-center">
        <IconButton
          label={voice.isMuted ? t.guild.dock.unmute : t.guild.dock.mute}
          onPress={() => {
            voice.toggleMute();
            if (!voice.channelId && !ACTIVE.has(voice.status)) toast(voice.isMuted ? t.guild.dock.micOn : t.guild.dock.micOff);
          }}
          active={voice.isMuted}
          className={cn('w-7 min-w-7', voice.isMuted && 'text-danger hover:text-danger')}
        >
          {voice.isMuted ? <MicOff className="size-4.5" aria-hidden /> : <Mic className="size-4.5" aria-hidden />}
        </IconButton>
        <DeviceMenu kind="audioinput" onOpenSettings={onOpenSettings} />
      </div>
      <div className="flex items-center">
        <IconButton
          label={voice.isDeafened ? t.guild.dock.undeafen : t.guild.dock.deafen}
          onPress={voice.toggleDeafen}
          active={voice.isDeafened}
          className={cn('w-7 min-w-7', voice.isDeafened && 'text-danger hover:text-danger')}
        >
          {voice.isDeafened ? <HeadphoneOff className="size-4.5" aria-hidden /> : <Headphones className="size-4.5" aria-hidden />}
        </IconButton>
        <DeviceMenu kind="audiooutput" onOpenSettings={onOpenSettings} />
      </div>
      <IconButton label={t.guild.dock.settings} onPress={onOpenSettings}>
        <Settings className="size-4.5" aria-hidden />
      </IconButton>
    </div>
  );
}

export function GuildDock({ onOpenSettings }: { onOpenSettings: () => void }) {
  return (
    <div className="alfy-dock mx-2 mb-2 shrink-0 overflow-hidden rounded-lg border border-separator shadow-sm">
      <VoicePanel />
      <UserPanel onOpenSettings={onOpenSettings} />
    </div>
  );
}
