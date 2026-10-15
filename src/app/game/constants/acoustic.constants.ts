// src/app/game/constants/acoustic.constants.ts

import { DifficultyFilter } from '../models/acoustic-quiz.model';

/* ═══════════════════════════════════════════════════════════
   LETTRES DES OPTIONS (A, B, C, D)
   ═══════════════════════════════════════════════════════════ */

export const LETTERS = ['A', 'B', 'C', 'D'] as const;

/* ═══════════════════════════════════════════════════════════
   FILTRES DE DIFFICULTÉ
   ═══════════════════════════════════════════════════════════ */

export const DIFFICULTIES: readonly DifficultyFilter[] = [
  'Toutes',
  'Facile',
  'Intermédiaire',
  'Expert',
];