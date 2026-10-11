'use client';

/**
 * Scène d'appel — affichée en tête de la conversation de l'appel en cours
 * (MP ou groupe), comme sur Discord : participants au centre, barre de
 * contrôles en bas, le fil de discussion reste lisible juste en dessous.
 *
 * Sans vidéo, chaque participant est un avatar rond cerclé de vert quand il
 * parle ; dès qu'une caméra ou un partage d'écran est actif, la scène passe
 * en grille de tuiles vidéo.
 */

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  Avatar, Button, ButtonGroup, Dropdown, Header, Label, Tooltip, type Selection,
} from '@heroui/react';
import {
  ChevronDown, Hand, Lock, Maximize2, Mic, MicOff, Minimize2, MonitorUp, PhoneOff, Video, VideoOff,
} from 'lucide-react';

import { useAuth } from '@/hooks/use-auth';
import { useAudioLevel } from '@/hooks/use-audio-level';
import { useCallContext } from '@/hooks/use-call-context';
import { resolveMediaUrl } from '@/lib/api';
import { useUserById } from '@/components/alfy/user-directory';
import { useRegisterCallStage } from '@/components/alfy/calls/call-stage-store';
import { useTranslation } from '@/components/locale-provider';
import { cn } from '@/lib/utils';

/** Conversation à laquelle la scène est rattachée. */
export type CallStageTarget = { kind: 'dm'; userId: string } | { kind: 'group'; groupId: string };

interface StageParticipant {
  id: string;
  name: string;
  avatarUrl?: string;
  stream: MediaStream | null;
  isLocal?: boolean;
  muted?: boolean;
  handRaised?: boolean;
  /** Invité qui n'a pas encore décroché. */
  pending?: boolean;
  /** Tuile de partage d'écran (et non de caméra). */
  screen?: boolean;
}

function hasLiveVideo(stream: MediaStream | null | undefined): boolean {
  return !!stream && stream.getVideoTracks().some((t) => t.enabled && t.readyState === 'live');
}

function formatDuration(total: number): string {
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mmss = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return h > 0 ? `${h}:${mmss}` : mmss;
}

/* ════════════════════════════════════════════════════════════════════════
 * Container — branché sur le vrai contexte d'appel.
 * ════════════════════════════════════════════════════════════════════════ */

export function ConversationCallStage({ target }: { target: CallStageTarget }) {
  const call = useCallContext();
  const active = call.callStatus === 'calling' || call.callStatus === 'connecting' || call.callStatus === 'connected';
  const matches =
    active &&
    (target.kind === 'dm'
      ? !call.isGroup && call.callCategory !== 'server' && call.callRecipientId === target.userId
      : call.callChannelId === target.groupId || call.callConversationId === target.groupId);

  useRegisterCallStage(matches);
  if (!matches) return null;
  return <LiveStage target={target} />;
}

function LiveStage({ target }: { target: CallStageTarget }) {
  const { t, tx } = useTranslation();
  const { user } = useAuth();
  const userById = useUserById();
  const call = useCallContext();
  const multi = call.isGroup || call.callCategory === 'server';

  const resolveName = (id: string) => {
    const info = call.participantInfo.get(id);
    if (info?.name) return info.name;
    const known = userById(id);
    return known.username !== 'inconnu' ? known.displayName : t.chat.participantFallback;
  };
  const resolveAvatar = (id: string) =>
    resolveMediaUrl(call.participantInfo.get(id)?.avatar) ?? userById(id).avatarUrl;

  const participants = useMemo<StageParticipant[]>(() => {
    const me: StageParticipant = {
      id: user?.id ?? 'me',
      name: user?.displayName || user?.username || t.callOverlay.you,
      avatarUrl: user?.avatarUrl ? resolveMediaUrl(user.avatarUrl) : undefined,
      stream: call.localStream,
      isLocal: true,
      muted: call.isMuted,
      handRaised: call.handRaised,
    };
    const list: StageParticipant[] = [me];

    if (call.isScreenSharing && call.screenStream) {
      list.push({ id: 'me_screen', name: tx(t.calls.stage.screenOf, { name: me.name }), stream: call.screenStream, isLocal: true, screen: true });
    }

    call.remoteStreams.forEach((stream, key) => {
      if (key.endsWith('_screen')) {
        const owner = key.slice(0, -'_screen'.length);
        list.push({ id: key, name: tx(t.calls.stage.screenOf, { name: resolveName(owner) }), stream, screen: true });
        return;
      }
      list.push({
        id: key,
        name: resolveName(key),
        avatarUrl: resolveAvatar(key),
        stream,
        handRaised: call.raisedHands.has(key),
      });
    });

    // MP qui sonne encore : le contact apparaît, en attente.
    if (target.kind === 'dm' && !list.some((p) => p.id === target.userId)) {
      list.push({
        id: target.userId,
        name: resolveName(target.userId),
        avatarUrl: resolveAvatar(target.userId),
        stream: null,
        pending: true,
      });
    }
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    user?.id, user?.displayName, user?.username, user?.avatarUrl, call.localStream, call.isMuted,
    call.handRaised, call.isScreenSharing, call.screenStream, call.remoteStreams, call.raisedHands,
    call.participantInfo, target, userById, t, tx,
  ]);

  const pendingPeer = participants.find((p) => p.pending);
  const status =
    call.callStatus === 'connected'
      ? formatDuration(call.callDuration)
      : call.callStatus === 'connecting'
        ? t.callBar.connecting
        : pendingPeer
          ? tx(t.calls.stage.waitingFor, { name: pendingPeer.name })
          : t.callBar.calling;

  const hangUp = multi ? call.leaveCall : call.endCall;

  return (
    <CallStage
      participants={participants}
      status={status}
      connected={call.callStatus === 'connected'}
      isMuted={call.isMuted}
      onToggleMute={call.toggleMute}
      isVideoOff={call.isVideoOff}
      onToggleVideo={() => void call.toggleVideo()}
      isScreenSharing={call.isScreenSharing}
      onToggleScreenShare={() => void (call.isScreenSharing ? call.stopScreenShare() : call.startScreenShare())}
      handRaised={multi ? call.handRaised : undefined}
      onToggleHand={multi ? call.toggleHand : undefined}
      localStream={call.localStream}
      onSwitchInput={(id) => void call.switchAudioInput(id)}
      onHangUp={hangUp}
    />
  );
}

/* ════════════════════════════════════════════════════════════════════════
 * Vue — présentationnelle.
 * ════════════════════════════════════════════════════════════════════════ */

interface CallStageProps {
  participants: StageParticipant[];
  status: string;
  connected: boolean;
  isMuted: boolean;
  onToggleMute: () => void;
  isVideoOff: boolean;
  onToggleVideo: () => void;
  isScreenSharing: boolean;
  onToggleScreenShare: () => void;
  handRaised?: boolean;
  onToggleHand?: () => void;
  localStream: MediaStream | null;
  onSwitchInput: (deviceId: string) => void;
  onHangUp: () => void;
}

export function CallStage({
  participants, status, connected, isMuted, onToggleMute, isVideoOff, onToggleVideo,
  isScreenSharing, onToggleScreenShare, handRaised, onToggleHand, localStream, onSwitchInput, onHangUp,
}: CallStageProps) {
  const { t } = useTranslation();
  const ref = useRef<HTMLElement>(null);
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    const sync = () => setFullscreen(document.fullscreenElement === ref.current);
    document.addEventListener('fullscreenchange', sync);
    return () => document.removeEventListener('fullscreenchange', sync);
  }, []);

  const toggleFullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void ref.current?.requestFullscreen?.();
  };

  const videoMode = participants.some((p) => hasLiveVideo(p.stream));

  return (
    <section
      ref={ref}
      aria-label={t.calls.controls.ariaLabel}
      className={cn(
        'at-fade relative flex shrink-0 flex-col bg-background',
        fullscreen ? 'h-full' : 'h-[clamp(260px,42vh,480px)]',
      )}
    >
      {/* Statut */}
      <div className="flex items-center gap-3 px-4 pt-3">
        <span className="flex min-w-0 items-center gap-2 text-xs text-muted">
          <Lock className="size-3.5 shrink-0 text-(--alfy-e2e)" aria-hidden />
          <span className="hidden sm:inline">{t.calls.stage.e2e}</span>
          <span className="hidden sm:inline" aria-hidden>·</span>
          <span className={cn('truncate tabular-nums', connected ? 'text-success' : 'text-foreground')} aria-live="polite">
            {status}
          </span>
        </span>
        <Tooltip delay={300}>
          <Button
            isIconOnly
            size="sm"
            variant="ghost"
            className="ml-auto text-muted"
            aria-label={fullscreen ? t.calls.exitFullscreen : t.calls.fullscreen}
            onPress={toggleFullscreen}
          >
            {fullscreen ? <Minimize2 className="size-4" aria-hidden /> : <Maximize2 className="size-4" aria-hidden />}
          </Button>
          <Tooltip.Content>
            <p>{fullscreen ? t.calls.exitFullscreen : t.calls.fullscreen}</p>
          </Tooltip.Content>
        </Tooltip>
      </div>

      {/* Participants */}
      <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden px-4 py-3">
        {videoMode ? (
          <div
            className={cn(
              'grid h-full w-full max-w-5xl auto-rows-fr gap-3',
              participants.length === 1 ? 'grid-cols-1' : participants.length <= 4 ? 'grid-cols-2' : 'grid-cols-3',
            )}
          >
            {participants.map((p) => (
              <VideoTile key={p.id} participant={p} />
            ))}
          </div>
        ) : (
          <ul className="flex flex-wrap items-center justify-center gap-6 sm:gap-8">
            {participants.filter((p) => !p.screen).map((p) => (
              <AvatarSeat key={p.id} participant={p} />
            ))}
          </ul>
        )}
      </div>

      {/* Contrôles */}
      <div className="flex flex-wrap items-center justify-center gap-2 px-4 pb-4">
        <ButtonGroup>
          <Tooltip delay={300}>
            <Button
              isIconOnly
              variant={isMuted ? 'danger-soft' : 'secondary'}
              aria-label={isMuted ? t.callBar.unmuteMic : t.callBar.muteMic}
              aria-pressed={isMuted}
              onPress={onToggleMute}
            >
              {isMuted ? <MicOff className="size-4.5" aria-hidden /> : <Mic className="size-4.5" aria-hidden />}
            </Button>
            <Tooltip.Content>
              <p>{isMuted ? t.callBar.unmuteMic : t.callBar.muteMic}</p>
            </Tooltip.Content>
          </Tooltip>
          <MicMenu localStream={localStream} onSwitch={onSwitchInput} muted={isMuted} />
        </ButtonGroup>

        <DockButton
          label={isVideoOff ? t.calls.enableCamera : t.calls.disableCamera}
          active={!isVideoOff}
          onPress={onToggleVideo}
        >
          {isVideoOff ? <VideoOff className="size-4.5" aria-hidden /> : <Video className="size-4.5" aria-hidden />}
        </DockButton>

        <DockButton
          label={isScreenSharing ? t.calls.stage.stopShare : t.calls.controls.shareScreen}
          active={isScreenSharing}
          onPress={onToggleScreenShare}
        >
          <MonitorUp className="size-4.5" aria-hidden />
        </DockButton>

        {onToggleHand && (
          <DockButton
            label={handRaised ? t.calls.controls.lowerHand : t.calls.controls.raiseHand}
            active={!!handRaised}
            onPress={onToggleHand}
          >
            <Hand className="size-4.5" aria-hidden />
          </DockButton>
        )}

        <Tooltip delay={300}>
          <Button variant="danger" className="ml-2 px-6" aria-label={t.calls.hangup} onPress={onHangUp}>
            <PhoneOff className="size-4.5" aria-hidden />
          </Button>
          <Tooltip.Content>
            <p>{t.calls.hangup}</p>
          </Tooltip.Content>
        </Tooltip>
      </div>
    </section>
  );
}

function DockButton({
  label, active, onPress, children,
}: { label: string; active: boolean; onPress: () => void; children: ReactNode }) {
  return (
    <Tooltip delay={300}>
      <Button isIconOnly variant={active ? 'primary' : 'secondary'} aria-label={label} aria-pressed={active} onPress={onPress}>
        {children}
      </Button>
      <Tooltip.Content>
        <p>{label}</p>
      </Tooltip.Content>
    </Tooltip>
  );
}

function SeatAvatar({ name, avatarUrl, className }: { name: string; avatarUrl?: string; className?: string }) {
  const initials = name.trim().split(/\s+/).filter(Boolean).map((w) => w[0]).slice(0, 2).join('').toUpperCase() || '?';
  return (
    <Avatar className={className}>
      {avatarUrl && <Avatar.Image src={avatarUrl} alt="" />}
      <Avatar.Fallback>{initials}</Avatar.Fallback>
    </Avatar>
  );
}

/* ── Participant sans vidéo : avatar rond, cerclé quand il parle ─────── */

function AvatarSeat({ participant: p }: { participant: StageParticipant }) {
  const { t, tx } = useTranslation();
  const speaking = useAudioLevel(p.pending || p.muted ? null : p.stream);

  return (
    <li className="flex flex-col items-center gap-2">
      <Tooltip delay={200}>
        <Tooltip.Trigger
          aria-label={speaking ? tx(t.calls.stage.speaking, { name: p.name }) : p.name}
          className="relative rounded-full outline-none focus-visible:ring-2 focus-visible:ring-focus"
        >
          <span
            className={cn(
              'block rounded-full ring-offset-4 ring-offset-background transition-[box-shadow,opacity] duration-(--dur-2)',
              speaking ? 'ring-[3px] ring-success' : 'ring-0',
              p.pending && 'call-ringing opacity-60',
            )}
          >
            <SeatAvatar name={p.name} avatarUrl={p.avatarUrl} className="size-20 text-xl" />
          </span>
          {(p.muted || p.handRaised) && (
            <span className="absolute -right-1 -bottom-1 flex gap-1">
              {p.handRaised && (
                <span className="at-pop flex size-6 items-center justify-center rounded-full bg-warning text-warning-foreground">
                  <Hand className="size-3.5" aria-label={tx(t.calls.tile.handRaised, { name: p.name })} />
                </span>
              )}
              {p.muted && (
                <span className="flex size-6 items-center justify-center rounded-full bg-danger text-danger-foreground">
                  <MicOff className="size-3.5" aria-label={t.calls.tile.micMuted} />
                </span>
              )}
            </span>
          )}
        </Tooltip.Trigger>
        <Tooltip.Content>
          <p>{p.name}</p>
        </Tooltip.Content>
      </Tooltip>
    </li>
  );
}

/* ── Tuile vidéo (caméra ou écran) ───────────────────────────────────── */

function VideoTile({ participant: p }: { participant: StageParticipant }) {
  const { t } = useTranslation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const video = hasLiveVideo(p.stream);
  const speaking = useAudioLevel(p.pending || p.muted || p.screen ? null : p.stream);

  useEffect(() => {
    const el = videoRef.current;
    if (!el || !p.stream) return;
    if (el.srcObject !== p.stream) el.srcObject = p.stream;
    el.play().catch(() => {});
  }, [p.stream, video]);

  return (
    <div
      className={cn(
        'relative flex min-h-0 items-center justify-center overflow-hidden rounded-2xl bg-surface-secondary',
        'transition-shadow duration-(--dur-2)',
        speaking && 'ring-[3px] ring-success',
        p.pending && 'opacity-60',
      )}
    >
      {video ? (
        // eslint-disable-next-line jsx-a11y/media-has-caption
        <video
          ref={videoRef}
          autoPlay
          playsInline
          // Jamais de son ici : l'audio passe par GlobalCallAudio (et la
          // vidéo locale coupée évite le larsen).
          muted
          className={cn('absolute inset-0 size-full', p.screen ? 'object-contain' : 'object-cover', p.isLocal && !p.screen && '-scale-x-100')}
        />
      ) : (
        <SeatAvatar name={p.name} avatarUrl={p.avatarUrl} className="size-16 text-lg" />
      )}
      <span className="absolute bottom-2 left-2 flex max-w-[calc(100%-1rem)] items-center gap-1.5 rounded-md bg-black/55 px-2 py-0.5 text-xs font-medium text-white backdrop-blur-sm">
        {p.muted && <MicOff className="size-3 shrink-0 text-red-400" aria-label={t.calls.tile.micMuted} />}
        {p.handRaised && <Hand className="size-3 shrink-0 text-amber-300" aria-hidden />}
        <span className="truncate">{p.name}</span>
      </span>
    </div>
  );
}

/* ── Choix du micro ──────────────────────────────────────────────────── */

function MicMenu({
  localStream, onSwitch, muted,
}: { localStream: MediaStream | null; onSwitch: (deviceId: string) => void; muted: boolean }) {
  const { t } = useTranslation();
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const current = localStream?.getAudioTracks()[0]?.getSettings().deviceId ?? 'default';

  useEffect(() => {
    const md = navigator.mediaDevices;
    if (!md?.enumerateDevices) return;
    const load = () =>
      md.enumerateDevices()
        .then((list) => setDevices(list.filter((d) => d.kind === 'audioinput' && d.deviceId)))
        .catch(() => {});
    void load();
    md.addEventListener('devicechange', load);
    return () => md.removeEventListener('devicechange', load);
  }, []);

  const select = (keys: Selection) => {
    if (keys === 'all') return;
    const id = [...keys][0];
    if (typeof id === 'string' && id !== current) onSwitch(id);
  };

  return (
    <Dropdown>
      <Button isIconOnly variant={muted ? 'danger-soft' : 'secondary'} aria-label={t.calls.stage.micOptions} className="w-7 min-w-0">
        <ButtonGroup.Separator />
        <ChevronDown className="size-3.5" aria-hidden />
      </Button>
      <Dropdown.Popover placement="top" className="min-w-64">
        <Dropdown.Menu selectionMode="single" selectedKeys={new Set([current])} onSelectionChange={select}>
          <Dropdown.Section>
            <Header>{t.calls.stage.inputDevice}</Header>
            {devices.length === 0 ? (
              <Dropdown.Item id="none" textValue={t.calls.stage.noDevices} isDisabled>
                <Label>{t.calls.stage.noDevices}</Label>
              </Dropdown.Item>
            ) : (
              devices.map((d, i) => {
                const name = d.deviceId === 'default' ? t.calls.stage.defaultDevice : d.label || `Micro ${i + 1}`;
                return (
                  <Dropdown.Item key={d.deviceId} id={d.deviceId} textValue={name}>
                    <Dropdown.ItemIndicator />
                    <Label className="truncate">{name}</Label>
                  </Dropdown.Item>
                );
              })
            )}
          </Dropdown.Section>
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  );
}
