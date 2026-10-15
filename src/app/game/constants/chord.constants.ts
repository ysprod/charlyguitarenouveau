// src/app/game/chord/data/chord.constants.ts

/* ═════════════════════════════════════════════════════════════════════
   CHORD — CONSTANTES
   ═════════════════════════════════════════════════════════════════════ */

/** Clé de stockage localStorage. */
export const STORAGE_KEY = 'chordGrids';

/** Valeur par défaut du textarea. */
export const DEFAULT_INPUT = '[C] [Am] | [F] [G] |\n[C] [Em] | [Dm] [G7]';

/** Ticks par noire (MIDI). */
export const TICKS_PER_BEAT = 480;

/** Décalage entre chaque note d'arpeggio (en ticks). */
export const ARPEGGIO_STEP_TICKS = 60;

/** Durée maximale d'une note d'arpeggio (en ticks). */
export const ARPEGGIO_NOTE_DURATION_TICKS = 480;

/* ═════════════════════════════════════════════════════════════════════
   NOTES & GAMMES
   ═════════════════════════════════════════════════════════════════════ */

/** Notes en dièses (12 tons). */
export const NOTES_SHARP: readonly string[] = [
  'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B',
];

/** Notes en bémols (12 tons). */
export const NOTES_FLAT: readonly string[] = [
  'C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B',
];

/** Intervalles (en demi-tons) de la gamme majeure. */
export const MAJOR_SCALE: readonly number[] = [0, 2, 4, 5, 7, 9, 11];

/** Degrés de la gamme majeure (chiffrage romain). */
export const DEGREE_LABELS: readonly string[] = [
  'I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°',
];

/* ═════════════════════════════════════════════════════════════════════
   MIDI
   ═════════════════════════════════════════════════════════════════════ */

/** Mapping note → demi-ton depuis C (pour l'export MIDI). */
export const NOTE_TO_SEMITONE: Readonly<Record<string, number>> = {
  'C': 0, 'C#': 1, 'Db': 1,
  'D': 2, 'D#': 3, 'Eb': 3,
  'E': 4, 'Fb': 4,
  'F': 5, 'E#': 5,
  'F#': 6, 'Gb': 6,
  'G': 7, 'G#': 8, 'Ab': 8,
  'A': 9, 'A#': 10, 'Bb': 10,
  'B': 11, 'Cb': 11,
};

/** Intervalles (en demi-tons) depuis la fondamentale selon la qualité. */
export const CHORD_INTERVALS: Readonly<Record<string, readonly number[]>> = {
  '':     [0, 4, 7],
  'm':    [0, 3, 7],
  'min':  [0, 3, 7],
  '7':    [0, 4, 7, 10],
  'maj7': [0, 4, 7, 11],
  'M7':   [0, 4, 7, 11],
  'm7':   [0, 3, 7, 10],
  'min7': [0, 3, 7, 10],
  'dim':  [0, 3, 6],
  '°':    [0, 3, 6],
  'dim7': [0, 3, 6, 9],
  '°7':   [0, 3, 6, 9],
  'aug':  [0, 4, 8],
  '+':    [0, 4, 8],
  'sus2': [0, 2, 7],
  'sus4': [0, 5, 7],
  '6':    [0, 4, 7, 9],
  'm6':   [0, 3, 7, 9],
  '9':    [0, 4, 7, 10, 14],
  'm9':   [0, 3, 7, 10, 14],
  'add9': [0, 4, 7, 14],
  'm7b5': [0, 3, 6, 10],
  'ø':    [0, 3, 6, 10],
};