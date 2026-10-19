 
/* ═════════════════════════════════════════════════════════════════════
   DIMENSION — Modèle d'une Dimension d'Offoland
   ═════════════════════════════════════════════════════════════════════ */

export interface Dimension {
  /** Nom affiché (ex : BLANC, ROUGE, JAUNE). */
  readonly nom: string;

  /** Couleur principale (accent) — utilisée pour le contour et le badge. */
  readonly couleur: string;

  /** Couleur secondaire (hover) — utilisée pour le halo au survol. */
  readonly couleurSecondaire: string;

  /** Emoji symbolique. */
  readonly symbole: string;

  /** Note de musique (Do, Ré, Mi…). */
  readonly note: string;

  /** Nom du Sage gardien (Offodo, Offoré…). */
  readonly sage: string;

  /** Description de la dimension. */
  readonly description: string;

  /** Chemin de l'image de fond. */
  readonly image: string;

  /** Route Angular associée. */
  readonly route: string;
}