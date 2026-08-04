'use client';

import { Button, Chip, Code, Switch, Table } from '@heroui/react';
import { Plus } from 'lucide-react';

import { WEBHOOKS } from '@/components/alfy/mock/data';
import { useTranslation } from '@/components/locale-provider';

export function WebhooksPanel() {
  const { t, tx } = useTranslation();
  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-muted">
          {t.admin.dev.webhooks.intro}
        </p>
        <Button size="sm">
          <Plus className="size-3.5" />
          {t.admin.dev.webhooks.newWebhook}
        </Button>
      </div>
      <Table>
        <Table.ScrollContainer>
          <Table.Content aria-label={t.admin.dev.webhooks.ariaTable}>
            <Table.Header>
              <Table.Column isRowHeader>{t.admin.dev.webhooks.colUrl}</Table.Column>
              <Table.Column>{t.admin.dev.webhooks.colEvents}</Table.Column>
              <Table.Column>{t.admin.dev.webhooks.colActive}</Table.Column>
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
                    <Switch defaultSelected={hook.active} aria-label={tx(t.admin.dev.webhooks.ariaActivate, { url: hook.url })}>
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
