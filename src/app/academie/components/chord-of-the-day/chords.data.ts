// src/app/academie/components/chord-of-the-day/chords.data.ts

export interface GuitarChord {
  id: string;
  name: string;
  fullName: string;
  /** Positions sur les 6 cordes : -1 = étouffée, 0 = corde à vide, X = frette X */
  frets: number[];
  /** Fréquences (Hz) pour jouer l'accord */
  frequencies: number[];
}

export const GUITAR_CHORDS: readonly GuitarChord[] = [
  {
    id: 'do-maj',
    name: 'Do Majeur',
    fullName: 'C Major',
    frets: [-1, 3, 2, 0, 1, 0],
    frequencies: [261.63, 329.63, 392.00, 523.25],
  },
  {
    id: 'sol-maj',
    name: 'Sol Majeur',
    fullName: 'G Major',
    frets: [3, 2, 0, 0, 0, 3],
    frequencies: [196.00, 246.94, 392.00, 493.88],
  },
  {
    id: 're-maj',
    name: 'Ré Majeur',
    fullName: 'D Major',
    frets: [-1, -1, 0, 2, 3, 2],
    frequencies: [293.66, 369.99, 440.00, 587.33],
  },
  {
    id: 'la-maj',
    name: 'La Majeur',
    fullName: 'A Major',
    frets: [-1, 0, 2, 2, 2, 0],
    frequencies: [220.00, 277.18, 329.63, 440.00],
  },
  {
    id: 'mi-maj',
    name: 'Mi Majeur',
    fullName: 'E Major',
    frets: [0, 2, 2, 1, 0, 0],
    frequencies: [164.81, 246.94, 329.63, 415.30],
  },
  {
    id: 'la-min',
    name: 'La Mineur',
    fullName: 'A Minor',
    frets: [-1, 0, 2, 2, 1, 0],
    frequencies: [220.00, 261.63, 329.63, 440.00],
  },
  {
    id: 'mi-min',
    name: 'Mi Mineur',
    fullName: 'E Minor',
    frets: [0, 2, 2, 0, 0, 0],
    frequencies: [164.81, 246.94, 329.63, 392.00],
  },
  {
    id: 're-min',
    name: 'Ré Mineur',
    fullName: 'D Minor',
    frets: [-1, -1, 0, 2, 3, 1],
    frequencies: [293.66, 349.23, 440.00, 587.33],
  },
  {
    id: 'fa-maj',
    name: 'Fa Majeur',
    fullName: 'F Major',
    frets: [1, 3, 3, 2, 1, 1],
    frequencies: [174.61, 261.63, 349.23, 440.00],
  },
  {
    id: 'si-min',
    name: 'Si Mineur',
    fullName: 'B Minor',
    frets: [-1, 2, 4, 4, 3, 2],
    frequencies: [246.94, 293.66, 369.99, 493.88],
  },
  {
    id: 'sol-7',
    name: 'Sol 7',
    fullName: 'G7',
    frets: [3, 2, 0, 0, 0, 1],
    frequencies: [196.00, 246.94, 392.00, 349.23],
  },
  {
    id: 'do-7',
    name: 'Do 7',
    fullName: 'C7',
    frets: [-1, 3, 2, 3, 1, 0],
    frequencies: [261.63, 329.63, 349.23, 392.00],
  },
];