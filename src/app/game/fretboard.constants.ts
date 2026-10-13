import {
  Difficulty,
  DifficultyOption,
  GuitarString,
  MelodyChord
} from './fretboard.model';

/* ═══════════════════════════════════════════════════════
   THÉORIE MUSICALE
   ═══════════════════════════════════════════════════════ */

export const CHROMATIC_NOTES = [
  'C', 'C#', 'D', 'D#', 'E', 'F',
  'F#', 'G', 'G#', 'A', 'A#', 'B'
] as const;

export const FRENCH_NOTE_SEQUENCE = [
  'DO', 'DO#', 'RÉ', 'RÉ#', 'MI', 'FA',
  'FA#', 'SOL', 'SOL#', 'LA', 'LA#', 'SI'
] as const;

export const NOTE_TO_MIDI_OFFSET: Readonly<Record<string, number>> = {
  C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5,
  'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11
};

export const TARGET_NOTES = ['DO', 'RÉ', 'MI', 'FA', 'SOL', 'LA', 'SI'] as const;

export const GUITAR_STRINGS: readonly GuitarString[] = [
  { index: 1, name: 'E', gaugeMm: 0.30, baseMidi: 64 },
  { index: 2, name: 'B', gaugeMm: 0.41, baseMidi: 59 },
  { index: 3, name: 'G', gaugeMm: 0.61, baseMidi: 55 },
  { index: 4, name: 'D', gaugeMm: 0.81, baseMidi: 50 },
  { index: 5, name: 'A', gaugeMm: 1.07, baseMidi: 45 },
  { index: 6, name: 'E', gaugeMm: 1.35, baseMidi: 40 }
];

export const STRING_COLORS = [
  '#E6C280', '#D4AF37', '#B8860B',
  '#CD7F32', '#8B5A2B', '#5C4033'
] as const;

/* ═══════════════════════════════════════════════════════
   DIFFICULTÉ
   ═══════════════════════════════════════════════════════ */

export const DIFFICULTIES: readonly DifficultyOption[] = [
  { id: 'facile',   icon: '🌱', name: 'FACILE',    desc: '5 vies · Lent',   lives: 5, timeMultiplier: 0.8 },
  { id: 'normal',   icon: '🔥', name: 'NORMAL',    desc: '3 vies · Moyen',  lives: 3, timeMultiplier: 1.5 },
  { id: 'hardcore', icon: '🌟', name: 'DIFFICILE', desc: '2 vies · Rapide', lives: 2, timeMultiplier: 2.2 }
];

export const DIFFICULTY_MAP: Readonly<Record<Difficulty, DifficultyOption>> = {
  facile:   DIFFICULTIES[0],
  normal:   DIFFICULTIES[1],
  hardcore: DIFFICULTIES[2]
};

/* ═══════════════════════════════════════════════════════
   RÈGLES DE JEU
   ═══════════════════════════════════════════════════════ */

export interface GameRules {
  readonly MAX_TIME: number;
  readonly STAR_POWER_DURATION: number;
  readonly STAR_POWER_DRAIN_PER_TICK: number;
  readonly STAR_POWER_GAIN_ON_HIT: number;
  readonly COMBO_MELODY_TRIGGER: number;
  readonly COMBO_SHAKE_TRIGGER: number;
  readonly PERFECT_TIME_THRESHOLD: number;
  readonly TIMER_TICK_MS: number;
}

export const GAME_RULES: GameRules = {
  MAX_TIME: 200,
  STAR_POWER_DURATION: 8,
  STAR_POWER_DRAIN_PER_TICK: 1.25,
  STAR_POWER_GAIN_ON_HIT: 12,
  COMBO_MELODY_TRIGGER: 7,
  COMBO_SHAKE_TRIGGER: 10,
  PERFECT_TIME_THRESHOLD: 0.7,
  TIMER_TICK_MS: 100
};

/* ═══════════════════════════════════════════════════════
   EFFETS VISUELS
   ═══════════════════════════════════════════════════════ */

export const CONFETTI_COLORS = [
  '#FFD700', '#FF6B9D', '#00D4FF', '#00FF88',
  '#B266FF', '#FF4500', '#FFB347', '#9D4EDD'
] as const;

export const CONFETTI_COUNT = 80;
export const SPARKLES_INDICES = [1, 2, 3, 4, 5, 6];
export const LIVES_INDICES = [0, 1, 2, 3, 4];
export const STAR_POWER_STARS = Array.from({ length: 10 }, (_, i) => i);
export const FRETS = Array.from({ length: 13 }, (_, i) => i);

/* ═══════════════════════════════════════════════════════
   ACCORD PAR DÉFAUT (Mélodie des Origines)
   ═══════════════════════════════════════════════════════ */

export const CHORD_POOL: readonly MelodyChord[] = [
  {
    name: 'Am', frenchName: 'La mineur', color: '#B266FF', bassNote: 'A2',
    arpeggio: [
      { stringIdx: 5, fretIdx: 0 }, { stringIdx: 4, fretIdx: 2 },
      { stringIdx: 3, fretIdx: 2 }, { stringIdx: 2, fretIdx: 1 },
      { stringIdx: 1, fretIdx: 0 }
    ]
  },
  {
    name: 'C', frenchName: 'Do majeur', color: '#FFD700', bassNote: 'C3',
    arpeggio: [
      { stringIdx: 5, fretIdx: 3 }, { stringIdx: 4, fretIdx: 2 },
      { stringIdx: 3, fretIdx: 0 }, { stringIdx: 2, fretIdx: 1 },
      { stringIdx: 1, fretIdx: 0 }
    ]
  },
  {
    name: 'G', frenchName: 'Sol majeur', color: '#00FF88', bassNote: 'G2',
    arpeggio: [
      { stringIdx: 6, fretIdx: 3 }, { stringIdx: 5, fretIdx: 2 },
      { stringIdx: 4, fretIdx: 0 }, { stringIdx: 3, fretIdx: 0 },
      { stringIdx: 2, fretIdx: 0 }
    ]
  },
  {
    name: 'Dm', frenchName: 'Ré mineur', color: '#00D4FF', bassNote: 'D3',
    arpeggio: [
      { stringIdx: 4, fretIdx: 0 }, { stringIdx: 3, fretIdx: 2 },
      { stringIdx: 2, fretIdx: 3 }, { stringIdx: 1, fretIdx: 1 }
    ]
  },
  {
    name: 'Em', frenchName: 'Mi mineur', color: '#FF6B9D', bassNote: 'E2',
    arpeggio: [
      { stringIdx: 6, fretIdx: 0 }, { stringIdx: 5, fretIdx: 2 },
      { stringIdx: 4, fretIdx: 2 }, { stringIdx: 3, fretIdx: 0 },
      { stringIdx: 2, fretIdx: 0 }, { stringIdx: 1, fretIdx: 0 }
    ]
  },
  {
    name: 'F', frenchName: 'Fa majeur', color: '#FFB347', bassNote: 'F2',
    arpeggio: [
      { stringIdx: 6, fretIdx: 1 }, { stringIdx: 5, fretIdx: 3 },
      { stringIdx: 4, fretIdx: 3 }, { stringIdx: 3, fretIdx: 2 },
      { stringIdx: 2, fretIdx: 1 }, { stringIdx: 1, fretIdx: 1 }
    ]
  },
  {
    name: 'E', frenchName: 'Mi majeur', color: '#FF4500', bassNote: 'E2',
    arpeggio: [
      { stringIdx: 6, fretIdx: 0 }, { stringIdx: 5, fretIdx: 2 },
      { stringIdx: 4, fretIdx: 2 }, { stringIdx: 3, fretIdx: 1 },
      { stringIdx: 2, fretIdx: 0 }, { stringIdx: 1, fretIdx: 0 }
    ]
  },
  {
    name: 'A', frenchName: 'La majeur', color: '#9D4EDD', bassNote: 'A2',
    arpeggio: [
      { stringIdx: 5, fretIdx: 0 }, { stringIdx: 4, fretIdx: 2 },
      { stringIdx: 3, fretIdx: 2 }, { stringIdx: 2, fretIdx: 2 },
      { stringIdx: 1, fretIdx: 0 }
    ]
  }
];

/* ═══════════════════════════════════════════════════════
   STOCKAGE
   ═══════════════════════════════════════════════════════ */

export const FRETBOARD_STORAGE_KEYS = {
  HIGH_SCORE: 'fretboard_highscore'
} as const;