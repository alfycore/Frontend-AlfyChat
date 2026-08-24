'use client';

import { FileText } from 'lucide-react';

import type { AlfyAttachment } from '@/components/alfy/mock/types';
import { useAppPrefs } from '@/hooks/use-app-prefs';
import { useTranslation } from '@/components/locale-provider';

export function Attachment({
  attachment,
  onPreview,
}: {
  attachment: AlfyAttachment;
  /** Fourni par le parent quand un visualiseur est disponible pour cette image. */
  onPreview?: () => void;
}) {
  const { prefs } = useAppPrefs();
  const { t, tx } = useTranslation();
  const formatSize = (bytes: number) =>
    bytes > 1_000_000
      ? tx(t.chat.attachmentSizeMB, { size: (bytes / 1_000_000).toFixed(1) })
      : tx(t.chat.attachmentSizeKB, { size: Math.round(bytes / 1000) });

  // « Afficher les médias téléversés » désactivé → on garde la fiche fichier,
  // l'utilisateur peut toujours ouvrir la pièce jointe.
  if (attachment.mimeType.startsWith('image/') && attachment.url && prefs.showUploadedMedia) {
    /* Les dimensions ne sont transmises que si la passerelle les connaît ;
       sinon le fil se recale via le ResizeObserver de `useDmScroll`. */
    const vignette = (
      <img
        src={attachment.url}
        alt={attachment.name}
        width={attachment.width}
        height={attachment.height}
        loading="lazy"
        className="max-h-72 max-w-full object-cover transition-opacity hover:opacity-90"
      />
    );

    const classeCadre =
      'mt-1.5 block w-fit overflow-hidden rounded-md outline-none focus-visible:ring-2 focus-visible:ring-focus';

    /* Avec un visualiseur disponible, l'image s'ouvre en place plutôt que dans
       un onglet : quitter la conversation pour regarder une capture d'écran
       était le comportement le plus pénible du fil. */
    if (onPreview) {
      return (
        <button type="button" onClick={onPreview} className={`${classeCadre} cursor-zoom-in`}>
          {vignette}
        </button>
      );
    }

    return (
      <a href={attachment.url} target="_blank" rel="noopener noreferrer" className={classeCadre}>
        {vignette}
      </a>
    );
  }
  /* La fiche fichier n'était pas cliquable : une pièce jointe non-image ne
     pouvait tout simplement pas être ouverte. Et la taille, jamais transmise
     par la passerelle, s'affichait invariablement « 0 Ko ». */
  return (
    <a
      href={attachment.url}
      target="_blank"
      rel="noopener noreferrer"
      download={attachment.name}
      className="mt-1.5 flex w-fit max-w-sm items-center gap-2.5 rounded-md bg-surface-secondary px-3 py-2 outline-none transition-colors hover:bg-surface-tertiary focus-visible:ring-2 focus-visible:ring-focus"
    >
      <FileText className="size-6 shrink-0 text-accent" aria-hidden />
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-accent">{attachment.name}</p>
        {attachment.size > 0 && <p className="text-xs text-muted">{formatSize(attachment.size)}</p>}
      </div>
    </a>
  );
}
