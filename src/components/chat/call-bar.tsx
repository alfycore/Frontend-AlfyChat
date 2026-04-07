'use client';

import { HugeiconsIcon } from '@hugeicons/react';
import { PhoneIcon, PhoneOffIcon, MonitorUpIcon } from '@/components/icons';
import { useRouter } from 'next/navigation';
import { useCallContext } from '@/hooks/use-call-context';
import { Button } from '@heroui/react';
import { cn } from '@/lib/utils';

export function CallBar() {
  const {
    callStatus,
    callType,
    callerName,
    callRecipientId,
    callDuration,
    isScreenSharing,
    endCall,
  } = useCallContext();
  const router = useRouter();

  if (callStatus === 'idle' || callStatus === 'ended') return null;

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const statusText: Record<string, string> = {
    calling: 'Appel en cours…',
    ringing: 'Sonnerie…',
    connecting: 'Connexion…',
    connected: formatDuration(callDuration),
  };

  const handleClick = () => {
    if (callRecipientId) {
      router.push(`/channels/me/${callRecipientId}`);
    }
  };

  const handleEndCall = (e: React.MouseEvent) => {
    e.stopPropagation();
    endCall();
  };

  const isConnected = callStatus === 'connected';

  return (
    <div
      onClick={handleClick}
      className={cn(
        'flex cursor-pointer items-center justify-between border-b border-[var(--border)]/40 px-3 py-2 text-sm font-medium backdrop-blur-xl transition-all duration-200 md:px-4 md:py-1.5',
        isConnected
          ? 'bg-green-500/10 text-green-600 hover:bg-green-500/15 dark:text-green-400'
          : 'bg-[var(--accent)]/10 text-[var(--accent)] hover:bg-[var(--accent)]/15',
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2 md:gap-2.5">
        <div
          className={cn(
            'flex size-7 items-center justify-center rounded-lg',
            isConnected ? 'bg-green-500/15' : 'bg-[var(--accent)]/15',
          )}
        >
          <HugeiconsIcon icon={PhoneIcon} size={14} className="shrink-0" />
        </div>

        <span className="truncate text-sm">
          {callType === 'video' ? 'Vidéo' : 'Vocal'} — {callerName || 'En ligne'}
        </span>

        {isScreenSharing && (
          <div className="hidden items-center gap-1 rounded-lg bg-[var(--surface-secondary)]/40 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)] sm:flex">
            <HugeiconsIcon icon={MonitorUpIcon} size={12} />
            Partage
          </div>
        )}

        <span className="hidden text-xs opacity-70 sm:inline">{statusText[callStatus] || ''}</span>
      </div>

      <Button
        isIconOnly
        size="sm"
        variant="danger"
        className="rounded-lg"
        onPress={() => endCall()}
      >
        <HugeiconsIcon icon={PhoneOffIcon} size={16} />
      </Button>
    </div>
  );
}
