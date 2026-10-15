// src/app/game/chord/utils/chord.utils.ts

import { ChordDetail } from 'src/app/game/models/chord-decoder.model';
import { NOTES_SHARP, NOTES_FLAT, CHORD_INTERVALS, MAJOR_SCALE, DEGREE_LABELS } from '../constants/chord.constants';
 
 

/* ═════════════════════════════════════════════════════════════════════
   ANALYSE D'UN ACCORD
   ═════════════════════════════════════════════════════════════════════ */

export function analyzeChord(
  chordStr: string,
  selectedKey: string,
  useFlats: boolean
): ChordDetail {
  const match = chordStr.match(/^([A-G][b#]?)(.*)$/);

  if (!match) {
    return {
      raw: chordStr,
      root: '?',
      quality: '',
      notes: [],
      degree: '',
      romanNumeral: '',
      isDiatonic: false,
    };
  }

  const root = match[1];
  const quality = match[2] || '';

  const notes = getChordNotes(root, quality, useFlats);
  const degree = calculateDegree(root, selectedKey);
  const isDiatonic = degree !== '' && degree !== 'Ext';

  return {
    raw: chordStr,
    root,
    quality,
    notes,
    degree,
    romanNumeral: degreeToRoman(degree, quality),
    isDiatonic,
  };
}

/* ═════════════════════════════════════════════════════════════════════
   NOTES D'UN ACCORD
   ═════════════════════════════════════════════════════════════════════ */

export function getChordNotes(
  root: string,
  quality: string,
  useFlats: boolean
): string[] {
  let rootIndex = NOTES_SHARP.indexOf(root);
  if (rootIndex === -1) rootIndex = NOTES_FLAT.indexOf(root);
  if (rootIndex === -1) return [];

  const list = useFlats ? NOTES_FLAT : NOTES_SHARP;
  const get = (semi: number) => list[(rootIndex + semi + 12) % 12];

  const intervals = CHORD_INTERVALS[quality] ?? CHORD_INTERVALS[''];
  return intervals.map((semi) => get(semi));
}

/* ═════════════════════════════════════════════════════════════════════
   DEGRÉ DANS LA TONALITÉ
   ═════════════════════════════════════════════════════════════════════ */

export function calculateDegree(root: string, selectedKey: string): string {
  const keyIndex = NOTES_SHARP.indexOf(selectedKey);
  let rootIndex = NOTES_SHARP.indexOf(root);
  if (rootIndex === -1) rootIndex = NOTES_FLAT.indexOf(root);
  if (keyIndex === -1 || rootIndex === -1) return '';

  const interval = (rootIndex - keyIndex + 12) % 12;
  const idx = MAJOR_SCALE.indexOf(interval);
  if (idx === -1) return 'Ext';

  return DEGREE_LABELS[idx];
}

/* ═════════════════════════════════════════════════════════════════════
   CHIFFRAGE ROMAIN
   ═════════════════════════════════════════════════════════════════════ */

export function degreeToRoman(degree: string, quality: string): string {
  if (!degree) return '';

  let roman = degree.replace('°', '');
  if (quality.includes('7') && quality !== 'maj7') roman += '7';
  if (quality === 'maj7') roman += 'maj7';
  if (quality.includes('dim')) roman += '°';

  return roman;
}

/* ═════════════════════════════════════════════════════════════════════
   TRANSPOSITION DE GRILLE
   ═════════════════════════════════════════════════════════════════════ */

export function transposeGrid(
  rawInput: string,
  semitones: number,
  useFlats: boolean
): string {
  return rawInput.replace(
    /\[?([A-G][b#]?)([a-zA-Z0-9°+]*)\]?/g,
    (match, root, quality) => {
      const isBracketed = match.startsWith('[');
      let idx = NOTES_SHARP.indexOf(root);
      if (idx === -1) idx = NOTES_FLAT.indexOf(root);
      if (idx === -1) return match;

      const newIdx = (idx + semitones + 12) % 12;
      const list = useFlats ? NOTES_FLAT : NOTES_SHARP;
      const newChord = `${list[newIdx]}${quality}`;
      return isBracketed ? `[${newChord}]` : newChord;
    }
  );
}