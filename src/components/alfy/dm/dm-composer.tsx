'use client';

/**
 * Zone de saisie du fil privé.
 *
 * Points d'attention :
 *  - la hauteur suit le texte, plafonnée, sans dépendance externe ;
 *  - le brouillon survit au changement de conversation (le perdre en cliquant
 *    sur un autre contact était le reproche le plus concret sur l'ancienne
 *    version) ;
 *  - `TYPING_START` est limité en fréquence : une frappe rapide ne doit pas
 *    inonder la passerelle d'un événement par caractère.
 */

import { Button, Tooltip } from '@heroui/react';
import { Lock, SendHorizontal, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { EmojiPicker } from '@/components/alfy/chat/emoji-picker';
import type { AlfyMessage } from '@/components/alfy/mock/types';
import { useUserById } from '@/components/alfy/user-directory';
import { useAppPrefs } from '@/hooks/use-app-prefs';
import { useTranslation } from '@/components/locale-provider';
import { cn } from '@/lib/utils';

/** Hauteur maximale avant que la zone ne défile elle-même. */
const MAX_HEIGHT_PX = 200;
/** Intervalle minimal entre deux notifications de frappe. */
const TYPING_THROTTLE_MS = 2500;

/* Les brouillons vivent hors du composant : ils doivent survivre au démontage
   provoqué par le changement de conversation. */
const brouillons = new Map<string, string>();

interface DmComposerProps {
  conversationId: string;
  recipientName: string;
  /** Remplace « Écrire à {recipientName} » — ex. « Écrire dans #général ». */
  placeholder?: string;
  /** Message auquel on répond — affiché en bandeau au-dessus de la saisie. */
  replyTo?: AlfyMessage;
  onCancelReply?: () => void;
  onSend: (content: string, replyToId?: string) => void;
  onTyping?: () => void;
  /** Affiche la mention de chiffrement sous la zone. */
  encrypted?: boolean;
  isDisabled?: boolean;
  /** Remplace le placeholder par défaut quand `isDisabled` — ex: raison du blocage. */
  disabledMessage?: string;
}

export function DmComposer({
  conversationId,
  recipientName,
  placeholder,
  replyTo,
  onCancelReply,
  onSend,
  onTyping,
  encrypted = false,
  isDisabled = false,
  disabledMessage,
}: DmComposerProps) {
  const { t, tx } = useTranslation();
  const { prefs } = useAppPrefs();
  const userById = useUserById();
  const zoneRef = useRef<HTMLTextAreaElement>(null);
  const dernierTyping = useRef(0);

  const [valeur, setValeur] = useState(() => brouillons.get(conversationId) ?? '');

  const ajusterHauteur = useCallback(() => {
    const el = zoneRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, MAX_HEIGHT_PX)}px`;
  }, []);

  /* La vue est montée sous `key={conversationId}` : le brouillon est donc déjà
     restauré par l'initialiseur d'état ci-dessus. Il ne reste qu'à caler la
     hauteur et donner le focus. */
  useEffect(() => {
    requestAnimationFrame(() => {
      ajusterHauteur();
      zoneRef.current?.focus();
    });
  }, [ajusterHauteur]);

  useEffect(() => {
    ajusterHauteur();
  }, [valeur, ajusterHauteur]);

  /* Répondre place le curseur dans la zone : sinon il faut cliquer deux fois. */
  useEffect(() => {
    if (replyTo) zoneRef.current?.focus();
  }, [replyTo]);

  const envoyer = () => {
    const contenu = valeur.trim();
    if (!contenu || isDisabled) return;
    onSend(contenu, replyTo?.id);
    setValeur('');
    brouillons.delete(conversationId);
    onCancelReply?.();
    requestAnimationFrame(ajusterHauteur);
  };

  const surSaisie = (texte: string) => {
    setValeur(texte);
    if (texte) brouillons.set(conversationId, texte);
    else brouillons.delete(conversationId);

    const maintenant = Date.now();
    if (texte && maintenant - dernierTyping.current > TYPING_THROTTLE_MS) {
      dernierTyping.current = maintenant;
      onTyping?.();
    }
  };

  const peutEnvoyer = valeur.trim().length > 0 && !isDisabled;

  return (
    <div className="shrink-0 px-4 pb-4">
      {replyTo && (
        <div className="at-fade flex items-center gap-2 rounded-t-lg border border-b-0 border-separator bg-surface-secondary px-3 py-1.5 text-xs">
          <span className="text-muted">
            {t.friends.dm.replyingToLabel}{' '}
            <span className="font-medium text-foreground">
              {userById(replyTo.authorId).displayName}
            </span>
          </span>
          <span className="min-w-0 flex-1 truncate text-muted/70">{replyTo.content}</span>
          <Button
            isIconOnly
            size="sm"
            variant="ghost"
            aria-label={t.friends.dm.cancelReply}
            onPress={() => onCancelReply?.()}
          >
            <X className="size-3.5" aria-hidden />
          </Button>
        </div>
      )}

      <div
        className={cn(
          'flex items-end gap-1 border border-separator bg-surface-secondary px-2 py-1 transition-colors focus-within:border-accent/60',
          replyTo ? 'rounded-t-none rounded-b-lg' : 'rounded-lg',
        )}
      >
        <textarea
          ref={zoneRef}
          rows={1}
          value={valeur}
          disabled={isDisabled}
          aria-label={placeholder ?? tx(t.friends.dm.writeTo, { name: recipientName })}
          placeholder={
            isDisabled
              ? (disabledMessage ?? t.friends.dm.sendDisabled)
              : (placeholder ?? tx(t.friends.dm.writeTo, { name: recipientName }))
          }
          onChange={(e) => surSaisie(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              envoyer();
            }
          }}
          className="min-w-0 flex-1 resize-none self-center bg-transparent px-1.5 py-2 text-sm outline-none placeholder:text-muted disabled:cursor-not-allowed"
        />

        <EmojiPicker
          onPick={(emoji) => {
            surSaisie(valeur + emoji);
            zoneRef.current?.focus();
          }}
          showStickers={prefs.stickerSuggestions}
        />

        {(prefs.showSendButton || peutEnvoyer) && (
          <Tooltip delay={600}>
            <Button
              isIconOnly
              size="sm"
              variant={peutEnvoyer ? 'primary' : 'ghost'}
              aria-label={t.common.send}
              isDisabled={!peutEnvoyer}
              onPress={envoyer}
              className="mb-0.5"
            >
              <SendHorizontal className="size-4" aria-hidden />
            </Button>
            <Tooltip.Content>
              <p>{t.friends.dm.sendEnterHint}</p>
            </Tooltip.Content>
          </Tooltip>
        )}
      </div>

      {encrypted && (
        <p className="mt-1.5 flex items-center gap-1 text-[10px] text-muted">
          <Lock className="size-2.5 shrink-0 text-(--alfy-e2e)" aria-hidden />
          {t.friends.dm.encryptedFooter}
          <span className="hidden sm:inline">
            — <kbd className="font-sans">{t.friends.dm.shiftKey}</kbd>+
            <kbd className="font-sans">{t.friends.dm.enterKey}</kbd> {t.friends.dm.forNewLine}
          </span>
        </p>
      )}
    </div>
  );
}
