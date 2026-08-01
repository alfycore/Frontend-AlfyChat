'use client';

import { AlertDialog, Button, Code, Table } from '@heroui/react';
import { Plus } from 'lucide-react';

import { API_KEYS } from '@/components/alfy/mock/data';

const dateFmt = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });

export function ApiKeysPanel() {
  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-muted">
          Les clés donnent accès à l&apos;API REST — le secret n&apos;est montré qu&apos;à la création.
        </p>
        <Button size="sm">
          <Plus className="size-3.5" />
          Nouvelle clé
        </Button>
      </div>
      <Table>
        <Table.ScrollContainer>
          <Table.Content aria-label="Clés API">
            <Table.Header>
              <Table.Column isRowHeader>Nom</Table.Column>
              <Table.Column>Préfixe</Table.Column>
              <Table.Column>Créée le</Table.Column>
              <Table.Column>Dernier usage</Table.Column>
              <Table.Column aria-label="Actions" />
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
                    {key.lastUsedAt ? dateFmt.format(new Date(key.lastUsedAt)) : 'Jamais'}
                  </Table.Cell>
                  <Table.Cell>
                    <div className="flex justify-end">
                      <AlertDialog>
                        <Button size="sm" variant="ghost" className="text-danger">
                          Révoquer
                        </Button>
                        <AlertDialog.Backdrop>
                          <AlertDialog.Container>
                            <AlertDialog.Dialog className="sm:max-w-[380px]">
                              <AlertDialog.Header>
                                <AlertDialog.Icon status="danger" />
                                <AlertDialog.Heading>Révoquer « {key.name} » ?</AlertDialog.Heading>
                              </AlertDialog.Header>
                              <AlertDialog.Body>
                                <p>Toute intégration utilisant cette clé cessera de fonctionner immédiatement.</p>
                              </AlertDialog.Body>
                              <AlertDialog.Footer>
                                <Button slot="close" variant="tertiary">
                                  Annuler
                                </Button>
                                <Button slot="close" variant="danger">
                                  Révoquer
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
