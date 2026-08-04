'use client';

import { FileText } from 'lucide-react';

import type { AlfyAttachment } from '@/components/alfy/mock/types';
import { useAppPrefs } from '@/hooks/use-app-prefs';
import { useTranslation } from '@/components/locale-provider';

export function Attachment({ attachment }: { attachment: AlfyAttachment }) {
  const { prefs } = useAppPrefs();
  const { t, tx } = useTranslation();
  const formatSize = (bytes: number) =>
    bytes > 1_000_000
      ? tx(t.chat.attachmentSizeMB, { size: (bytes / 1_000_000).toFixed(1) })
      : tx(t.chat.attachmentSizeKB, { size: Math.round(bytes / 1000) });

  // « Afficher les médias téléversés » désactivé → on garde la fiche fichier,
  // l'utilisateur peut toujours ouvrir la pièce jointe.
  if (attachment.mimeType.startsWith('image/') && attachment.url && prefs.showUploadedMedia) {
    return (
      <a
        href={attachment.url}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-1.5 block w-fit overflow-hidden rounded-md outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--focus)]"
      >
        {/* Dimensions fixes connues → pas de reflow au chargement */}
        <img
          src={attachment.url}
          alt={attachment.name}
          width={attachment.width}
          height={attachment.height}
          loading="lazy"
          className="max-h-72 max-w-full object-cover transition-opacity hover:opacity-90"
        />
      </a>
    );
  }
  return (
    <div className="mt-1.5 flex w-fit max-w-sm items-center gap-2.5 rounded-md bg-surface-secondary px-3 py-2">
      <FileText className="size-6 shrink-0 text-[color:var(--accent)]" aria-hidden />
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-[color:var(--accent)]">{attachment.name}</p>
        <p className="text-xs text-muted">{formatSize(attachment.size)}</p>
      </div>
    </div>
  );
}
