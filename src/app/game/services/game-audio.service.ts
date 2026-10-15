import { Injectable, OnDestroy } from '@angular/core';
import { createAudioContext } from '../utils/audio.utils';
 
 
export type UiSoundType =
  | 'hit'
  | 'miss'
  | 'error'      // ← alias de 'miss' (pour compatibilité)
  | 'win'
  | 'over'
  | 'gameover'   // ← alias de 'over'
  | 'click'
  | 'tick'
  | 'start'      // ← nouveau
  | 'perfect'    // ← nouveau
  | 'starpower'; // ← nouveau

interface ToneOptions {
  readonly freq: number;
  readonly endFreq?: number;
  readonly type: OscillatorType;
  readonly duration: number;
  readonly volume: number;
  readonly delay?: number;
}

/**
 * Service audio générique pour les jeux.
 * Fournit un ensemble de sons UI (hit, miss, win, over, click, tick)
 * et permet de jouer des séquences de tons personnalisées.
 */
@Injectable({ providedIn: 'root' })
export class GameAudioService implements OnDestroy {

  private readonly audioCtx: AudioContext | null;

  constructor() {
    this.audioCtx = createAudioContext();
  }

  ngOnDestroy(): void {
    void this.audioCtx?.close().catch(() => undefined);
  }

  /** Reprend le contexte s'il est suspendu. */
  async ensureReady(): Promise<void> {
    if (this.audioCtx?.state === 'suspended') {
      try {
        await this.audioCtx.resume();
      } catch {
        /* silencieux */
      }
    }
  }

  /**
   * Joue un son UI standard.
   */
  play(type: UiSoundType): void {
    if (!this.audioCtx) return;
    if (this.audioCtx.state === 'suspended') {
      void this.audioCtx.resume().catch(() => undefined);
    }

    switch (type) {
      case 'hit':
        this.playSequence([
          { freq: 523.25, type: 'triangle', duration: 0.25, volume: 0.18 },
          { freq: 659.25, type: 'triangle', duration: 0.25, volume: 0.18, delay: 0.06 },
          { freq: 783.99, type: 'triangle', duration: 0.25, volume: 0.18, delay: 0.12 }
        ]);
        break;

      case 'miss':
        this.playTone({ freq: 180, endFreq: 90, type: 'sawtooth', duration: 0.25, volume: 0.2 });
        break;

      case 'win':
        this.playSequence([
          { freq: 523.25,  type: 'sine', duration: 0.4, volume: 0.2 },
          { freq: 659.25,  type: 'sine', duration: 0.4, volume: 0.2, delay: 0.1 },
          { freq: 783.99,  type: 'sine', duration: 0.4, volume: 0.2, delay: 0.2 },
          { freq: 1046.50, type: 'sine', duration: 0.4, volume: 0.2, delay: 0.3 }
        ]);
        break;

      case 'over':
        this.playSequence([
          { freq: 392,    type: 'sawtooth', duration: 0.3, volume: 0.2 },
          { freq: 349.23, type: 'sawtooth', duration: 0.3, volume: 0.2, delay: 0.15 },
          { freq: 329.63, type: 'sawtooth', duration: 0.3, volume: 0.2, delay: 0.30 },
          { freq: 261.63, type: 'sawtooth', duration: 0.3, volume: 0.2, delay: 0.45 }
        ]);
        break;

      case 'click':
        this.playTone({ freq: 880, type: 'sine', duration: 0.08, volume: 0.1 });
        break;

      case 'tick':
        this.playTone({ freq: 1200, type: 'square', duration: 0.05, volume: 0.05 });
        break;
    }
  }

  /**
   * Joue un ton personnalisé.
   */
  playTone(opts: ToneOptions): void {
    if (!this.audioCtx) return;

    const now = this.audioCtx.currentTime + (opts.delay ?? 0);
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();

    osc.type = opts.type;
    osc.frequency.setValueAtTime(opts.freq, now);

    if (opts.endFreq !== undefined) {
      osc.frequency.linearRampToValueAtTime(opts.endFreq, now + opts.duration);
    }

    gain.gain.setValueAtTime(opts.volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + opts.duration);

    osc.connect(gain);
    gain.connect(this.audioCtx.destination);
    osc.start(now);
    osc.stop(now + opts.duration + 0.05);
  }

  /**
   * Joue une séquence de tons (avec délais échelonnés).
   */
  private playSequence(tones: readonly ToneOptions[]): void {
    tones.forEach(t => this.playTone(t));
  }
}