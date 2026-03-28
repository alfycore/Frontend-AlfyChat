'use client';

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
    <div className="border-t border-[var(--border)]/40 bg-[var(--background)]/60 px-3 py-2.5 backdrop-blur-xl">
      {/* Connection status */}
      <div className="mb-2 flex items-center gap-2">
        <div className={cn(
          'flex size-5 shrink-0 items-center justify-center rounded-md',
          isConnecting ? 'bg-yellow-500/15' : 'bg-green-500/15'
        )}>
          {isConnecting
            ? <Loader2Icon size={12} className="animate-spin text-yellow-500" />
            : <Volume2Icon size={12} className="text-green-500" />
          }
        </div>
        <span className={cn('text-[11px] font-semibold', isConnecting ? 'text-yellow-500' : 'text-green-500')}>
          {isConnecting ? 'Connexion…' : 'Vocal actif'}
        </span>
        <span className="ml-auto rounded-lg bg-[var(--surface-secondary)]/40 px-2 py-0.5 text-[10px] font-medium text-[var(--muted)]">
          {participants.length} {participants.length === 1 ? 'membre' : 'membres'}
        </span>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-1 rounded-xl bg-[var(--surface-secondary)]/30 p-1">
        <Button isIconOnly size="sm" variant="tertiary" onPress={toggleMute}
          className={cn('size-8 flex-1 rounded-lg transition-all duration-150',
            isMuted ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' : 'text-[var(--muted)]/70 hover:text-[var(--foreground)]'
          )}
        >
          {isMuted ? <MicOffIcon size={15} /> : <MicIcon size={15} />}
        </Button>

        <Button isIconOnly size="sm" variant="tertiary" onPress={toggleDeafen}
          className={cn('size-8 flex-1 rounded-lg transition-all duration-150',
            isDeafened ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' : 'text-[var(--muted)]/70 hover:text-[var(--foreground)]'
          )}
        >
          {isDeafened ? <HeadphoneOffIcon size={15} /> : <HeadphonesIcon size={15} />}
        </Button>

        <div className="mx-1 h-5 w-px rounded-full bg-[var(--border)]/30" />

        <Button isIconOnly size="sm" variant="tertiary"
          className="size-8 flex-1 rounded-lg bg-red-500/15 text-red-400 transition-all duration-150 hover:bg-red-500/25"
          onPress={leaveChannel}
        >
          <PhoneOffIcon size={15} />
        </Button>
      </div>
    </div>
  );
}
