'use client';

/**
 * Salon vocal de serveur — rejoint/crée l'appel SFU du salon dès l'arrivée
 * sur la route (le clic sur le salon dans la sidebar EST l'action de
 * rejoindre, comme sur Discord). L'appel lui-même s'affiche via la modale
 * globale `AlfyActiveCall` ; cette vue ne sert que d'accueil/statut.
 */

import { useEffect, useRef } from 'react';
import { Button } from '@heroui/react';
import { LogOut, Volume2 } from 'lucide-react';

import { useCallContext } from '@/hooks/use-call-context';

interface AlfyVoiceChannelViewProps {
  serverId: string;
  channelId: string;
  channelName?: string;
}

export function AlfyVoiceChannelView({ serverId, channelId, channelName }: AlfyVoiceChannelViewProps) {
  const { callStatus, callChannelId, callCategory, participantCount, initiateServerCall, leaveCall } =
    useCallContext();
  const attemptedRef = useRef<string | null>(null);

  const inThisChannel =
    callCategory === 'server' && callChannelId === channelId && callStatus !== 'idle' && callStatus !== 'ended';
  const busyElsewhere = !inThisChannel && callStatus !== 'idle' && callStatus !== 'ended';

  useEffect(() => {
    if (inThisChannel || busyElsewhere) return;
    // Un seul essai automatique par salon — si ça échoue (permission micro
    // refusée, etc.), on ne redemande pas en boucle à chaque re-render.
    if (attemptedRef.current === channelId) return;
    attemptedRef.current = channelId;
    void initiateServerCall(channelId, serverId, 'voice', channelName);
  }, [channelId, serverId, channelName, inThisChannel, busyElsewhere, initiateServerCall]);

  return (
    <div className="flex h-full min-w-0 flex-1 flex-col items-center justify-center gap-4 bg-surface px-6 text-center">
      <span className="flex size-16 items-center justify-center rounded-full bg-surface-secondary text-accent">
        <Volume2 className="size-7" aria-hidden />
      </span>
      <div>
        <p className="text-lg font-bold">{channelName ?? 'Salon vocal'}</p>
        <p className="mt-1 text-sm text-muted">
          {busyElsewhere
            ? 'Déjà en appel ailleurs — quittez-le avant de rejoindre ce salon.'
            : callStatus === 'connected'
              ? `Connecté${participantCount > 1 ? ` · ${participantCount} participants` : ''}`
              : 'Connexion…'}
        </p>
      </div>
      {inThisChannel && (
        <Button color="danger" variant="soft" onPress={leaveCall}>
          <LogOut className="size-4" aria-hidden />
          Quitter le vocal
        </Button>
      )}
    </div>
  );
}
