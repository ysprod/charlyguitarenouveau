// src/app/game/kronos/constants/kronos.constants.ts

import { DiceFace } from '../models/kronos.model';

/* ═══════════════════════════════════════════════════════════
   CLÉ DE PRÉFÉRENCE
   ═══════════════════════════════════════════════════════════ */

export const SOUND_PREF_KEY = 'kronos_sound_enabled';

/* ═══════════════════════════════════════════════════════════
   RÈGLES DU JEU
   ═══════════════════════════════════════════════════════════ */

export const SEUIL_LYKO = 1_000_000_000;
export const COUT_LANCER = 2_000;

/* ═══════════════════════════════════════════════════════════
   FACES DU DÉ (dodécaèdre)
   ═══════════════════════════════════════════════════════════ */

export const FACES: readonly DiceFace[] = [
  { value: 1,  symbol: '⚀', name: 'Le Commencement' },
  { value: 2,  symbol: '⚁', name: 'Le Doute' },
  { value: 3,  symbol: '⚂', name: 'La Trinité' },
  { value: 4,  symbol: '⚃', name: 'Les Fondations' },
  { value: 5,  symbol: '⚄', name: 'Le Changement' },
  { value: 6,  symbol: '⚅', name: "L'Harmonie" },
  { value: 7,  symbol: '✦', name: 'La Chance' },
  { value: 8,  symbol: '✧', name: "L'Infini" },
  { value: 9,  symbol: '❂', name: 'La Sagesse' },
  { value: 10, symbol: '❖', name: 'La Puissance' },
  { value: 11, symbol: '✵', name: 'Le Destin' },
  { value: 12, symbol: '✹', name: "L'Apothéose" },
];