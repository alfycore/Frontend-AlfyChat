'use client';

import { PhoneIcon, PhoneOffIcon, MonitorUpIcon, MicIcon, MicOffIcon, VideoIcon } from '@/components/icons';
import { useRouter } from 'next/navigation';
import { useCallContext } from '@/hooks/use-call-context';
import { useTranslation } from '@/components/locale-provider';
import { cn } from '@/lib/utils';

export function CallBar() {
  const {
    callStatus,
    callType,
    callerName,
    callRecipientId,
    callChannelId,
    isGroup,
    callCategory,
    callMode,
    tierLabel,
    handRaised,
    callDuration,
    isScreenSharing,
    isMuted,
    endCall,
    leaveCall,
    toggleMute,
    toggleHand,
  } = useCallContext();
  const router = useRouter();
  const { t } = useTranslation();

  if (callStatus === 'idle' || callStatus === 'ended') return null;

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const isConnected = callStatus === 'connected';

  const statusLabel: Record<string, string> = {
    calling: t.callBar.calling,
    ringing: t.callBar.ringing,
    connecting: t.callBar.connecting,
    connected: callType === 'video' ? t.callBar.videoConnected : t.callBar.voiceConnected,
  };

  const handleNavigate = () => {
    if (isGroup && callChannelId) {
      // Navigate to the channel — the server/channel IDs are not stored here; best effort
    } else if (callRecipientId) {
      router.push(`/channels/me/${callRecipientId}`);
    }
  };

  const handleHangup = () => {
    if (isGroup) leaveCall();
    else endCall();
  };

  return (
    <div className={cn(
      'shrink-0 border-t px-2 py-2 backdrop-blur-sm',
      isConnected
        ? 'border-success/25 bg-success/[0.06]'
        : 'border-border/40 bg-card/60',
    )}>
      {/* Status row */}
      <div
        role="button"
        tabIndex={0}
        onClick={handleNavigate}
        onKeyDown={(e) => e.key === 'Enter' && handleNavigate()}
        className="mb-1.5 flex cursor-pointer items-center gap-2 rounded-lg px-1.5 py-1 transition-colors hover:bg-foreground/6"
      >
        {/* Animated signal dot */}
        <span className="relative flex size-2 shrink-0">
          {isConnected ? (
            <>
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-40" />
              <span className="relative inline-flex size-2 rounded-full bg-success" />
            </>
          ) : (
            <span className="relative inline-flex size-2 rounded-full bg-primary" />
          )}
        </span>

        <span className={cn(
          'flex-1 truncate font-heading text-[11px] font-semibold tracking-tight',
          isConnected ? 'text-success' : 'text-muted-foreground',
        )}>
          {statusLabel[callStatus] ?? t.callBar.call}
        </span>

        {isConnected && (
          <span className="shrink-0 font-mono text-[10px] text-success/70">
            {formatDuration(callDuration)}
          </span>
        )}
      </div>

      {/* Info + actions row */}
      <div className="flex items-center gap-1 px-1">
        {/* Call type icon */}
        <div className={cn(
          'mr-1 flex size-6 shrink-0 items-center justify-center rounded-lg ring-1',
          isConnected ? 'bg-success/15 ring-success/25' : 'bg-foreground/[0.04] ring-border/30',
        )}>
          {callType === 'video'
            ? <VideoIcon size={12} className={isConnected ? 'text-success' : 'text-muted-foreground/60'} />
            : <PhoneIcon size={12} className={isConnected ? 'text-success' : 'text-muted-foreground/60'} />
          }
        </div>

        <span className="min-w-0 flex-1 truncate text-[11px] font-medium text-foreground/70">
          {callerName || t.callBar.ongoingCall}
        </span>

        {isScreenSharing && (
          <MonitorUpIcon size={12} className="shrink-0 text-primary" aria-label={t.callBar.shareScreen} />
        )}

        {/* Quality / mode badge (group or server calls only) */}
        {isConnected && callCategory !== 'dm' && (
          <span className="shrink-0 rounded-md border border-border/40 bg-foreground/5 px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
            {callMode === 'sfu' ? tierLabel : 'P2P'}
          </span>
        )}

        {/* Raise / lower hand (server calls only) */}
        {isConnected && callCategory === 'server' && (
          <button
            type="button"
            onClick={toggleHand}
            aria-label={handRaised ? 'Baisser la main' : 'Lever la main'}
            title={handRaised ? 'Baisser la main' : 'Lever la main'}
            className={cn(
              'flex size-7 shrink-0 items-center justify-center rounded-lg text-sm transition-all duration-150 hover:scale-110 active:scale-95',
              handRaised
                ? 'bg-warning/20 text-warning'
                : 'bg-foreground/5 text-muted-foreground hover:bg-foreground/10 hover:text-foreground',
            )}
          >
            ✋
          </button>
        )}

        {/* Mute toggle */}
        <button
          type="button"
          onClick={toggleMute}
          aria-label={isMuted ? t.callBar.unmuteMic : t.callBar.muteMic}
          title={isMuted ? t.callBar.unmuteMic : t.callBar.muteMic}
          className={cn(
            'flex size-7 shrink-0 items-center justify-center rounded-lg transition-all duration-150 hover:scale-110 active:scale-95',
            isMuted
              ? 'bg-destructive/20 text-destructive hover:bg-destructive hover:text-destructive-foreground'
              : 'bg-foreground/[0.05] text-muted-foreground hover:bg-foreground/10 hover:text-foreground',
          )}
        >
          {isMuted ? <MicOffIcon size={13} /> : <MicIcon size={13} />}
        </button>

        {/* End / Leave call */}
        <button
          type="button"
          onClick={handleHangup}
          aria-label={isGroup ? (t.calls?.leave ?? 'Quitter') : t.callBar.hangup}
          title={isGroup ? (t.calls?.leave ?? 'Quitter') : t.callBar.hangup}
          className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-destructive/15 text-destructive transition-all duration-150 hover:scale-110 hover:bg-destructive hover:text-destructive-foreground active:scale-95"
        >
          <PhoneOffIcon size={13} />
        </button>
      </div>
    </div>
  );
}
