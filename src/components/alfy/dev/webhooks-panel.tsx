'use client';

import { Button, Chip, Code, Switch, Table } from '@heroui/react';
import { Plus } from 'lucide-react';

import { WEBHOOKS } from '@/components/alfy/mock/data';

export function WebhooksPanel() {
  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-muted">
          Recevez les événements de vos serveurs en HTTP POST signé (HMAC).
        </p>
        <Button size="sm">
          <Plus className="size-3.5" />
          Nouveau webhook
        </Button>
      </div>
      <Table>
        <Table.ScrollContainer>
          <Table.Content aria-label="Webhooks">
            <Table.Header>
              <Table.Column isRowHeader>URL</Table.Column>
              <Table.Column>Événements</Table.Column>
              <Table.Column>Actif</Table.Column>
            </Table.Header>
            <Table.Body>
              {WEBHOOKS.map((hook) => (
                <Table.Row key={hook.id}>
                  <Table.Cell>
                    <Code className="text-xs">{hook.url}</Code>
                  </Table.Cell>
                  <Table.Cell>
                    <div className="flex flex-wrap gap-1">
                      {hook.events.map((e) => (
                        <Chip key={e} size="sm" variant="soft" className="text-[10px]">
                          {e}
                        </Chip>
                      ))}
                    </div>
                  </Table.Cell>
                  <Table.Cell>
                    <Switch defaultSelected={hook.active} aria-label={`Activer ${hook.url}`}>
                      <Switch.Content>
                        <Switch.Control>
                          <Switch.Thumb />
                        </Switch.Control>
                      </Switch.Content>
                    </Switch>
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
