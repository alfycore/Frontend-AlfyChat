'use client';

/**
 * Vocal de serveur, côté client.
 *
 * `useGuildVoice()` expose les gestes Discord : rejoindre un salon d'un clic
 * (en quittant le précédent), micro, casque, caméra, partage d'écran. Il lit le
 * MIROIR d'appel (`call-mirror.ts`) par sélecteurs : un composant qui l'utilise
 * ne se re-rend que si micro / salon / statut changent — jamais à chaque tic de
 * la durée d'appel. Les actions passent par `callActions` et sont stables.
 *
 * `useVoicePresenceSync()` (monté une fois) publie notre présence auprès de la
 * passerelle — c'est elle qui fait apparaître notre avatar sous le salon vocal
 * chez tous les membres — et l'anneau « parle » détecté localement. Il applique
 * aussi les actions de modération reçues (rendu muet, déplacé, déconnecté).
 */

import { useEffect, useEffectEvent, useRef } from 'react';
import { toast } from '@heroui/react';
import { useShallow } from 'zustand/react/shallow';

import { useAuth } from '@/hooks/use-auth';
import { socketService } from '@/lib/socket';
import { useTranslation } from '@/components/locale-provider';
import { guildStore, useGuildStore } from '@/components/alfy/guild/store';
import { useVoicePrefs } from '@/components/alfy/guild/voice/voice-prefs';
import { ACTIVE_CALL, callActions, useCallMirror } from '@/components/alfy/guild/voice/call-mirror';
import type { GuildChannel } from '@/components/alfy/guild/types';

/** Serveur d'un salon connu du store. */
function serverOf(channelId: string | undefined | null): string | null {
  if (!channelId) return null;
  for (const [sid, list] of Object.entries(guildStore.get().channels)) if (list.some((c) => c.id === channelId)) return sid;
  return null;
}

/* ── Actions (stables, lisent l'état au moment du geste) ─────────────────── */

export async function joinVoice(serverId: string, channel: Pick<GuildChannel, 'id' | 'name'>) {
  const m = useCallMirror.getState();
  const a = callActions.current;
  if (!a) return;
  if (m.category === 'server' && m.channelId === channel.id && ACTIVE_CALL.has(m.status)) return;
  // Changer de salon = quitter l'appel courant (quel qu'il soit) puis rejoindre.
  if (ACTIVE_CALL.has(m.status)) {
    if (m.category === 'server' || m.isGroup) a.leaveCall();
    else a.endCall();
    await new Promise((r) => setTimeout(r, 120));
  }
  await callActions.current?.initiateServerCall(channel.id, serverId, 'voice', channel.name);
}

export function leaveVoice() {
  if (ACTIVE_CALL.has(useCallMirror.getState().status)) callActions.current?.leaveCall();
}

export function toggleDeafen() {
  const prefs = useVoicePrefs.getState();
  const m = useCallMirror.getState();
  if (!ACTIVE_CALL.has(m.status)) {
    // Hors appel : on mémorise, comme le bouton casque de Discord.
    prefs.setDeafened(!prefs.deafened, prefs.idleMuted);
    return;
  }
  if (prefs.deafened) {
    // Réactiver le casque rend le micro tel qu'il était avant.
    prefs.setDeafened(false);
    if (!prefs.mutedBeforeDeafen && m.isMuted) callActions.current?.toggleMute();
  } else {
    prefs.setDeafened(true, m.isMuted);
    if (!m.isMuted) callActions.current?.toggleMute();
  }
}

export function toggleMute() {
  const prefs = useVoicePrefs.getState();
  const m = useCallMirror.getState();
  if (!ACTIVE_CALL.has(m.status)) {
    if (prefs.deafened) prefs.setDeafened(false, false);
    prefs.setIdleMuted(!prefs.idleMuted);
    return;
  }
  // Réactiver le micro alors que le casque est coupé réactive aussi le casque.
  if (prefs.deafened && m.isMuted) prefs.setDeafened(false, false);
  callActions.current?.toggleMute();
  prefs.setIdleMuted(!m.isMuted);
}

export function toggleVideo() {
  void callActions.current?.toggleVideo();
}

export function toggleScreenShare() {
  const a = callActions.current;
  if (!a) return;
  void (useCallMirror.getState().isScreenSharing ? a.stopScreenShare() : a.startScreenShare());
}

export interface GuildVoiceApi {
  /** Salon vocal de serveur auquel on est connecté (ou en cours de connexion). */
  channelId: string | null;
  serverId: string | null;
  status: string;
  connected: boolean;
  isMuted: boolean;
  isDeafened: boolean;
  isVideoOn: boolean;
  isScreenSharing: boolean;
  join: typeof joinVoice;
  leave: typeof leaveVoice;
  toggleMute: typeof toggleMute;
  toggleDeafen: typeof toggleDeafen;
  toggleVideo: typeof toggleVideo;
  toggleScreenShare: typeof toggleScreenShare;
}

/** Salon vocal de serveur courant — sélecteur minimal (une chaîne). */
export function useVoiceChannelId(): string | null {
  return useCallMirror((s) => (s.category === 'server' && ACTIVE_CALL.has(s.status) ? (s.channelId ?? null) : null));
}

export function useGuildVoice(): GuildVoiceApi {
  const m = useCallMirror(
    useShallow((s) => ({
      status: s.status,
      category: s.category,
      channelId: s.channelId,
      isMuted: s.isMuted,
      isVideoOff: s.isVideoOff,
      isScreenSharing: s.isScreenSharing,
    })),
  );
  const deafened = useVoicePrefs((s) => s.deafened);
  const idleMuted = useVoicePrefs((s) => s.idleMuted);
  const inCall = ACTIVE_CALL.has(m.status);
  const isServerCall = m.category === 'server' && inCall;
  const channelId = isServerCall ? (m.channelId ?? null) : null;
  const serverId = useGuildStore((s) => {
    if (!channelId) return null;
    for (const [sid, list] of Object.entries(s.channels)) if (list.some((c) => c.id === channelId)) return sid;
    return null;
  });

  return {
    channelId,
    serverId,
    status: m.status,
    connected: isServerCall && m.status === 'connected',
    isMuted: inCall ? m.isMuted : idleMuted || deafened,
    isDeafened: deafened,
    isVideoOn: !m.isVideoOff,
    isScreenSharing: m.isScreenSharing,
    join: joinVoice,
    leave: leaveVoice,
    toggleMute,
    toggleDeafen,
    toggleVideo,
    toggleScreenShare,
  };
}

/* ════════════════════════════════════════════════════════════════════════ */

/** Détecte la parole sur un flux local (≈ 15 Hz, avec maintien de 300 ms). */
function useSpeakingDetector(stream: MediaStream | null, enabled: boolean, onChange: (speaking: boolean) => void) {
  // Toujours la dernière version du rappel, sans relancer l'analyse audio.
  const emit = useEffectEvent(onChange);
  useEffect(() => {
    const track = stream?.getAudioTracks().find((t) => t.readyState === 'live');
    if (!enabled || !stream || !track) {
      emit(false);
      return;
    }
    let ctx: AudioContext;
    try {
      ctx = new AudioContext();
    } catch {
      return;
    }
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    analyser.smoothingTimeConstant = 0.3;
    source.connect(analyser);
    const data = new Uint8Array(analyser.fftSize);
    let speaking = false;
    let lastLoud = 0;
    const timer = window.setInterval(() => {
      if (!track.enabled) {
        if (speaking) {
          speaking = false;
          emit(false);
        }
        return;
      }
      analyser.getByteTimeDomainData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i++) {
        const n = (data[i] - 128) / 128;
        sum += n * n;
      }
      const rms = Math.sqrt(sum / data.length);
      const now = performance.now();
      if (rms > 0.02) lastLoud = now;
      const next = now - lastLoud < 300;
      if (next !== speaking) {
        speaking = next;
        emit(next);
      }
    }, 80);
    return () => {
      window.clearInterval(timer);
      source.disconnect();
      void ctx.close().catch(() => {});
      emit(false);
    };
  }, [stream, enabled]);
}

export function useVoicePresenceSync() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const m = useCallMirror(
    useShallow((s) => ({
      status: s.status,
      isMuted: s.isMuted,
      isVideoOff: s.isVideoOff,
      isScreenSharing: s.isScreenSharing,
      mediaError: s.mediaError,
      localStream: s.localStream,
    })),
  );
  const voice = useGuildVoice();
  const deafened = useVoicePrefs((s) => s.deafened);

  const channelId = voice.connected ? voice.channelId : null;
  const serverId = voice.connected ? voice.serverId : null;
  const announced = useRef<{ serverId: string; channelId: string } | null>(null);

  /* Rejoindre / quitter la présence vocale. */
  useEffect(() => {
    const prev = announced.current;
    if (prev && (prev.channelId !== channelId || !channelId)) {
      socketService.emit('VOICE_LEAVE', prev);
      announced.current = null;
    }
    if (channelId && serverId && (!prev || prev.channelId !== channelId)) {
      const s = useCallMirror.getState();
      socketService.emit('VOICE_JOIN', {
        serverId,
        channelId,
        muted: s.isMuted,
        deafened: useVoicePrefs.getState().deafened,
        video: !s.isVideoOff,
      });
      announced.current = { serverId, channelId };
    }
  }, [channelId, serverId]);

  /* À la connexion : appliquer le micro coupé / casque coupé choisis hors appel. */
  useEffect(() => {
    if (m.status !== 'connected') return;
    const prefs = useVoicePrefs.getState();
    if ((prefs.idleMuted || prefs.deafened) && !useCallMirror.getState().isMuted) callActions.current?.toggleMute();
  }, [m.status]);

  /* Micro, casque, caméra, partage d'écran → état diffusé. */
  useEffect(() => {
    if (!announced.current) return;
    socketService.emit('VOICE_STATE_UPDATE', {
      ...announced.current,
      muted: m.isMuted,
      deafened,
      video: !m.isVideoOff,
      streaming: m.isScreenSharing,
    });
  }, [m.isMuted, deafened, m.isVideoOff, m.isScreenSharing, channelId]);

  /* Reconnexion du socket : la passerelle a pu oublier notre présence. */
  useEffect(() => {
    const onReconnected = () => {
      if (!announced.current) return;
      const s = useCallMirror.getState();
      socketService.emit('VOICE_JOIN', {
        ...announced.current,
        muted: s.isMuted,
        deafened: useVoicePrefs.getState().deafened,
        video: !s.isVideoOff,
      });
    };
    socketService.on('socket:reconnected', onReconnected);
    return () => socketService.off('socket:reconnected', onReconnected);
  }, []);

  /* Anneau « parle » : local tout de suite, diffusé aux autres. */
  const me = user?.id;
  useSpeakingDetector(m.localStream, Boolean(channelId) && !m.isMuted, (speaking) => {
    if (me) guildStore.setSpeaking(me, speaking);
    if (announced.current) socketService.emit('VOICE_SPEAKING', { speaking });
  });

  /* Modération vocale reçue. */
  const onForce = useEffectEvent((data: unknown) => {
    const d = ((data as { payload?: unknown })?.payload ?? data) as { action?: string; channelId?: string; serverId?: string };
    switch (d?.action) {
      case 'mute':
        if (!useCallMirror.getState().isMuted) callActions.current?.toggleMute();
        toast(t.guild.voice.forcedMute);
        break;
      case 'deafen':
        if (!useVoicePrefs.getState().deafened) toggleDeafen();
        toast(t.guild.voice.forcedDeafen);
        break;
      case 'disconnect':
        callActions.current?.leaveCall();
        toast(t.guild.voice.forcedDisconnect);
        break;
      case 'move': {
        const target = d.channelId;
        const sid = d.serverId ?? serverOf(target);
        const channel = sid ? guildStore.get().channels[sid]?.find((x) => x.id === target) : undefined;
        if (sid && channel) void joinVoice(sid, channel);
        toast(t.guild.voice.forcedMove);
        break;
      }
      default:
        break;
    }
  });
  useEffect(() => {
    const handler = (data: unknown) => onForce(data);
    socketService.on('VOICE_FORCE', handler);
    return () => socketService.off('VOICE_FORCE', handler);
  }, []);

  /* Refus de la passerelle (salon plein, pas le droit de se connecter). */
  useEffect(() => {
    const onError = (data: unknown) => {
      const d = ((data as { payload?: unknown })?.payload ?? data) as { error?: string };
      if (d?.error === 'CHANNEL_FULL') toast.danger(t.guild.voice.channelFull);
      else if (d?.error === 'PERMISSION_DENIED') toast.danger(t.guild.voice.noConnect);
    };
    socketService.on('VOICE_ERROR', onError);
    return () => socketService.off('VOICE_ERROR', onError);
  }, [t]);

  /* Erreurs remontées par l'appel lui-même (initiation refusée). */
  useEffect(() => {
    if (!m.mediaError) return;
    if (m.mediaError.includes('CHANNEL_FULL')) toast.danger(t.guild.voice.channelFull);
    else if (m.mediaError.includes('PERMISSION_DENIED')) toast.danger(t.guild.voice.noConnect);
  }, [m.mediaError, t]);
}
