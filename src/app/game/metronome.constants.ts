import { DifficultyConfig } from './metronome-challenge.model';

/* ═══════════════════════════════════════════════════════
   DIFFICULTÉS
   ═══════════════════════════════════════════════════════ */

export const METRONOME_DIFFICULTIES: readonly DifficultyConfig[] = [
  {
    mode: 'EASY',
    label: 'Facile',
    emoji: '🌱',
    perfectThreshold: 50,
    greatThreshold: 100,
    okThreshold: 150,
    description: 'Tolérance large — pour découvrir'
  },
  {
    mode: 'NORMAL',
    label: 'Normal',
    emoji: '🎯',
    perfectThreshold: 25,
    greatThreshold: 50,
    okThreshold: 90,
    description: 'Équilibré — pour progresser'
  },
  {
    mode: 'HARD',
    label: 'Hard',
    emoji: '🔥',
    perfectThreshold: 15,
    greatThreshold: 30,
    okThreshold: 60,
    description: 'Précision requise — pour affiner'
  },
  {
    mode: 'EXPERT',
    label: 'Expert',
    emoji: '💎',
    perfectThreshold: 8,
    greatThreshold: 18,
    okThreshold: 40,
    description: 'Millimétrique — pour les pros'
  }
];

/* ═══════════════════════════════════════════════════════
   CONFIGURATION PAR DÉFAUT
   ═══════════════════════════════════════════════════════ */

export const METRONOME_DEFAULTS = {
  BPM: 100,
  TOTAL_BEATS: 16,
  BEATS_PER_BAR: 4,
  SUBDIVISION: 1,
  LATENCY_OFFSET_MS: 0,
  COUNTDOWN_SECONDS: 4,
  TAP_DEBOUNCE_MS: 80
};

export const METRONOME_LIMITS = {
  BPM_MIN: 40,
  BPM_MAX: 220,
  BPM_STEP: 5,
  LATENCY_MIN: -100,
  LATENCY_MAX: 100,
  LATENCY_STEP: 5
};

export const METRONOME_BPM_PRESETS = [60, 80, 100, 120, 140, 180] as const;
export const METRONOME_BEAT_OPTIONS = [8, 16, 32, 64] as const;
export const METRONOME_SUBDIVISION_OPTIONS = [1, 2, 4] as const;

/* ═══════════════════════════════════════════════════════
   SCORING & RANGS
   ═══════════════════════════════════════════════════════ */

export const METRONOME_SCORING = {
  PERFECT_POINTS: 100,
  GREAT_POINTS: 75,
  OK_POINTS: 40,
  MISSED_PENALTY: 20
} as const;

export const METRONOME_RANKS: ReadonlyArray<{
  minScore: number;
  title: string;
  emoji: string;
}> = [
  { minScore: 95, title: 'Horloge Suisse',       emoji: '⏱️' },
  { minScore: 85, title: 'Groove Master',        emoji: '🎸' },
  { minScore: 70, title: 'Batteur Solide',       emoji: '🥁' },
  { minScore: 50, title: 'Apprenti Rythmique',   emoji: '🎵' },
  { minScore: 25, title: 'En Progrès',           emoji: '📈' },
  { minScore: 0,  title: 'Débutant Rythmique',   emoji: '🥁' }
];

/* ═══════════════════════════════════════════════════════
   AUDIO — Fréquences
   ═══════════════════════════════════════════════════════ */

export const METRONOME_SOUNDS = {
  COUNTDOWN: 880,
  BAR_START: 1320,
  BEAT: 990,
  SUB_BEAT: 660
} as const;

/* ═══════════════════════════════════════════════════════
   STOCKAGE
   ═══════════════════════════════════════════════════════ */

export const METRONOME_STORAGE_KEYS = {
  BEST_SCORE: 'metronome_bestScore',
  BEST_AVG: 'metronome_bestAvg',
  SESSIONS: 'metronome_sessions',
  SOUND_ENABLED: 'metronome_sound_enabled'
} as const;

export const METRONOME_HISTORY_LIMIT = 10;