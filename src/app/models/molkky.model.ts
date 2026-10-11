import { ChordShape, Difficulty } from './memory-chord.model';

export interface PinState {
  readonly chord: ChordShape;
  readonly isDown: boolean;
  readonly isRevealed: boolean;
  readonly isShaking: boolean;
}

export interface DifficultyConfig {
  readonly id: Difficulty;
  readonly nom: string;
  readonly icone: string;
  readonly description: string;
  readonly couleur: string;
  readonly strikeLimit: number;
  readonly timeMultiplier: number;
  readonly pinCount: number;
}