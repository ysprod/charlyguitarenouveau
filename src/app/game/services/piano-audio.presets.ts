// src/app/game/services/piano-audio.presets.ts

/* ═══════════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════════ */

export type InstrumentType =
  | 'piano' | 'organ' | 'strings' | 'harpsichord' | 'synth'
  | 'trumpet' | 'eguitar' | 'bells' | 'flute' | 'sax';

export interface ADSR {
  readonly attack: number;
  readonly decay: number;
  readonly sustain: number; // 0 à 1
  readonly release: number;
}

export interface FilterEnv {
  readonly type: BiquadFilterType;
  readonly baseFreq: number;
  readonly envAmount: number; // Excursion en Hz impulsée par l'attaque
  readonly Q: number;
  /** Si vrai, le cutoff et le Q sont modulés par la vélocité. */
  readonly velocityTracked?: boolean;
}

export interface HarmonicSpec {
  readonly mult: number;      // Multiplicateur de fréquence
  readonly type: OscillatorType;
  readonly gain: number;      // Amplitude relative
  readonly detune?: number;   // Désharmonie en cents
}

/** Bruit d'attaque (hammer, breath, bell…) */
export interface NoiseSpec {
  readonly duration: number;   // secondes
  readonly gain: number;       // amplitude relative
  readonly filterType: BiquadFilterType;
  readonly filterFreq: number;
  readonly filterQ?: number;
  /** Stereo spread (0 = mono, 1 = large) */
  readonly stereoSpread?: number;
}

export interface InstrumentPreset {
  readonly label: string;
  readonly gain: number;
  readonly adsr: ADSR;
  readonly harmonics: readonly HarmonicSpec[];
  readonly filter?: FilterEnv;
  readonly noise?: NoiseSpec;
  readonly vibratoHz?: number;
  readonly vibratoCents?: number;
  readonly tremoloHz?: number;
  readonly tremoloDepth?: number;
  readonly distortion?: number;
  readonly reverbMix?: number;
  /** Inharmonicité du piano (désaccorde légèrement les harmoniques) */
  readonly inharmonicity?: number;
  /** Panning stéréo (0 = centre) */
  readonly panSpread?: number;
}

/* ═══════════════════════════════════════════════════════════
   PRESETS
   ═══════════════════════════════════════════════════════════ */

export const INSTRUMENTS: Readonly<Record<InstrumentType, InstrumentPreset>> = {

  piano: {
    label: 'Piano Synthétique',
    gain: 0.9,
    adsr: { attack: 0.003, decay: 1.2, sustain: 0.05, release: 0.3 },
    harmonics: [
      { mult: 1, type: 'sine',     gain: 1.0 },
      { mult: 2, type: 'sine',     gain: 0.5, detune: 2 },
      { mult: 3, type: 'triangle', gain: 0.25, detune: -2 },
      { mult: 4, type: 'sine',     gain: 0.1 },
    ],
    filter: { type: 'lowpass', baseFreq: 1200, envAmount: 4000, Q: 1.2, velocityTracked: true },
    noise: {
      duration: 0.04,
      gain: 0.06,
      filterType: 'bandpass',
      filterFreq: 3500,
      filterQ: 1.0,
      stereoSpread: 0.3,
    },
    inharmonicity: 0.0004,
    reverbMix: 0.2,
    panSpread: 0.15,
  },

  harpsichord: {
    label: 'Clavecin',
    gain: 0.85,
    adsr: { attack: 0.001, decay: 0.4, sustain: 0.01, release: 0.1 },
    harmonics: [
      { mult: 1, type: 'sawtooth', gain: 0.8 },
      { mult: 2, type: 'square',   gain: 0.6 },
      { mult: 3, type: 'sawtooth', gain: 0.4 },
    ],
    filter: { type: 'highpass', baseFreq: 300, envAmount: 0, Q: 0.7 },
    noise: { duration: 0.02, gain: 0.08, filterType: 'highpass', filterFreq: 4000 },
    reverbMix: 0.1,
  },

  organ: {
    label: 'Orgue (Hammond)',
    gain: 0.7,
    adsr: { attack: 0.02, decay: 0.05, sustain: 0.95, release: 0.08 },
    harmonics: [
      { mult: 0.5, type: 'sine', gain: 0.8 },
      { mult: 1,   type: 'sine', gain: 1.0 },
      { mult: 1.5, type: 'sine', gain: 0.6 },
      { mult: 2,   type: 'sine', gain: 0.7 },
      { mult: 3,   type: 'sine', gain: 0.4 },
    ],
    vibratoHz: 6,
    vibratoCents: 8,
    tremoloHz: 5.5,
    tremoloDepth: 0.05,
    reverbMix: 0.3,
  },

  strings: {
    label: 'Ensemble de Cordes',
    gain: 0.6,
    adsr: { attack: 0.25, decay: 0.4, sustain: 0.85, release: 0.6 },
    harmonics: [
      { mult: 1, type: 'sawtooth', gain: 0.7, detune: -7 },
      { mult: 1, type: 'sawtooth', gain: 0.7, detune: 7 },
      { mult: 2, type: 'sawtooth', gain: 0.4, detune: -4 },
      { mult: 2, type: 'sawtooth', gain: 0.4, detune: 4 },
    ],
    filter: { type: 'lowpass', baseFreq: 1800, envAmount: 1200, Q: 1.0, velocityTracked: true },
    vibratoHz: 5,
    vibratoCents: 12,
    reverbMix: 0.5,
    panSpread: 0.4,
  },

  synth: {
    label: 'Synthé Analogique',
    gain: 0.6,
    adsr: { attack: 0.01, decay: 0.2, sustain: 0.6, release: 0.3 },
    harmonics: [
      { mult: 1,   type: 'sawtooth', gain: 1.0, detune: -10 },
      { mult: 1,   type: 'square',   gain: 0.8, detune: 10 },
      { mult: 0.5, type: 'square',   gain: 0.5 },
    ],
    filter: { type: 'lowpass', baseFreq: 800, envAmount: 3500, Q: 4.5, velocityTracked: true },
    vibratoHz: 5.5,
    vibratoCents: 15,
    reverbMix: 0.25,
  },

  trumpet: {
    label: 'Trompette',
    gain: 0.65,
    adsr: { attack: 0.04, decay: 0.1, sustain: 0.85, release: 0.12 },
    harmonics: [
      { mult: 1, type: 'sawtooth', gain: 1.0 },
      { mult: 2, type: 'sawtooth', gain: 0.6 },
      { mult: 3, type: 'square',   gain: 0.3 },
    ],
    filter: { type: 'lowpass', baseFreq: 1200, envAmount: 3000, Q: 2.0, velocityTracked: true },
    noise: { duration: 0.03, gain: 0.04, filterType: 'bandpass', filterFreq: 2500, filterQ: 2.0 },
    vibratoHz: 5.5,
    vibratoCents: 12,
    reverbMix: 0.2,
  },

  eguitar: {
    label: 'Guitare Électrique (Lead)',
    gain: 0.5,
    adsr: { attack: 0.008, decay: 0.3, sustain: 0.7, release: 0.25 },
    harmonics: [
      { mult: 1, type: 'sawtooth', gain: 1.0 },
      { mult: 2, type: 'square',   gain: 0.5, detune: 3 },
    ],
    distortion: 0.35,
    filter: { type: 'lowpass', baseFreq: 2500, envAmount: 1500, Q: 1.8, velocityTracked: true },
    vibratoHz: 5.0,
    vibratoCents: 10,
    reverbMix: 0.3,
  },

  bells: {
    label: 'Cloches Méditatives',
    gain: 0.7,
    adsr: { attack: 0.001, decay: 1.8, sustain: 0.0, release: 1.0 },
    harmonics: [
      { mult: 1.0,   type: 'sine', gain: 1.0 },
      { mult: 2.756, type: 'sine', gain: 0.6 },
      { mult: 5.404, type: 'sine', gain: 0.35 },
      { mult: 8.932, type: 'sine', gain: 0.2 },
    ],
    filter: { type: 'lowpass', baseFreq: 6000, envAmount: 0, Q: 0.7 },
    noise: {
      duration: 0.08,
      gain: 0.12,
      filterType: 'bandpass',
      filterFreq: 5000,
      filterQ: 3.0,
      stereoSpread: 0.6,
    },
    reverbMix: 0.6,
    panSpread: 0.5,
  },

  flute: {
    label: 'Flûte traversière',
    gain: 0.75,
    adsr: { attack: 0.08, decay: 0.15, sustain: 0.8, release: 0.15 },
    harmonics: [
      { mult: 1, type: 'sine',     gain: 1.0 },
      { mult: 2, type: 'sine',     gain: 0.2 },
      { mult: 3, type: 'triangle', gain: 0.08 },
    ],
    filter: { type: 'lowpass', baseFreq: 2000, envAmount: 800, Q: 1.0 },
    noise: {
      duration: 0.15,
      gain: 0.05,
      filterType: 'bandpass',
      filterFreq: 3000,
      filterQ: 2.0,
    },
    vibratoHz: 5.2,
    vibratoCents: 20,
    tremoloHz: 5.2,
    tremoloDepth: 0.15,
    reverbMix: 0.35,
  },

  sax: {
    label: 'Saxophone Alto',
    gain: 0.6,
    adsr: { attack: 0.05, decay: 0.15, sustain: 0.8, release: 0.18 },
    harmonics: [
      { mult: 1, type: 'square',   gain: 0.8 },
      { mult: 1, type: 'sawtooth', gain: 0.5 },
      { mult: 2, type: 'sawtooth', gain: 0.4 },
      { mult: 3, type: 'square',   gain: 0.2 },
    ],
    filter: { type: 'lowpass', baseFreq: 1400, envAmount: 2200, Q: 3.0, velocityTracked: true },
    noise: {
      duration: 0.05,
      gain: 0.05,
      filterType: 'bandpass',
      filterFreq: 2200,
      filterQ: 2.5,
    },
    vibratoHz: 5.5,
    vibratoCents: 16,
    reverbMix: 0.25,
  },
};