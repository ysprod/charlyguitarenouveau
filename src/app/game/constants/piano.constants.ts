// src/app/game/pianovirtuel/constants/piano.constants.ts

import { PianoKey } from 'src/app/game/models/piano.model';

/* ═══════════════════════════════════════════════════════════
   MAPPING CLAVIER AZERTY → NOTES
   ═══════════════════════════════════════════════════════════ */

export const AZERTY_MAP: Readonly<Record<string, string>> = {
   q: 'C3', s: 'C#3', d: 'D3', f: 'D#3', g: 'E3',
   h: 'F3', j: 'F#3', k: 'G3', l: 'G#3', m: 'A3',
   w: 'C#3', x: 'D#3', c: 'F#3', v: 'G#3', b: 'A#3',
};

/* ═══════════════════════════════════════════════════════════
   CLAVIER PIANO (3 octaves)
   ═══════════════════════════════════════════════════════════ */

export const PIANO_KEYS_DATA: readonly PianoKey[] = [
   { index: 0, note: 'C3', frenchNote: 'DO', octave: 3, isBlack: false, whiteIndex: 0 },
   { index: 1, note: 'C#3', frenchNote: 'DO#', octave: 3, isBlack: true, whiteIndex: 0 },
   { index: 2, note: 'D3', frenchNote: 'RÉ', octave: 3, isBlack: false, whiteIndex: 1 },
   { index: 3, note: 'D#3', frenchNote: 'RÉ#', octave: 3, isBlack: true, whiteIndex: 1 },
   { index: 4, note: 'E3', frenchNote: 'MI', octave: 3, isBlack: false, whiteIndex: 2 },
   { index: 5, note: 'F3', frenchNote: 'FA', octave: 3, isBlack: false, whiteIndex: 3 },
   { index: 6, note: 'F#3', frenchNote: 'FA#', octave: 3, isBlack: true, whiteIndex: 3 },
   { index: 7, note: 'G3', frenchNote: 'SOL', octave: 3, isBlack: false, whiteIndex: 4 },
   { index: 8, note: 'G#3', frenchNote: 'SOL#', octave: 3, isBlack: true, whiteIndex: 4 },
   { index: 9, note: 'A3', frenchNote: 'LA', octave: 3, isBlack: false, whiteIndex: 5 },
   { index: 10, note: 'A#3', frenchNote: 'LA#', octave: 3, isBlack: true, whiteIndex: 5 },
   { index: 11, note: 'B3', frenchNote: 'SI', octave: 3, isBlack: false, whiteIndex: 6 },
   { index: 12, note: 'C4', frenchNote: 'DO', octave: 4, isBlack: false, whiteIndex: 7 },
   { index: 13, note: 'C#4', frenchNote: 'DO#', octave: 4, isBlack: true, whiteIndex: 7 },
   { index: 14, note: 'D4', frenchNote: 'RÉ', octave: 4, isBlack: false, whiteIndex: 8 },
   { index: 15, note: 'D#4', frenchNote: 'RÉ#', octave: 4, isBlack: true, whiteIndex: 8 },
   { index: 16, note: 'E4', frenchNote: 'MI', octave: 4, isBlack: false, whiteIndex: 9 },
   { index: 17, note: 'F4', frenchNote: 'FA', octave: 4, isBlack: false, whiteIndex: 10 },
   { index: 18, note: 'F#4', frenchNote: 'FA#', octave: 4, isBlack: true, whiteIndex: 10 },
   { index: 19, note: 'G4', frenchNote: 'SOL', octave: 4, isBlack: false, whiteIndex: 11 },
   { index: 20, note: 'G#4', frenchNote: 'SOL#', octave: 4, isBlack: true, whiteIndex: 11 },
   { index: 21, note: 'A4', frenchNote: 'LA', octave: 4, isBlack: false, whiteIndex: 12 },
   { index: 22, note: 'A#4', frenchNote: 'LA#', octave: 4, isBlack: true, whiteIndex: 12 },
   { index: 23, note: 'B4', frenchNote: 'SI', octave: 4, isBlack: false, whiteIndex: 13 },
   { index: 24, note: 'C5', frenchNote: 'DO', octave: 5, isBlack: false, whiteIndex: 14 },
];

/* ═══════════════════════════════════════════════════════════
   CLÉS DE STOCKAGE
   ═══════════════════════════════════════════════════════════ */



/* ═══════════════════════════════════════════════════════════
   SEUILS
   ═══════════════════════════════════════════════════════════ */

/** Durée minimale d'une note enregistrée (ms). */
export const MIN_NOTE_DURATION_MS = 80;

/** Seuil de déplacement pour le drag-scroll (px). */
export const DRAG_THRESHOLD_PX = 6;

// src/app/game/piano/constants/piano.constants.ts



/* ═══════════════════════════════════════════════════════════
   RÈGLES DE JEU
   ═══════════════════════════════════════════════════════════ */

export const MAX_TIME = 200;
export const STAR_POWER_DURATION = 8;
export const STAR_POWER_GAIN_PER_HIT = 12;
export const STAR_POWER_GAIN_MAX = 100;
export const COMBO_MELODY_TRIGGER = 12;
export const COMBO_SHAKE_TRIGGER = 10;
export const TAP_THRESHOLD_PX = 8;

/* ═══════════════════════════════════════════════════════════
   STOCKAGE
   ═══════════════════════════════════════════════════════════ */

export const STORAGE_KEYS = {
   HIGH_SCORE: 'charly_piano_highscore',
   SOUND_ENABLED: 'piano_hero_sound_enabled',
   SONG: 'charly_piano_song_v2',
} as const;

/* ═══════════════════════════════════════════════════════════
   ITÉRATIONS D'AFFICHAGE
   ═══════════════════════════════════════════════════════════ */

/** Cœurs affichés dans la barre de vies (5 max). */
export const HEARTS: readonly number[] = [1, 2, 3, 4, 5];

/** Particules décoratives de la mélodie. */
export const MELODY_PARTICLES: readonly number[] = [1, 2, 3, 4, 5, 6, 7, 8];

/* ═══════════════════════════════════════════════════════════
   CLAVIER PIANO (C3 → C5)
   ═══════════════════════════════════════════════════════════ */

export const PIANO_KEYS: readonly PianoKey[] = [
   { index: 0, note: 'C3', frenchNote: 'DO', octave: 3, isBlack: false, whiteIndex: 0 },
   { index: 1, note: 'C#3', frenchNote: 'DO#', octave: 3, isBlack: true, whiteIndex: 0 },
   { index: 2, note: 'D3', frenchNote: 'RÉ', octave: 3, isBlack: false, whiteIndex: 1 },
   { index: 3, note: 'D#3', frenchNote: 'RÉ#', octave: 3, isBlack: true, whiteIndex: 1 },
   { index: 4, note: 'E3', frenchNote: 'MI', octave: 3, isBlack: false, whiteIndex: 2 },
   { index: 5, note: 'F3', frenchNote: 'FA', octave: 3, isBlack: false, whiteIndex: 3 },
   { index: 6, note: 'F#3', frenchNote: 'FA#', octave: 3, isBlack: true, whiteIndex: 3 },
   { index: 7, note: 'G3', frenchNote: 'SOL', octave: 3, isBlack: false, whiteIndex: 4 },
   { index: 8, note: 'G#3', frenchNote: 'SOL#', octave: 3, isBlack: true, whiteIndex: 4 },
   { index: 9, note: 'A3', frenchNote: 'LA', octave: 3, isBlack: false, whiteIndex: 5 },
   { index: 10, note: 'A#3', frenchNote: 'LA#', octave: 3, isBlack: true, whiteIndex: 5 },
   { index: 11, note: 'B3', frenchNote: 'SI', octave: 3, isBlack: false, whiteIndex: 6 },
   { index: 12, note: 'C4', frenchNote: 'DO', octave: 4, isBlack: false, whiteIndex: 7 },
   { index: 13, note: 'C#4', frenchNote: 'DO#', octave: 4, isBlack: true, whiteIndex: 7 },
   { index: 14, note: 'D4', frenchNote: 'RÉ', octave: 4, isBlack: false, whiteIndex: 8 },
   { index: 15, note: 'D#4', frenchNote: 'RÉ#', octave: 4, isBlack: true, whiteIndex: 8 },
   { index: 16, note: 'E4', frenchNote: 'MI', octave: 4, isBlack: false, whiteIndex: 9 },
   { index: 17, note: 'F4', frenchNote: 'FA', octave: 4, isBlack: false, whiteIndex: 10 },
   { index: 18, note: 'F#4', frenchNote: 'FA#', octave: 4, isBlack: true, whiteIndex: 10 },
   { index: 19, note: 'G4', frenchNote: 'SOL', octave: 4, isBlack: false, whiteIndex: 11 },
   { index: 20, note: 'G#4', frenchNote: 'SOL#', octave: 4, isBlack: true, whiteIndex: 11 },
   { index: 21, note: 'A4', frenchNote: 'LA', octave: 4, isBlack: false, whiteIndex: 12 },
   { index: 22, note: 'A#4', frenchNote: 'LA#', octave: 4, isBlack: true, whiteIndex: 12 },
   { index: 23, note: 'B4', frenchNote: 'SI', octave: 4, isBlack: false, whiteIndex: 13 },
   { index: 24, note: 'C5', frenchNote: 'DO', octave: 5, isBlack: false, whiteIndex: 14 },
];

/* ═══════════════════════════════════════════════════════════
   NOTES & COULEURS
   ═══════════════════════════════════════════════════════════ */

export const WHITE_NOTES_LIST: readonly string[] = [
   'DO', 'RÉ', 'MI', 'FA', 'SOL', 'LA', 'SI',
];

export const NOTE_COLORS: Readonly<Record<string, string>> = {
   'DO': '#FF3366', 'DO#': '#FF3366',
   'RÉ': '#FFD700', 'RÉ#': '#FFD700',
   'MI': '#00D4FF',
   'FA': '#FF6B35', 'FA#': '#FF6B35',
   'SOL': '#00FF88', 'SOL#': '#00FF88',
   'LA': '#B266FF', 'LA#': '#B266FF',
   'SI': '#FF8CC8',
};