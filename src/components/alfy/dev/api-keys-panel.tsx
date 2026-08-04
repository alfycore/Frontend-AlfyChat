'use client';

import { AlertDialog, Button, Code, Table } from '@heroui/react';
import { Plus } from 'lucide-react';

import { API_KEYS } from '@/components/alfy/mock/data';
import { useTranslation } from '@/components/locale-provider';

const dateFmt = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });

export function ApiKeysPanel() {
  const { t, tx } = useTranslation();
  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-muted">
          {t.admin.dev.apiKeys.intro}
        </p>
        <Button size="sm">
          <Plus className="size-3.5" />
          {t.admin.dev.apiKeys.newKey}
        </Button>
      </div>
      <Table>
        <Table.ScrollContainer>
          <Table.Content aria-label={t.admin.dev.apiKeys.ariaTable}>
            <Table.Header>
              <Table.Column isRowHeader>{t.admin.dev.apiKeys.colName}</Table.Column>
              <Table.Column>{t.admin.dev.apiKeys.colPrefix}</Table.Column>
              <Table.Column>{t.admin.dev.apiKeys.colCreatedAt}</Table.Column>
              <Table.Column>{t.admin.dev.apiKeys.colLastUsed}</Table.Column>
              <Table.Column aria-label={t.admin.dev.apiKeys.colActions} />
            </Table.Header>
            <Table.Body>
              {API_KEYS.map((key) => (
                <Table.Row key={key.id}>
                  <Table.Cell className="font-medium">{key.name}</Table.Cell>
                  <Table.Cell>
                    <Code className="text-xs">{key.prefix}</Code>
                  </Table.Cell>
                  <Table.Cell className="text-muted">{dateFmt.format(new Date(key.createdAt))}</Table.Cell>
                  <Table.Cell className="text-muted">
                    {key.lastUsedAt ? dateFmt.format(new Date(key.lastUsedAt)) : t.admin.dev.apiKeys.never}
                  </Table.Cell>
                  <Table.Cell>
                    <div className="flex justify-end">
                      <AlertDialog>
                        <Button size="sm" variant="ghost" className="text-danger">
                          {t.admin.dev.apiKeys.revoke}
                        </Button>
                        <AlertDialog.Backdrop>
                          <AlertDialog.Container>
                            <AlertDialog.Dialog className="sm:max-w-[380px]">
                              <AlertDialog.Header>
                                <AlertDialog.Icon status="danger" />
                                <AlertDialog.Heading>{tx(t.admin.dev.apiKeys.revokeConfirm, { name: key.name })}</AlertDialog.Heading>
                              </AlertDialog.Header>
                              <AlertDialog.Body>
                                <p>{t.admin.dev.apiKeys.revokeDesc}</p>
                              </AlertDialog.Body>
                              <AlertDialog.Footer>
                                <Button slot="close" variant="tertiary">
                                  {t.common.cancel}
                                </Button>
                                <Button slot="close" variant="danger">
                                  {t.admin.dev.apiKeys.revoke}
                                </Button>
                              </AlertDialog.Footer>
                            </AlertDialog.Dialog>
                          </AlertDialog.Container>
                        </AlertDialog.Backdrop>
                      </AlertDialog>
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
