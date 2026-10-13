// src/app/univers/charlyguitaregame/data/dimensions.data.ts

import { Dimension } from './dimension.model';

/* ═════════════════════════════════════════════════════════════════════
   LES 7 DIMENSIONS D'OFFOLAND
   ─────────────────────────────────────────────────────────────────────
   Ordre sacré (selon la Bible d'Offoland) : Do → Ré → Mi → Fa → Sol → La → Si
   ⚠️ Couleurs assombries pour contraste AA sur fond blanc.
   ═════════════════════════════════════════════════════════════════════ */

export const DIMENSIONS: readonly Dimension[] = [
  {
    nom: 'BLANC',
    couleur: '#475569',          // gris foncé (assombrissement du blanc)
    couleurSecondaire: '#94a3b8',
    symbole: '✨',
    note: 'Do',
    sage: 'Offodo',
    description: 'La Dimension du Commencement',
    image: 'assets/blanc.jpg',
    route: '/blanc'
  },
  {
    nom: 'ROUGE',
    couleur: '#dc2626',
    couleurSecondaire: '#b91c1c',
    symbole: '🔥',
    note: 'Ré',
    sage: 'Offoré',
    description: 'La Dimension du Courage',
    image: 'assets/rouge.jpg',
    route: '/rouge'
  },
  {
    nom: 'VERT',
    couleur: '#16a34a',          // vert assombri pour contraste AA
    couleurSecondaire: '#15803d',
    symbole: '🌿',
    note: 'Mi',
    sage: 'Offomi',
    description: 'La Dimension de la Vie',
    image: 'assets/vert.jpg',
    route: '/vert'
  },
  {
    nom: 'BLEU',
    couleur: '#2563eb',          // bleu assombri pour contraste AA
    couleurSecondaire: '#1d4ed8',
    symbole: '🌊',
    note: 'Fa',
    sage: 'Offofa',
    description: 'La Dimension de la Connaissance',
    image: 'assets/bleu.jpg',
    route: '/bleu'
  },
  {
    nom: 'NOIR',
    couleur: '#1a1a1a',
    couleurSecondaire: '#4a4a4a',
    symbole: '🖤',
    note: 'Sol',
    sage: 'Offosol',
    description: "La Dimension de l'Épreuve",
    image: 'assets/noir.jpg',
    route: '/noir'
  },
  {
    nom: 'POURPRE',
    couleur: '#9333ea',
    couleurSecondaire: '#7e22ce',
    symbole: '👁️',
    note: 'La',
    sage: 'Offola',
    description: 'La Dimension de la Vision',
    image: 'assets/pourpre.jpg',
    route: '/pourpre'
  },
  {
    nom: 'JAUNE',
    couleur: '#b8860b',          // doré assombri (assombrissement du jaune)
    couleurSecondaire: '#d4a017',
    symbole: '👑',
    note: 'Si',
    sage: 'Offosi',
    description: "La Dimension de l'Accomplissement",
    image: 'assets/jaune.jpg',
    route: '/violet'             // ⚠️ Route conservée volontairement
  }
];