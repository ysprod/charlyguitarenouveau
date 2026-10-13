// src/app/game/chord/data/chord.presets.ts

export interface Preset {
  readonly name: string;
  readonly grid: string;
  readonly key: string;
}

/* ═════════════════════════════════════════════════════════════════════
   PRESETS — Grilles célèbres
   ═════════════════════════════════════════════════════════════════════ */

export const PRESETS: readonly Preset[] = [
  { name: 'Pop I-V-vi-IV',    grid: '[C] [G] | [Am] [F]',                                   key: 'C' },
  { name: 'Blues 12 mesures', grid: '[C7] | [F7] | [C7] | [G7] |\n[F7] | [C7] | [G7] | [C7]',  key: 'C' },
  { name: 'ii-V-I Jazz',      grid: '[Dm7] [G7] | [Cmaj7]',                                 key: 'C' },
  { name: 'Anatole (Rhythm)', grid: '[Cmaj7] [Am7] | [Dm7] [G7]',                           key: 'C' },
  { name: 'Andalouse',        grid: '[Am] [G] | [F] [E7]',                                  key: 'A' },
];