'use client';

import { MarkdownRenderer } from '@/components/chat/markdown-renderer';
import { useAppPrefs } from '@/hooks/use-app-prefs';

/**
 * Rendu markdown complet : titres h1-h6, gras/italique/souligné/barré
 * (combinables), listes imbriquées, citations imbriquées, tableaux, images,
 * liens, blocs de code, code inline, spoilers, mentions.
 * Délègue à `MarkdownRenderer` (components/chat) qui couvre déjà tout ça, en
 * lui passant les préférences de chat de l'utilisateur.
 */
export function AlfyMarkdown({
  content,
  isModerator = false,
}: {
  content: string;
  mentions?: string[];
  /** Le lecteur modère ce salon — utile pour le mode spoiler « modéré ». */
  isModerator?: boolean;
}) {
  const { prefs } = useAppPrefs();
  const revealSpoilers =
    prefs.spoilerMode === 'always' || (prefs.spoilerMode === 'moderated' && isModerator);

  return (
    <MarkdownRenderer
      content={content}
      revealSpoilers={revealSpoilers}
      showLinkedMedia={prefs.showLinkedMedia}
    />
  );
}
