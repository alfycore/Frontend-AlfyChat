'use client';

import { useEffect, useRef } from 'react';
import { PhoneIcon, PhoneOffIcon, VideoIcon } from '@/components/icons';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { resolveMediaUrl } from '@/lib/api';

interface IncomingCallDialogProps {
  open: boolean;
  callerName: string;
  callerAvatar?: string;
  callType: 'voice' | 'video';
  onAccept: () => void;
  onDecline: () => void;
}

export function IncomingCallDialog({
  open,
  callerName,
  callerAvatar,
  callType,
  onAccept,
  onDecline,
}: IncomingCallDialogProps) {
  const ctxRef = useRef<AudioContext | null>(null);

  // ── Ringtone: two-tone pulse (440 Hz + 480 Hz), 0.6s on / 1.2s off ──
  useEffect(() => {
    if (!open) return;

    try {
      const ctx = new AudioContext();
      ctxRef.current = ctx;

      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.frequency.value = 440;
      osc2.frequency.value = 480;
      osc1.type = 'sine';
      osc2.type = 'sine';
      gain.gain.value = 0;
      osc1.start();
      osc2.start();

      const interval = setInterval(() => {
        const t = ctx.currentTime;
        gain.gain.setValueAtTime(0.08, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
      }, 1800);

      return () => {
        clearInterval(interval);
        // Silence immédiatement avant d'arrêter pour éviter le clic audio résiduel
        try { gain.gain.setValueAtTime(0, ctx.currentTime); } catch { /* ignore */ }
        try { osc1.stop(); } catch { /* ignore */ }
        try { osc2.stop(); } catch { /* ignore */ }
        ctx.close().catch(() => {});
        ctxRef.current = null;
      };
    } catch {
      // AudioContext not available
    }
  }, [open]);

  return (
    <Dialog open={open}>
      <DialogContent showCloseButton={false} className="max-w-[320px] overflow-hidden rounded-3xl border-0 bg-zinc-900 p-0 shadow-2xl">
            <DialogHeader className="sr-only">
              <DialogTitle>
                {callType === 'video' ? 'Appel vidéo entrant' : 'Appel vocal entrant'}
              </DialogTitle>
            </DialogHeader>

            {/* ── Top section: avatar + info ── */}
            <div className="relative flex flex-col items-center px-8 pb-6 pt-10">
              {/* Ambient glow behind avatar */}
              <div className="pointer-events-none absolute inset-0 flex items-start justify-center overflow-hidden">
                <div className="mt-4 size-48 animate-pulse rounded-full bg-(--accent)/10 blur-3xl" />
              </div>

              {/* Avatar with animated rings */}
              <div className="relative mb-5 flex items-center justify-center">
                <span className="absolute size-28 animate-ping rounded-full border border-white/8" style={{ animationDuration: '1.6s' }} />
                <span className="absolute size-22 animate-ping rounded-full border border-white/12" style={{ animationDuration: '1.2s', animationDelay: '0.2s' }} />
                <div className="relative rounded-full p-1 ring-2 ring-white/10 shadow-xl">
                  <Avatar className="size-20 rounded-full">
                    <AvatarImage src={resolveMediaUrl(callerAvatar)} />
                    <AvatarFallback className="bg-zinc-700 text-white text-3xl font-bold">
                      {callerName[0]?.toUpperCase() || '?'}
                    </AvatarFallback>
                  </Avatar>
                </div>
              </div>

              {/* Caller name + badge */}
              <div className="flex flex-col items-center gap-2 text-center">
                <h2 className="text-xl font-bold tracking-tight text-white">{callerName}</h2>
                <div className="flex items-center gap-1.5 rounded-full bg-white/8 px-3 py-1">
                  <span className="relative flex size-1.5">
                    <span className="absolute inline-flex size-full animate-ping rounded-full bg-(--accent) opacity-60" />
                    <span className="relative inline-flex size-1.5 rounded-full bg-(--accent)" />
                  </span>
                  <span className="text-[11px] font-semibold uppercase tracking-widest text-white/60">
                    {callType === 'video' ? 'Appel vidéo' : 'Appel vocal'}
                  </span>
                </div>
              </div>
            </div>

            {/* ── Bottom section: action buttons ── */}
            <div className="flex items-center justify-center gap-12 border-t border-white/6 bg-zinc-950/50 px-8 py-6">
              {/* Decline */}
              <div className="flex flex-col items-center gap-2">
                <Button
                  size="icon"
                  onClick={onDecline}
                  className="size-16 rounded-full bg-red-500 text-white shadow-xl transition-all duration-200 hover:scale-110 hover:bg-red-400 active:scale-95"
                >
                  <PhoneOffIcon size={26} />
                </Button>
                <span className="text-[11px] font-medium text-white/40">Refuser</span>
              </div>

              {/* Accept */}
              <div className="flex flex-col items-center gap-2">
                <Button
                  size="icon"
                  onClick={onAccept}
                  className="size-16 rounded-full bg-green-500 text-white shadow-xl transition-all duration-200 hover:scale-110 hover:bg-green-400 active:scale-95"
                >
                  {callType === 'video' ? (
                    <VideoIcon size={26} />
                  ) : (
                    <PhoneIcon size={26} />
                  )}
                </Button>
                <span className="text-[11px] font-medium text-white/40">Accepter</span>
              </div>
            </div>
      </DialogContent>
    </Dialog>
  );
}
