'use client';

import { Button, Card, Chip, Code, toast } from '@heroui/react';
import { Globe } from 'lucide-react';

import type { AlfyNodeStatus } from '@/components/alfy/mock/types';

export function DomainCard({ status }: { status: AlfyNodeStatus }) {
  return (
    <Card>
      <Card.Header>
        <div className="flex w-full items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe className="size-4 text-muted" aria-hidden />
            <Card.Title className="text-sm">Domaine personnalisé</Card.Title>
          </div>
          {status.domainVerified ? (
            <Chip size="sm" color="success" variant="soft">
              Vérifié
            </Chip>
          ) : (
            <Chip size="sm" color="warning" variant="soft">
              En attente
            </Chip>
          )}
        </div>
        <Card.Description>
          {status.domain ?? 'Aucun domaine configuré'}
        </Card.Description>
      </Card.Header>
      <Card.Content className="flex flex-col gap-2">
        <p className="text-xs text-muted">
          Ajoutez cet enregistrement TXT à votre zone DNS pour prouver la propriété :
        </p>
        <Code className="w-fit text-[11px]">alfychat-verify=7f3a09c2e8b14d5f</Code>
      </Card.Content>
      <Card.Footer className="justify-end gap-2">
        <Button
          size="sm"
          variant="secondary"
          onPress={async () => {
            await navigator.clipboard.writeText('alfychat-verify=7f3a09c2e8b14d5f');
            toast('Enregistrement TXT copié');
          }}
        >
          Copier le TXT
        </Button>
        <Button size="sm">Vérifier maintenant</Button>
      </Card.Footer>
    </Card>
  );
}
