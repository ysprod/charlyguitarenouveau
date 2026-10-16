// src/app/offoland/dimensions/blanc/models/blanc.model.ts

/* ═══════════════════════════════════════════════════════════
   CARACTÉRISTIQUE
   ═══════════════════════════════════════════════════════════ */

export interface Caracteristique {
  readonly titre: string;
  readonly icone: string;
  readonly description: string;
  readonly couleur: string;
}

/* ═══════════════════════════════════════════════════════════
   TRAIT (FORCE / FAIBLESSE)
   ═══════════════════════════════════════════════════════════ */

export type TraitType = 'force' | 'faiblesse';

export interface Trait {
  readonly nom: string;
  readonly icone: string;
  readonly description: string;
  readonly type: TraitType;
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
   RÈGLE DES POINTS
   ═══════════════════════════════════════════════════════════ */

export interface ReglePoints {
  readonly titre: string;
  readonly description: string;
}