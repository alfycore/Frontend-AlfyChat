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
import { useTranslation } from '@/components/locale-provider';

export function BotList() {
  const { t, tx } = useTranslation();
  const SCOPES = [
    { id: 'bot', label: 'bot', description: t.admin.dev.bots.scopeBotDesc },
    { id: 'messages.read', label: 'messages.read', description: t.admin.dev.bots.scopeMessagesReadDesc },
    { id: 'messages.write', label: 'messages.write', description: t.admin.dev.bots.scopeMessagesWriteDesc },
    { id: 'commands', label: 'commands', description: t.admin.dev.bots.scopeCommandsDesc },
  ];
  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-muted">
          {tx(t.admin.dev.bots.intro, { n: BOTS.length })}
        </p>
        <Modal>
          <Button size="sm">
            <Plus className="size-3.5" />
            {t.admin.dev.bots.newBot}
          </Button>
          <Modal.Backdrop>
            <Modal.Container>
              <Modal.Dialog className="sm:max-w-[420px]">
                <Modal.CloseTrigger />
                <Modal.Header>
                  <Modal.Icon className="bg-default text-foreground">
                    <Bot className="size-5" />
                  </Modal.Icon>
                  <Modal.Heading>{t.admin.dev.bots.createBot}</Modal.Heading>
                </Modal.Header>
                <Modal.Body>
                  <Form
                    className="flex flex-col gap-4"
                    onSubmit={(e) => {
                      e.preventDefault();
                      toast(t.admin.dev.bots.toastBotCreated, { description: t.admin.dev.bots.toastBotCreatedDesc });
                    }}
                  >
                    <TextField name="name" isRequired>
                      <Label>{t.admin.dev.bots.nameLabel}</Label>
                      <Input placeholder={t.admin.dev.bots.namePlaceholder} />
                      <FieldError />
                    </TextField>
                    <CheckboxGroup defaultValue={['bot']} aria-label={t.admin.dev.bots.ariaScopes}>
                      <Label>{t.admin.dev.bots.scopesLabel}</Label>
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
                      {t.admin.dev.bots.submitCreate}
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
                        {t.admin.dev.bots.public}
                      </Chip>
                    ) : (
                      <Chip size="sm" variant="soft">
                        {t.admin.dev.bots.private}
                      </Chip>
                    )}
                  </div>
                  <p className="text-xs text-muted">
                    {tx(bot.serverCount > 1 ? t.admin.dev.bots.serverCountPlural : t.admin.dev.bots.serverCount, { n: bot.serverCount })}
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
                  toast(t.admin.dev.bots.toastTokenCopied, { description: bot.name });
                }}
              >
                <Copy className="size-3.5" />
                {t.admin.dev.bots.tokenBtn}
              </Button>
              <Button size="sm" variant="secondary">
                {t.admin.dev.bots.configureBtn}
              </Button>
            </Card.Footer>
          </Card>
        ))}
      </div>
    </div>
  );
}
