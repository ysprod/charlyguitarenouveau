import { Injectable, signal, OnDestroy, inject, NgZone } from '@angular/core';

export type InstrumentType =
  | 'piano' | 'organ' | 'strings' | 'harpsichord' | 'synth'
  | 'trumpet' | 'eguitar' | 'bells' | 'flute' | 'sax';

interface ADSR {
  attack: number;
  decay: number;
  sustain: number; // 0 à 1
  release: number;
}

interface FilterEnv {
  type: BiquadFilterType;
  baseFreq: number;
  envAmount: number; // Excursion en Hz impulsée par l'attaque
  Q: number;
}

interface HarmonicSpec {
  mult: number;      // Multiplicateur de fréquence (1 = fondamentale, 2 = 1ère harmonique, etc.)
  type: OscillatorType;
  gain: number;      // Amplitude relative
  detune?: number;   // Désharmonie en cents
}

interface InstrumentPreset {
  label: string;
  gain: number;
  adsr: ADSR;
  harmonics: HarmonicSpec[];
  filter?: FilterEnv;
  vibratoHz?: number;
  vibratoCents?: number;
  tremoloHz?: number;
  tremoloDepth?: number;
  distortion?: number;
  reverbMix?: number;
}

interface AudioVoice {
  gainNode: GainNode;
  sources: OscillatorNode[];
  lfos: OscillatorNode[];
  stop: (stopTime: number, release: number) => void;
}

const INSTRUMENTS: Record<InstrumentType, InstrumentPreset> = {
  piano: {
    label: 'Piano Synthétique',
    gain: 0.9,
    adsr: { attack: 0.003, decay: 1.2, sustain: 0.05, release: 0.3 },
    harmonics: [
      { mult: 1, type: 'sine', gain: 1.0 },
      { mult: 2, type: 'sine', gain: 0.5, detune: 2 },
      { mult: 3, type: 'triangle', gain: 0.25, detune: -2 },
      { mult: 4, type: 'sine', gain: 0.1 },
    ],
    filter: { type: 'lowpass', baseFreq: 1200, envAmount: 4000, Q: 1.2 },
    reverbMix: 0.2,
  },
  harpsichord: {
    label: 'Clavecin',
    gain: 0.85,
    adsr: { attack: 0.001, decay: 0.4, sustain: 0.01, release: 0.1 },
    harmonics: [
      { mult: 1, type: 'sawtooth', gain: 0.8 },
      { mult: 2, type: 'square', gain: 0.6 },
      { mult: 3, type: 'sawtooth', gain: 0.4 },
    ],
    filter: { type: 'highpass', baseFreq: 300, envAmount: 0, Q: 0.7 },
    reverbMix: 0.1,
  },
  organ: {
    label: 'Orgue (Hammond)',
    gain: 0.7,
    adsr: { attack: 0.02, decay: 0.05, sustain: 0.95, release: 0.08 },
    harmonics: [
      { mult: 0.5, type: 'sine', gain: 0.8 }, // Sub-octave (Tiré 16')
      { mult: 1, type: 'sine', gain: 1.0 },   // Fondamentale (Tiré 8')
      { mult: 1.5, type: 'sine', gain: 0.6 }, // Quinte (Tiré 5 1/3')
      { mult: 2, type: 'sine', gain: 0.7 },   // Octave (Tiré 4')
      { mult: 3, type: 'sine', gain: 0.4 },   // Douzième (Tiré 2 2/3')
    ],
    vibratoHz: 6,
    vibratoCents: 8,
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
    filter: { type: 'lowpass', baseFreq: 1800, envAmount: 1200, Q: 1.0 },
    vibratoHz: 5,
    vibratoCents: 12,
    reverbMix: 0.5,
  },
  synth: {
    label: 'Synthé Analogique',
    gain: 0.6,
    adsr: { attack: 0.01, decay: 0.2, sustain: 0.6, release: 0.3 },
    harmonics: [
      { mult: 1, type: 'sawtooth', gain: 1.0, detune: -10 },
      { mult: 1, type: 'square', gain: 0.8, detune: 10 },
      { mult: 0.5, type: 'square', gain: 0.5 }, // Sub-oscillator
    ],
    filter: { type: 'lowpass', baseFreq: 800, envAmount: 3500, Q: 4.5 },
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
      { mult: 3, type: 'square', gain: 0.3 },
    ],
    filter: { type: 'lowpass', baseFreq: 1200, envAmount: 3000, Q: 2.0 },
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
      { mult: 2, type: 'square', gain: 0.5, detune: 3 },
    ],
    distortion: 0.35,
    filter: { type: 'lowpass', baseFreq: 2500, envAmount: 1500, Q: 1.8 },
    vibratoHz: 5.0,
    vibratoCents: 10,
    reverbMix: 0.3,
  },
  bells: {
    label: 'Cloches Méditatives',
    gain: 0.7,
    adsr: { attack: 0.001, decay: 1.8, sustain: 0.0, release: 1.0 },
    harmonics: [
      { mult: 1.0, type: 'sine', gain: 1.0 },
      { mult: 2.756, type: 'sine', gain: 0.6 },  // Ratio inharmonique
      { mult: 5.404, type: 'sine', gain: 0.35 }, // Ratio inharmonique
      { mult: 8.932, type: 'sine', gain: 0.2 },  // Ratio inharmonique
    ],
    filter: { type: 'lowpass', baseFreq: 6000, envAmount: 0, Q: 0.7 },
    reverbMix: 0.6,
  },
  flute: {
    label: 'Flûte traversière',
    gain: 0.75,
    adsr: { attack: 0.08, decay: 0.15, sustain: 0.8, release: 0.15 },
    harmonics: [
      { mult: 1, type: 'sine', gain: 1.0 },
      { mult: 2, type: 'sine', gain: 0.2 },
      { mult: 3, type: 'triangle', gain: 0.08 },
    ],
    filter: { type: 'lowpass', baseFreq: 2000, envAmount: 800, Q: 1.0 },
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
      { mult: 1, type: 'square', gain: 0.8 },
      { mult: 1, type: 'sawtooth', gain: 0.5 },
      { mult: 2, type: 'sawtooth', gain: 0.4 },
      { mult: 3, type: 'square', gain: 0.2 },
    ],
    filter: { type: 'lowpass', baseFreq: 1400, envAmount: 2200, Q: 3.0 },
    vibratoHz: 5.5,
    vibratoCents: 16,
    reverbMix: 0.25,
  },
};

const NOTE_OFFSETS: Record<string, number> = {
  'C': 0, 'C#': 1, 'D': 2, 'D#': 3, 'E': 4, 'F': 5,
  'F#': 6, 'G': 7, 'G#': 8, 'A': 9, 'A#': 10, 'B': 11
};

const NOTE_REGEX = /^([A-G]#?)(-?\d+)$/;
const NOTE_MIDI_CACHE = new Map<string, number>();

function noteToMidiFast(note: string): number {
  const cached = NOTE_MIDI_CACHE.get(note);
  if (cached !== undefined) return cached;

  const match = NOTE_REGEX.exec(note);
  if (!match) {
    NOTE_MIDI_CACHE.set(note, 60);
    return 60;
  }

  const [, pitch, octStr] = match;
  const oct = parseInt(octStr, 10);
  const pitchOffset = NOTE_OFFSETS[pitch] ?? 0;
  const midi = Math.min(127, Math.max(0, (oct + 1) * 12 + pitchOffset));

  NOTE_MIDI_CACHE.set(note, midi);
  return midi;
}

function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

@Injectable({ providedIn: 'root' })
export class PianoAudioService implements OnDestroy {
  private readonly ngZone = inject(NgZone);

  // ── ÉTAT EXPOSÉ ─────────────────────────────────────────
  private readonly _isReady = signal(true);
  readonly isReady = this._isReady.asReadonly();

  readonly loadProgress = signal(100).asReadonly();

  private readonly _isMuted = signal(false);
  readonly isMuted = this._isMuted.asReadonly();

  private readonly _instrument = signal<InstrumentType>('piano');
  readonly instrument = this._instrument.asReadonly();

  // ── INTERNES ────────────────────────────────────────────
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private reverbNode: ConvolverNode | null = null;
  private reverbGain: GainNode | null = null;

  private readonly activeVoices = new Map<string, AudioVoice>();
  private initPromise: Promise<void> | null = null;

  // ═══════════════════════════════════════════════════════
  // INITIALISATION
  // ═══════════════════════════════════════════════════════
  init(): Promise<void> {
    if (this.initPromise) return this.initPromise;
    this.initPromise = this.doInit();
    return this.initPromise;
  }

  private async doInit(): Promise<void> {
    const Ctor = window.AudioContext
      ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

    if (!Ctor) return;

    this.ctx = new Ctor({ latencyHint: 'interactive' });
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.9;
    this.masterGain.connect(this.ctx.destination);

    // Réverbe à réponse impulsionnelle synthétique
    this.reverbNode = this.ctx.createConvolver();
    this.reverbNode.buffer = this.createReverbImpulse(2.0, 2.5);
    this.reverbGain = this.ctx.createGain();
    this.reverbGain.gain.value = 0.15;

    this.masterGain.connect(this.reverbNode);
    this.reverbNode.connect(this.reverbGain);
    this.reverbGain.connect(this.ctx.destination);
  }

  private createReverbImpulse(durationSec: number, decay: number): AudioBuffer {
    const rate = this.ctx!.sampleRate;
    const length = rate * durationSec;
    const impulse = this.ctx!.createBuffer(2, length, rate);
    for (let channel = 0; channel < 2; channel++) {
      const data = impulse.getChannelData(channel);
      for (let i = 0; i < length; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
      }
    }
    return impulse;
  }

  async unlock(): Promise<void> {
    if (this.ctx && this.ctx.state === 'suspended') {
      try { await this.ctx.resume(); } catch { /* ignore */ }
    }
  }

  // ═══════════════════════════════════════════════════════
  // CHOIX DE L'INSTRUMENT
  // ═══════════════════════════════════════════════════════
  setInstrument(type: InstrumentType): void {
    this.allNotesOff();
    this._instrument.set(type);
    const preset = INSTRUMENTS[type];
    if (this.reverbGain && this.ctx) {
      this.reverbGain.gain.setTargetAtTime(
        (preset.reverbMix ?? 0.2) * 0.4,
        this.ctx.currentTime,
        0.05
      );
    }
  }

  // ═══════════════════════════════════════════════════════
  // JEU / MOTEUR DE SYNTHÈSE
  // ═══════════════════════════════════════════════════════
  noteOn(note: string, velocity = 0.85): void {
    if (!this.ctx || !this.masterGain || this._isMuted()) return;

    const midi = noteToMidiFast(note);
    const preset = INSTRUMENTS[this._instrument()];

    this.ngZone.runOutsideAngular(() => {
      const existing = this.activeVoices.get(note);
      if (existing) this.stopVoice(existing, 0.02);

      const voice = this.createSynthVoice(midi, velocity, preset);
      this.activeVoices.set(note, voice);
    });
  }

  private createSynthVoice(midi: number, velocity: number, preset: InstrumentPreset): AudioVoice {
    const now = this.ctx!.currentTime;
    const baseFreq = midiToFreq(midi);
    const sources: OscillatorNode[] = [];
    const lfos: OscillatorNode[] = [];

    const voiceGain = this.ctx!.createGain();

    // 1. LFO Vibrato (Modulation de fréquence)
    let vibratoGain: GainNode | null = null;
    if (preset.vibratoHz && preset.vibratoCents) {
      const vibratoLfo = this.ctx!.createOscillator();
      vibratoLfo.frequency.value = preset.vibratoHz;

      vibratoGain = this.ctx!.createGain();
      vibratoGain.gain.value = baseFreq * (Math.pow(2, preset.vibratoCents / 1200) - 1);

      vibratoLfo.connect(vibratoGain);
      vibratoLfo.start(now);
      lfos.push(vibratoLfo);
    }

    // 2. Génération des harmoniques
    const totalHarmonicGain = preset.harmonics.reduce((acc, h) => acc + h.gain, 0) || 1;

    preset.harmonics.forEach((h) => {
      const osc = this.ctx!.createOscillator();
      osc.type = h.type;

      const targetFreq = baseFreq * h.mult;
      osc.frequency.setValueAtTime(targetFreq, now);

      if (h.detune) {
        osc.detune.setValueAtTime(h.detune, now);
      }

      if (vibratoGain) {
        vibratoGain.connect(osc.frequency);
      }

      const hGain = this.ctx!.createGain();
      hGain.gain.value = h.gain / totalHarmonicGain;

      osc.connect(hGain);
      hGain.connect(voiceGain);

      osc.start(now);
      sources.push(osc);
    });

    // 3. LFO Tremolo (Modulation d'amplitude)
    if (preset.tremoloHz && preset.tremoloDepth) {
      const tremoloLfo = this.ctx!.createOscillator();
      tremoloLfo.frequency.value = preset.tremoloHz;

      const tremoloGain = this.ctx!.createGain();
      tremoloGain.gain.value = preset.tremoloDepth;

      tremoloLfo.connect(tremoloGain);
      tremoloGain.connect(voiceGain.gain);

      tremoloLfo.start(now);
      lfos.push(tremoloLfo);
    }

    // 4. Enveloppe ADSR d'amplitude
    const peakGain = Math.min(1, Math.max(0.05, velocity)) * preset.gain;
    const adsr = preset.adsr;
    const sustainLevel = Math.max(0.0001, peakGain * adsr.sustain);

    voiceGain.gain.setValueAtTime(0.0001, now);
    voiceGain.gain.linearRampToValueAtTime(peakGain, now + adsr.attack);
    voiceGain.gain.exponentialRampToValueAtTime(sustainLevel, now + adsr.attack + adsr.decay);

    let chainOut: AudioNode = voiceGain;

    // 5. Filtre Dynamique (Enveloppe de filtre)
    if (preset.filter) {
      const filter = this.ctx!.createBiquadFilter();
      filter.type = preset.filter.type;
      filter.Q.value = preset.filter.Q;

      const baseF = preset.filter.baseFreq;
      const envAmt = preset.filter.envAmount;

      filter.frequency.setValueAtTime(baseF, now);
      if (envAmt > 0) {
        filter.frequency.linearRampToValueAtTime(baseF + envAmt, now + adsr.attack);
        filter.frequency.exponentialRampToValueAtTime(
          Math.max(10, baseF + envAmt * adsr.sustain),
          now + adsr.attack + adsr.decay
        );
      }

      chainOut.connect(filter);
      chainOut = filter;
    }

    // 6. Saturation / Distorsion
    if (preset.distortion && preset.distortion > 0) {
      const shaper = this.ctx!.createWaveShaper();
      shaper.curve = this.makeDistortionCurve(preset.distortion * 50);
      shaper.oversample = '2x';

      chainOut.connect(shaper);
      chainOut = shaper;
    }

    chainOut.connect(this.masterGain!);

    return {
      gainNode: voiceGain,
      sources,
      lfos,
      stop: (stopTime, release) => {
        voiceGain.gain.cancelScheduledValues(stopTime);
        voiceGain.gain.setValueAtTime(Math.max(0.0001, voiceGain.gain.value), stopTime);
        voiceGain.gain.exponentialRampToValueAtTime(0.0001, stopTime + release);

        sources.forEach((s) => s.stop(stopTime + release + 0.02));
        lfos.forEach((l) => l.stop(stopTime + release + 0.02));
      },
    };
  }

  private makeDistortionCurve(amount: number): Float32Array<ArrayBuffer> {
    const k = amount;
    const n = 44100;
    const buffer = new ArrayBuffer(n * 4);
    const curve = new Float32Array(buffer);
    const deg = Math.PI / 180;
    for (let i = 0; i < n; ++i) {
      const x = (i * 2) / n - 1;
      curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
    }
    return curve;
  }

  private stopVoice(voice: AudioVoice, overrideRelease?: number): void {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const preset = INSTRUMENTS[this._instrument()];
    const release = overrideRelease ?? preset.adsr.release;
    try {
      voice.stop(now, release);
    } catch { /* ignoré */ }
  }

  noteOff(note: string): void {
    const voice = this.activeVoices.get(note);
    if (!voice) return;
    this.activeVoices.delete(note);
    this.ngZone.runOutsideAngular(() => this.stopVoice(voice));
  }

  allNotesOff(): void {
    this.ngZone.runOutsideAngular(() => {
      for (const [, voice] of this.activeVoices) {
        this.stopVoice(voice, 0.05);
      }
      this.activeVoices.clear();
    });
  }

  setMuted(muted: boolean): void {
    this._isMuted.set(muted);
    if (muted) this.allNotesOff();
  }

  toggleMute(): void {
    this.setMuted(!this._isMuted());
  }

  setVolume(v: number): void {
    if (!this.masterGain || !this.ctx) return;
    const val = Math.min(1, Math.max(0, v));
    this.masterGain.gain.setTargetAtTime(val, this.ctx.currentTime, 0.01);
  }

  getCurrentTime(): number {
    return this.ctx?.currentTime ?? 0;
  }

  playNoteFor(note: string, durationSec: number, velocity = 0.85): void {
    this.noteOn(note, velocity);
    this.ngZone.runOutsideAngular(() => {
      setTimeout(() => this.noteOff(note), durationSec * 1000);
    });
  }

  ngOnDestroy(): void {
    this.allNotesOff();
    if (this.ctx && this.ctx.state !== 'closed') {
      void this.ctx.close();
    }
  }
}