export interface ChordDetail {
  raw: string;
  root: string;
  quality: string;
  notes: string[];
  degree?: string;      // degré dans la tonalité (I, ii, V7...)
  romanNumeral?: string; // chiffrage romain
  isDiatonic?: boolean;  // appartient à la tonalité ?
}

export interface GridBar {
  barNumber: number;
  chords: ChordDetail[];
  duration: number;      // en temps (4 par défaut)
}

export interface SavedGrid {
  name: string;
  content: string;
  key: string;
  bpm: number;
}

export type QualityType =
  | '' | 'm' | '7' | 'maj7' | 'm7' | 'dim' | 'aug' | 'sus2' | 'sus4'
  | '6' | 'm6' | '9' | 'm9' | 'add9' | 'm7b5' | 'dim7';