// src/app/features/piano/models/piano.model.ts

export interface PianoKey {
  index: number;
  note: string;
  frenchNote: string;
  octave: number;
  isBlack: boolean;
  whiteIndex: number;
}

export interface MelodyChord {
  name: string;
  frenchName: string;
  color: string;
  notes: string[];
  bassNote: string;
}

export interface Particle {
  id: number;
  x: number;
  y: number;
  color: string;
  size: number;
  rotation: number;
}

export interface HitEffect {
  id: number;
  keyIndex: number;
}

export type GameDifficulty = 'facile' | 'normal' | 'hardcore';
export type FeedbackType = 'success' | 'error' | 'perfect';

/** Mode de jeu : défi classique ou piano libre. */
export type GameMode = 'challenge' | 'free';