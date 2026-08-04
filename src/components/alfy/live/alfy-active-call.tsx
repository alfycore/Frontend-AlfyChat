'use client';

/**
 * Container : affiche la barre d'appel persistante + la vue étendue quand un
 * appel (DM, groupe ou serveur) est en cours. Branché sur le vrai `useCallContext`
 * (WebRTC/SFU) — avant ce composant, aucune UI n'existait une fois l'appel
 * accepté (ni bouton raccrocher, ni mute), seul l'audio jouait en arrière-plan
 * via `GlobalCallAudio`.
 */

import { useMemo, useState } from 'react';
import { Modal } from '@heroui/react';

import { useAuth } from '@/hooks/use-auth';
import { useCallContext } from '@/hooks/use-call-context';
import { CallBar } from '@/components/alfy/calls/call-bar';
import { VoiceRoom, type RoomParticipant } from '@/components/alfy/calls/voice-room';

export function AlfyActiveCall() {
  const { user } = useAuth();
  const {
    callStatus,
    callerName,
    isGroup,
    callCategory,
    tierLabel,
    callDuration,
    localStream,
    remoteStreams,
    participantInfo,
    isMuted,
    toggleMute,
    isVideoOff,
    toggleVideo,
    isScreenSharing,
    startScreenShare,
    stopScreenShare,
    endCall,
    leaveCall,
    handRaised,
    raisedHands,
    toggleHand,
  } = useCallContext();
  const [expanded, setExpanded] = useState(false);

  const participants = useMemo<RoomParticipant[]>(() => {
    const list: RoomParticipant[] = [
      {
        userId: user?.id || 'me',
        name: 'Vous',
        avatarUrl: user?.avatarUrl,
        stream: localStream,
        isLocal: true,
        muted: isMuted,
        screenSharing: isScreenSharing,
        handRaised,
      },
    ];
    remoteStreams.forEach((stream, userId) => {
      const info = participantInfo.get(userId);
      list.push({
        userId,
        name: info?.name || 'Participant',
        avatarUrl: info?.avatar,
        stream,
        handRaised: raisedHands.has(userId),
      });
    });
    return list;
  }, [user?.id, user?.avatarUrl, localStream, isMuted, isScreenSharing, remoteStreams, participantInfo, handRaised, raisedHands]);

  if (callStatus !== 'calling' && callStatus !== 'connecting' && callStatus !== 'connected') return null;

  const label = callerName || (isGroup ? 'Appel de groupe' : 'Appel en cours');
  const isMultiParty = isGroup || callCategory === 'server';
  const hangUp = isMultiParty ? leaveCall : endCall;

  return (
    <>
      <CallBar
        label={label}
        durationSeconds={callDuration}
        isMuted={isMuted}
        onToggleMute={toggleMute}
        onOpen={() => setExpanded(true)}
        onLeave={hangUp}
      />
      <Modal isOpen={expanded} onOpenChange={setExpanded}>
        <Modal.Backdrop>
          <Modal.Container>
            <Modal.Dialog className="h-[min(85vh,700px)] w-[min(90vw,64rem)] max-w-none p-0">
              <Modal.CloseTrigger />
              <Modal.Body className="h-full p-0">
                <VoiceRoom
                  channelName={label}
                  participants={participants}
                  tierLabel={tierLabel ?? undefined}
                  isMuted={isMuted}
                  onToggleMute={toggleMute}
                  isVideoOff={isVideoOff}
                  onToggleVideo={toggleVideo}
                  isScreenSharing={isScreenSharing}
                  onToggleScreenShare={isScreenSharing ? stopScreenShare : startScreenShare}
                  // Lever la main n'a de sens qu'à plusieurs — pas en appel 1:1.
                  handRaised={isMultiParty ? handRaised : undefined}
                  onToggleHand={isMultiParty ? toggleHand : undefined}
                  onLeave={() => { hangUp(); setExpanded(false); }}
                />
              </Modal.Body>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </>
  );
}
