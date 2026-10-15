// src/app/game/utils/difficulty.util.ts

import { Difficulty } from '../models/acoustic-quiz.model';

/**
 * Convertit une difficulté en classe CSS (sans accents, en minuscules).
 *
 * @example
 * getDifficultyClass('Intermédiaire') // 'intermediaire'
 * getDifficultyClass('Facile')        // 'facile'
 */
export function getDifficultyClass(difficulty: Difficulty): string {
  return difficulty.toLowerCase().replace('é', 'e');
}