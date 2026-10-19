export interface GuitarNote {
  stringIndex: number; // 1 (Mi aigu) à 6 (Mi grave)
  fret: number;        // 0 (à vide) à 12
  noteName: string;    
}

export interface GameState {
  score: number;
  combo: number;
  lives: number;
  targetNote: string;
  timeLeft: number;
  isPlaying: boolean;
  isGameOver: boolean;
}