'use client';

import { AlertDialog, Button } from '@heroui/react';
import { Phone, PhoneOff, Video } from 'lucide-react';

import type { AlfyUser } from '@/components/alfy/mock/types';
import { AlfyAvatar } from '@/components/alfy/primitives/alfy-avatar';
import { useTranslation } from '@/components/locale-provider';

interface IncomingCallProps {
  caller: AlfyUser;
  callType: 'voice' | 'video';
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onAccept?: () => void;
  onDecline?: () => void;
}

export function IncomingCall({ caller, callType, isOpen, onOpenChange, onAccept, onDecline }: IncomingCallProps) {
  const { t, tx } = useTranslation();
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
                {tx(t.calls.incoming.callingYou, { name: caller.displayName })}
              </AlertDialog.Heading>
            </AlertDialog.Header>
            <AlertDialog.Body className="text-center">
              <p className="text-sm text-muted">
                {tx(t.calls.incoming.subtitle, { type: callType === 'video' ? t.callOverlay.videoCall : t.callOverlay.voiceCall })}
              </p>
            </AlertDialog.Body>
            <AlertDialog.Footer className="justify-center gap-3">
              {/*
                Pas de `slot="close"` ici : sur ces composants React Aria, tout
                enfant portant ce slot ferme le dialogue tout seul, ce qui
                déclenche `onOpenChange(false)` → `declineCall()` en plus du
                bouton pressé. Cliquer « Accepter » envoyait donc CALL_ACCEPT
                *et* CALL_REJECT en même temps — le refus gagnait la course
                côté serveur et l'appel raccrochait aussitôt. La fermeture du
                dialogue vient maintenant uniquement du changement de
                `callStatus` déclenché par onAccept/onDecline.
              */}
              <Button variant="danger" onPress={onDecline}>
                <PhoneOff className="size-4" />
                {t.calls.incoming.decline}
              </Button>
              <Button className="bg-success text-(--success-foreground)" onPress={onAccept}>
                {callType === 'video' ? <Video className="size-4" /> : <Phone className="size-4" />}
                {t.calls.incoming.accept}
              </Button>
            </AlertDialog.Footer>
          </AlertDialog.Dialog>
        </AlertDialog.Container>
      </AlertDialog.Backdrop>
    </AlertDialog>
  );
}
