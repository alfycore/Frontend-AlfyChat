'use client';

import {
  Button,
  Card,
  Checkbox,
  CheckboxGroup,
  Chip,
  Code,
  Description,
  FieldError,
  Form,
  Input,
  Label,
  Modal,
  TextField,
  toast,
} from '@heroui/react';
import { Bot, Copy, Plus } from 'lucide-react';

import { BOTS } from '@/components/alfy/mock/data';
import { AlfyAvatar } from '@/components/alfy/primitives/alfy-avatar';

const SCOPES = [
  { id: 'bot', label: 'bot', description: 'Rejoindre des serveurs comme bot' },
  { id: 'messages.read', label: 'messages.read', description: 'Lire les messages des salons autorisés' },
  { id: 'messages.write', label: 'messages.write', description: 'Envoyer des messages' },
  { id: 'commands', label: 'commands', description: 'Déclarer des slash commands' },
];

export function BotList() {
  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-muted">
          {BOTS.length} bots — l&apos;API est ouverte et documentée.
        </p>
        <Modal>
          <Button size="sm">
            <Plus className="size-3.5" />
            Nouveau bot
          </Button>
          <Modal.Backdrop>
            <Modal.Container>
              <Modal.Dialog className="sm:max-w-[420px]">
                <Modal.CloseTrigger />
                <Modal.Header>
                  <Modal.Icon className="bg-default text-foreground">
                    <Bot className="size-5" />
                  </Modal.Icon>
                  <Modal.Heading>Créer un bot</Modal.Heading>
                </Modal.Header>
                <Modal.Body>
                  <Form
                    className="flex flex-col gap-4"
                    onSubmit={(e) => {
                      e.preventDefault();
                      toast('Bot créé', { description: 'Le jeton a été généré — copiez-le maintenant.' });
                    }}
                  >
                    <TextField name="name" isRequired>
                      <Label>Nom du bot</Label>
                      <Input placeholder="Mon super bot" />
                      <FieldError />
                    </TextField>
                    <CheckboxGroup defaultValue={['bot']} aria-label="Scopes OAuth2">
                      <Label>Scopes OAuth2</Label>
                      {SCOPES.map((scope) => (
                        <Checkbox key={scope.id} value={scope.id}>
                          <Checkbox.Control>
                            <Checkbox.Indicator />
                          </Checkbox.Control>
                          <span className="flex flex-col">
                            <Label>
                              <Code className="text-xs">{scope.label}</Code>
                            </Label>
                            <Description>{scope.description}</Description>
                          </span>
                        </Checkbox>
                      ))}
                    </CheckboxGroup>
                    <Button type="submit" className="w-full">
                      Créer le bot
                    </Button>
                  </Form>
                </Modal.Body>
              </Modal.Dialog>
            </Modal.Container>
          </Modal.Backdrop>
        </Modal>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {BOTS.map((bot) => (
          <Card key={bot.id}>
            <Card.Header>
              <div className="flex w-full items-center gap-3">
                <AlfyAvatar name={bot.name} avatarUrl={bot.avatarUrl} size="md" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Card.Title className="text-sm">{bot.name}</Card.Title>
                    {bot.public ? (
                      <Chip size="sm" color="accent" variant="soft">
                        Public
                      </Chip>
                    ) : (
                      <Chip size="sm" variant="soft">
                        Privé
                      </Chip>
                    )}
                  </div>
                  <p className="text-xs text-muted">
                    {bot.serverCount} serveur{bot.serverCount > 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              <Card.Description>{bot.description}</Card.Description>
            </Card.Header>
            <Card.Footer className="justify-end gap-2">
              <Button
                size="sm"
                variant="ghost"
                onPress={async () => {
                  await navigator.clipboard.writeText(`alfy_bot_${bot.id}_************`);
                  toast('Jeton copié', { description: bot.name });
                }}
              >
                <Copy className="size-3.5" />
                Jeton
              </Button>
              <Button size="sm" variant="secondary">
                Configurer
              </Button>
            </Card.Footer>
          </Card>
        ))}
      </div>
    </div>
  );
}
