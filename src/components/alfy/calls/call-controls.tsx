'use client';

import { Button, ToggleButton, Toolbar, Tooltip } from '@heroui/react';
import { Hand, Mic, MicOff, MonitorUp, PhoneOff, Video, VideoOff } from 'lucide-react';

import { useTranslation } from '@/components/locale-provider';

interface CallControlsProps {
  isMuted: boolean;
  onToggleMute: () => void;
  isVideoOff: boolean;
  onToggleVideo: () => void;
  isScreenSharing?: boolean;
  onToggleScreenShare?: () => void;
  /** Absent = pas de bouton « lever la main » (appels 1:1, sans salon commun). */
  handRaised?: boolean;
  onToggleHand?: () => void;
  onHangUp?: () => void;
}

/** Barre de contrôles flottante d'un appel. */
export function CallControls({
  isMuted,
  onToggleMute,
  isVideoOff,
  onToggleVideo,
  isScreenSharing,
  onToggleScreenShare,
  handRaised,
  onToggleHand,
  onHangUp,
}: CallControlsProps) {
  const { t } = useTranslation();
  return (
    <Toolbar
      aria-label={t.calls.controls.ariaLabel}
      className="alfy-enter flex items-center gap-1.5 rounded-full border border-border bg-overlay/90 px-3 py-2 shadow-lg backdrop-blur-md"
    >
      <Tooltip delay={300}>
        <ToggleButton isIconOnly isSelected={!isMuted} onChange={onToggleMute} aria-label={isMuted ? t.calls.controls.enableMic : t.callBar.muteMic} className="rounded-full">
          {isMuted ? <MicOff className="size-4.5" /> : <Mic className="size-4.5" />}
        </ToggleButton>
        <Tooltip.Content>
          <p>{isMuted ? t.calls.controls.enableMic : t.callBar.muteMic}</p>
        </Tooltip.Content>
      </Tooltip>
      <Tooltip delay={300}>
        <ToggleButton isIconOnly isSelected={!isVideoOff} onChange={onToggleVideo} aria-label={isVideoOff ? t.calls.enableCamera : t.calls.disableCamera} className="rounded-full">
          {isVideoOff ? <VideoOff className="size-4.5" /> : <Video className="size-4.5" />}
        </ToggleButton>
        <Tooltip.Content>
          <p>{isVideoOff ? t.calls.enableCamera : t.calls.disableCamera}</p>
        </Tooltip.Content>
      </Tooltip>
      {onToggleScreenShare && (
        <Tooltip delay={300}>
          <ToggleButton isIconOnly isSelected={!!isScreenSharing} onChange={onToggleScreenShare} aria-label={t.calls.controls.shareScreen} className="rounded-full">
            <MonitorUp className="size-4.5" />
          </ToggleButton>
          <Tooltip.Content>
            <p>{t.calls.controls.shareScreen}</p>
          </Tooltip.Content>
        </Tooltip>
      )}
      {onToggleHand && (
        <Tooltip delay={300}>
          <ToggleButton
            isIconOnly
            isSelected={!!handRaised}
            onChange={onToggleHand}
            aria-label={handRaised ? t.calls.controls.lowerHand : t.calls.controls.raiseHand}
            className="rounded-full"
          >
            <Hand className="size-4.5" />
          </ToggleButton>
          <Tooltip.Content>
            <p>{handRaised ? t.calls.controls.lowerHand : t.calls.controls.raiseHand}</p>
          </Tooltip.Content>
        </Tooltip>
      )}
      <Tooltip delay={300}>
        <Button
          isIconOnly
          variant="danger"
          aria-label={t.calls.hangup}
          className="ml-1 rounded-full"
          onPress={onHangUp}
        >
          <PhoneOff className="size-4.5" />
        </Button>
        <Tooltip.Content>
          <p>{t.calls.hangup}</p>
        </Tooltip.Content>
      </Tooltip>
    </Toolbar>
  );
}
