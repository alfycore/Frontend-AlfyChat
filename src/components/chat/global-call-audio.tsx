'use client';

import { useEffect, useRef } from 'react';
import { useCallContext } from '@/hooks/use-call-context';
import { getAudioPreferences } from '@/hooks/use-call';
import { streamOwner, useVoicePrefs } from '@/components/alfy/guild/voice/voice-prefs';

/** Persistent hidden <audio> for a single remote stream. */
function PersistentAudio({ stream, userId }: { stream: MediaStream; userId: string }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  /* Casque coupé, sourdine locale et volume par utilisateur (menu d'un
     participant, comme sur Discord). */
  const deafened = useVoicePrefs((s) => s.deafened);
  const localMuted = useVoicePrefs((s) => Boolean(s.localMutes[userId]));
  const userVolume = useVoicePrefs((s) => s.volumes[userId] ?? 100);
  const outputVersion = useVoicePrefs((s) => s.outputVersion);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    el.muted = deafened || localMuted;
    const prefs = getAudioPreferences();
    // L'élément <audio> plafonne à 1 : au-delà de 100 %, on reste à fond.
    el.volume = Math.max(0, Math.min(1, ((prefs.outputVolume ?? 100) / 100) * (userVolume / 100)));
    // Sortie choisie depuis le panneau utilisateur, appliquée à chaud.
    const withSink = el as HTMLAudioElement & { setSinkId?: (id: string) => Promise<void> };
    if (outputVersion > 0 && typeof withSink.setSinkId === 'function') {
      void withSink.setSinkId(prefs.outputDeviceId || 'default').catch(() => {});
    }
  }, [deafened, localMuted, userVolume, outputVersion]);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;

    if (el.srcObject !== stream) el.srcObject = stream;

    const applyPrefs = async () => {
      const prefs = getAudioPreferences();
      const voice = useVoicePrefs.getState();
      el.muted = voice.deafened || Boolean(voice.localMutes[userId]);
      el.volume = Math.max(0, Math.min(1, ((prefs.outputVolume ?? 100) / 100) * ((voice.volumes[userId] ?? 100) / 100)));
      const withSink = el as HTMLAudioElement & { setSinkId?: (id: string) => Promise<void> };
      if (prefs.outputDeviceId && prefs.outputDeviceId !== 'default' && typeof withSink.setSinkId === 'function') {
        try { await withSink.setSinkId(prefs.outputDeviceId); } catch { /* device may not be available */ }
      }
    };
    void applyPrefs();

    const tryPlay = () => {
      if (stream && el.paused) {
        el.play().catch((err: unknown) => {
          // Lecture bloquée (autoplay) : relancée au prochain clic / touche.
          console.warn(`[CALL] Lecture audio de ${userId} bloquée :`, (err as Error)?.name ?? err);
        });
      }
    };
    tryPlay();
    window.addEventListener('pointerdown', tryPlay);
    window.addEventListener('keydown', tryPlay);

    return () => {
      window.removeEventListener('pointerdown', tryPlay);
      window.removeEventListener('keydown', tryPlay);
      el.srcObject = null;
    };
  }, [stream, userId]);

  // eslint-disable-next-line jsx-a11y/media-has-caption
  return <audio ref={audioRef} autoPlay playsInline style={{ display: 'none' }} />;
}

/**
 * Persistent hidden <video muted> that keeps the local getUserMedia stream
 * alive so the browser doesn't suspend microphone capture when the call panel
 * unmounts on navigation.
 */
function PersistentLocalVideo({ stream }: { stream: MediaStream }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (el.srcObject !== stream) el.srcObject = stream;
    el.play().catch(() => {});

    return () => {
      el.srcObject = null;
    };
  }, [stream]);

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted
      style={{ display: 'none' }}
    />
  );
}

/**
 * Renders persistent hidden media elements so that both microphone capture
 * (local) and remote audio playback survive page navigation within the layout.
 * Must be mounted inside CallProvider, outside of {children}.
 */
export function GlobalCallAudio() {
  const { callStatus, localStream, remoteStreams } = useCallContext();

  if (callStatus === 'idle' || callStatus === 'ended') return null;

  const audioEntries: [string, MediaStream][] = [];
  remoteStreams.forEach((stream, key) => {
    if (stream.getAudioTracks().length > 0) {
      audioEntries.push([key, stream]);
    }
  });

  return (
    <>
      {/* Keep local microphone capture active across navigation */}
      {localStream && <PersistentLocalVideo stream={localStream} />}

      {/* Play remote audio streams regardless of which page is active */}
      {audioEntries.map(([key, stream]) => (
        <PersistentAudio key={key} stream={stream} userId={streamOwner(key)} />
      ))}
    </>
  );
}
