// src/app/game/services/piano-audio.service.ts

import { Injectable, OnDestroy, inject, NgZone, signal } from '@angular/core';

import {
  INSTRUMENTS,
  InstrumentPreset,
  InstrumentType,
} from './piano-audio.presets';
export type { InstrumentType } from './piano-audio.presets';
/* ═══════════════════════════════════════════════════════════
   TYPES INTERNES
   ═══════════════════════════════════════════════════════════ */

interface AudioVoice {
  readonly gainNode: GainNode;
  readonly sources: readonly OscillatorNode[];
  readonly lfos: readonly OscillatorNode[];
  readonly noiseSource?: AudioBufferSourceNode;
  readonly release: number;
  readonly stop: (stopTime: number) => void;
}

/* ═══════════════════════════════════════════════════════════
   NOTES → MIDI / FRÉQUENCE
   ═══════════════════════════════════════════════════════════ */

const NOTE_OFFSETS: Readonly<Record<string, number>> = {
  'C': 0, 'C#': 1, 'D': 2, 'D#': 3, 'E': 4, 'F': 5,
  'F#': 6, 'G': 7, 'G#': 8, 'A': 9, 'A#': 10, 'B': 11,
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

/* ═══════════════════════════════════════════════════════════
   CONSTANTES
   ═══════════════════════════════════════════════════════════ */

/** Temps d'avance pour la programmation (évite les glitchs). */
const LOOK_AHEAD_S = 0.015;

/** Durée de la réverbe synthétique. */
const REVERB_DURATION_S = 2.4;
const REVERB_DECAY = 2.8;

/* ═══════════════════════════════════════════════════════════
   SERVICE
   ═══════════════════════════════════════════════════════════ */

@Injectable({ providedIn: 'root' })
export class PianoAudioService implements OnDestroy {

  private readonly ngZone = inject(NgZone);

  /* ─── État exposé ─── */
  private readonly _isReady = signal(true);
  readonly isReady = this._isReady.asReadonly();

  readonly loadProgress = signal(100).asReadonly();

  private readonly _isMuted = signal(false);
  readonly isMuted = this._isMuted.asReadonly();

  private readonly _instrument = signal<InstrumentType>('piano');
  readonly instrument = this._instrument.asReadonly();

  /* ─── Interne ─── */
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private highShelf: BiquadFilterNode | null = null;
  private reverbNode: ConvolverNode | null = null;
  private reverbGain: GainNode | null = null;
  private reverbSend: GainNode | null = null;

  private readonly activeVoices = new Map<string, AudioVoice>();
  private readonly sustainedNotes = new Set<string>();
  private initPromise: Promise<void> | null = null;

  /* ─── Buffer de bruit blanc (réutilisé) ─── */
  private whiteNoiseBuffer: AudioBuffer | null = null;

  /* ═══════════════════════════════════════════════════════
     INITIALISATION
     ═══════════════════════════════════════════════════════ */

  init(): Promise<void> {
    if (this.initPromise) return this.initPromise;
    this.initPromise = this.doInit();
    return this.initPromise;
  }

  private async doInit(): Promise<void> {
    if (typeof window === 'undefined') return;

    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;

    if (!Ctor) return;

    this.ctx = new Ctor({ latencyHint: 'interactive' });

    /* ─── Master gain ─── */
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.9;

    /* ─── High-shelf pour compenser la perte d'aigus de la réverbe ─── */
    this.highShelf = this.ctx.createBiquadFilter();
    this.highShelf.type = 'highshelf';
    this.highShelf.frequency.value = 4000;
    this.highShelf.gain.value = 1.5;

    this.masterGain.connect(this.highShelf);
    this.highShelf.connect(this.ctx.destination);

    /* ─── Réverbe : convolver + send ─── */
    this.reverbNode = this.ctx.createConvolver();
    this.reverbNode.buffer = this.createReverbImpulse(
      REVERB_DURATION_S,
      REVERB_DECAY
    );

    this.reverbGain = this.ctx.createGain();
    this.reverbGain.gain.value = 0.15;

    /* Send dédié (les voix y envoient une copie, pas le signal entier) */
    this.reverbSend = this.ctx.createGain();
    this.reverbSend.gain.value = 0.15;
    this.reverbSend.connect(this.reverbNode);
    this.reverbNode.connect(this.reverbGain);
    this.reverbGain.connect(this.highShelf);

    /* ─── Buffer de bruit blanc (réutilisé pour toutes les attaques) ─── */
    this.whiteNoiseBuffer = this.createWhiteNoiseBuffer(1.0);
  }

  /**
   * Réverbe à réponse impulsionnelle synthétique **réaliste** :
   * exponentielle décroissante + early reflections.
   */
  private createReverbImpulse(durationSec: number, decay: number): AudioBuffer {
    const rate = this.ctx!.sampleRate;
    const length = Math.floor(rate * durationSec);
    const impulse = this.ctx!.createBuffer(2, length, rate);

    /* Early reflections (positions en secondes) */
    const earlyReflections = [0.008, 0.017, 0.029, 0.041, 0.055];

    for (let channel = 0; channel < 2; channel++) {
      const data = impulse.getChannelData(channel);
      for (let i = 0; i < length; i++) {
        const t = i / rate;
        const env = Math.pow(1 - i / length, decay);

        /* Diffusion principale */
        let sample = (Math.random() * 2 - 1) * env * 0.5;

        /* Early reflections */
        for (const rt of earlyReflections) {
          const delaySamples = Math.floor(rt * rate);
          if (i >= delaySamples && i < delaySamples + Math.floor(rate * 0.003)) {
            sample += (Math.random() * 2 - 1) * env * 0.15;
          }
        }

        data[i] = sample;
      }
    }

    return impulse;
  }

  /** Buffer de bruit blanc réutilisable. */
  private createWhiteNoiseBuffer(durationSec: number): AudioBuffer {
    const rate = this.ctx!.sampleRate;
    const length = Math.floor(rate * durationSec);
    const buffer = this.ctx!.createBuffer(1, length, rate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  async unlock(): Promise<void> {
    if (this.ctx && this.ctx.state === 'suspended') {
      try { await this.ctx.resume(); } catch { /* ignore */ }
    }
  }

  ensureReady(): Promise<boolean> {
    return this.init().then(() => this._isReady());
  }

  /* ═══════════════════════════════════════════════════════
     CHOIX DE L'INSTRUMENT
     ═══════════════════════════════════════════════════════ */

  setInstrument(type: InstrumentType): void {
    this.allNotesOff();
    this._instrument.set(type);

    const preset = INSTRUMENTS[type];
    if (this.reverbSend && this.ctx) {
      this.reverbSend.gain.setTargetAtTime(
        (preset.reverbMix ?? 0.2) * 0.5,
        this.ctx.currentTime,
        0.05
      );
    }
  }

  /* ═══════════════════════════════════════════════════════
     JEU / MOTEUR DE SYNTHÈSE
     ═══════════════════════════════════════════════════════ */

  noteOn(note: string, velocity = 0.85): void {
    if (!this.ctx || !this.masterGain || this._isMuted()) return;

    const midi = noteToMidiFast(note);
    const preset = INSTRUMENTS[this._instrument()];

    this.ngZone.runOutsideAngular(() => {
      const existing = this.activeVoices.get(note);
      if (existing) this.stopVoice(existing);

      const voice = this.createSynthVoice(midi, velocity, preset);
      this.activeVoices.set(note, voice);
    });
  }

  private createSynthVoice(
    midi: number,
    velocity: number,
    preset: InstrumentPreset
  ): AudioVoice {
    const ctx = this.ctx!;
    const now = ctx.currentTime + LOOK_AHEAD_S;
    const baseFreq = midiToFreq(midi);
    const sources: OscillatorNode[] = [];
    const lfos: OscillatorNode[] = [];

    /* ─── 0. Voice gain + pan stéréo ─── */
    const voiceGain = ctx.createGain();
    const panner = ctx.createStereoPanner();

    /* Pan spread léger (décorrélé selon la note) */
    const panSpread = preset.panSpread ?? 0;
    panner.pan.value = (Math.random() * 2 - 1) * panSpread;

    voiceGain.connect(panner);
    panner.connect(this.masterGain!);

    /* Send réverbe (copie du signal, pas le signal entier) */
    if (this.reverbSend) {
      const send = ctx.createGain();
      send.gain.value = 1.0;
      panner.connect(send);
      send.connect(this.reverbSend);
    }

    /* ─── 1. LFO Vibrato ─── */
    let vibratoGain: GainNode | null = null;
    if (preset.vibratoHz && preset.vibratoCents) {
      const vibratoLfo = ctx.createOscillator();
      vibratoLfo.frequency.value = preset.vibratoHz;

      vibratoGain = ctx.createGain();
      vibratoGain.gain.value =
        baseFreq * (Math.pow(2, preset.vibratoCents / 1200) - 1);

      vibratoLfo.connect(vibratoGain);
      vibratoLfo.start(now);
      lfos.push(vibratoLfo);
    }

    /* ─── 2. Génération des harmoniques ─── */
    const totalHarmonicGain =
      preset.harmonics.reduce((acc, h) => acc + h.gain, 0) || 1;

    const inharmonicity = preset.inharmonicity ?? 0;

    preset.harmonics.forEach((h) => {
      const osc = ctx.createOscillator();
      osc.type = h.type;

      /* Inharmonicité du piano : les harmoniques sont légèrement désaccordés */
      const harmonicMult = h.mult * (1 + inharmonicity * h.mult * h.mult);
      const targetFreq = baseFreq * harmonicMult;
      osc.frequency.setValueAtTime(targetFreq, now);

      if (h.detune) osc.detune.setValueAtTime(h.detune, now);
      if (vibratoGain) vibratoGain.connect(osc.frequency);

      const hGain = ctx.createGain();
      hGain.gain.value = h.gain / totalHarmonicGain;

      osc.connect(hGain);
      hGain.connect(voiceGain);

      osc.start(now);
      sources.push(osc);
    });

    /* ─── 3. LFO Tremolo ─── */
    if (preset.tremoloHz && preset.tremoloDepth) {
      const tremoloLfo = ctx.createOscillator();
      tremoloLfo.frequency.value = preset.tremoloHz;

      const tremoloGain = ctx.createGain();
      tremoloGain.gain.value = preset.tremoloDepth;

      tremoloLfo.connect(tremoloGain);
      tremoloGain.connect(voiceGain.gain);

      tremoloLfo.start(now);
      lfos.push(tremoloLfo);
    }

    /* ─── 4. Enveloppe ADSR d'amplitude ─── */
    const clampedVel = Math.min(1, Math.max(0.05, velocity));
    const peakGain = clampedVel * preset.gain;
    const adsr = preset.adsr;
    const sustainLevel = Math.max(0.0001, peakGain * adsr.sustain);

    voiceGain.gain.setValueAtTime(0.0001, now);
    voiceGain.gain.linearRampToValueAtTime(peakGain, now + adsr.attack);
    voiceGain.gain.exponentialRampToValueAtTime(
      sustainLevel,
      now + adsr.attack + adsr.decay
    );

    let chainOut: AudioNode = voiceGain;

    /* ─── 5. Filtre Dynamique (velocity-tracked) ─── */
    if (preset.filter) {
      const filter = ctx.createBiquadFilter();
      filter.type = preset.filter.type;

      const baseF = preset.filter.baseFreq;
      const envAmt = preset.filter.envAmount;

      /* Modulation par la vélocité (plus fort → plus brillant) */
      const velBoost = preset.filter.velocityTracked ? (clampedVel - 0.5) * 0.6 : 0;
      const trackedBase = baseF * (1 + velBoost);
      const trackedQ = preset.filter.Q * (1 + velBoost);

      filter.Q.value = trackedQ;
      filter.frequency.setValueAtTime(trackedBase, now);

      if (envAmt > 0) {
        filter.frequency.linearRampToValueAtTime(
          trackedBase + envAmt,
          now + adsr.attack
        );
        filter.frequency.exponentialRampToValueAtTime(
          Math.max(10, trackedBase + envAmt * adsr.sustain),
          now + adsr.attack + adsr.decay
        );
      }

      chainOut.connect(filter);
      chainOut = filter;
    }

    /* ─── 6. Saturation / Distorsion ─── */
    if (preset.distortion && preset.distortion > 0) {
      const shaper = ctx.createWaveShaper();
      shaper.curve = this.makeDistortionCurve(preset.distortion * 50);
      shaper.oversample = '2x';

      chainOut.connect(shaper);
      chainOut = shaper;
    }

    /* ─── 7. Bruit d'attaque (hammer / breath / bell) ─── */
    let noiseSource: AudioBufferSourceNode | undefined;
    if (preset.noise && this.whiteNoiseBuffer) {
      noiseSource = ctx.createBufferSource();
      noiseSource.buffer = this.whiteNoiseBuffer;
      noiseSource.loop = true;

      const noiseFilter = ctx.createBiquadFilter();
      noiseFilter.type = preset.noise.filterType;
      noiseFilter.frequency.value = preset.noise.filterFreq;
      noiseFilter.Q.value = preset.noise.filterQ ?? 1.0;

      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.0001, now);
      noiseGain.gain.linearRampToValueAtTime(
        preset.noise.gain * clampedVel,
        now + 0.002
      );
      noiseGain.gain.exponentialRampToValueAtTime(
        0.0001,
        now + preset.noise.duration
      );

      noiseSource.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(chainOut);

      noiseSource.start(now);
      noiseSource.stop(now + preset.noise.duration + 0.05);
    }

    /* ─── 8. Connexion finale au master ─── */
    chainOut.connect(voiceGain);

    /* ─── Release par voix (stockée pour être indépendante du preset courant) ─── */
    const release = adsr.release;

    return {
      gainNode: voiceGain,
      sources,
      lfos,
      noiseSource,
      release,
      stop: (stopTime: number) => {
        const g = voiceGain.gain;
        g.cancelScheduledValues(stopTime);
        g.setValueAtTime(Math.max(0.0001, g.value), stopTime);
        g.exponentialRampToValueAtTime(0.0001, stopTime + release);

        const end = stopTime + release + 0.05;
        sources.forEach((s) => { try { s.stop(end); } catch { /* déjà stoppé */ } });
        lfos.forEach((l) => { try { l.stop(end); } catch { /* déjà stoppé */ } });
        noiseSource?.stop(end);
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

  private stopVoice(voice: AudioVoice): void {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    try {
      voice.stop(now);
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
      for (const [, voice] of this.activeVoices) this.stopVoice(voice);
      this.activeVoices.clear();
      this.sustainedNotes.clear();
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

  /**
   * Joue une note pendant une durée donnée, **basée sur l'horloge audio**
   * (au lieu de `setTimeout` → plus précis, pas de dérive).
   */
  playNoteFor(note: string, durationSec: number, velocity = 0.85): void {
    this.noteOn(note, velocity);

    const ctx = this.ctx;
    if (!ctx) return;

    const stopTime = ctx.currentTime + durationSec;
    this.ngZone.runOutsideAngular(() => {
      /* On programme un stop à l'instant audio exact */
      const voice = this.activeVoices.get(note);
      if (!voice) return;

      /* On utilise un microtask pour ne pas bloquer la boucle audio */
      const check = () => {
        if (!this.ctx) return;
        if (this.ctx.currentTime >= stopTime) {
          this.noteOff(note);
        } else {
          requestAnimationFrame(check);
        }
      };
      requestAnimationFrame(check);
    });
  }

  /* ═══════════════════════════════════════════════════════
     SUSTAIN / PÉDALE
     ═══════════════════════════════════════════════════════ */

  /** Active la pédale de sustain (les notes ne sont plus relâchées). */
  sustainOn(): void {
    this.sustainedNotes.clear();
  }

  /** Désactive la pédale de sustain (relâche toutes les notes tenues). */
  sustainOff(): void {
    for (const note of this.sustainedNotes) this.noteOff(note);
    this.sustainedNotes.clear();
  }

  /* ═══════════════════════════════════════════════════════
     NETTOYAGE
     ═══════════════════════════════════════════════════════ */

  ngOnDestroy(): void {
    this.allNotesOff();
    if (this.ctx && this.ctx.state !== 'closed') {
      void this.ctx.close();
    }
  }
}