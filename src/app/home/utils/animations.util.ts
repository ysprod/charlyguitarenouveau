// src/app/home/again/utils/animations.util.ts

/**
 * Retourne un délai d'animation en secondes basé sur l'index.
 *
 * @example
 * animationDelay(0, 0.15) // '0s'
 * animationDelay(3, 0.15) // '0.45s'
 */
export function animationDelay(index: number, step: number): string {
  return `${index * step}s`;
}