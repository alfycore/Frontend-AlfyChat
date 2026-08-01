'use client';

import { Button, Card, toast } from '@heroui/react';
import { Check, MessageSquare, ServerCog, UserRound } from 'lucide-react';

import { CURRENT_USER } from '@/components/alfy/mock/data';
import { AlfyAvatar } from '@/components/alfy/primitives/alfy-avatar';
import { AlfyMark } from '@/components/alfy/primitives/alfy-mark';

const SCOPES = [
  { icon: UserRound, label: 'Accéder à votre profil public', detail: 'nom, avatar, identifiant' },
  { icon: MessageSquare, label: 'Envoyer des messages en votre nom', detail: 'dans les salons autorisés' },
  { icon: ServerCog, label: 'Voir vos serveurs', detail: 'liste et rôles' },
];

export default function UitestOauthPage() {
  return (
    <div className="flex h-full items-center justify-center overflow-y-auto bg-background p-6">
      <Card className="alfy-enter w-full max-w-sm">
        <Card.Header className="items-center text-center">
          <div className="flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-2xl bg-surface-secondary text-lg">🤖</span>
            <span className="text-muted">↔</span>
            <AlfyMark className="size-9" />
          </div>
          <Card.Title>Sondage Express veut accéder à votre compte</Card.Title>
          <Card.Description>Cette application tierce demande les autorisations suivantes.</Card.Description>
        </Card.Header>
        <Card.Content className="flex flex-col gap-3">
          <div className="flex items-center gap-2 rounded-lg bg-surface-secondary p-2.5">
            <AlfyAvatar name={CURRENT_USER.displayName} avatarUrl={CURRENT_USER.avatarUrl} size="sm" />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{CURRENT_USER.displayName}</p>
              <p className="truncate text-xs text-muted">@{CURRENT_USER.username}</p>
            </div>
          </div>
          <ul className="flex flex-col gap-2">
            {SCOPES.map(({ icon: Icon, label, detail }) => (
              <li key={label} className="flex items-start gap-2.5">
                <span className="mt-0.5 flex size-5 items-center justify-center rounded-full bg-success/15 text-success">
                  <Check className="size-3" aria-hidden />
                </span>
                <span className="min-w-0">
                  <span className="flex items-center gap-1.5 text-sm">
                    <Icon className="size-3.5 text-muted" aria-hidden />
                    {label}
                  </span>
                  <span className="text-xs text-muted">{detail}</span>
                </span>
              </li>
            ))}
          </ul>
        </Card.Content>
        <Card.Footer className="gap-2">
          <Button variant="tertiary" className="flex-1" onPress={() => toast('Autorisation refusée')}>
            Refuser
          </Button>
          <Button className="flex-1" onPress={() => toast('Application autorisée', { description: 'Sondage Express' })}>
            Autoriser
          </Button>
        </Card.Footer>
      </Card>
    </div>
  );
}
