// src/app/game/cardgame/utils/cardgame.utils.ts

/* ═════════════════════════════════════════════════════════════════════
   SHUFFLE — Fisher-Yates
   ═════════════════════════════════════════════════════════════════════ */

export function shuffleArray<T>(array: readonly T[]): T[] {
  return array
    .map((item) => ({ sort: Math.random(), value: item }))
    .sort((a, b) => a.sort - b.sort)
    .map((item) => item.value);
}

/* ═════════════════════════════════════════════════════════════════════
   PICK RANDOM — Retourne un élément aléatoire
   ═════════════════════════════════════════════════════════════════════ */

export function pickRandom<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

/* ═════════════════════════════════════════════════════════════════════
   PHRASES ALÉATOIRES
   ═════════════════════════════════════════════════════════════════════ */

export const MATCH_PHRASES: readonly string[] = [
  'Bien joué !',
  'Super !',
  'Trop fort !',
  'Youpi !',
  'Encore une !',
  'Génial !',
  'Bravo !',
  'Wow, quelle mémoire !',
];

export const WRONG_PHRASES: readonly string[] = [
  'Oups, raté !',
  'Presque !',
  'Essaie encore !',
  'Pas grave, retente !',
  'Hop, essaie encore !',
  'Tu vas y arriver !',
];

export function pickMatchPhrase(): string {
  return pickRandom(MATCH_PHRASES);
}

export function pickWrongPhrase(): string {
  return pickRandom(WRONG_PHRASES);
}