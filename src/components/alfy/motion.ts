/**
 * Alfy — vocabulaire d'animation partagé (mêmes jetons que l'Atelier).
 *
 * Un seul jeu de durées, de courbes et de variants pour toute l'interface :
 * les composants importent ces jetons au lieu de redéfinir leurs transitions.
 */

import type { Transition, Variants } from 'motion/react';

/* ── Durées (s) ──────────────────────────────────────────────────────────────
 * Alignées sur les jetons CSS --dur-* de globals.css : une entrée doit durer
 * la même chose qu'elle soit jouée par CSS ou par framer.
 *   fast = --dur-1 (120ms) · base = --dur-2 (180ms) · slow = --dur-3 (240ms)
 * ────────────────────────────────────────────────────────────────────────── */
export const DUR = {
  fast: 0.12,
  base: 0.18,
  slow: 0.24,
} as const;

/* ── Courbes ─────────────────────────────────────────────────────────────── */
export const EASE = {
  /** Sortie douce — toutes les entrées (= --ease-out-quart). */
  out: [0.165, 0.84, 0.44, 1] as const,
  /**
   * Dépassement franc — UNIQUEMENT les moments de célébration rares
   * (connexion validée, succès). Jamais sur une action répétable :
   * un rebond sur un geste qu'on refait dix fois par minute devient
   * une nuisance dès le troisième.
   */
  celebrate: [0.34, 1.56, 0.64, 1] as const,
};

/* ── Springs ─────────────────────────────────────────────────────────────────
 * Rappel : le taux d'amortissement vaut damping / (2·√stiffness).
 *   < 1 → dépassement · = 1 → arrivée nette · > 1 → mou.
 * On vise 1 partout sauf intention contraire explicite.
 * ────────────────────────────────────────────────────────────────────────── */
export const SPRING = {
  /** Panneaux latéraux, drawers, member list. ζ ≈ 0.83 → ~1 % de dépassement. */
  panel: { type: 'spring', stiffness: 420, damping: 34 } as Transition,
  /**
   * Réactions, badges, pickers.
   * Était damping 28 → ζ = 0.59, soit ~10 % de dépassement sur une action
   * déclenchée au clic. 47 ramène à ζ ≈ 1 : la pastille arrive et s'arrête.
   */
  pop: { type: 'spring', stiffness: 560, damping: 47 } as Transition,
  /**
   * Pastille active qui voyage (layoutId).
   * Était k=500/d=38 → ~210 ms de stabilisation : en enchaînant les salons
   * au clic, la barre traînait derrière la sélection.
   * k=900/d=60 (ζ ≈ 1) descend à ~90 ms — le déplacement reste lisible sans
   * jamais devenir un délai.
   */
  indicator: { type: 'spring', stiffness: 900, damping: 60 } as Transition,
};

/* ── Transitions toutes faites ───────────────────────────────────────────── */
export const TRANS = {
  fast: { duration: DUR.fast, ease: EASE.out } as Transition,
  base: { duration: DUR.base, ease: EASE.out } as Transition,
  slow: { duration: DUR.slow, ease: EASE.out } as Transition,
};

/* ── Variants communs ────────────────────────────────────────────────────── */

/** Entrée standard : fondu + remontée de 4px. */
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 4 },
  visible: { opacity: 1, y: 0, transition: TRANS.base },
  exit: { opacity: 0, y: 4, transition: TRANS.fast },
};

/** Fondu simple. */
export const fade: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: TRANS.base },
  exit: { opacity: 0, transition: TRANS.fast },
};

/**
 * Pop (réaction ajoutée, badge).
 * scale partait de 0.6 : un élément qui naît à 60 % de sa taille lit comme
 * un zoom, pas comme une apparition. 0.97 + opacité suffit — c'est l'échelle
 * de départ pour un petit élément (bouton, pastille).
 */
export const pop: Variants = {
  hidden: { opacity: 0, scale: 0.97 },
  visible: { opacity: 1, scale: 1, transition: SPRING.pop },
  exit: { opacity: 0, scale: 0.97, transition: TRANS.fast },
};

/** Conteneur de liste avec stagger (18ms/item, plafonné par le parent). */
export const staggerList: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.018 } },
};

/** Item de liste staggered. */
export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 4 },
  visible: { opacity: 1, y: 0, transition: TRANS.base },
};

/** Press feedback pour les éléments cliquables non-HeroUI. */
export const pressable = {
  whileTap: { scale: 0.97 },
  transition: TRANS.fast,
} as const;

/** Cap du stagger : au-delà de N items, entrer sans délai. */
export const STAGGER_CAP = 10;
