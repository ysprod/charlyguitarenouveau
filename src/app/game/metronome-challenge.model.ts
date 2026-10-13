export type AccuracyLevel = 'PERFECT' | 'GREAT' | 'OK' | 'EARLY' | 'LATE' | 'MISSED';
export type GameState = 'IDLE' | 'COUNTDOWN' | 'PLAYING' | 'FINISHED';
export type DifficultyMode = 'EASY' | 'NORMAL' | 'HARD' | 'EXPERT';

export interface TapRecord {
  beatNumber: number;
  expectedTime: number;
  actualTime: number;
  deltaMs: number;
  accuracy: AccuracyLevel;
}

export interface BeatResult {
  beatNumber: number;
  expectedTime: number;
  actualTime: number | null;
  deltaMs: number | null;
  accuracy: AccuracyLevel;
}

export interface GameResults {
  totalBeats: number;
  playedBeats: number;
  missedBeats: number;
  scorePercentage: number;
  avgDeltaMs: number;
  medianDeltaMs: number;
  stdDeviationMs: number;
  bestDeltaMs: number;
  worstDeltaMs: number;
  perfectCount: number;
  greatCount: number;
  okCount: number;
  rankTitle: string;
  rankEmoji: string;
  isNewRecord: boolean;
}

export interface DifficultyConfig {
  mode: DifficultyMode;
  label: string;
  emoji: string;
  perfectThreshold: number;  // ms
  greatThreshold: number;
  okThreshold: number;
  description: string;
}

export interface SessionHistory {
  date: string;
  bpm: number;
  score: number;
  accuracy: number;
  difficulty: DifficultyMode;
}