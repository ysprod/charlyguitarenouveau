// src/app/offoland/models/offoland.model.ts

/* ═════════════════════════════════════════════════════════════════════
   OFFLOLAND — MODÈLES
   ═════════════════════════════════════════════════════════════════════ */

/** Portail vers un module d'Offoland (actif ou verrouillé). */
export interface Portail {
  /** Identifiant unique (utilisé pour le track). */
  readonly id: string;

  /** Emoji du portail. */
  readonly icon: string;

  /** Label principal (ex : ÉCONOMIE). */
  readonly label: string;

  /** Sous-titre descriptif. */
  readonly sub: string;

  /** Route Angular si le portail est actif. `null` si verrouillé. */
  readonly route: string | null;

  /** Classe CSS additionnelle (ex : portail-economie). */
  readonly cssClass: string;
}

/** Divinité d'Offoland. */
export interface Divinite {
  readonly id: string;
  readonly icon: string;
  readonly name: string;
  readonly role: string;
  readonly quote: string;
}

/** Note de la Mélodie des Origines (La m – Ré m – Fa M – Sol M). */
export interface AccordOrigine {
  readonly label: string;
  readonly color: string;
}

/** Note sacrée (Do, Ré, Mi…). */
export interface NoteSacree {
  readonly label: string;
  readonly color: string;
}

/** Citation sacrée d'Offoland. */
export interface OffolandQuote {
  readonly text: string;
  readonly author: string;
}

/** Section « Le Chemin ». */
export interface CheminSection {
  readonly title: string;
  readonly icon: string;
  readonly paragraphs: readonly string[];
}