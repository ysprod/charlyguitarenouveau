// src/app/features/oracle-game/utils/oracle.utils.ts

/* ═════════════════════════════════════════════════════════════════════
   ORACLE UTILS — Fonctions pures (testables)
   ═════════════════════════════════════════════════════════════════════ */

/**
 * Normalise une chaîne :
 * - minuscules
 * - suppression des accents
 * - suppression de la ponctuation
 * - compression des espaces
 */
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Échappe les caractères spéciaux regex d'une chaîne.
 */
export function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Vérifie si le message (déjà normalisé) contient une des réponses acceptées.
 * La comparaison se fait mot entier (via `\b`).
 */
export function matchesAnswer(
  normalizedMessage: string,
  accepted: readonly string[]
): boolean {
  return accepted.some((answer) => {
    const norm = normalize(answer);
    if (!norm) return false;

    const pattern = `(^|\\s)${escapeRegex(norm)}(\\s|$)`;
    return new RegExp(pattern).test(normalizedMessage);
  });
}