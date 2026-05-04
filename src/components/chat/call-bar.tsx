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
    callDuration,
    isScreenSharing,
    isMuted,
    endCall,
    toggleMute,
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
    if (callRecipientId) router.push(`/channels/me/${callRecipientId}`);
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

        {/* Mute toggle */}
        <button
          type="button"
          onClick={toggleMute}
          aria-label={isMuted ? 'Réactiver le micro' : 'Couper le micro'}
          title={isMuted ? 'Réactiver le micro' : 'Couper le micro'}
          className={cn(
            'flex size-7 shrink-0 items-center justify-center rounded-lg transition-all duration-150 hover:scale-110 active:scale-95',
            isMuted
              ? 'bg-destructive/20 text-destructive hover:bg-destructive hover:text-destructive-foreground'
              : 'bg-foreground/[0.05] text-muted-foreground hover:bg-foreground/10 hover:text-foreground',
          )}
        >
          {isMuted ? <MicOffIcon size={13} /> : <MicIcon size={13} />}
        </button>

        {/* End call */}
        <button
          type="button"
          onClick={endCall}
          aria-label="Raccrocher"
          title="Raccrocher"
          className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-destructive/15 text-destructive transition-all duration-150 hover:scale-110 hover:bg-destructive hover:text-destructive-foreground active:scale-95"
        >
          <PhoneOffIcon size={13} />
        </button>
      </div>
    </div>
  );
}
