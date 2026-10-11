import { ChordShape } from '../models/memory-chord.model';

/**
 * Catalogue complet des accords de la méthode Charly Guitare.
 * Utilisé par le jeu L'Essentiel (Mölkky).
 */
export const CHORD_CATALOG: readonly ChordShape[] = [
  /* ─── Facile ─── */
  { id: '1',  name: 'C',  fullName: 'Do Majeur',  frets: [-1, 3, 2, 0, 1, 0], baseFret: 1, points: 1,  difficulty: 'facile',    category: 'majeur' },
  { id: '2',  name: 'Am', fullName: 'La mineur',  frets: [-1, 0, 2, 2, 1, 0], baseFret: 1, points: 2,  difficulty: 'facile',    category: 'mineur' },
  { id: '3',  name: 'G',  fullName: 'Sol Majeur', frets: [ 3, 2, 0, 0, 0, 3], baseFret: 1, points: 3,  difficulty: 'facile',    category: 'majeur' },
  { id: '4',  name: 'Em', fullName: 'Mi mineur',  frets: [ 0, 2, 2, 0, 0, 0], baseFret: 1, points: 4,  difficulty: 'facile',    category: 'mineur' },

  /* ─── Normal ─── */
  { id: '5',  name: 'Dm', fullName: 'Ré mineur',  frets: [-1, -1, 0, 2, 3, 1], baseFret: 1, points: 5,  difficulty: 'normal',    category: 'mineur' },
  { id: '6',  name: 'E',  fullName: 'Mi Majeur',  frets: [ 0,  2, 2, 1, 0, 0], baseFret: 1, points: 6,  difficulty: 'normal',    category: 'majeur' },
  { id: '7',  name: 'A',  fullName: 'La Majeur',  frets: [-1,  0, 2, 2, 2, 0], baseFret: 1, points: 7,  difficulty: 'normal',    category: 'majeur' },
  { id: '8',  name: 'D',  fullName: 'Ré Majeur',  frets: [-1, -1, 0, 2, 3, 2], baseFret: 1, points: 8,  difficulty: 'normal',    category: 'majeur' },

  /* ─── Difficile ─── */
  { id: '9',  name: 'F',  fullName: 'Fa Majeur',  frets: [ 1, 3, 3, 2, 1, 1],  baseFret: 1, points: 9,  difficulty: 'difficile', category: 'majeur' },
  { id: '10', name: 'B7', fullName: 'Si 7ème',    frets: [-1, 2, 1, 2, 0, 2],  baseFret: 1, points: 10, difficulty: 'difficile', category: 'septieme' },
  { id: '11', name: 'C7', fullName: 'Do 7ème',    frets: [-1, 3, 2, 3, 1, 0],  baseFret: 1, points: 11, difficulty: 'difficile', category: 'septieme' },
  { id: '12', name: 'G7', fullName: 'Sol 7ème',   frets: [ 3, 2, 0, 0, 0, 1],  baseFret: 1, points: 12, difficulty: 'difficile', category: 'septieme' }
];