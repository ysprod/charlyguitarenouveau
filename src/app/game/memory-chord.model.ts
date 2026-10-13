export interface ChordShape {
  id: string;
  name: string;
  fullName: string;
  frets: number[];       // -1 = étouffée, 0 = à vide, >0 = case
  baseFret: number;
  points: number;        // Valeur Mölkky (1 à 12)
  difficulty: 'facile' | 'normal' | 'difficile';
  category: 'majeur' | 'mineur' | 'septieme' | 'suspendu';
}

export interface MolkkyGameState {
  score: number;
  strikes: number;
  targetChord: ChordShape | null;
  isPlaying: boolean;
  isGameOver: boolean;
  isVictory: boolean;
  difficulty: 'facile' | 'normal' | 'difficile';
  timeLeft: number;
  roundNumber: number;
  perfectRounds: number;
  bonusMultiplier: number;
}

export type Difficulty = 'facile' | 'normal' | 'difficile';