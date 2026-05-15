'use client';

import { useEffect } from 'react';

// Applies DM-max quality constraints (1080p / 4 Mbps) to the local video track
// whenever the stream changes. Safe to call with null — just no-ops.
export function useCallDm(localStream: MediaStream | null) {
  useEffect(() => {
    if (!localStream) return;
    const videoTrack = localStream.getVideoTracks()[0];
    if (!videoTrack) return;

    videoTrack.applyConstraints({
      width: { ideal: 1920 },
      height: { ideal: 1080 },
      frameRate: { ideal: 30 },
    }).catch(() => {});
  }, [localStream]);
}
