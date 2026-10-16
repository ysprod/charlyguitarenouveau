// src/app/game/kronos/utils/kronos.util.ts

import { FACES } from '../constants/kronos.constants';
import { DiceFace } from '../models/kronos.model';

/**
 * Retourne les informations de la face correspondant à la valeur donnée.
 * Retourne `undefined` si la valeur est hors bornes (1-12).
 */
export function getFaceInfo(value: number): DiceFace | undefined {
  return FACES.find((f) => f.value === value);
}

/**
 * Formate un nombre en français (séparateur de milliers).
 *
 * @example
 * formatNumber(1234567) // '1 234 567'
 */
const NUMBER_FORMATTER = new Intl.NumberFormat('fr-FR');

export function formatNumber(value: number): string {
  return NUMBER_FORMATTER.format(value);
}