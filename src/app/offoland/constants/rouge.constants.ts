// src/app/offoland/dimensions/rouge/constants/rouge.constants.ts

import { Clan, Correspondance, Faiblesse, Pouvoir } from '../models/rouge.model';

/* ═══════════════════════════════════════════════════════════
   DÉCOR — CŒURS & PARTICULES
   ═══════════════════════════════════════════════════════════ */

export const HEARTS: readonly number[] = [1, 2, 3, 4, 5, 6, 7, 8];

export const RED_PARTICLES: readonly number[] = Array.from(
  { length: 25 },
  (_, i) => i + 1
);

/* ═══════════════════════════════════════════════════════════
   CLANS ÉMOTIONNELS
   ═══════════════════════════════════════════════════════════ */

export const CLANS: readonly Clan[] = [
  {
    nom: 'LES AMOUREUX',
    sentiment: "L'Amour",
    symbole: '❤️',
    couleur: '#ec4899',
    description:
      'Ceux dont le cœur bat pour un autre. Leur force est leur passion, leur faiblesse leur attachement.',
  },
  {
    nom: 'LES COLÉRIQUES',
    sentiment: 'La Colère',
    symbole: '💢',
    couleur: '#dc2626',
    description:
      "Ceux qui brûlent de l'intérieur. Leur feu consume leurs ennemis, mais aussi eux-mêmes.",
  },
  {
    nom: 'LES DÉSESPÉRÉS',
    sentiment: 'Le Désespoir',
    symbole: '🌧️',
    couleur: '#6366f1',
    description:
      "Ceux qui ont perdu l'espoir. Ils errent dans les brumes de leur propre âme.",
  },
  {
    nom: 'LES COURAGEUX',
    sentiment: 'Le Courage',
    symbole: '🔥',
    couleur: '#f59e0b',
    description:
      'Ceux qui avancent malgré la peur. Leur flamme éclaire les ténèbres de ce monde.',
  },
  {
    nom: 'LES JALOUX',
    sentiment: 'La Jalousie',
    symbole: '👁️',
    couleur: '#10b981',
    description:
      "Ceux qui voient ce qu'ils n'ont pas. Leur regard empoisonne leur propre cœur.",
  },
  {
    nom: 'LES VANTAIRDS',
    sentiment: "L'Orgueil",
    symbole: '🦚',
    couleur: '#a855f7',
    description:
      'Ceux qui se croient supérieurs. Leur image est leur forteresse et leur prison.',
  },
];

/* ═══════════════════════════════════════════════════════════
   POUVOIRS DU CHARLY ROUGE
   ═══════════════════════════════════════════════════════════ */

export const POUVOIRS: readonly Pouvoir[] = [
  {
    nom: 'RÉGÉNÉRATION',
    icone: '💚',
    description:
      "Le Charly Rouge peut guérir n'importe quelle blessure en jouant une sonorité sacrée.",
    cout: 'Perte de capacités vitales',
  },
  {
    nom: 'RÉSURRECTION',
    icone: '✨',
    description:
      'Il peut ramener un être à la vie, mais ce miracle lui coûte une partie de sa propre essence.',
    cout: 'Sacrifice de soi',
  },
];

/* ═══════════════════════════════════════════════════════════
   FAIBLESSE
   ═══════════════════════════════════════════════════════════ */

export const FAIBLESSE: Faiblesse = {
  titre: "LA MALÉDICTION DE L'AMOUR",
  description:
    "Le Charly Rouge tombe éperdument amoureux. Chaque fois qu'il aime, il perd sa guitare — l'unique instrument capable d'accomplir ses miracles. Il doit alors la chercher à travers le monde, déchiré entre son devoir et son cœur.",
};

/* ═══════════════════════════════════════════════════════════
   CORRESPONDANCES ENTRE MONDES
   ═══════════════════════════════════════════════════════════ */

export const CORRESPONDANCES: readonly Correspondance[] = [
  { monde: 'BLEU',  couleur: '#3b82f6', repere: 'Univers de Zeus' },
  { monde: 'ROUGE', couleur: '#dc2626', repere: 'Univers de Bafum' },
  { monde: 'VERT',  couleur: '#22c55e', repere: 'Univers de Poséidon' },
  { monde: 'BLANC', couleur: '#f8fafc', repere: 'Univers du Léviathan' },
];