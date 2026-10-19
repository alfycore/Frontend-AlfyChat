'use client';

/**
 * Vue d'un salon vocal — un écran à part entière, pas un chat.
 *
 * Avant d'entrer : aperçu (qui est là, statut du salon, limite) et bouton
 * « Rejoindre le vocal ». Une fois connecté : grille de tuiles (parole,
 * caméra, partages d'écran), focus sur une tuile au clic, barre de contrôles
 * flottante, plein écran, et le chat textuel du salon dans un panneau latéral.
 */

import { Avatar, Button, Separator, Tooltip } from '@heroui/react';
import {
  Hand,
  HeadphoneOff,
  Headphones,
  Maximize2,
  MessageSquare,
  Mic,
  MicOff,
  Minimize2,
  MonitorUp,
  PhoneOff,
  UserPlus,
  Users,
  Video,
  VideoOff,
  X,
} from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useAuth } from '@/hooks/use-auth';
import { useCallContext } from '@/hooks/use-call-context';
import { useMobileNav } from '@/hooks/use-mobile-nav';
import { resolveMediaUrl } from '@/lib/api';
import { useTranslation } from '@/components/locale-provider';
import { cn } from '@/lib/utils';
import { useRegisterCallStage } from '@/components/alfy/calls/call-stage-store';
import { CHANNEL_ICONS } from '@/components/alfy/guild/channel-icons';
import {
  memberColor,
  memberName,
  useGuildChannel,
  useGuildMembers,
  useGuildRoles,
  useMyPerms,
  useVoiceChannel,
} from '@/components/alfy/guild/hooks';
import { guildUi } from '@/components/alfy/guild/ui';
import { HeaderButton } from '@/components/alfy/guild/chat/channel-header';
import { TextChannelView } from '@/components/alfy/guild/chat/text-channel-view';
import { useGuildVoice } from '@/components/alfy/guild/voice/use-guild-voice';
import { VoiceTile, hasLiveVideo, type TileModel } from '@/components/alfy/guild/voice/voice-tile';

/** Colonnes de la grille selon le nombre de tuiles (proche de Discord). */
function gridCols(n: number): string {
  if (n <= 1) return 'grid-cols-1';
  if (n <= 4) return 'grid-cols-2';
  if (n <= 9) return 'grid-cols-3';
  return 'grid-cols-4';
}

function ControlButton({
  label,
  onPress,
  active,
  danger,
  off,
  disabled,
  children,
}: {
  label: string;
  onPress: () => void;
  active?: boolean;
  danger?: boolean;
  /** État « coupé » (micro / casque) — rendu rouge. */
  off?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Tooltip delay={200} closeDelay={0}>
      <Button
        isIconOnly
        aria-label={label}
        aria-pressed={active ?? off}
        isDisabled={disabled}
        onPress={onPress}
        className={cn(
          'size-12 min-w-12 rounded-full transition-[background-color,color,transform] duration-(--dur-1) active:scale-95',
          danger
            ? 'bg-danger text-(--danger-foreground) hover:bg-danger/85'
            : off
              ? 'bg-foreground text-danger hover:bg-foreground/90'
              : active
                ? 'bg-foreground text-background hover:bg-foreground/90'
                : 'bg-surface-tertiary text-foreground hover:bg-foreground/15',
        )}
      >
        {children}
      </Button>
      <Tooltip.Content placement="top">
        <p>{label}</p>
      </Tooltip.Content>
    </Tooltip>
  );
}

interface VoiceChannelViewProps {
  serverId: string;
  channelId: string;
}

export function VoiceChannelView({ serverId, channelId }: VoiceChannelViewProps) {
  const { t, tx } = useTranslation();
  const { user } = useAuth();
  const params = useSearchParams();
  const { isMobile, openSidebar } = useMobileNav();
  const call = useCallContext();
  const voice = useGuildVoice();
  const channel = useGuildChannel(serverId, channelId);
  const state = useVoiceChannel(channelId);
  const members = useGuildMembers(serverId);
  const roles = useGuildRoles(serverId);
  const perms = useMyPerms(serverId, channelId);

  const inThisChannel = voice.channelId === channelId;
  const connected = inThisChannel && voice.connected;
  useRegisterCallStage(inThisChannel);

  /* `?chat=1` (bouton « Ouvrir le chat » de la sidebar) ouvre le panneau. */
  const chatParam = params?.get('chat') === '1';
  const [chatOpen, setChatOpen] = useState(chatParam);
  const [seenChatParam, setSeenChatParam] = useState(chatParam);
  if (chatParam !== seenChatParam) {
    setSeenChatParam(chatParam);
    if (chatParam) setChatOpen(true);
  }
  const [focusKey, setFocusKey] = useState<string | null>(null);
  const [autoFocused, setAutoFocused] = useState<string | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onChange = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);
  const toggleFullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
    else void stageRef.current?.requestFullscreen().catch(() => {});
  };

  const participants = useMemo(() => state?.participants ?? [], [state]);
  const presence = useMemo(() => new Map(participants.map((p) => [p.userId, p])), [participants]);
  const nameOf = useCallback(
    (uid: string, fallback: string) => memberName(members[uid], fallback),
    [members],
  );

  /* ── Tuiles : soi, les autres (flux SFU), les partages d'écran. ─────────── */
  const tiles = useMemo<TileModel[]>(() => {
    if (!inThisChannel) return [];
    const me = user?.id ?? 'me';
    const myName = nameOf(me, user?.displayName || user?.username || t.guild.voice.you);
    const list: TileModel[] = [
      {
        key: me,
        userId: me,
        name: myName,
        avatarUrl: user?.avatarUrl ? resolveMediaUrl(user.avatarUrl) : undefined,
        color: memberColor(members[me], roles),
        stream: call.localStream,
        isLocal: true,
        screen: false,
        muted: voice.isMuted,
        deafened: voice.isDeafened,
        handRaised: call.handRaised,
      },
    ];
    if (call.isScreenSharing && call.screenStream) {
      list.push({ key: `${me}_screen`, userId: me, name: myName, stream: call.screenStream, isLocal: true, screen: true, muted: false, deafened: false, handRaised: false });
    }
    const seen = new Set([me]);
    call.remoteStreams.forEach((stream, key) => {
      const screen = key.endsWith('_screen');
      const uid = screen ? key.slice(0, -'_screen'.length) : key;
      const p = presence.get(uid);
      const info = call.participantInfo.get(uid);
      const name = nameOf(uid, p?.displayName || info?.name || t.guild.voice.participant);
      if (!screen) seen.add(uid);
      list.push({
        key,
        userId: uid,
        name,
        avatarUrl: members[uid]?.user.avatarUrl ?? p?.avatarUrl ?? (info?.avatar ? resolveMediaUrl(info.avatar) : undefined),
        color: memberColor(members[uid], roles),
        stream,
        isLocal: false,
        screen,
        muted: Boolean(p?.muted || p?.serverMuted),
        deafened: Boolean(p?.deafened || p?.serverDeafened),
        handRaised: call.raisedHands.has(uid),
      });
    });
    // Présents d'après la passerelle mais sans flux encore négocié.
    for (const p of participants) {
      if (seen.has(p.userId)) continue;
      list.push({
        key: p.userId,
        userId: p.userId,
        name: nameOf(p.userId, p.displayName),
        avatarUrl: members[p.userId]?.user.avatarUrl ?? p.avatarUrl,
        color: memberColor(members[p.userId], roles),
        stream: null,
        isLocal: false,
        screen: false,
        muted: p.muted || p.serverMuted,
        deafened: p.deafened || p.serverDeafened,
        handRaised: call.raisedHands.has(p.userId),
      });
    }
    // Les partages d'écran passent devant, comme sur Discord.
    return list.sort((a, b) => Number(b.screen) - Number(a.screen));
  }, [inThisChannel, user, nameOf, members, roles, call.localStream, call.isScreenSharing, call.screenStream, call.remoteStreams, call.participantInfo, call.raisedHands, call.handRaised, voice.isMuted, voice.isDeafened, presence, participants, t]);

  /* Un partage d'écran qui démarre prend le focus (une fois par partage). */
  const screenKey = tiles.find((x) => x.screen && !x.isLocal)?.key ?? null;
  if (screenKey !== autoFocused) {
    setAutoFocused(screenKey);
    if (screenKey && !focusKey) setFocusKey(screenKey);
  }
  // Tuile disparue (participant parti) : retour à la grille sans état à nettoyer.
  const focused = focusKey ? tiles.find((x) => x.key === focusKey) : undefined;

  if (!channel) return <div className="flex-1 bg-background" />;

  const Icon = CHANNEL_ICONS[channel.type] ?? CHANNEL_ICONS.voice;
  const full = channel.userLimit > 0 && participants.length >= channel.userLimit && !inThisChannel && !perms.can('MOVE_MEMBERS');
  const canConnect = perms.can('CONNECT');
  const anyVideo = tiles.some((x) => hasLiveVideo(x.stream));

  return (
    <div className="flex h-full min-w-0 flex-1 bg-background">
      <section ref={stageRef} aria-label={channel.name} className="relative flex min-w-0 flex-1 flex-col bg-[color-mix(in_oklab,var(--background)_80%,black)]">
        {/* En-tête de la scène */}
        <header className="flex h-12 shrink-0 items-center gap-2 px-3 text-foreground">
          {isMobile && (
            <Button isIconOnly size="sm" variant="ghost" aria-label={t.guild.chat.openNav} onPress={openSidebar} className="text-muted">
              <Users className="size-5" aria-hidden />
            </Button>
          )}
          <Icon className="size-6 shrink-0 text-muted" aria-hidden />
          <h1 className="min-w-0 truncate text-base font-semibold">{channel.name}</h1>
          {state?.status && <span className="hidden min-w-0 truncate text-sm text-muted md:block">— {state.status}</span>}
          <div className="ml-auto flex items-center gap-0.5">
            {perms.can('CREATE_INVITE') && (
              <HeaderButton label={t.guild.voice.inviteToChannel} onPress={() => guildUi.invite(serverId, channelId)}>
                <UserPlus className="size-5" aria-hidden />
              </HeaderButton>
            )}
            <HeaderButton label={chatOpen ? t.guild.voice.hideChat : t.guild.voice.showChat} onPress={() => setChatOpen((v) => !v)} active={chatOpen}>
              <MessageSquare className="size-5" aria-hidden />
            </HeaderButton>
          </div>
        </header>

        {!inThisChannel ? (
          /* ── Aperçu avant d'entrer ───────────────────────────────────── */
          <div className="alfy-enter flex min-h-0 flex-1 flex-col items-center justify-center gap-5 px-6 text-center">
            {participants.length > 0 ? (
              <div className="flex -space-x-3">
                {participants.slice(0, 6).map((p) => (
                  <Avatar key={p.userId} className="size-16 ring-4 ring-background">
                    {(members[p.userId]?.user.avatarUrl ?? p.avatarUrl) && <Avatar.Image src={members[p.userId]?.user.avatarUrl ?? p.avatarUrl} alt="" />}
                    <Avatar.Fallback>{nameOf(p.userId, p.displayName).slice(0, 1)}</Avatar.Fallback>
                  </Avatar>
                ))}
                {participants.length > 6 && (
                  <span className="flex size-16 items-center justify-center rounded-full bg-surface-tertiary text-sm font-semibold ring-4 ring-background">
                    +{participants.length - 6}
                  </span>
                )}
              </div>
            ) : (
              <span className="flex size-20 items-center justify-center rounded-full bg-surface-tertiary text-muted">
                <Icon className="size-10" strokeWidth={1.75} aria-hidden />
              </span>
            )}
            <div>
              <h2 className="text-2xl font-bold tracking-tight">{channel.name}</h2>
              <p className="mt-1 text-sm text-muted">
                {participants.length === 0
                  ? t.guild.voice.nobodyHere
                  : participants.length === 1
                    ? tx(t.guild.voice.oneHere, { name: nameOf(participants[0].userId, participants[0].displayName) })
                    : tx(t.guild.voice.manyHere, { n: participants.length })}
              </p>
            </div>
            <Button
              size="lg"
              className="bg-success px-8 font-semibold text-(--success-foreground) hover:bg-success/90"
              isDisabled={!canConnect || full}
              onPress={() => void voice.join(serverId, channel)}
            >
              {!canConnect ? t.guild.voice.noConnect : full ? t.guild.voice.channelFull : t.guild.voice.joinVoice}
            </Button>
            {voice.channelId && voice.channelId !== channelId && <p className="text-xs text-muted">{t.guild.voice.willSwitch}</p>}
          </div>
        ) : (
          /* ── Scène connectée ─────────────────────────────────────────── */
          <div className="relative flex min-h-0 flex-1 flex-col px-4 pb-24">
            {focused ? (
              <div className="flex min-h-0 flex-1 flex-col gap-3">
                <div className="min-h-0 flex-1">
                  <VoiceTile tile={focused} focused onSelect={() => setFocusKey(null)} />
                </div>
                <div className="flex h-28 shrink-0 justify-center gap-3 overflow-x-auto">
                  {tiles
                    .filter((x) => x.key !== focused.key)
                    .map((x) => (
                      <div key={x.key} className="aspect-video h-full shrink-0">
                        <VoiceTile tile={x} small onSelect={() => setFocusKey(x.key)} />
                      </div>
                    ))}
                </div>
              </div>
            ) : (
              <div
                className={cn(
                  'm-auto grid w-full max-w-6xl content-center gap-3',
                  gridCols(tiles.length),
                  anyVideo || tiles.length > 2 ? '' : 'max-w-4xl',
                )}
              >
                {tiles.map((x) => (
                  <div key={x.key} className="aspect-video min-h-0">
                    <VoiceTile tile={x} onSelect={() => setFocusKey(x.key)} />
                  </div>
                ))}
              </div>
            )}

            {/* Barre de contrôles flottante */}
            <div className="absolute inset-x-0 bottom-5 flex justify-center">
              <div className="flex items-center gap-2 rounded-full border border-separator bg-overlay/90 p-2 shadow-lg backdrop-blur-md">
                <ControlButton
                  label={call.isVideoOff ? t.guild.voice.cameraTurnOn : t.guild.voice.cameraTurnOff}
                  onPress={voice.toggleVideo}
                  active={!call.isVideoOff}
                  disabled={!connected || !perms.can('VIDEO')}
                >
                  {call.isVideoOff ? <VideoOff className="size-5" aria-hidden /> : <Video className="size-5" aria-hidden />}
                </ControlButton>
                <ControlButton
                  label={call.isScreenSharing ? t.guild.voice.stopShare : t.guild.voice.share}
                  onPress={voice.toggleScreenShare}
                  active={call.isScreenSharing}
                  disabled={!connected || !perms.can('VIDEO')}
                >
                  <MonitorUp className="size-5" aria-hidden />
                </ControlButton>
                <ControlButton label={call.handRaised ? t.guild.voice.lowerHand : t.guild.voice.raiseHand} onPress={call.toggleHand} active={call.handRaised} disabled={!connected}>
                  <Hand className="size-5" aria-hidden />
                </ControlButton>
                <Separator orientation="vertical" className="mx-1 h-8" />
                <ControlButton label={voice.isMuted ? t.guild.dock.unmute : t.guild.dock.mute} onPress={voice.toggleMute} off={voice.isMuted}>
                  {voice.isMuted ? <MicOff className="size-5" aria-hidden /> : <Mic className="size-5" aria-hidden />}
                </ControlButton>
                <ControlButton label={voice.isDeafened ? t.guild.dock.undeafen : t.guild.dock.deafen} onPress={voice.toggleDeafen} off={voice.isDeafened}>
                  {voice.isDeafened ? <HeadphoneOff className="size-5" aria-hidden /> : <Headphones className="size-5" aria-hidden />}
                </ControlButton>
                <ControlButton label={t.guild.voice.disconnect} onPress={voice.leave} danger>
                  <PhoneOff className="size-5" aria-hidden />
                </ControlButton>
              </div>
            </div>

            <div className="absolute right-4 bottom-7">
              <HeaderButton label={fullscreen ? t.guild.voice.exitFullscreen : t.guild.voice.fullscreen} onPress={toggleFullscreen}>
                {fullscreen ? <Minimize2 className="size-5" aria-hidden /> : <Maximize2 className="size-5" aria-hidden />}
              </HeaderButton>
            </div>
          </div>
        )}
      </section>

      {/* Chat du salon vocal */}
      {chatOpen && (
        <aside className="alfy-enter flex w-[min(380px,40vw)] shrink-0 flex-col border-l border-separator bg-surface">
          <div className="flex h-12 shrink-0 items-center gap-2 border-b border-separator px-3">
            <MessageSquare className="size-5 text-muted" aria-hidden />
            <p className="min-w-0 flex-1 truncate text-sm font-semibold">{channel.name}</p>
            <HeaderButton label={t.guild.voice.hideChat} onPress={() => setChatOpen(false)}>
              <X className="size-4.5" aria-hidden />
            </HeaderButton>
          </div>
          <div className="min-h-0 flex-1">
            <TextChannelView serverId={serverId} channelId={channelId} embedded />
          </div>
        </aside>
      )}
    </div>
  );
}
