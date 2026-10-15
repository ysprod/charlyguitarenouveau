// src/app/game/chord/utils/chord-midi.utils.ts

import { ChordDetail, GridBar } from 'src/app/game/models/chord-decoder.model';
import { TICKS_PER_BEAT, ARPEGGIO_STEP_TICKS, ARPEGGIO_NOTE_DURATION_TICKS, NOTE_TO_SEMITONE, CHORD_INTERVALS } from '../constants/chord.constants';

 

/* ═════════════════════════════════════════════════════════════════════
   MIDI — Construction de fichier SMF type 0 avec arpeggio
   ═════════════════════════════════════════════════════════════════════ */

export function buildMidiFile(
  bars: readonly GridBar[],
  bpm: number,
  beatsPerBar: number
): Uint8Array {
  const ticksPerBar = TICKS_PER_BEAT * beatsPerBar;
  const microsecondsPerBeat = Math.round(60_000_000 / bpm);

  const events: { tick: number; data: number[] }[] = [];

  let globalTick = 0;

  for (const bar of bars) {
    const nb = bar.chords.length;
    if (nb === 0) {
      globalTick += ticksPerBar;
      continue;
    }

    const ticksPerChord = Math.floor(ticksPerBar / nb);

    for (const chord of bar.chords) {
      const notes = chordToMidiNotes(chord);

      notes.forEach((note, i) => {
        const noteStart = globalTick + i * ARPEGGIO_STEP_TICKS;
        const maxDuration = Math.max(
          30,
          ticksPerChord - i * ARPEGGIO_STEP_TICKS - 10
        );
        const noteDuration = Math.min(
          ARPEGGIO_NOTE_DURATION_TICKS,
          maxDuration
        );
        const noteEnd = noteStart + noteDuration;

        events.push({ tick: noteStart, data: [0x90, note, 80] });
        events.push({ tick: noteEnd, data: [0x80, note, 0] });
      });

      globalTick += ticksPerChord;
    }
  }

  events.sort((a, b) => a.tick - b.tick);

  const track: number[] = [];

  /* Meta event : Tempo */
  track.push(
    0x00,
    0xff, 0x51, 0x03,
    (microsecondsPerBeat >> 16) & 0xff,
    (microsecondsPerBeat >> 8) & 0xff,
    microsecondsPerBeat & 0xff
  );

  let lastTick = 0;
  for (const ev of events) {
    const delta = ev.tick - lastTick;
    lastTick = ev.tick;

    track.push(...encodeVarLen(delta));
    track.push(...ev.data);
  }

  track.push(0x00, 0xff, 0x2f, 0x00); /* End of Track */

  const header = [
    0x4d, 0x54, 0x68, 0x64,
    0x00, 0x00, 0x00, 0x06,
    0x00, 0x00,
    0x00, 0x01,
    (TICKS_PER_BEAT >> 8) & 0xff,
    TICKS_PER_BEAT & 0xff,
  ];

  const trackHeader = [
    0x4d, 0x54, 0x72, 0x6b,
    (track.length >> 24) & 0xff,
    (track.length >> 16) & 0xff,
    (track.length >> 8) & 0xff,
    track.length & 0xff,
  ];

  return new Uint8Array([...header, ...trackHeader, ...track]);
}

/* ═════════════════════════════════════════════════════════════════════
   CONVERSION ACCORD → NOTES MIDI
   ═════════════════════════════════════════════════════════════════════ */

export function chordToMidiNotes(chord: ChordDetail): number[] {
  const rootSemitone = NOTE_TO_SEMITONE[chord.root];
  if (rootSemitone === undefined) return [];

  const intervals = CHORD_INTERVALS[chord.quality] ?? CHORD_INTERVALS[''];

  const baseOctave = 60; /* C4 */

  return intervals.map((semi) => {
    const midi = baseOctave + rootSemitone + semi;
    if (midi > 127) return midi - 12;
    if (midi < 0) return midi + 12;
    return midi;
  });
}

/* ═════════════════════════════════════════════════════════════════════
   VARIABLE-LENGTH QUANTITY (MIDI)
   ═════════════════════════════════════════════════════════════════════ */

export function encodeVarLen(value: number): number[] {
  if (value < 0) value = 0;

  const bytes: number[] = [value & 0x7f];
  value >>= 7;

  while (value > 0) {
    bytes.unshift((value & 0x7f) | 0x80);
    value >>= 7;
  }

  return bytes;
}