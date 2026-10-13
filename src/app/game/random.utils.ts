/**
 * Génère un entier aléatoire entre min (inclus) et max (exclu).
 */
export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min)) + min;
}

/**
 * Génère un nombre décimal aléatoire entre min (inclus) et max (exclu).
 */
export function randomFloat(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

/**
 * Retourne un élément aléatoire d'un tableau.
 */
export function randomElement<T>(array: readonly T[]): T {
  return array[randomInt(0, array.length)];
}

/**
 * Mélange un tableau (algorithme de Fisher-Yates).
 * Retourne un nouveau tableau, n'altère pas l'original.
 */
export function shuffle<T>(array: readonly T[]): T[] {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = randomInt(0, i + 1);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Retourne `count` éléments aléatoires distincts d'un tableau.
 */
export function randomSample<T>(array: readonly T[], count: number): T[] {
  return shuffle(array).slice(0, Math.min(count, array.length));
}