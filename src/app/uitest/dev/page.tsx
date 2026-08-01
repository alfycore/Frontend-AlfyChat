'use client';

/** /uitest/dev — portail développeur : bots, clés API, webhooks. */

import { Tabs } from '@heroui/react';
import { Bot, KeyRound, Webhook } from 'lucide-react';

import { BotList } from '@/components/alfy/dev/bot-list';
import { ApiKeysPanel } from '@/components/alfy/dev/api-keys-panel';
import { WebhooksPanel } from '@/components/alfy/dev/webhooks-panel';

export default function UitestDevPage() {
  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-4xl px-6 py-10">
        <header className="alfy-enter mb-6">
          <h1 className="text-xl font-semibold">Portail développeur</h1>
          <p className="mt-1 text-sm text-muted">
            API ouverte, documentée et gratuite. Construisez des bots et des intégrations pour vos
            communautés.
          </p>
        </header>

        <Tabs defaultSelectedKey="bots">
          <Tabs.ListContainer>
            <Tabs.List aria-label="Portail développeur">
              <Tabs.Tab id="bots">
                <Bot className="size-4" aria-hidden />
                Bots
                <Tabs.Indicator />
              </Tabs.Tab>
              <Tabs.Tab id="keys">
                <KeyRound className="size-4" aria-hidden />
                Clés API
                <Tabs.Indicator />
              </Tabs.Tab>
              <Tabs.Tab id="webhooks">
                <Webhook className="size-4" aria-hidden />
                Webhooks
                <Tabs.Indicator />
              </Tabs.Tab>
            </Tabs.List>
          </Tabs.ListContainer>
          <Tabs.Panel id="bots" className="pt-4">
            <BotList />
          </Tabs.Panel>
          <Tabs.Panel id="keys" className="pt-4">
            <ApiKeysPanel />
          </Tabs.Panel>
          <Tabs.Panel id="webhooks" className="pt-4">
            <WebhooksPanel />
          </Tabs.Panel>
        </Tabs>
      </div>
    </div>
  );
}
