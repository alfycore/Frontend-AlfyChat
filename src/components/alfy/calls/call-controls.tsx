'use client';

import { Button, ToggleButton, Toolbar, Tooltip } from '@heroui/react';
import { Mic, MicOff, MonitorUp, PhoneOff, Video, VideoOff } from 'lucide-react';

interface CallControlsProps {
  isMuted: boolean;
  onToggleMute: () => void;
  isVideoOff: boolean;
  onToggleVideo: () => void;
  isScreenSharing?: boolean;
  onToggleScreenShare?: () => void;
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
  onHangUp,
}: CallControlsProps) {
  return (
    <Toolbar
      aria-label="Contrôles de l'appel"
      className="alfy-enter flex items-center gap-1.5 rounded-full border border-border bg-overlay/90 px-3 py-2 shadow-lg backdrop-blur-md"
    >
      <Tooltip delay={300}>
        <ToggleButton isIconOnly isSelected={!isMuted} onChange={onToggleMute} aria-label={isMuted ? 'Activer le micro' : 'Couper le micro'} className="rounded-full">
          {isMuted ? <MicOff className="size-4.5" /> : <Mic className="size-4.5" />}
        </ToggleButton>
        <Tooltip.Content>
          <p>{isMuted ? 'Activer le micro' : 'Couper le micro'}</p>
        </Tooltip.Content>
      </Tooltip>
      <Tooltip delay={300}>
        <ToggleButton isIconOnly isSelected={!isVideoOff} onChange={onToggleVideo} aria-label={isVideoOff ? 'Activer la caméra' : 'Couper la caméra'} className="rounded-full">
          {isVideoOff ? <VideoOff className="size-4.5" /> : <Video className="size-4.5" />}
        </ToggleButton>
        <Tooltip.Content>
          <p>{isVideoOff ? 'Activer la caméra' : 'Couper la caméra'}</p>
        </Tooltip.Content>
      </Tooltip>
      {onToggleScreenShare && (
        <Tooltip delay={300}>
          <ToggleButton isIconOnly isSelected={!!isScreenSharing} onChange={onToggleScreenShare} aria-label="Partager l'écran" className="rounded-full">
            <MonitorUp className="size-4.5" />
          </ToggleButton>
          <Tooltip.Content>
            <p>Partager l&apos;écran</p>
          </Tooltip.Content>
        </Tooltip>
      )}
      <Tooltip delay={300}>
        <Button
          isIconOnly
          variant="danger"
          aria-label="Raccrocher"
          className="ml-1 rounded-full"
          onPress={onHangUp}
        >
          <PhoneOff className="size-4.5" />
        </Button>
        <Tooltip.Content>
          <p>Raccrocher</p>
        </Tooltip.Content>
      </Tooltip>
    </Toolbar>
  );
}
