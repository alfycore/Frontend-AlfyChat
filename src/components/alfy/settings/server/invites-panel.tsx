'use client';

import { Button, Code, Table, Tooltip, toast } from '@heroui/react';
import { Copy, Plus, Trash2 } from 'lucide-react';

import { INVITES } from '@/components/alfy/mock/data';
import type { AlfyInvite } from '@/components/alfy/mock/types';
import { useUserById } from '@/components/alfy/user-directory';
import { PanelHeader } from '@/components/alfy/settings/settings-shell';

const dateFmt = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });

interface InvitesPanelProps {
  /** Invitations réelles ; sans elles, jeu de démonstration. */
  invites?: AlfyInvite[];
  onCreate?: () => void;
  onRevoke?: (code: string) => void;
}

export function InvitesPanel({ invites, onCreate, onRevoke }: InvitesPanelProps = {}) {
  const userById = useUserById();
  const items = invites ?? INVITES;
  const copy = async (code: string) => {
    await navigator.clipboard.writeText(`https://alfy.chat/invite/${code}`);
    toast('Lien copié', { description: `alfy.chat/invite/${code}` });
  };

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <PanelHeader
          title="Invitations"
          description="Créez des liens d'invitation à durée ou nombre d'utilisations limités."
        />
        <Button size="sm" onPress={onCreate}>
          <Plus className="size-3.5" />
          Créer un lien
        </Button>
      </div>
      <Table>
        <Table.ScrollContainer>
          <Table.Content aria-label="Liens d'invitation">
            <Table.Header>
              <Table.Column isRowHeader>Code</Table.Column>
              <Table.Column>Créé par</Table.Column>
              <Table.Column>Utilisations</Table.Column>
              <Table.Column>Expire</Table.Column>
              <Table.Column aria-label="Actions" />
            </Table.Header>
            <Table.Body>
              {items.map((invite) => (
                <Table.Row key={invite.code}>
                  <Table.Cell>
                    <Code>{invite.code}</Code>
                  </Table.Cell>
                  <Table.Cell>{userById(invite.createdBy).displayName}</Table.Cell>
                  <Table.Cell className="tabular-nums">
                    {invite.uses}
                    {invite.maxUses ? ` / ${invite.maxUses}` : ''}
                  </Table.Cell>
                  <Table.Cell>
                    {invite.expiresAt ? dateFmt.format(new Date(invite.expiresAt)) : 'Jamais'}
                  </Table.Cell>
                  <Table.Cell>
                    <div className="flex justify-end gap-1">
                      <Tooltip delay={300}>
                        <Button
                          isIconOnly
                          size="sm"
                          variant="ghost"
                          aria-label={`Copier le lien ${invite.code}`}
                          onPress={() => copy(invite.code)}
                        >
                          <Copy className="size-3.5" />
                        </Button>
                        <Tooltip.Content>
                          <p>Copier le lien</p>
                        </Tooltip.Content>
                      </Tooltip>
                      <Tooltip delay={300}>
                        <Button
                          isIconOnly
                          size="sm"
                          variant="ghost"
                          className="text-danger"
                          aria-label={`Révoquer ${invite.code}`}
                          onPress={() => onRevoke?.(invite.code)}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                        <Tooltip.Content>
                          <p>Révoquer</p>
                        </Tooltip.Content>
                      </Tooltip>
                    </div>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Content>
        </Table.ScrollContainer>
      </Table>
    </div>
  );
}
