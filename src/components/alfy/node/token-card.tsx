'use client';

import { AlertDialog, Button, Card, Input, TextField } from '@heroui/react';
import { KeyRound } from 'lucide-react';

export function TokenCard() {
  return (
    <Card>
      <Card.Header>
        <div className="flex items-center gap-2">
          <KeyRound className="size-4 text-muted" aria-hidden />
          <Card.Title className="text-sm">Jeton du nœud</Card.Title>
        </div>
        <Card.Description>
          Authentifie votre nœud auprès de la passerelle AlfyChat. Ne le partagez jamais.
        </Card.Description>
      </Card.Header>
      <Card.Content>
        <TextField isReadOnly type="password" defaultValue="9c1f4e88-2a6b-4f3d-b0e7-5d21c8a94f60" aria-label="Jeton du nœud">
          <Input className="font-mono" />
        </TextField>
      </Card.Content>
      <Card.Footer className="justify-end">
        <AlertDialog>
          <Button size="sm" variant="danger">
            Régénérer le jeton
          </Button>
          <AlertDialog.Backdrop>
            <AlertDialog.Container>
              <AlertDialog.Dialog className="sm:max-w-[400px]">
                <AlertDialog.Header>
                  <AlertDialog.Icon status="danger" />
                  <AlertDialog.Heading>Régénérer le jeton ?</AlertDialog.Heading>
                </AlertDialog.Header>
                <AlertDialog.Body>
                  <p>
                    L&apos;ancien jeton sera immédiatement invalidé : votre nœud passera hors ligne
                    jusqu&apos;à ce que vous le redémarriez avec le nouveau jeton.
                  </p>
                </AlertDialog.Body>
                <AlertDialog.Footer>
                  <Button slot="close" variant="tertiary">
                    Annuler
                  </Button>
                  <Button slot="close" variant="danger">
                    Régénérer
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
