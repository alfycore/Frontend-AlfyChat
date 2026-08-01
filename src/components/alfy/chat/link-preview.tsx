import { Card } from '@heroui/react';
import { Globe } from 'lucide-react';

import type { AlfyLinkPreview } from '@/components/alfy/mock/types';

export function LinkPreview({ preview }: { preview: AlfyLinkPreview }) {
  return (
    <Card className="mt-1.5 max-w-md border-l-2 border-l-[color:var(--accent)] bg-surface-secondary">
      <Card.Header>
        <div className="flex items-center gap-1.5 text-xs text-muted">
          <Globe className="size-3" aria-hidden />
          {preview.siteName}
        </div>
        <Card.Title className="text-sm">
          <a
            href={preview.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[color:var(--accent)] hover:underline"
          >
            {preview.title}
          </a>
        </Card.Title>
        <Card.Description className="text-xs">{preview.description}</Card.Description>
      </Card.Header>
    </Card>
  );
}
