'use client';

import { Chip } from '@heroui/react';
import { Lock } from 'lucide-react';

import { useUserById } from '@/components/alfy/user-directory';
import type { AlfyCallParticipant } from '@/components/alfy/mock/types';
import { CallControls } from '@/components/alfy/calls/call-controls';
import { CallTile } from '@/components/alfy/calls/call-tile';
import { useTranslation } from '@/components/locale-provider';

interface CallViewProps {
  participants: AlfyCallParticipant[];
  currentUserId: string;
  durationSeconds?: number;
  isMuted: boolean;
  onToggleMute: () => void;
  isVideoOff: boolean;
  onToggleVideo: () => void;
  isScreenSharing?: boolean;
  onToggleScreenShare?: () => void;
  onHangUp?: () => void;
}

/** Appel vidéo 1:1 P2P : pair en grand, soi en incrustation. */
export function CallView({
  participants,
  currentUserId,
  durationSeconds = 0,
  onHangUp,
  ...controls
}: CallViewProps) {
  const { t, tx } = useTranslation();
  const userById = useUserById();
  const peer = participants.find((p) => p.userId !== currentUserId) ?? participants[0];
  const me = participants.find((p) => p.userId === currentUserId);
  const peerUser = userById(peer.userId);
  const mmss = `${String(Math.floor(durationSeconds / 60)).padStart(2, '0')}:${String(durationSeconds % 60).padStart(2, '0')}`;

  return (
    <div className="relative flex h-full flex-col items-center justify-center gap-4 bg-background p-4">
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-semibold">{tx(t.calls.view.callWith, { name: peerUser.displayName })}</h2>
        <Chip size="sm" variant="soft" className="cursor-default text-(--alfy-e2e)">
          <Lock className="size-3" aria-hidden />
          <Chip.Label>{t.calls.view.p2pEncrypted}</Chip.Label>
        </Chip>
        <Chip size="sm" variant="soft" className="cursor-default tabular-nums">
          {mmss}
        </Chip>
      </div>

      <div className="relative w-full max-w-3xl">
        <CallTile name={peerUser.displayName} avatarUrl={peerUser.avatarUrl} muted={peer.muted} screenSharing={peer.screenSharing} size="lg" />
        {me && (
          <div className="absolute right-3 bottom-3 w-40 shadow-lg sm:w-48">
            <CallTile name={t.common.you} avatarUrl={userById(me.userId).avatarUrl} isLocal muted={me.muted} />
          </div>
        )}
      </div>

      <CallControls {...controls} onHangUp={onHangUp} />
    </div>
  );
}
