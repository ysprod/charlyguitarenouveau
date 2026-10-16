// src/app/offoland/dimensions/vert/models/vert.model.ts

/* ═══════════════════════════════════════════════════════════
   SIRÈNE
   ═══════════════════════════════════════════════════════════ */

export interface Sirene {
  readonly numero: number;
  readonly nom: string;
  readonly pouvoir: string;
  readonly description: string;
  readonly couleur: string;
  readonly icone: string;
  readonly danger: string;
}

/* ═══════════════════════════════════════════════════════════
   POUVOIR DU CHARLY VERT
   ═══════════════════════════════════════════════════════════ */

export interface Pouvoir {
  readonly nom: string;
  readonly icone: string;
  readonly description: string;
  readonly limite: string;
}

/* ═══════════════════════════════════════════════════════════
   PHÉNOMÈNE NATUREL
   ═══════════════════════════════════════════════════════════ */

export interface PhenomeneNaturel {
  readonly nom: string;
  readonly icone: string;
  readonly description: string;
}

/* ═══════════════════════════════════════════════════════════
   CORRESPONDANCE ENTRE MONDES
   ═══════════════════════════════════════════════════════════ */

export interface Correspondance {
  readonly monde: string;
  readonly couleur: string;
  readonly repere: string;
}

/* ═══════════════════════════════════════════════════════════
   BLOCS DE TEXTE GÉNÉRIQUES
   ═══════════════════════════════════════════════════════════ */

export interface TextBlock {
  readonly titre: string;
  readonly description: string;
}