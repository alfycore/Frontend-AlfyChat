'use client';

import { Button, Card, Chip, Code, toast } from '@heroui/react';
import { Globe } from 'lucide-react';

import type { AlfyNodeStatus } from '@/components/alfy/mock/types';
import { useTranslation } from '@/components/locale-provider';

export function DomainCard({ status }: { status: AlfyNodeStatus }) {
  const { t } = useTranslation();
  return (
    <Card>
      <Card.Header>
        <div className="flex w-full items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe className="size-4 text-muted" aria-hidden />
            <Card.Title className="text-sm">{t.node.domain.title}</Card.Title>
          </div>
          {status.domainVerified ? (
            <Chip size="sm" color="success" variant="soft">
              {t.node.domain.verified}
            </Chip>
          ) : (
            <Chip size="sm" color="warning" variant="soft">
              {t.node.domain.pending}
            </Chip>
          )}
        </div>
        <Card.Description>
          {status.domain ?? t.node.domain.noDomain}
        </Card.Description>
      </Card.Header>
      <Card.Content className="flex flex-col gap-2">
        <p className="text-xs text-muted">
          {t.node.domain.txtInstructions}
        </p>
        <Code className="w-fit text-[11px]">alfychat-verify=7f3a09c2e8b14d5f</Code>
      </Card.Content>
      <Card.Footer className="justify-end gap-2">
        <Button
          size="sm"
          variant="secondary"
          onPress={async () => {
            await navigator.clipboard.writeText('alfychat-verify=7f3a09c2e8b14d5f');
            toast(t.node.domain.txtCopiedToast);
          }}
        >
          {t.node.domain.copyTxtBtn}
        </Button>
        <Button size="sm">{t.node.domain.verifyBtn}</Button>
      </Card.Footer>
    </Card>
  );
}
