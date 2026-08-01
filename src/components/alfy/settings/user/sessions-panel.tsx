'use client';

import { Button, Chip, Spinner, toast } from '@heroui/react';
import { Laptop, Smartphone } from 'lucide-react';
import { useState } from 'react';

import { SESSIONS } from '@/components/alfy/mock/data';
import type { AlfySession } from '@/components/alfy/mock/types';
import { PanelHeader } from '@/components/alfy/settings/settings-shell';
import { SettingsRow, SettingsSection } from '@/components/alfy/settings/section';

const dateFmt = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' });

interface SessionsPanelProps {
  /** Sessions réelles ; sans elles, jeu de démonstration. */
  sessions?: AlfySession[];
  loading?: boolean;
  onRevoke?: (sessionId: string) => void;
  onRevokeOthers?: () => void;
}

export function SessionsPanel({ sessions, loading, onRevoke, onRevokeOthers }: SessionsPanelProps) {
  const [localSessions, setLocalSessions] = useState(SESSIONS);
  const isLive = sessions !== undefined;
  const items = sessions ?? localSessions;

  const revoke = (session: AlfySession) => {
    if (isLive) onRevoke?.(session.id);
    else setLocalSessions((s) => s.filter((x) => x.id !== session.id));
    toast('Session révoquée', { description: session.device });
  };

  return (
    <div>
      <PanelHeader
        title="Sessions actives"
        description="Les appareils actuellement connectés à votre compte. Révoquez ce que vous ne reconnaissez pas."
      />

      <SettingsSection title="Appareils connectés">
        {loading && items.length === 0 ? (
          <div className="flex items-center gap-2 px-4 py-6 text-sm text-muted">
            <Spinner size="sm" /> Chargement des sessions…
          </div>
        ) : items.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted">Aucune autre session active.</p>
        ) : (
          items.map((session) => {
            const Icon = /android|iphone|mobile/i.test(session.device) ? Smartphone : Laptop;
            return (
              <SettingsRow
                key={session.id}
                label={
                  <span className="flex items-center gap-2">
                    <Icon className="size-4 text-muted" aria-hidden />
                    {session.device}
                    {session.current && (
                      <Chip size="sm" color="accent" variant="soft">
                        Cette session
                      </Chip>
                    )}
                  </span>
                }
                description={`${session.location} · dernière activité ${dateFmt.format(new Date(session.lastActiveAt))}`}
              >
                {!session.current && (
                  <Button size="sm" variant="ghost" className="text-danger" onPress={() => revoke(session)}>
                    Révoquer
                  </Button>
                )}
              </SettingsRow>
            );
          })
        )}
      </SettingsSection>

      <div className="flex justify-end">
        <Button
          variant="danger"
          size="sm"
          isDisabled={items.filter((s) => !s.current).length === 0}
          onPress={() => {
            if (isLive) onRevokeOthers?.();
            else setLocalSessions((s) => s.filter((x) => x.current));
            toast('Sessions révoquées', { description: 'Tous les autres appareils ont été déconnectés.' });
          }}
        >
          Déconnecter tous les autres appareils
        </Button>
      </div>
    </div>
  );
}
