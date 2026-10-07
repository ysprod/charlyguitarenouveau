import { Injectable, inject } from '@angular/core';
import { AUDIO_CONTEXT_CTOR } from './audio.tokens';
 
export type SfxName =
  | 'click'
  | 'hover'
  | 'success'
  | 'error'
  | 'levelUp'
  | 'hint'
  | 'start'
  | 'victory'
  | 'micOn'
  | 'micOff'
  | 'typing';

@Injectable({ providedIn: 'root' })
export class AudioFxService {
  private readonly Ctor = inject(AUDIO_CONTEXT_CTOR);
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private enabled = true;

  private ensureCtx(): AudioContext | null {
    if (!this.Ctor) return null;
    if (!this.ctx) {
      this.ctx = new this.Ctor();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.35;
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
    return this.ctx;
  }

  setEnabled(on: boolean): void {
    this.enabled = on;
    if (this.masterGain) this.masterGain.gain.value = on ? 0.35 : 0;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  play(name: SfxName): void {
    if (!this.enabled) return;
    const ctx = this.ensureCtx();
    if (!ctx || !this.masterGain) return;

    switch (name) {
      case 'click': this.click(ctx); break;
      case 'hover': this.hover(ctx); break;
      case 'success': this.success(ctx); break;
      case 'error': this.error(ctx); break;
      case 'levelUp': this.levelUp(ctx); break;
      case 'hint': this.hint(ctx); break;
      case 'start': this.start(ctx); break;
      case 'victory': this.victory(ctx); break;
      case 'micOn': this.micOn(ctx); break;
      case 'micOff': this.micOff(ctx); break;
      case 'typing': this.typing(ctx); break;
    }
  }

  // ── Générateurs de sons ──

  private tone(
    ctx: AudioContext,
    freq: number,
    start: number,
    duration: number,
    type: OscillatorType = 'sine',
    vol = 0.5
  ): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
    gain.gain.setValueAtTime(0, ctx.currentTime + start);
    gain.gain.linearRampToValueAtTime(vol, ctx.currentTime + start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + duration);
    osc.connect(gain).connect(this.masterGain!);
    osc.start(ctx.currentTime + start);
    osc.stop(ctx.currentTime + start + duration + 0.05);
  }

  private click(ctx: AudioContext): void {
    this.tone(ctx, 880, 0, 0.06, 'square', 0.25);
    this.tone(ctx, 1320, 0.02, 0.05, 'triangle', 0.15);
  }

  private hover(ctx: AudioContext): void {
    this.tone(ctx, 1200, 0, 0.03, 'sine', 0.08);
  }

  private success(ctx: AudioContext): void {
    // Arpège Do-Mi-Sol-Do
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((f, i) => {
      this.tone(ctx, f, i * 0.08, 0.25, 'triangle', 0.4);
      this.tone(ctx, f * 2, i * 0.08, 0.15, 'sine', 0.15);
    });
  }

  private error(ctx: AudioContext): void {
    this.tone(ctx, 220, 0, 0.15, 'sawtooth', 0.3);
    this.tone(ctx, 165, 0.1, 0.2, 'sawtooth', 0.3);
  }

  private levelUp(ctx: AudioContext): void {
    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5];
    notes.forEach((f, i) => {
      this.tone(ctx, f, i * 0.07, 0.35, 'triangle', 0.4);
      this.tone(ctx, f * 1.5, i * 0.07, 0.2, 'sine', 0.2);
    });
  }

  private hint(ctx: AudioContext): void {
    this.tone(ctx, 987.77, 0, 0.08, 'sine', 0.3);
    this.tone(ctx, 1318.5, 0.08, 0.15, 'sine', 0.3);
  }

  private start(ctx: AudioContext): void {
    const notes = [392, 523.25, 659.25];
    notes.forEach((f, i) => this.tone(ctx, f, i * 0.06, 0.2, 'triangle', 0.35));
  }

  private victory(ctx: AudioContext): void {
    // Fanfare épique
    const fanfare = [
      [523.25, 0], [523.25, 0.15], [523.25, 0.3], [659.25, 0.45],
      [783.99, 0.65], [1046.5, 0.9], [1318.5, 1.1]
    ] as const;
    fanfare.forEach(([f, t]) => {
      this.tone(ctx, f, t, 0.3, 'triangle', 0.4);
      this.tone(ctx, f * 2, t, 0.2, 'sine', 0.15);
    });
    // Basse
    [261.63, 329.63, 392].forEach((f, i) =>
      this.tone(ctx, f, 0.9 + i * 0.15, 0.5, 'sawtooth', 0.2)
    );
  }

  private micOn(ctx: AudioContext): void {
    this.tone(ctx, 660, 0, 0.05, 'sine', 0.2);
    this.tone(ctx, 990, 0.05, 0.1, 'sine', 0.25);
  }

  private micOff(ctx: AudioContext): void {
    this.tone(ctx, 660, 0, 0.05, 'sine', 0.2);
    this.tone(ctx, 440, 0.05, 0.1, 'sine', 0.25);
  }

  private typing(ctx: AudioContext): void {
    this.tone(ctx, 1600 + Math.random() * 400, 0, 0.02, 'square', 0.05);
  }
}