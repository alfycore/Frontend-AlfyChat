'use client';

/**
 * Miroir léger de l'état d'appel.
 *
 * `CallProvider` publie un nouvel objet de contexte à chaque changement —
 * dont la durée d'appel, chaque seconde, et chaque évènement WebRTC. Tout
 * composant abonné au contexte se re-rendait donc en continu pendant un appel
 * (rail, arbre des salons, liste des membres…). Ici, un seul petit composant
 * lit le contexte et recopie dans un store zustand les champs utiles ; les
 * vues s'abonnent par sélecteur et ne bougent que quand LEUR champ change.
 * Les actions (rejoindre, couper le micro…) sont exposées par une référence
 * module, toujours à jour, qui ne provoque aucun rendu.
 */

import { useEffect } from 'react';
import { create } from 'zustand';

import { useCallContext } from '@/hooks/use-call-context';

export interface CallMirrorState {
  status: 'idle' | 'calling' | 'ringing' | 'connecting' | 'connected' | 'ended';
  category: string | null;
  channelId?: string;
  conversationId?: string;
  recipientId?: string;
  isGroup: boolean;
  callerName?: string;
  isMuted: boolean;
  isVideoOff: boolean;
  isScreenSharing: boolean;
  handRaised: boolean;
  mediaError?: string;
  localStream: MediaStream | null;
}

export const useCallMirror = create<CallMirrorState>()(() => ({
  status: 'idle',
  category: null,
  isGroup: false,
  isMuted: false,
  isVideoOff: true,
  isScreenSharing: false,
  handRaised: false,
  localStream: null,
}));

type Ctx = ReturnType<typeof useCallContext>;
export interface CallActions {
  initiateServerCall: Ctx['initiateServerCall'];
  leaveCall: Ctx['leaveCall'];
  endCall: Ctx['endCall'];
  toggleMute: Ctx['toggleMute'];
  toggleVideo: Ctx['toggleVideo'];
  startScreenShare: Ctx['startScreenShare'];
  stopScreenShare: Ctx['stopScreenShare'];
  switchAudioInput: Ctx['switchAudioInput'];
  toggleHand: Ctx['toggleHand'];
}

/** Dernières actions d'appel connues (mises à jour après chaque rendu du fournisseur). */
export const callActions: { current: CallActions | null } = { current: null };

export const ACTIVE_CALL = new Set(['calling', 'connecting', 'connected']);

/** Seul abonné au contexte d'appel du module — à monter une fois. */
export function CallMirrorSync() {
  const c = useCallContext();

  useEffect(() => {
    callActions.current = {
      initiateServerCall: c.initiateServerCall,
      leaveCall: c.leaveCall,
      endCall: c.endCall,
      toggleMute: c.toggleMute,
      toggleVideo: c.toggleVideo,
      startScreenShare: c.startScreenShare,
      stopScreenShare: c.stopScreenShare,
      switchAudioInput: c.switchAudioInput,
      toggleHand: c.toggleHand,
    };
  });

  useEffect(() => {
    const next: CallMirrorState = {
      status: c.callStatus,
      category: c.callCategory,
      channelId: c.callChannelId,
      conversationId: c.callConversationId,
      recipientId: c.callRecipientId,
      isGroup: c.isGroup,
      callerName: c.callerName,
      isMuted: c.isMuted,
      isVideoOff: c.isVideoOff,
      isScreenSharing: c.isScreenSharing,
      handRaised: c.handRaised,
      mediaError: c.mediaError,
      localStream: c.localStream,
    };
    const prev = useCallMirror.getState();
    const changed = (Object.keys(next) as (keyof CallMirrorState)[]).some((k) => prev[k] !== next[k]);
    if (changed) useCallMirror.setState(next);
  }, [
    c.callStatus,
    c.callCategory,
    c.callChannelId,
    c.callConversationId,
    c.callRecipientId,
    c.isGroup,
    c.callerName,
    c.isMuted,
    c.isVideoOff,
    c.isScreenSharing,
    c.handRaised,
    c.mediaError,
    c.localStream,
  ]);

  return null;
}
