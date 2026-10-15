// src/app/academie/models/academie.model.ts

/* ═════════════════════════════════════════════════════════════════════
   ACADEMIE — MODÈLES
   ═════════════════════════════════════════════════════════════════════ */

/** Formation proposée par l'Académie. */
export interface Formation {
  /** Identifiant unique (utilisé pour le track). */
  readonly id: string;

  /** Numéro affiché en haut à droite de la carte (ex : "02"). */
  readonly number: string;

  /** Emoji de la carte. */
  readonly icon: string;

  /** Label de catégorie (ex : FORMATION, EXPERTS, PERSONNALISÉ). */
  readonly label: string;

  /** Titre principal de la carte (ex : APPRENDRE). */
  readonly title: string;

  /** Description courte. */
  readonly description: string;

  /** Liste des sous-catégories. */
  readonly subcategories: readonly string[];

  /** Label du lien d'action. */
  readonly actionLabel: string;

  /** Route du lien d'action. */
  readonly actionRoute: string;

  /** Vrai si la carte est mise en avant (highlight). */
  readonly highlighted: boolean;

  /** Vrai si le badge POPULAIRE doit être affiché. */
  readonly popular: boolean;
}

/** Carte de session LIVE. */
export interface LiveCard {
  /** Identifiant unique (utilisé pour le track). */
  readonly id: string;

  /** Emoji de la carte (avant-plan). */
  readonly icon: string;

  /** Emoji de fond décoratif. */
  readonly backgroundIcon: string;

  /** Titre principal (ex : MASTER CLASS LIVE). */
  readonly title: string;

  /** Description courte. */
  readonly description: string;

  /** Label du lien d'action. */
  readonly actionLabel: string;

  /** Route du lien d'action. */
  readonly actionRoute: string;
}