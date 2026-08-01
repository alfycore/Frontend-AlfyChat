'use client';

/** /uitest/call — appel 1:1 P2P, salon vocal SFU et modale d'appel entrant. */

import { Button, Tabs } from '@heroui/react';
import { BellRing } from 'lucide-react';
import { useState } from 'react';

import { CALL_PARTICIPANTS, CURRENT_USER, USERS, VOICE_ROOM_PARTICIPANTS, userById } from '@/components/alfy/mock/data';
import { CallView } from '@/components/alfy/calls/call-view';
import { IncomingCall } from '@/components/alfy/calls/incoming-call';
import { VoiceRoom } from '@/components/alfy/calls/voice-room';

export default function UitestCallPage() {
  const [incomingOpen, setIncomingOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const nadia = USERS.find((u) => u.id === 'u-nadia')!;

  const roomParticipants = VOICE_ROOM_PARTICIPANTS.map((p) => {
    const u = userById(p.userId);
    return { userId: p.userId, name: u.displayName, avatarUrl: u.avatarUrl, isLocal: p.userId === CURRENT_USER.id, muted: p.muted, screenSharing: p.screenSharing };
  });

  return (
    <div className="flex h-full flex-col">
      <Tabs defaultSelectedKey="p2p" className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b border-separator px-4">
          <Tabs.ListContainer>
            <Tabs.List aria-label="Type d'appel">
              <Tabs.Tab id="p2p">
                Appel 1:1 (P2P)
                <Tabs.Indicator />
              </Tabs.Tab>
              <Tabs.Tab id="sfu">
                Salon vocal (SFU)
                <Tabs.Indicator />
              </Tabs.Tab>
            </Tabs.List>
          </Tabs.ListContainer>
          <Button size="sm" variant="secondary" onPress={() => setIncomingOpen(true)}>
            <BellRing className="size-3.5" />
            Simuler un appel entrant
          </Button>
        </div>
        <Tabs.Panel id="p2p" className="min-h-0 flex-1">
          <CallView
            participants={CALL_PARTICIPANTS}
            currentUserId={CURRENT_USER.id}
            isMuted={isMuted}
            onToggleMute={() => setIsMuted((m) => !m)}
            isVideoOff={isVideoOff}
            onToggleVideo={() => setIsVideoOff((v) => !v)}
          />
        </Tabs.Panel>
        <Tabs.Panel id="sfu" className="min-h-0 flex-1">
          <VoiceRoom
            channelName="Salon principal"
            participants={roomParticipants}
            isMuted={isMuted}
            onToggleMute={() => setIsMuted((m) => !m)}
            isVideoOff={isVideoOff}
            onToggleVideo={() => setIsVideoOff((v) => !v)}
          />
        </Tabs.Panel>
      </Tabs>

      <IncomingCall
        caller={nadia}
        callType="video"
        isOpen={incomingOpen}
        onOpenChange={setIncomingOpen}
      />
    </div>
  );
}
