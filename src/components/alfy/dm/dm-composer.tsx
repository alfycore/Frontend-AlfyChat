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
 *    inonder la passerelle d'un événement par caractère ;
 *  - les pièces jointes voyagent DANS le contenu du message, encodées en
 *    lignes `[attach:img]:<url>` / `[attach:file]:<nom>|<url>`. Cette
 *    convention (partagée avec `live/map.ts` qui les ré-extrait à l'affichage)
 *    a une conséquence utile : en MP, le contenu est chiffré par Signal avant
 *    de partir, donc l'URL du fichier l'est aussi. Le fichier lui-même reste
 *    en clair sur le service media — c'est le compromis assumé.
 */

import { Button, Tooltip, toast } from '@heroui/react';
import { FileText, Loader2, Lock, Paperclip, SendHorizontal, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { EmojiPicker } from '@/components/alfy/chat/emoji-picker';
import type { AlfyMessage } from '@/components/alfy/mock/types';
import { useUserById } from '@/components/alfy/user-directory';
import { useAppPrefs } from '@/hooks/use-app-prefs';
import { useTranslation } from '@/components/locale-provider';
import { api, resolveMediaUrl } from '@/lib/api';
import { cn } from '@/lib/utils';

/** Hauteur maximale avant que la zone ne défile elle-même. */
const MAX_HEIGHT_PX = 200;
/** Intervalle minimal entre deux notifications de frappe. */
const TYPING_THROTTLE_MS = 2500;
/** Doit rester aligné sur `MAX_FILE_SIZE` du service media. */
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

interface PieceJointe {
  id: string;
  name: string;
  url: string;
  isImage: boolean;
}

/* Brouillons et pièces jointes vivent hors du composant : ils doivent survivre
   au démontage provoqué par le changement de conversation. */
const brouillons = new Map<string, string>();
const piecesEnAttente = new Map<string, PieceJointe[]>();

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
  const fichierRef = useRef<HTMLInputElement>(null);
  const dernierTyping = useRef(0);

  const [valeur, setValeur] = useState(() => brouillons.get(conversationId) ?? '');
  const [pieces, setPieces] = useState<PieceJointe[]>(
    () => piecesEnAttente.get(conversationId) ?? [],
  );
  const [envoiEnCours, setEnvoiEnCours] = useState(false);
  const [surviole, setSurvole] = useState(false);

  /* Les pièces jointes suivent le même sort que le brouillon : on quitte la
     conversation, on revient, elles sont toujours là. */
  const majPieces = useCallback(
    (maj: (actuelles: PieceJointe[]) => PieceJointe[]) => {
      setPieces((actuelles) => {
        const suivantes = maj(actuelles);
        if (suivantes.length) piecesEnAttente.set(conversationId, suivantes);
        else piecesEnAttente.delete(conversationId);
        return suivantes;
      });
    },
    [conversationId],
  );

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

  /** Téléverse les fichiers choisis et les ajoute à la liste en attente. */
  const televerser = useCallback(
    async (fichiers: FileList | File[] | null) => {
      const liste = Array.from(fichiers ?? []);
      if (!liste.length || isDisabled) return;

      setEnvoiEnCours(true);
      try {
        for (const fichier of liste) {
          // Pré-contrôle : inutile de pousser 10 Mo sur le réseau pour se faire
          // refuser à l'arrivée.
          if (fichier.size > MAX_UPLOAD_BYTES) {
            toast.danger(t.composer.uploadFailed, {
              description: `${fichier.name} — 10 Mo max`,
            });
            continue;
          }
          const res = await api.uploadDocument(fichier);
          if (res.success && res.data) {
            majPieces((actuelles) => [
              ...actuelles,
              {
                id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
                name: res.data!.filename || fichier.name,
                url: res.data!.url,
                isImage: res.data!.isImage,
              },
            ]);
          } else {
            toast.danger(t.composer.uploadFailed, {
              description: res.error || fichier.name,
            });
          }
        }
      } finally {
        setEnvoiEnCours(false);
        zoneRef.current?.focus();
      }
    },
    [isDisabled, majPieces, t.composer.uploadFailed],
  );

  /* Coller une capture d'écran est le geste le plus courant pour envoyer une
     image : sans ce gestionnaire, il faut passer par le sélecteur de fichiers. */
  const surCollage = useCallback(
    (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
      const fichiers = Array.from(e.clipboardData?.files ?? []);
      if (!fichiers.length) return;
      e.preventDefault();
      void televerser(fichiers);
    },
    [televerser],
  );

  const envoyer = () => {
    if (envoiEnCours) return;
    const contenu = valeur.trim();
    if ((!contenu && pieces.length === 0) || isDisabled) return;

    // Convention partagée avec `live/map.ts` : une ligne par pièce jointe,
    // ajoutée au contenu — donc chiffrée avec lui en MP.
    let charge = contenu;
    for (const piece of pieces) {
      const ligne = piece.isImage
        ? `\n[attach:img]:${piece.url}`
        : `\n[attach:file]:${piece.name}|${piece.url}`;
      charge = charge ? charge + ligne : ligne.trimStart();
    }

    onSend(charge, replyTo?.id);
    setValeur('');
    majPieces(() => []);
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

  const peutEnvoyer = (valeur.trim().length > 0 || pieces.length > 0) && !isDisabled && !envoiEnCours;

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
        onDragOver={(e) => {
          if (isDisabled) return;
          e.preventDefault();
          setSurvole(true);
        }}
        onDragLeave={() => setSurvole(false)}
        onDrop={(e) => {
          if (isDisabled) return;
          e.preventDefault();
          setSurvole(false);
          void televerser(e.dataTransfer?.files ?? null);
        }}
        className={cn(
          'border border-separator bg-surface-secondary transition-colors focus-within:border-accent/60',
          surviole && 'border-accent bg-accent/5',
          replyTo ? 'rounded-t-none rounded-b-lg' : 'rounded-lg',
        )}
      >
        {(pieces.length > 0 || envoiEnCours) && (
          <div className="flex flex-wrap gap-2 border-b border-separator px-2 py-2">
            {pieces.map((piece) => (
              <span
                key={piece.id}
                className="flex items-center gap-1.5 rounded-md bg-surface px-2 py-1 text-xs"
              >
                {piece.isImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={resolveMediaUrl(piece.url)}
                    alt=""
                    className="size-8 rounded object-cover"
                  />
                ) : (
                  <FileText className="size-3.5 text-muted" aria-hidden />
                )}
                <span className="max-w-40 truncate">{piece.name}</span>
                <button
                  type="button"
                  aria-label={tx(t.composer.removeAttachment, { name: piece.name })}
                  onClick={() => majPieces((a) => a.filter((p) => p.id !== piece.id))}
                  className="cursor-pointer rounded-sm text-muted outline-none transition-colors hover:text-danger focus-visible:ring-2 focus-visible:ring-focus"
                >
                  <X className="size-3" aria-hidden />
                </button>
              </span>
            ))}
            {envoiEnCours && (
              <span className="flex items-center gap-1.5 rounded-md bg-surface px-2 py-1 text-xs text-muted">
                <Loader2 className="size-3 animate-spin" aria-hidden />
                {t.common.sending}
              </span>
            )}
          </div>
        )}

        <div className="flex items-end gap-1 px-2 py-1">
          <input
            ref={fichierRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => {
              void televerser(e.target.files);
              e.target.value = '';
            }}
          />
          <Tooltip delay={600}>
            <Button
              isIconOnly
              size="sm"
              variant="ghost"
              aria-label={t.composer.attachFile}
              className="mb-0.5 text-muted"
              isDisabled={isDisabled || envoiEnCours}
              onPress={() => fichierRef.current?.click()}
            >
              <Paperclip className="size-4" aria-hidden />
            </Button>
            <Tooltip.Content>
              <p>{t.composer.attachFile}</p>
            </Tooltip.Content>
          </Tooltip>

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
            onPaste={surCollage}
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
      </div>

     
    </div>
  );
}
