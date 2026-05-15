'use client';

import { useEffect, useState } from 'react';
import { socketService } from '@/lib/socket';

type Producer = import('mediasoup-client').types.Producer;

export interface TierParams {
  tier: number;
  label: string;
  videoMaxSpatialLayer: number;
  videoDisabled: boolean;
  videoMaxBitrate: number;
  audioSampleRate: number;
  audioStereo: boolean;
  audioMaxBitrate: number;
}

function parsePayload(data: unknown): Record<string, unknown> {
  const d = data as { payload?: Record<string, unknown> };
  return (d?.payload || data) as Record<string, unknown>;
}

export function useCallQuality(
  producersRef: React.MutableRefObject<Map<string, Producer>>,
) {
  const [currentTier, setCurrentTier] = useState<number | null>(null);
  const [tierLabel, setTierLabel] = useState<string>('Max');

  useEffect(() => {
    const handle = (data: unknown) => {
      const p = parsePayload(data);
      const tier = p.tier as number;
      const tierParams = p.tierParams as TierParams | undefined;

      setCurrentTier(tier);
      if (tierParams?.label) setTierLabel(tierParams.label);

      if (!tierParams) return;

      const videoProducer = producersRef.current.get('video');
      if (videoProducer && !videoProducer.closed) {
        try {
          if (tierParams.videoDisabled) {
            videoProducer.pause();
          } else {
            if (videoProducer.paused) videoProducer.resume();
            (videoProducer as any).setMaxSpatialLayer?.(tierParams.videoMaxSpatialLayer ?? 2);
          }
        } catch { /* ignore */ }
      }

      const audioProducer = producersRef.current.get('audio');
      if (audioProducer && !audioProducer.closed && audioProducer.track) {
        audioProducer.track.applyConstraints({
          sampleRate: tierParams.audioSampleRate,
          channelCount: tierParams.audioStereo ? 2 : 1,
        }).catch(() => {});
      }
    };

    socketService.on('CALL_QUALITY_UPDATE', handle);
    return () => socketService.off('CALL_QUALITY_UPDATE', handle);
  }, [producersRef]);

  return { currentTier, tierLabel };
}
