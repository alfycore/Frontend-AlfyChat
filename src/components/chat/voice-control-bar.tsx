'use client';

import { HugeiconsIcon } from '@hugeicons/react';
import { MicIcon, MicOffIcon, HeadphonesIcon, HeadphoneOffIcon, PhoneOffIcon, Volume2Icon, Loader2Icon } from '@/components/icons';
import { useVoice } from '@/hooks/use-voice';
import { Button } from '@heroui/react';
import { cn } from '@/lib/utils';

export function VoiceControlBar() {
  const voice = useVoice();

  if (!voice || !voice.currentChannelId) return null;

  const {
    currentChannelId,
    participants,
    isMuted,
    isDeafened,
    isConnecting,
    leaveChannel,
    toggleMute,
    toggleDeafen,
  } = voice;

  return (
    <div className="space-y-1.5 border-t border-[var(--border)]/40 bg-[var(--background)]/60 px-3 py-2 backdrop-blur-xl">
      {/* Connection status */}
      <div className="flex items-center gap-2">
        {isConnecting ? (
          <HugeiconsIcon icon={Loader2Icon} size={14} className="animate-spin text-yellow-500" />
        ) : (
          <div className="flex size-5 items-center justify-center rounded-md bg-green-500/15">
            <HugeiconsIcon icon={Volume2Icon} size={12} className="text-green-500" />
          </div>
        )}
        <span className="text-xs font-medium text-green-500">
          {isConnecting ? 'Connexion…' : 'Connecté au vocal'}
        </span>
        <span className="ml-auto rounded-md bg-[var(--surface-secondary)]/30 px-1.5 py-0.5 text-[10px] text-[var(--muted)]">
          {participants.length} {participants.length === 1 ? 'personne' : 'personnes'}
        </span>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-1.5 rounded-xl bg-[var(--surface-secondary)]/20 p-1">
        <Button
          isIconOnly
          size="sm"
          variant="tertiary"
          onPress={toggleMute}
          className={cn(
            'size-8 rounded-lg transition-all duration-200',
            isMuted && 'bg-red-500/20 text-red-500 hover:bg-red-500/30'
          )}
        >
          {isMuted ? <HugeiconsIcon icon={MicOffIcon} size={16} /> : <HugeiconsIcon icon={MicIcon} size={16} />}
        </Button>

        <Button
          isIconOnly
          size="sm"
          variant="tertiary"
          onPress={toggleDeafen}
          className={cn(
            'size-8 rounded-lg transition-all duration-200',
            isDeafened && 'bg-red-500/20 text-red-500 hover:bg-red-500/30'
          )}
        >
          {isDeafened ? <HugeiconsIcon icon={HeadphoneOffIcon} size={16} /> : <HugeiconsIcon icon={HeadphonesIcon} size={16} />}
        </Button>

        <div className="flex-1" />

        <Button
          isIconOnly
          size="sm"
          variant="tertiary"
          className="size-8 rounded-lg bg-red-500/20 text-red-500 transition-all duration-200 hover:bg-red-500/30"
          onPress={leaveChannel}
        >
          <HugeiconsIcon icon={PhoneOffIcon} size={16} />
        </Button>
      </div>
    </div>
  );
}
