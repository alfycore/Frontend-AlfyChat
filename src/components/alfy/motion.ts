/**
 * Alfy — vocabulaire d'animation partagé (mêmes jetons que l'Atelier).
 *
 * Un seul jeu de durées, de courbes et de variants pour toute l'interface :
 * les composants importent ces jetons au lieu de redéfinir leurs transitions.
 */

import type { Transition, Variants } from 'motion/react';

/* ── Durées (s) ──────────────────────────────────────────────────────────── */
export const DUR = {
  fast: 0.14,
  base: 0.22,
  slow: 0.34,
} as const;

/* ── Courbes ─────────────────────────────────────────────────────────────── */
export const EASE = {
  /** Sortie douce — toutes les entrées. */
  out: [0.22, 1, 0.36, 1] as const,
  /** Rebond léger — pops (réactions, badges). */
  pop: [0.34, 1.56, 0.64, 1] as const,
};

/* ── Springs ─────────────────────────────────────────────────────────────── */
export const SPRING = {
  /** Panneaux latéraux, drawers, member list. */
  panel: { type: 'spring', stiffness: 420, damping: 34 } as Transition,
  /** Réactions, badges, pickers. */
  pop: { type: 'spring', stiffness: 560, damping: 28 } as Transition,
  /** Pastille active qui voyage (layoutId). */
  indicator: { type: 'spring', stiffness: 500, damping: 38 } as Transition,
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

/** Pop (réaction ajoutée, badge). */
export const pop: Variants = {
  hidden: { opacity: 0, scale: 0.6 },
  visible: { opacity: 1, scale: 1, transition: SPRING.pop },
  exit: { opacity: 0, scale: 0.6, transition: TRANS.fast },
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
