/* ═════════════════════════════════════════════════════════════════════
   ACADEMIE — MODÈLES
   ═════════════════════════════════════════════════════════════════════ */

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