'use client';

import { PhoneIcon, PhoneOffIcon, MonitorUpIcon, MicIcon, MicOffIcon, VideoIcon } from '@/components/icons';
import { useRouter } from 'next/navigation';
import { useCallContext } from '@/hooks/use-call-context';
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

  if (callStatus === 'idle' || callStatus === 'ended') return null;

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const isConnected = callStatus === 'connected';

  const statusLabel: Record<string, string> = {
    calling: 'Appel en cours…',
    ringing: 'Sonnerie…',
    connecting: 'Connexion…',
    connected: callType === 'video' ? 'Vidéo connectée' : 'Vocal connecté',
  };

  const handleNavigate = () => {
    if (callRecipientId) router.push(`/channels/me/${callRecipientId}`);
  };

  return (
    <div className={cn(
      'shrink-0 border-t px-2 py-2',
      isConnected
        ? 'border-green-500/20 bg-green-500/6'
        : 'border-[var(--border)]/30 bg-[var(--background)]/60',
    )}>
      {/* Status row */}
      <div
        role="button"
        tabIndex={0}
        onClick={handleNavigate}
        onKeyDown={(e) => e.key === 'Enter' && handleNavigate()}
        className="mb-1.5 flex cursor-pointer items-center gap-2 rounded-lg px-1.5 py-1 transition-colors hover:bg-white/5"
      >
        {/* Animated signal dot */}
        <span className="relative flex size-2 shrink-0">
          {isConnected ? (
            <>
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-green-400 opacity-40" />
              <span className="relative inline-flex size-2 rounded-full bg-green-400" />
            </>
          ) : (
            <span className="relative inline-flex size-2 rounded-full bg-[var(--accent)]" />
          )}
        </span>

        <span className={cn(
          'flex-1 truncate text-[11px] font-semibold',
          isConnected ? 'text-green-400' : 'text-[var(--muted)]',
        )}>
          {statusLabel[callStatus] ?? 'Appel…'}
        </span>

        {isConnected && (
          <span className="shrink-0 font-mono text-[10px] text-green-400/70">
            {formatDuration(callDuration)}
          </span>
        )}
      </div>

      {/* Info + actions row */}
      <div className="flex items-center gap-1 px-1">
        {/* Call type icon */}
        <div className={cn(
          'mr-1 flex size-6 shrink-0 items-center justify-center rounded-md',
          isConnected ? 'bg-green-500/15' : 'bg-white/6',
        )}>
          {callType === 'video'
            ? <VideoIcon size={12} className={isConnected ? 'text-green-400' : 'text-white/50'} />
            : <PhoneIcon size={12} className={isConnected ? 'text-green-400' : 'text-white/50'} />
          }
        </div>

        <span className="min-w-0 flex-1 truncate text-[11px] font-medium text-[var(--foreground)]/70">
          {callerName || 'Appel en cours'}
        </span>

        {isScreenSharing && (
          <MonitorUpIcon size={12} className="shrink-0 text-[var(--accent)]" title="Partage d'écran" />
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
              ? 'bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white'
              : 'bg-white/6 text-[var(--muted)] hover:bg-white/12 hover:text-[var(--foreground)]',
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
          className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-red-500/15 text-red-400 transition-all duration-150 hover:scale-110 hover:bg-red-500 hover:text-white active:scale-95"
        >
          <PhoneOffIcon size={13} />
        </button>
      </div>
    </div>
  );
}
