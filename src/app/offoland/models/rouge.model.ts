 /* ═══════════════════════════════════════════════════════════
   CLAN ÉMOTIONNEL
   ═══════════════════════════════════════════════════════════ */

export interface Clan {
  readonly nom: string;
  readonly sentiment: string;
  readonly symbole: string;
  readonly couleur: string;
  readonly description: string;
}

/* ═══════════════════════════════════════════════════════════
   POUVOIR
   ═══════════════════════════════════════════════════════════ */

export interface Pouvoir {
  readonly nom: string;
  readonly icone: string;
  readonly description: string;
  readonly cout: string;
}

/* ═══════════════════════════════════════════════════════════
   FAIBLESSE
   ═══════════════════════════════════════════════════════════ */

export interface Faiblesse {
  readonly titre: string;
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