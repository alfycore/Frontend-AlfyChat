'use client';

import { AlertDialog, Button, Card, Input, TextField } from '@heroui/react';
import { KeyRound } from 'lucide-react';

import { useTranslation } from '@/components/locale-provider';

export function TokenCard() {
  const { t } = useTranslation();
  return (
    <Card>
      <Card.Header>
        <div className="flex items-center gap-2">
          <KeyRound className="size-4 text-muted" aria-hidden />
          <Card.Title className="text-sm">{t.node.token.title}</Card.Title>
        </div>
        <Card.Description>
          {t.node.token.description}
        </Card.Description>
      </Card.Header>
      <Card.Content>
        <TextField isReadOnly type="password" defaultValue="9c1f4e88-2a6b-4f3d-b0e7-5d21c8a94f60" aria-label={t.node.token.title}>
          <Input className="font-mono" />
        </TextField>
      </Card.Content>
      <Card.Footer className="justify-end">
        <AlertDialog>
          <Button size="sm" variant="danger">
            {t.node.token.regenerateBtn}
          </Button>
          <AlertDialog.Backdrop>
            <AlertDialog.Container>
              <AlertDialog.Dialog className="sm:max-w-[400px]">
                <AlertDialog.Header>
                  <AlertDialog.Icon status="danger" />
                  <AlertDialog.Heading>{t.node.token.regenerateDialogTitle}</AlertDialog.Heading>
                </AlertDialog.Header>
                <AlertDialog.Body>
                  <p>
                    {t.node.token.regenerateDialogBody}
                  </p>
                </AlertDialog.Body>
                <AlertDialog.Footer>
                  <Button slot="close" variant="tertiary">
                    {t.common.cancel}
                  </Button>
                  <Button slot="close" variant="danger">
                    {t.node.token.confirmRegenerateBtn}
                  </Button>
                </AlertDialog.Footer>
              </AlertDialog.Dialog>
            </AlertDialog.Container>
          </AlertDialog.Backdrop>
        </AlertDialog>
      </Card.Footer>
    </Card>
  );
}
