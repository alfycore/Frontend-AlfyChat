'use client';

import { MicIcon, MicOffIcon, HeadphonesIcon, HeadphoneOffIcon, PhoneOffIcon, Volume2Icon, Loader2Icon } from '@/components/icons';
import { useVoice } from '@/hooks/use-voice';
import { Button } from '@/components/ui/button';
import { NetworkQualityIndicator } from '@/components/chat/network-quality-indicator';
import { cn } from '@/lib/utils';

export function VoiceControlBar() {
  const voice = useVoice();

  if (!voice || !voice.currentChannelId) return null;

  const {
    participants,
    isMuted,
    isDeafened,
    isConnecting,
    networkStats,
    leaveChannel,
    toggleMute,
    toggleDeafen,
  } = voice;

  return (
    <div className="border-t border-border/40 bg-card/60 px-3 py-2.5 backdrop-blur-sm">
      {/* Connection status */}
      <div className="mb-2 flex items-center gap-2">
        <div className={cn(
          'flex size-5 shrink-0 items-center justify-center rounded-xl ring-1',
          isConnecting ? 'bg-amber-500/15 ring-amber-500/25' : 'bg-success/15 ring-success/25'
        )}>
          {isConnecting
            ? <Loader2Icon size={12} className="animate-spin text-amber-500" />
            : <Volume2Icon size={12} className="text-success" />
          }
        </div>
        <span className={cn(
          'font-heading text-[11px] font-semibold tracking-tight',
          isConnecting ? 'text-amber-500' : 'text-success'
        )}>
          {isConnecting ? 'Connexion…' : 'Vocal actif'}
        </span>
        <span className="ml-auto rounded-lg bg-foreground/[0.04] px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
          {participants.length} {participants.length === 1 ? 'membre' : 'membres'}
        </span>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-1 rounded-xl bg-foreground/[0.03] p-1 ring-1 ring-border/30">
        <Button size="icon-sm" variant="ghost" onClick={toggleMute}
          className={cn('size-8 flex-1 rounded-lg transition-all duration-150',
            isMuted ? 'bg-destructive/15 text-destructive hover:bg-destructive/25' : 'text-muted-foreground/70 hover:bg-foreground/6 hover:text-foreground'
          )}
        >
          {isMuted ? <MicOffIcon size={15} /> : <MicIcon size={15} />}
        </Button>

        <Button size="icon-sm" variant="ghost" onClick={toggleDeafen}
          className={cn('size-8 flex-1 rounded-lg transition-all duration-150',
            isDeafened ? 'bg-destructive/15 text-destructive hover:bg-destructive/25' : 'text-muted-foreground/70 hover:bg-foreground/6 hover:text-foreground'
          )}
        >
          {isDeafened ? <HeadphoneOffIcon size={15} /> : <HeadphonesIcon size={15} />}
        </Button>

        <NetworkQualityIndicator stats={networkStats} className="size-8 flex-1 rounded-lg" />

        <div className="mx-1 h-5 w-px rounded-full bg-border/40" />

        <Button size="icon-sm" variant="ghost"
          className="size-8 flex-1 rounded-lg bg-destructive/15 text-destructive transition-all duration-150 hover:bg-destructive hover:text-destructive-foreground"
          onClick={leaveChannel}
        >
          <PhoneOffIcon size={15} />
        </Button>
      </div>
    </div>
  );
}
