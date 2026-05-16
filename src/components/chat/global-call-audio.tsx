'use client';

import { useEffect, useRef } from 'react';
import { useCallContext } from '@/hooks/use-call-context';
import { getAudioPreferences } from '@/hooks/use-call';

/** Persistent hidden <audio> for a single remote stream. */
function PersistentAudio({ stream }: { stream: MediaStream }) {
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;

    if (el.srcObject !== stream) el.srcObject = stream;

    const applyPrefs = async () => {
      const prefs = getAudioPreferences();
      el.volume = Math.max(0, Math.min(1, (prefs.outputVolume ?? 100) / 100));
      const withSink = el as HTMLAudioElement & { setSinkId?: (id: string) => Promise<void> };
      if (prefs.outputDeviceId && prefs.outputDeviceId !== 'default' && typeof withSink.setSinkId === 'function') {
        try { await withSink.setSinkId(prefs.outputDeviceId); } catch { /* device may not be available */ }
      }
    };
    void applyPrefs();

    const tryPlay = () => {
      if (stream && el.paused) el.play().catch(() => {});
    };
    tryPlay();
    window.addEventListener('pointerdown', tryPlay);
    window.addEventListener('keydown', tryPlay);

    return () => {
      window.removeEventListener('pointerdown', tryPlay);
      window.removeEventListener('keydown', tryPlay);
      el.srcObject = null;
    };
  }, [stream]);

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
        <PersistentAudio key={key} stream={stream} />
      ))}
    </>
  );
}
