 
/* ═══════════════════════════════════════════════════════════
   CRÉATURE
   ═══════════════════════════════════════════════════════════ */

export interface Creature {
  readonly nom: string;
  readonly icone: string;
  readonly couleur: string;
  readonly description: string;
  readonly danger: string;
}

/* ═══════════════════════════════════════════════════════════
   PIÈGE
   ═══════════════════════════════════════════════════════════ */

export interface Piege {
  readonly nom: string;
  readonly icone: string;
  readonly description: string;
}

/* ═══════════════════════════════════════════════════════════
   CLIMAT
   ═══════════════════════════════════════════════════════════ */

export interface Climat {
  readonly nom: string;
  readonly icone: string;
}

/* ═══════════════════════════════════════════════════════════
   RÉVEIL DU CHARLY BLEU
   ═══════════════════════════════════════════════════════════ */

export interface Reveil {
  readonly type: string;
  readonly valeur: string;
  readonly icone: string;
}

/* ═══════════════════════════════════════════════════════════
   CHARLY BLEU
   ═══════════════════════════════════════════════════════════ */

export interface CharlyBleu {
  readonly titre: string;
  readonly description: string;
  readonly reveil: readonly Reveil[];
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