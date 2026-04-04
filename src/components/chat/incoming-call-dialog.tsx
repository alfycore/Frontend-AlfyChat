'use client';

import { useEffect, useRef } from 'react';
import { PhoneIcon, PhoneOffIcon, VideoIcon } from '@/components/icons';
import { Avatar, Button, Modal } from '@heroui/react';
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

  // ── Ringtone (440 Hz oscillator, 0.5s on / 1s off) ──
  useEffect(() => {
    if (!open) return;

    try {
      const ctx = new AudioContext();
      ctxRef.current = ctx;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 440;
      osc.type = 'sine';
      gain.gain.value = 0;
      osc.start();

      const interval = setInterval(() => {
        const t = ctx.currentTime;
        gain.gain.setValueAtTime(0.12, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
      }, 1500);

      return () => {
        clearInterval(interval);
        osc.stop();
        ctx.close().catch(() => {});
        ctxRef.current = null;
      };
    } catch {
      // AudioContext not available
    }
  }, [open]);

  return (
    <Modal isOpen={open}>
      <Modal.Backdrop>
        <Modal.Container size="sm">
          <Modal.Dialog className="max-w-sm rounded-2xl border border-[var(--border)]/30 bg-[var(--surface)]/80 shadow-2xl">
          {/* ── Header ── */}
          <div className="relative overflow-hidden">
            {/* Background glow */}
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute left-1/2 top-1/4 size-48 -translate-x-1/2 animate-pulse rounded-full bg-[var(--accent)]/15 " />
            </div>

            <div className="relative flex flex-col items-center gap-4 px-6 pb-5 pt-8 sm:px-8">
              {/* Avatar with ping animation */}
              <div className="relative">
                <div className="rounded-2xl border border-[var(--border)]/60 bg-[var(--surface)]/80 p-1 shadow-2xl">
                  <Avatar className="size-20 rounded-xl sm:size-24">
                    <Avatar.Image src={resolveMediaUrl(callerAvatar)} />
                    <Avatar.Fallback className="bg-[var(--accent)]/80 text-[var(--accent-foreground)] text-3xl font-bold">
                      {callerName[0]?.toUpperCase() || '?'}
                    </Avatar.Fallback>
                  </Avatar>
                </div>
                <span className="absolute -inset-1 animate-ping rounded-2xl border border-[var(--accent)]/30" />
                <span className="absolute -inset-3 animate-pulse rounded-3xl border border-[var(--accent)]/15" />
              </div>

              {/* Caller info */}
              <div className="flex flex-col items-center gap-1.5 text-center">
                <h2 className="text-lg font-semibold tracking-tight sm:text-xl">{callerName}</h2>
                <div className="flex items-center gap-1.5 rounded-xl bg-[var(--surface-secondary)]/40 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
                  <span className="relative flex size-2">
                    <span className="absolute inline-flex size-full animate-ping rounded-full bg-[var(--accent)]/60" />
                    <span className="relative inline-flex size-2 rounded-full bg-[var(--accent)]" />
                  </span>
                  {callType === 'video' ? 'Appel vidéo entrant' : 'Appel vocal entrant'}
                </div>
              </div>
            </div>
          </div>

          {/* ── Action buttons ── */}
          <div className="rounded-b-2xl border-t border-[var(--border)]/30 bg-[var(--surface-secondary)]/20 px-6 py-5 sm:px-8">
            <div className="flex items-center justify-center gap-10 sm:gap-14">
              {/* Decline */}
              <div className="flex flex-col items-center gap-2">
                <Button
                  isIconOnly
                  onPress={onDecline}
                  className="size-14 rounded-2xl bg-red-500/90 text-white shadow-lg shadow-red-500/25 transition-all duration-200 hover:scale-105 hover:bg-red-500 active:scale-95 sm:size-16"
                >
                  <PhoneOffIcon size={24} />
                </Button>
                <span className="text-[11px] font-medium tracking-wide text-[var(--muted)]/70">Refuser</span>
              </div>

              {/* Accept */}
              <div className="flex flex-col items-center gap-2">
                <Button
                  isIconOnly
                  onPress={onAccept}
                  className="size-14 rounded-2xl bg-green-500/90 text-white shadow-lg shadow-green-500/25 transition-all duration-200 hover:scale-105 hover:bg-green-500 active:scale-95 sm:size-16"
                >
                  {callType === 'video' ? (
                    <VideoIcon size={24} />
                  ) : (
                    <PhoneIcon size={24} />
                  )}
                </Button>
                <span className="text-[11px] font-medium tracking-wide text-[var(--muted)]/70">Accepter</span>
              </div>
            </div>
          </div>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
