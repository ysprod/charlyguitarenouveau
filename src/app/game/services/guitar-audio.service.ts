import { Injectable, OnDestroy } from '@angular/core';
import {
  CHROMATIC_NOTES,
  FRENCH_NOTE_SEQUENCE,
  GUITAR_STRINGS
} from '../constants/fretboard.constants';
import { PlayingVoice } from '../models/fretboard.model';
import {
  createAudioContext,
  noteToFrequency,
  resumeAudioContext
} from '../utils/audio.utils';
import { randomFloat } from '../utils/random.utils';

/** Configuration acoustique globale. */
interface GuitarProfile {
  /** Durée de décroissance "naturelle" de la note (secondes). */
  duration: number;
  /** Volume de l'attaque du médiator (0-1). */
  pickVolume: number;
  /** Fréquence de coupure du corps (Hz) au moment de l'attaque. */
  bodyCutoff: number;
  /** Fréquence de coupure finale du corps (Hz). */
  bodyCutoffEnd: number;
  /** Q des résonances de caisse. */
  bodyQ: number;
  /** Fréquences des résonances de caisse (Hz). */
  bodyResonances: number[];
}

const DEFAULT_PROFILE: GuitarProfile = {
  duration: 4.5,
  pickVolume: 0.16,
  bodyCutoff: 3800,
  bodyCutoffEnd: 750,
  bodyQ: 2.2,
  bodyResonances: [85, 185, 340, 750, 1450], // Modes de Helmholtz et caisse bois réalistes
};

/** Harmoniques avec décroissance propre. */
interface Harmonic {
  type: OscillatorType;
  ratio: number;
  gain: number;
  /** Durée propre (les harmoniques aiguës meurent avant). */
  decayRatio: number;
}

/** Harmoniques affinées pour une guitare acoustique folk (cordes acier). */
const ACOUSTIC_HARMONICS: readonly Harmonic[] = [
  { type: 'triangle', ratio: 1,    gain: 0.65, decayRatio: 1.0   }, // fondamentale riche
  { type: 'sine',     ratio: 2,    gain: 0.32, decayRatio: 0.82  }, // octave
  { type: 'sine',     ratio: 3.02, gain: 0.22, decayRatio: 0.60  }, // quinte + inharmonicité prononcée
  { type: 'sine',     ratio: 4.04, gain: 0.14, decayRatio: 0.45  }, // double octave
  { type: 'sine',     ratio: 5.07, gain: 0.08, decayRatio: 0.30  }, // tierce majeure
  { type: 'sine',     ratio: 6.10, gain: 0.05, decayRatio: 0.20  }, // harmonique aigüe bois
  { type: 'sine',     ratio: 8.16, gain: 0.025, decayRatio: 0.12 }, // brillance métallique du médiator
];

@Injectable({ providedIn: 'root' })
export class GuitarAudioService implements OnDestroy {

  private audioCtx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private reverb: ConvolverNode | null = null;
  private reverbGain: GainNode | null = null;

  private readonly activeVoices = new Map<number, PlayingVoice>();
  private readonly melodyVoices = new Set<OscillatorNode>();

  constructor() {
    this.audioCtx = createAudioContext();
    if (this.audioCtx) {
      this.buildMasterChain();
    }
  }

  ngOnDestroy(): void {
    this.stopAllVoices();
    void this.audioCtx?.close().catch(() => undefined);
    this.audioCtx = null;
  }

  /* ═══════════════════════════════════════════════════════
     MASTER CHAIN (compression + reverb, une seule fois)
     ═══════════════════════════════════════════════════════ */

  private buildMasterChain(): void {
    if (!this.audioCtx) return;
    const ctx = this.audioCtx;

    this.masterGain = ctx.createGain();
    this.masterGain.gain.value = 0.85;

    // Compression chaleureuse pour coller le son et donner du sustain
    this.compressor = ctx.createDynamicsCompressor();
    this.compressor.threshold.value = -20;
    this.compressor.knee.value = 18;
    this.compressor.ratio.value = 4;
    this.compressor.attack.value = 0.002;
    this.compressor.release.value = 0.3;

    // Reverb acoustique (simulation d'une caisse/pièce en bois)
    this.reverb = ctx.createConvolver();
    this.reverb.buffer = this.buildImpulseResponse(1.6, 2.5);
    this.reverbGain = ctx.createGain();
    this.reverbGain.gain.value = 0.15; // subtil et naturel

    this.compressor.connect(this.masterGain);
    this.compressor.connect(this.reverb);
    this.reverb.connect(this.reverbGain);
    this.reverbGain.connect(this.masterGain);
    this.masterGain.connect(ctx.destination);
  }

  /** Génère une impulsion de reverb acoustique (décroissance exponentielle douce). */
  private buildImpulseResponse(duration: number, decay: number): AudioBuffer {
    const ctx = this.audioCtx!;
    const rate = ctx.sampleRate;
    const length = Math.floor(rate * duration);
    const impulse = ctx.createBuffer(2, length, rate);

    for (let channel = 0; channel < 2; channel++) {
      const data = impulse.getChannelData(channel);
      for (let i = 0; i < length; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
      }
    }
    return impulse;
  }

  private get output(): AudioNode | null {
    return this.compressor;
  }

  /* ═══════════════════════════════════════════════════════
     CONTEXTE AUDIO
     ═══════════════════════════════════════════════════════ */

  async ensureReady(): Promise<boolean> {
    return resumeAudioContext(this.audioCtx ?? undefined);
  }

  get isRunning(): boolean {
    return this.audioCtx?.state === 'running';
  }

  get isAvailable(): boolean {
    return this.audioCtx !== null;
  }

  /* ═══════════════════════════════════════════════════════
     SYNTHÈSE — NOTE ACOUSTIQUE
     ═══════════════════════════════════════════════════════ */

  playNote(
    stringIdx: number,
    toneNote: string,
    duration = DEFAULT_PROFILE.duration,
    volume = 0.85,
    delaySeconds = 0
  ): void {
    if (!this.audioCtx || !this.output) return;

    this.dampString(stringIdx);

    const ctx = this.audioCtx;
    const freq = noteToFrequency(toneNote);
    const startTime = ctx.currentTime + delaySeconds;

    const velocity = Math.max(0.05, Math.min(1, volume));
    const noteDuration = duration * (0.75 + velocity * 0.45);
    const brightness = 0.5 + velocity * 0.5;

    const isBassString = stringIdx >= 4;
    const stringThickness = 1 + stringIdx * 0.12;

    /* ── Chaîne de filtres du corps et du médiator ── */
    const gainNode = ctx.createGain();
    const bodyFilter = ctx.createBiquadFilter();
    const pickFilter = ctx.createBiquadFilter();

    // Filtre principal de la table d'harmonie (fermeture progressive du son)
    bodyFilter.type = 'lowpass';
    bodyFilter.frequency.setValueAtTime(
      Math.min(DEFAULT_PROFILE.bodyCutoff * brightness, freq * 14),
      startTime
    );
    bodyFilter.frequency.exponentialRampToValueAtTime(
      Math.max(DEFAULT_PROFILE.bodyCutoffEnd, freq * 2.0),
      startTime + noteDuration * 0.65
    );
    bodyFilter.Q.value = DEFAULT_PROFILE.bodyQ;

    // Attaque du médiator sur les hautes fréquences
    pickFilter.type = 'peaking';
    pickFilter.frequency.value = Math.min(freq * 5 * brightness, 6500);
    pickFilter.Q.value = 1.0;
    pickFilter.gain.value = 6 * brightness;

    /* ── Résonances de caisse acoustique en parallèle ── */
    const bodyResonators = DEFAULT_PROFILE.bodyResonances
      .filter(f => f < freq * 12)
      .map(f => {
        const bq = ctx.createBiquadFilter();
        bq.type = 'peaking';
        bq.frequency.value = f;
        bq.Q.value = 5.5; // Résonance plus marquée (effet caisse de résonance en bois)
        bq.gain.value = 4.5 * stringThickness;
        pickFilter.connect(bq);
        return bq;
      });

    /* ── Enveloppe ADSR (attaque ultra-courte et naturelle) ── */
    const attack = isBassString ? 0.005 : 0.002;
    const decay = 0.08;
    const sustainLevel = 0.35;

    gainNode.gain.setValueAtTime(0.0001, startTime);
    gainNode.gain.linearRampToValueAtTime(velocity, startTime + attack);
    gainNode.gain.exponentialRampToValueAtTime(
      velocity * sustainLevel,
      startTime + attack + decay
    );
    gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + noteDuration);

    /* ── Harmoniques, vibrato et inharmonicité ── */
    const oscillators = this.buildHarmonics(
      freq,
      startTime,
      noteDuration,
      ACOUSTIC_HARMONICS,
      pickFilter,
      { withVibrato: true, detune: true, stringIdx }
    );

    /* ── Bruit de médiator (claquement de corde) ── */
    this.addPickNoise(startTime, freq, velocity, pickFilter);

    /* ── Connexions ── */
    pickFilter.connect(bodyFilter);
    bodyResonators.forEach(bq => bq.connect(bodyFilter));
    bodyFilter.connect(gainNode);
    gainNode.connect(this.output);

    this.activeVoices.set(stringIdx, {
      source: oscillators[0],
      gainNode,
      stringIdx,
      startTime,
    });
  }

  /* ═══════════════════════════════════════════════════════
     SYNTHÈSE — MÉLODIE
     ═══════════════════════════════════════════════════════ */

  playMelodyNote(
    stringIdx: number,
    toneNote: string,
    duration: number,
    volume: number,
    delaySeconds: number
  ): void {
    if (!this.audioCtx || this.audioCtx.state !== 'running' || !this.output) return;

    const ctx = this.audioCtx;
    const freq = noteToFrequency(toneNote);
    const startTime = ctx.currentTime + delaySeconds;

    const gainNode = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(Math.min(freq * 5.5, 5500), startTime);
    filter.frequency.exponentialRampToValueAtTime(freq * 2.0, startTime + duration * 0.6);
    filter.Q.value = 1.2;

    gainNode.gain.setValueAtTime(0.0001, startTime);
    gainNode.gain.linearRampToValueAtTime(volume, startTime + 0.004);
    gainNode.gain.exponentialRampToValueAtTime(volume * 0.35, startTime + 0.12);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    this.buildHarmonics(
      freq,
      startTime,
      duration,
      ACOUSTIC_HARMONICS,
      filter,
      { withVibrato: true, detune: true, stringIdx, trackMelody: true }
    );

    this.addPickNoise(startTime, freq, volume * 0.8, filter);

    filter.connect(gainNode);
    gainNode.connect(this.output);
  }

  /* ═══════════════════════════════════════════════════════
     DAMPING
     ═══════════════════════════════════════════════════════ */

  dampString(stringIdx: number, dampingDuration = 0.03): void {
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

  getDisplayNote(stringIdx: number, fret: number): string {
    const str = GUITAR_STRINGS.find(s => s.index === stringIdx);
    if (!str) return '';
    const midi = str.baseMidi + fret;
    return FRENCH_NOTE_SEQUENCE[midi % 12];
  }

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

  private buildHarmonics(
    freq: number,
    startTime: number,
    duration: number,
    harmonics: readonly Harmonic[],
    output: AudioNode,
    options: {
      withVibrato?: boolean;
      detune?: boolean;
      stringIdx?: number;
      trackMelody?: boolean;
    } = {}
  ): OscillatorNode[] {
    if (!this.audioCtx) return [];
    const ctx = this.audioCtx;
    const { withVibrato = false, detune = false, stringIdx = 0, trackMelody = false } = options;
    const oscillators: OscillatorNode[] = [];

    const vibratoRate = withVibrato ? 4.5 + (5 - stringIdx) * 0.2 : 0;
    const vibratoDepth = withVibrato ? freq * (0.0018 + stringIdx * 0.0003) : 0;

    for (const { type, ratio, gain, decayRatio } of harmonics) {
      const osc = ctx.createOscillator();
      const hGain = ctx.createGain();

      osc.type = type;

      // Inharmonicité physique des cordes tendues (plus marquée sur les graves)
      const inharmonicity = 1 + (ratio - 1) * 0.0014 * (stringIdx + 1);
      const baseFreq = freq * ratio * inharmonicity;

      const detuneCents = detune ? randomFloat(-1.2, 1.2) * (ratio * 0.4) : 0;

      osc.frequency.setValueAtTime(baseFreq, startTime);
      osc.detune.setValueAtTime(detuneCents, startTime);
      hGain.gain.value = gain;

      if (withVibrato && vibratoDepth > 0) {
        const lfo = ctx.createOscillator();
        const lfoGain = ctx.createGain();
        lfo.frequency.value = vibratoRate + randomFloat(-0.2, 0.2);
        lfoGain.gain.value = vibratoDepth;
        lfo.connect(lfoGain);
        lfoGain.connect(osc.frequency);
        lfo.start(startTime);
        lfo.stop(startTime + duration * decayRatio + 0.1);
      }

      hGain.gain.setValueAtTime(gain, startTime);
      hGain.gain.exponentialRampToValueAtTime(
        0.0001,
        startTime + duration * decayRatio
      );

      osc.connect(hGain);
      hGain.connect(output);

      osc.start(startTime);
      osc.stop(startTime + duration * decayRatio + 0.1);

      oscillators.push(osc);

      if (trackMelody) {
        this.melodyVoices.add(osc);
        osc.onended = () => this.melodyVoices.delete(osc);
      }
    }

    return oscillators;
  }

  private addPickNoise(
    startTime: number,
    freq: number,
    velocity: number,
    output: AudioNode
  ): void {
    if (!this.audioCtx) return;
    const ctx = this.audioCtx;
    const noiseDuration = 0.02; // Attaque sèche et courte

    const bufferSize = Math.floor(ctx.sampleRate * noiseDuration);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1);
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.value = Math.min(freq * 7, 6000);
    noiseFilter.Q.value = 1.5;

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(
      DEFAULT_PROFILE.pickVolume * velocity,
      startTime
    );
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, startTime + noiseDuration);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(output);

    noise.start(startTime);
    noise.stop(startTime + noiseDuration);
  }
}