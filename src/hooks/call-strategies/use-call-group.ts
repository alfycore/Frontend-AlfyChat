'use client';

import { useEffect } from 'react';
import { socketService } from '@/lib/socket';

function parsePayload(data: unknown): Record<string, unknown> {
  const d = data as { payload?: Record<string, unknown> };
  return (d?.payload || data) as Record<string, unknown>;
}

interface UseCallGroupOptions {
  // Callback triggered when the gateway promotes the call from P2P → SFU
  onModeSwitchToSfu: (callId: string) => void;
  // Only register listeners when in an active group call
  enabled: boolean;
}

// Listens for CALL_MODE_SWITCH and delegates the SFU transition to the orchestrator.
export function useCallGroup({ onModeSwitchToSfu, enabled }: UseCallGroupOptions) {
  useEffect(() => {
    if (!enabled) return;

    const handle = (data: unknown) => {
      const p = parsePayload(data);
      if (p.newMode === 'sfu' && p.callId) {
        onModeSwitchToSfu(p.callId as string);
      }
    };

    socketService.on('CALL_MODE_SWITCH', handle);
    return () => socketService.off('CALL_MODE_SWITCH', handle);
  }, [enabled, onModeSwitchToSfu]);
}
