'use client';

/**
 * Moteur de défilement du fil de discussion.
 *
 * Tout ce qui donne au chat sa sensation de fluidité vit ici :
 *
 *  - **Ancrage bas** — on ne recolle en bas que si l'utilisateur y était déjà.
 *    Lire l'historique n'est jamais interrompu par l'arrivée d'un message.
 *  - **Ancrage haut** — en préfixant l'historique, on restaure la position
 *    exacte pour que le contenu lu ne bouge pas d'un pixel.
 *  - **Recalage sur redimensionnement** — images, embeds et pièces jointes
 *    changent la hauteur après coup : un ResizeObserver recolle en bas plutôt
 *    que d'écouter `load` sur chaque `<img>`.
 *
 * Les écritures de `scrollTop` passent toutes par `useLayoutEffect` : le
 * navigateur ne peint jamais l'état intermédiaire, donc aucun saut visible.
 */

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

/** Distance au bas en dessous de laquelle on considère l'utilisateur « collé ». */
const BOTTOM_THRESHOLD_PX = 120;
/** Distance au haut déclenchant le chargement du lot précédent. */
const TOP_TRIGGER_PX = 600;

interface Options {
  /** Identifiants des messages affichés, du plus ancien au plus récent. */
  itemIds: string[];
  hasMore?: boolean;
  isLoadingMore?: boolean;
  onLoadMore?: () => Promise<unknown> | void;
}

/**
 * À monter sous `key={conversationId}` : le changement de conversation passe
 * par un remontage, ce qui évite toute logique de remise à zéro manuelle.
 */
export function useDmScroll({
  itemIds,
  hasMore = false,
  isLoadingMore = false,
  onLoadMore,
}: Options) {
  const viewportRef = useRef<HTMLDivElement>(null);

  /* `pinned` pilote l'affichage de la pastille ; la ref porte la valeur
     lue dans les effets, sans les faire dépendre du rendu. */
  const [pinned, setPinned] = useState(true);
  const pinnedRef = useRef(true);
  const [unread, setUnread] = useState(0);

  /* Suivi des changements de liste pour distinguer ajout en bas / en haut. */
  const prevCount = useRef(0);
  const prevFirstId = useRef<string | undefined>(undefined);
  const prevLastId = useRef<string | undefined>(undefined);

  /* Position mémorisée juste avant une demande d'historique. */
  const restoreAnchor = useRef<{ height: number; top: number } | null>(null);
  const loadRequested = useRef(false);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'auto') => {
    const el = viewportRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior });
    pinnedRef.current = true;
    setPinned(true);
    setUnread(0);
  }, []);

  /**
   * Amène un message précis au centre et le souligne brièvement.
   * Utilisé par la recherche et le panneau des messages épinglés, dont les
   * résultats n'étaient jusqu'ici pas cliquables.
   */
  const scrollToMessage = useCallback((messageId: string) => {
    const el = viewportRef.current;
    if (!el) return false;
    const cible = el.querySelector<HTMLElement>(`[data-message-id="${CSS.escape(messageId)}"]`);
    if (!cible) return false;

    cible.scrollIntoView({ block: 'center', behavior: 'smooth' });
    cible.classList.remove('alfy-jump-flash');
    // Forcer un reflow pour pouvoir rejouer l'animation sur un même message.
    void cible.offsetWidth;
    cible.classList.add('alfy-jump-flash');
    window.setTimeout(() => cible.classList.remove('alfy-jump-flash'), 1600);
    return true;
  }, []);

  /* ── Suivi de la position ─────────────────────────────────────────────── */

  const handleScroll = useCallback(() => {
    const el = viewportRef.current;
    if (!el) return;

    const distanceBas = el.scrollHeight - el.scrollTop - el.clientHeight;
    const colle = distanceBas < BOTTOM_THRESHOLD_PX;
    if (colle !== pinnedRef.current) {
      pinnedRef.current = colle;
      setPinned(colle);
    }
    if (colle) setUnread(0);

    /* Historique : on mémorise la géométrie AVANT que les messages n'arrivent,
       sinon impossible de recalculer l'offset une fois le DOM modifié. */
    if (el.scrollTop < TOP_TRIGGER_PX && hasMore && !isLoadingMore && !loadRequested.current && onLoadMore) {
      loadRequested.current = true;
      restoreAnchor.current = { height: el.scrollHeight, top: el.scrollTop };
      Promise.resolve(onLoadMore()).finally(() => {
        loadRequested.current = false;
      });
    }
  }, [hasMore, isLoadingMore, onLoadMore]);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => el.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  /* ── Position de départ ───────────────────────────────────────────────── */

  /* Aucune remise à zéro n'est nécessaire ici : la vue est montée avec
     `key={conversationId}`, donc changer de conversation remonte le composant
     et repart d'un état neuf. */
  useLayoutEffect(() => {
    const el = viewportRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, []);

  /* ── Réaction aux changements de liste ────────────────────────────────── */

  useLayoutEffect(() => {
    const el = viewportRef.current;
    if (!el) return;

    const count = itemIds.length;
    const premier = itemIds[0];
    const dernier = itemIds[count - 1];
    const avant = prevCount.current;

    const prefixe = avant > 0 && premier !== undefined && premier !== prevFirstId.current;
    const ajoutBas = dernier !== undefined && dernier !== prevLastId.current;

    prevCount.current = count;
    prevFirstId.current = premier;
    prevLastId.current = dernier;

    if (count === 0) return;

    /* Premier remplissage : on se place en bas sans animation. */
    if (avant === 0) {
      el.scrollTop = el.scrollHeight;
      return;
    }

    /* Historique préfixé : on annule le décalage introduit par les nouveaux
       nœuds pour que le message que l'utilisateur lisait reste sous ses yeux. */
    if (prefixe && restoreAnchor.current) {
      const { height, top } = restoreAnchor.current;
      restoreAnchor.current = null;
      el.scrollTop = el.scrollHeight - height + top;
      return;
    }

    /* Message en bas : suivre, ou signaler en silence. */
    if (ajoutBas && count > avant) {
      if (pinnedRef.current) el.scrollTop = el.scrollHeight;
      else setUnread((n) => n + (count - avant));
    }
  }, [itemIds]);

  /* ── Recalage quand le contenu grandit après coup ─────────────────────── */

  useEffect(() => {
    const el = viewportRef.current;
    const contenu = el?.firstElementChild;
    if (!el || !contenu) return;

    const ro = new ResizeObserver(() => {
      // Une image ou un embed vient de prendre sa taille définitive.
      if (pinnedRef.current) el.scrollTop = el.scrollHeight;
    });
    ro.observe(contenu);
    return () => ro.disconnect();
  }, []);

  return { viewportRef, pinned, unread, scrollToBottom, scrollToMessage };
}
