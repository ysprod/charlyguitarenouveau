/* ═══════════════════════════════════════════════════════
   TYPES & INTERFACES — Charly Guitare Hero
   ═══════════════════════════════════════════════════════ */

export type Difficulty = 'facile' | 'normal' | 'hardcore';
export type FeedbackKind = 'success' | 'error' | 'perfect';
export type UiSoundKind =
  | 'click'
  | 'error'
  | 'gameover'
  | 'start'
  | 'perfect'
  | 'starpower';

export interface MelodyChord {
  readonly name: string;
  readonly frenchName: string;
  readonly color: string;
  readonly bassNote: string;
  readonly arpeggio: ReadonlyArray<{ stringIdx: number; fretIdx: number }>;
}

export interface GuitarString {
  readonly index: number;
  readonly name: string;
  readonly gaugeMm: number;
  readonly baseMidi: number;
}

export interface Particle {
  readonly id: number;
  readonly x: number;
  readonly y: number;
  readonly color: string;
  readonly size: number;
  readonly rotation: number;
}

export interface ConfettiParticle {
  readonly id: number;
  readonly x: number;
  readonly color: string;
  readonly size: number;
  readonly delay: number;
  readonly duration: number;
  readonly rotation: number;
}

export interface PlayingVoice {
  readonly source: OscillatorNode;
  readonly gainNode: GainNode;
  readonly stringIdx: number;
  readonly startTime: number;
}

export interface DifficultyOption {
  readonly id: Difficulty;
  readonly icon: string;
  readonly name: string;
  readonly desc: string;
  readonly lives: number;
  readonly timeMultiplier: number;
}