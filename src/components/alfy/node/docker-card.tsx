'use client';

import { Accordion, Button, Card, Tooltip, toast } from '@heroui/react';
import { Container, Copy } from 'lucide-react';

const COMPOSE = `services:
  alfychat-node:
    image: alfychat/server-node:1.4
    restart: unless-stopped
    environment:
      - SERVER_ID=s-alfy
      - NODE_TOKEN=\${NODE_TOKEN}
    volumes:
      - ./data:/data
    ports:
      - "8443:8443"`;

const CLI = 'alfychat-server start --server-id=s-alfy --token=$NODE_TOKEN';

function CopyBlock({ label, content }: { label: string; content: string }) {
  return (
    <div className="relative">
      <pre className="overflow-x-auto rounded-md bg-[color:var(--field-background)] p-3 pr-10 font-mono text-xs leading-relaxed">
        {content}
      </pre>
      <Tooltip delay={300}>
        <Button
          isIconOnly
          size="sm"
          variant="ghost"
          className="absolute top-1.5 right-1.5 text-muted"
          aria-label={`Copier ${label}`}
          onPress={async () => {
            await navigator.clipboard.writeText(content);
            toast('Copié', { description: label });
          }}
        >
          <Copy className="size-3.5" />
        </Button>
        <Tooltip.Content>
          <p>Copier</p>
        </Tooltip.Content>
      </Tooltip>
    </div>
  );
}

export function DockerCard() {
  return (
    <Card>
      <Card.Header>
        <div className="flex items-center gap-2">
          <Container className="size-4 text-[color:var(--alfy-node)]" aria-hidden />
          <Card.Title className="text-sm">Configuration Docker</Card.Title>
        </div>
        <Card.Description>Déployez votre nœud en une commande.</Card.Description>
      </Card.Header>
      <Card.Content className="flex flex-col gap-3">
        <CopyBlock label="docker-compose.yml" content={COMPOSE} />
        <Accordion>
          <Accordion.Item id="cli">
            <Accordion.Heading>
              <Accordion.Trigger className="text-xs">
                Sans Docker (CLI Node.js)
                <Accordion.Indicator />
              </Accordion.Trigger>
            </Accordion.Heading>
            <Accordion.Panel>
              <CopyBlock label="Commande CLI" content={CLI} />
            </Accordion.Panel>
          </Accordion.Item>
        </Accordion>
      </Card.Content>
    </Card>
  );
}
