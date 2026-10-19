/* ═══════════════════════════════════════════════════════════
   DIVINITÉ
   ═══════════════════════════════════════════════════════════ */

export interface Divinite {
  readonly nom: string;
  readonly titre: string;
  readonly territoire: string;
  readonly symbole: string;
  readonly couleur: string;
  readonly description: string;
  readonly gardien?: string;
}

/* ═══════════════════════════════════════════════════════════
   PASSAGE INTRA-DIMENSIONNEL
   ═══════════════════════════════════════════════════════════ */

export interface Passage {
  readonly de: string;
  readonly vers: string;
  readonly gardien: string;
  readonly couleur: string;
}