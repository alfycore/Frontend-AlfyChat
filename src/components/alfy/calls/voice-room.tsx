'use client';

import { Chip } from '@heroui/react';
import { Volume2 } from 'lucide-react';

import { CallControls } from '@/components/alfy/calls/call-controls';
import { CallTile } from '@/components/alfy/calls/call-tile';

export interface RoomParticipant {
  userId: string;
  name: string;
  avatarUrl?: string;
  stream?: MediaStream | null;
  isLocal?: boolean;
  muted?: boolean;
  screenSharing?: boolean;
  handRaised?: boolean;
}

interface VoiceRoomProps {
  channelName: string;
  participants: RoomParticipant[];
  tierLabel?: string;
  isMuted: boolean;
  onToggleMute: () => void;
  isVideoOff: boolean;
  onToggleVideo: () => void;
  isScreenSharing?: boolean;
  onToggleScreenShare?: () => void;
  handRaised?: boolean;
  onToggleHand?: () => void;
  onLeave?: () => void;
}

/** Salon vocal (appel de groupe / serveur, SFU) : grille de participants. */
export function VoiceRoom({
  channelName,
  participants,
  tierLabel,
  onLeave,
  ...controls
}: VoiceRoomProps) {
  return (
    <div className="flex h-full flex-col items-center gap-4 bg-background p-4">
      <div className="flex items-center gap-2 pt-2">
        <Volume2 className="size-4 text-muted" aria-hidden />
        <h2 className="text-sm font-semibold">{channelName}</h2>
        <Chip size="sm" variant="soft" className="cursor-default">
          {participants.length} participants
        </Chip>
        {tierLabel && (
          <Chip size="sm" variant="soft" className="cursor-default">
            {tierLabel}
          </Chip>
        )}
      </div>

      <div className="grid w-full max-w-4xl flex-1 auto-rows-min content-center gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {participants.map((p) => (
          <CallTile
            key={p.userId}
            name={p.name}
            avatarUrl={p.avatarUrl}
            stream={p.stream}
            isLocal={p.isLocal}
            muted={p.muted}
            screenSharing={p.screenSharing}
            handRaised={p.handRaised}
          />
        ))}
      </div>

      <div className="pb-2">
        <CallControls {...controls} onHangUp={onLeave} />
      </div>
    </div>
  );
}
