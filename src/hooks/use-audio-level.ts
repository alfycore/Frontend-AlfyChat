'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Detects whether a MediaStream has active audio above a given threshold.
 * Uses AudioContext + AnalyserNode — never routes audio to speakers (no echo).
 *
 * @param stream  - The MediaStream to analyse (local or remote)
 * @param threshold - RMS level above which the user is considered speaking (0–1, default 0.012)
 */
export function useAudioLevel(stream: MediaStream | null, threshold = 0.012): boolean {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const rafRef = useRef<number>(0);
  const ctxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    // No stream or no live audio track → silent
    const hasLiveAudio =
      !!stream && stream.getAudioTracks().some((t) => t.readyState === 'live' && t.enabled);

    if (!hasLiveAudio) {
      setIsSpeaking(false);
      return;
    }

    let ctx: AudioContext;
    try {
      ctx = new AudioContext();
      ctxRef.current = ctx;
    } catch {
      return; // AudioContext not available (SSR / restricted context)
    }

    // createMediaStreamSource only reads the stream — it never plays it back
    const source = ctx.createMediaStreamSource(stream!);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    analyser.smoothingTimeConstant = 0.35;
    source.connect(analyser);
    // NOTE: analyser is NOT connected to ctx.destination → no audio output, no echo

    const data = new Uint8Array(analyser.frequencyBinCount);

    const tick = () => {
      analyser.getByteTimeDomainData(data);

      // Root Mean Square of the waveform
      let sum = 0;
      for (const v of data) {
        const n = (v - 128) / 128; // normalise to [-1, 1]
        sum += n * n;
      }
      const rms = Math.sqrt(sum / data.length);

      setIsSpeaking(rms > threshold);
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafRef.current);
      try { source.disconnect(); } catch { /* ignore */ }
      ctx.close().catch(() => {});
      ctxRef.current = null;
      setIsSpeaking(false);
    };
  }, [stream, threshold]);

  return isSpeaking;
}
