import { DifficultyConfig } from '../models/molkky.model';
import { Difficulty } from '../models/memory-chord.model';

/* ═══════════════════════════════════════════════════════
   DIFFICULTÉS
   ═══════════════════════════════════════════════════════ */

export const MOLKKY_DIFFICULTIES: readonly DifficultyConfig[] = [
  {
    id: 'facile',
    nom: 'FACILE',
    icone: '🌱',
    description: '6 accords simples · Timer lent · 5 erreurs autorisées',
    couleur: '#10b981',
    strikeLimit: 5,
    timeMultiplier: 0.6,
    pinCount: 6
  },
  {
    id: 'normal',
    nom: 'NORMAL',
    icone: '⚡',
    description: '9 accords · Timer moyen · 3 erreurs autorisées',
    couleur: '#f59e0b',
    strikeLimit: 3,
    timeMultiplier: 1,
    pinCount: 9
  },
  {
    id: 'difficile',
    nom: 'DIFFICILE',
    icone: '🔥',
    description: '12 accords · Timer rapide · 2 erreurs autorisées',
    couleur: '#ef4444',
    strikeLimit: 2,
    timeMultiplier: 0.5,
    pinCount: 12
  }
];

export const MOLKKY_DIFFICULTY_MAP: Readonly<Record<Difficulty, DifficultyConfig>> = {
  facile:    MOLKKY_DIFFICULTIES[0],
  normal:    MOLKKY_DIFFICULTIES[1],
  difficile: MOLKKY_DIFFICULTIES[2]
};

/* ═══════════════════════════════════════════════════════
   RÈGLES DE JEU — interface déclarée ICI
   ═══════════════════════════════════════════════════════ */

export interface MolkkyRules {
  readonly MAX_TIME: number;
  readonly SCORE_TARGET: number;
  readonly SCORE_PENALTY: number;
  readonly TIMER_TICK_MS: number;
  readonly TICK_SOUND_THRESHOLD: number;
  readonly COMBO_THRESHOLD: number;
  readonly COMBO_BONUS: number;
}

export const MOLKKY_RULES: MolkkyRules = {
  MAX_TIME: 100,
  SCORE_TARGET: 50,
  SCORE_PENALTY: 25,
  TIMER_TICK_MS: 100,
  TICK_SOUND_THRESHOLD: 30,
  COMBO_THRESHOLD: 3,
  COMBO_BONUS: 1.5
};

/* ═══════════════════════════════════════════════════════
   STOCKAGE
   ═══════════════════════════════════════════════════════ */

export const MOLKKY_STORAGE_KEYS = {
  DIFFICULTY: 'molkky_difficulty'
} as const;