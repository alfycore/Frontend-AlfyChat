'use client';

import { useState, useCallback } from 'react';
import { socketService } from '@/lib/socket';

// Raise / lower hand state for server/community calls.
// The gateway relays CALL_RAISE_HAND / CALL_LOWER_HAND to all participants.
export function useCallServer() {
  const [handRaised, setHandRaised] = useState(false);

  const raiseHand = useCallback((callId: string) => {
    socketService.emit('CALL_RAISE_HAND', { callId });
    setHandRaised(true);
  }, []);

  const lowerHand = useCallback((callId: string) => {
    socketService.emit('CALL_LOWER_HAND', { callId });
    setHandRaised(false);
  }, []);

  const toggleHand = useCallback((callId: string, currentlyRaised: boolean) => {
    if (currentlyRaised) lowerHand(callId);
    else raiseHand(callId);
  }, [raiseHand, lowerHand]);

  const reset = useCallback(() => setHandRaised(false), []);

  return { handRaised, raiseHand, lowerHand, toggleHand, reset };
}
