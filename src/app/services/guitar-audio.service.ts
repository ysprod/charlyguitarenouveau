import { Injectable, OnDestroy } from '@angular/core';

import {
  CHROMATIC_NOTES,
  FRENCH_NOTE_SEQUENCE,
  GUITAR_STRINGS,
  NOTE_TO_MIDI_OFFSET
} from '../constants/fretboard.constants';

import { PlayingVoice } from '../models/fretboard.model';

import { randomFloat } from '../utils/random.utils';
import {
  createAudioContext,
  noteToFrequency,
  resumeAudioContext
} from '../utils/audio.utils';

/**
 * Service de synthèse audio pour les composants de guitare.
 *
 * Centralise :
 *  - La gestion du contexte audio (création, résumé, fermeture)
 *  - La synthèse d'une note de guitare acoustique
 *  - La synthèse d'une note de mélodie (multi-voix, sans damping)
 *  - Le damping (étouffement) des cordes précédentes
 *  - La théorie musicale (notes, fréquences)
 */
@Injectable({ providedIn: 'root' })
export class GuitarAudioService implements OnDestroy {

  private audioCtx: AudioContext | null = null;

  /** Voix actives sur chaque corde (par index de corde). */
  private readonly activeVoices = new Map<number, PlayingVoice>();

  /** Voix actives de la mélodie (non dampées entre elles). */
  private readonly melodyVoices = new Set<OscillatorNode>();

  constructor() {
    this.audioCtx = createAudioContext();
  }

  ngOnDestroy(): void {
    this.stopAllVoices();
    void this.audioCtx?.close().catch(() => undefined);
    this.audioCtx = null;
  }

  /* ═══════════════════════════════════════════════════════
     CONTEXTE AUDIO
     ═══════════════════════════════════════════════════════ */

  /** Reprend le contexte s'il est suspendu. */
  async ensureReady(): Promise<boolean> {
    return resumeAudioContext(this.audioCtx ?? undefined);
  }

  /** Vrai si le contexte audio est prêt à jouer. */
  get isRunning(): boolean {
    return this.audioCtx?.state === 'running';
  }

  /** Vrai si le contexte existe. */
  get isAvailable(): boolean {
    return this.audioCtx !== null;
  }

  /* ═══════════════════════════════════════════════════════
     SYNTHÈSE — NOTE ACOUSTIQUE (avec damping)
     ═══════════════════════════════════════════════════════ */

  /**
   * Joue une note de guitare acoustique sur une corde.
   *
   * - Étouffe la note précédente sur la même corde
   * - Chaîne : oscillateurs → filtre pick → filtre body → gain → destination
   * - Enveloppe ADSR naturelle + vibrato LFO
   */
  playNote(
    stringIdx: number,
    toneNote: string,
    duration = 3.5,
    volume = 0.85,
    delaySeconds = 0
  ): void {
    if (!this.audioCtx) return;

    this.dampString(stringIdx);

    const freq = noteToFrequency(toneNote);
    const startTime = this.audioCtx.currentTime + delaySeconds;

    const gainNode = this.audioCtx.createGain();
    const bodyFilter = this.audioCtx.createBiquadFilter();
    const pickFilter = this.audioCtx.createBiquadFilter();

    /* Caisse (bois) */
    bodyFilter.type = 'lowpass';
    bodyFilter.frequency.setValueAtTime(freq * 4, startTime);
    bodyFilter.frequency.exponentialRampToValueAtTime(
      freq * 1.5,
      startTime + duration * 0.6
    );
    bodyFilter.Q.value = 1.2;

    /* Médiator (brillance) */
    pickFilter.type = 'peaking';
    pickFilter.frequency.value = freq * 6;
    pickFilter.Q.value = 0.8;
    pickFilter.gain.value = 4;

    /* Enveloppe ADSR */
    const isBassString = stringIdx >= 5;
    const attack = isBassString ? 0.004 : 0.002;
    const decay = 0.08;
    const sustainLevel = 0.45;

    gainNode.gain.setValueAtTime(0.0001, startTime);
    gainNode.gain.linearRampToValueAtTime(volume, startTime + attack);
    gainNode.gain.exponentialRampToValueAtTime(
      volume * sustainLevel,
      startTime + attack + decay
    );
    gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    /* Harmoniques + vibrato */
    const oscillators = this.buildHarmonics(
      freq,
      startTime,
      duration,
      [
        { type: 'triangle', ratio: 1,    gain: 0.6 },
        { type: 'sine',     ratio: 2,    gain: 0.25 },
        { type: 'sine',     ratio: 3.01, gain: 0.15 }
      ],
      pickFilter,
      true
    );

    pickFilter.connect(bodyFilter);
    bodyFilter.connect(gainNode);
    gainNode.connect(this.audioCtx.destination);

    this.activeVoices.set(stringIdx, {
      source: oscillators[0],
      gainNode,
      stringIdx,
      startTime
    });
  }

  /* ═══════════════════════════════════════════════════════
     SYNTHÈSE — NOTE DE MÉLODIE (multi-voix)
     ═══════════════════════════════════════════════════════ */

  /**
   * Joue une note de mélodie (multi-voix, sans damper les autres).
   * Utilisée pour la Mélodie des Origines.
   */
  playMelodyNote(
    stringIdx: number,
    toneNote: string,
    duration: number,
    volume: number,
    delaySeconds: number
  ): void {
    if (!this.audioCtx || this.audioCtx.state !== 'running') return;

    const freq = noteToFrequency(toneNote);
    const startTime = this.audioCtx.currentTime + delaySeconds;

    const gainNode = this.audioCtx.createGain();
    const filter = this.audioCtx.createBiquadFilter();

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(freq * 5, startTime);
    filter.frequency.exponentialRampToValueAtTime(
      freq * 1.8,
      startTime + duration * 0.7
    );

    gainNode.gain.setValueAtTime(0.0001, startTime);
    gainNode.gain.linearRampToValueAtTime(volume, startTime + 0.008);
    gainNode.gain.exponentialRampToValueAtTime(volume * 0.4, startTime + 0.15);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    this.buildHarmonics(
      freq,
      startTime,
      duration,
      [
        { type: 'triangle', ratio: 1,    gain: 0.7 },
        { type: 'sine',     ratio: 2,    gain: 0.2 },
        { type: 'sine',     ratio: 3.01, gain: 0.1 }
      ],
      filter,
      true,
      true /* trackMelody */
    );

    filter.connect(gainNode);
    gainNode.connect(this.audioCtx.destination);
  }

  /* ═══════════════════════════════════════════════════════
     DAMPING
     ═══════════════════════════════════════════════════════ */

  /**
   * Étouffe la note précédente sur une corde (comme un vrai guitariste).
   */
  dampString(stringIdx: number, dampingDuration = 0.04): void {
    const existing = this.activeVoices.get(stringIdx);
    if (!existing || !this.audioCtx) return;

    const now = this.audioCtx.currentTime;
    existing.gainNode.gain.cancelScheduledValues(now);
    existing.gainNode.gain.setValueAtTime(existing.gainNode.gain.value, now);
    existing.gainNode.gain.exponentialRampToValueAtTime(
      0.0001,
      now + dampingDuration
    );

    try {
      existing.source.stop(now + dampingDuration);
      existing.source.disconnect();
    } catch { /* noop */ }

    this.activeVoices.delete(stringIdx);
  }

  /** Arrête toutes les voix actives (cordes + mélodie). */
  stopAllVoices(): void {
    this.activeVoices.forEach(v => {
      try { v.source.stop(); } catch { /* noop */ }
    });
    this.activeVoices.clear();

    this.melodyVoices.forEach(v => {
      try { v.stop(); } catch { /* noop */ }
    });
    this.melodyVoices.clear();
  }

  /* ═══════════════════════════════════════════════════════
     THÉORIE MUSICALE
     ═══════════════════════════════════════════════════════ */

  /**
   * Nom français de la note (avec dièses) pour une corde + case.
   * ⚠️ On garde les dièses : DO ≠ DO#.
   */
  getDisplayNote(stringIdx: number, fret: number): string {
    const str = GUITAR_STRINGS.find(s => s.index === stringIdx);
    if (!str) return '';
    const midi = str.baseMidi + fret;
    return FRENCH_NOTE_SEQUENCE[midi % 12];
  }

  /**
   * Nom scientifique + octave (ex : "A4") pour la synthèse audio.
   */
  getToneNote(stringIdx: number, fret: number): string {
    const str = GUITAR_STRINGS.find(s => s.index === stringIdx);
    if (!str) return 'C4';
    const midi = str.baseMidi + fret;
    const octave = Math.floor(midi / 12) - 1;
    return `${CHROMATIC_NOTES[midi % 12]}${octave}`;
  }

  /* ═══════════════════════════════════════════════════════
     HELPERS PRIVÉS
     ═══════════════════════════════════════════════════════ */

  /**
   * Construit les oscillateurs harmoniques + LFO de vibrato.
   */
  private buildHarmonics(
    freq: number,
    startTime: number,
    duration: number,
    harmonics: readonly { type: OscillatorType; ratio: number; gain: number }[],
    output: AudioNode,
    withVibrato = false,
    trackMelody = false
  ): OscillatorNode[] {
    if (!this.audioCtx) return [];

    const ctx = this.audioCtx;
    const oscillators: OscillatorNode[] = [];

    for (const { type, ratio, gain } of harmonics) {
      const osc = ctx.createOscillator();
      const hGain = ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq * ratio, startTime);
      hGain.gain.value = gain;

      if (withVibrato) {
        const lfo = ctx.createOscillator();
        const lfoGain = ctx.createGain();
        lfo.frequency.value = randomFloat(4.5, 6);
        lfoGain.gain.value = freq * 0.003;
        lfo.connect(lfoGain);
        lfoGain.connect(osc.frequency);
        lfo.start(startTime);
        lfo.stop(startTime + duration);
      }

      osc.connect(hGain);
      hGain.connect(output);

      osc.start(startTime);
      osc.stop(startTime + duration + 0.05);

      oscillators.push(osc);

      if (trackMelody) {
        this.melodyVoices.add(osc);
        osc.onended = () => this.melodyVoices.delete(osc);
      }
    }

    return oscillators;
  }
}