// src/app/game/guitar-live/utils/string.utils.ts

import { STRING_COLORS } from "../constants/fretboard.constants";

 

/**
 * Retourne la couleur associée à une corde (1 = Mi grave, 6 = Mi aigu).
 * Retourne une couleur dorée par défaut si l'index est hors bornes.
 */
export function getStringColor(stringIdx: number): string {
  return STRING_COLORS[stringIdx - 1] ?? '#D4AF37';
}