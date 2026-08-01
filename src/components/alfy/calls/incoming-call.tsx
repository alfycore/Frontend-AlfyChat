'use client';

import { AlertDialog, Button } from '@heroui/react';
import { Phone, PhoneOff, Video } from 'lucide-react';

import type { AlfyUser } from '@/components/alfy/mock/types';
import { AlfyAvatar } from '@/components/alfy/primitives/alfy-avatar';

interface IncomingCallProps {
  caller: AlfyUser;
  callType: 'voice' | 'video';
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onAccept?: () => void;
  onDecline?: () => void;
}

export function IncomingCall({ caller, callType, isOpen, onOpenChange, onAccept, onDecline }: IncomingCallProps) {
  return (
    <AlertDialog isOpen={isOpen} onOpenChange={onOpenChange}>
      <AlertDialog.Backdrop>
        <AlertDialog.Container>
          <AlertDialog.Dialog className="sm:max-w-[340px]">
            <AlertDialog.Header className="flex-col items-center gap-3 text-center">
              <span className="alfy-pulse">
                <AlfyAvatar name={caller.displayName} avatarUrl={caller.avatarUrl} size="lg" />
              </span>
              <AlertDialog.Heading>
                {caller.displayName} vous appelle
              </AlertDialog.Heading>
            </AlertDialog.Header>
            <AlertDialog.Body className="text-center">
              <p className="text-sm text-muted">
                {callType === 'video' ? 'Appel vidéo' : 'Appel vocal'} — chiffré de bout en bout
              </p>
            </AlertDialog.Body>
            <AlertDialog.Footer className="justify-center gap-3">
              <Button slot="close" variant="danger" onPress={onDecline}>
                <PhoneOff className="size-4" />
                Refuser
              </Button>
              <Button slot="close" className="bg-success text-[color:var(--success-foreground)]" onPress={onAccept}>
                {callType === 'video' ? <Video className="size-4" /> : <Phone className="size-4" />}
                Accepter
              </Button>
            </AlertDialog.Footer>
          </AlertDialog.Dialog>
        </AlertDialog.Container>
      </AlertDialog.Backdrop>
    </AlertDialog>
  );
}
