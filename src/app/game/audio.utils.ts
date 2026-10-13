import { NOTE_TO_MIDI_OFFSET } from './fretboard.constants';

/**
 * Convertit une note en notation scientifique (ex. "A4") en index MIDI.
 * Retourne 60 (Do4) par défaut si le format est invalide.
 */
export function noteToMidiIndex(note: string): number {
  const match = /^([A-G]#?)(\d+)$/.exec(note);
  if (!match) return 60;
  const [, pitch, octaveStr] = match;
  return (Number(octaveStr) + 1) * 12 + (NOTE_TO_MIDI_OFFSET[pitch] ?? 0);
}

/**
 * Convertit un index MIDI en fréquence audio (Hz).
 */
export function midiToFrequency(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

/**
 * Calcule la fréquence d'une note (notation scientifique).
 */
export function noteToFrequency(note: string): number {
  return midiToFrequency(noteToMidiIndex(note));
}

/**
 * Initialise un AudioContext de manière tolérante (préfixes webkit).
 * Retourne `null` si l'API n'est pas disponible.
 */
export function createAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;

  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

  return Ctor ? new Ctor() : null;
}

/**
 * Reprend le contexte audio s'il est suspendu.
 * Tolérant aux erreurs (retourne `false` si échec).
 */
export async function resumeAudioContext(ctx: AudioContext | undefined): Promise<boolean> {
  if (!ctx) return false;
  if (ctx.state === 'running') return true;

  try {
    await ctx.resume();
    // ⚠️ On relit l'état APRÈS l'await : TypeScript ne le sait pas
    // automatiquement, donc on force la lecture via une variable intermédiaire
    // castée en string.
    return (ctx.state as string) === 'running';
  } catch {
    return false;
  }
}