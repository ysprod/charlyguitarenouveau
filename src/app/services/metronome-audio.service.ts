import { Injectable, OnDestroy } from '@angular/core';
import { createAudioContext } from '../utils/audio.utils';

interface ScheduledClick {
  readonly time: number;      // AudioContext time
  readonly freq: number;
  readonly gain: number;
  readonly duration: number;
}

/**
 * Service audio pour le métronome.
 *
 * Utilise un « look-ahead scheduler » : les clicks sont planifiés
 * à l'avance dans le buffer audio (25 ms), garantissant une précision
 * sub-milliseconde même sous forte charge CPU.
 *
 * ⚠️ Ne PAS utiliser `setInterval` pour déclencher les sons du métronome :
 * `setInterval` dérive (5-50 ms/min) et rend le timing imprécis.
 */
@Injectable({ providedIn: 'root' })
export class MetronomeAudioService implements OnDestroy {

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
   * Retourne l'heure actuelle du contexte audio (en secondes).
   * C'est la référence temporelle pour tous les calculs.
   */
  get currentTime(): number {
    return this.audioCtx?.currentTime ?? 0;
  }

  /**
   * Planifie un click à un instant précis.
   * @param delaySeconds Délai à partir de MAINTENANT (en secondes)
   */
  scheduleClick(
    freq: number,
    delaySeconds: number,
    gainValue = 0.15,
    duration = 0.04
  ): void {
    if (!this.audioCtx) return;

    const when = this.audioCtx.currentTime + delaySeconds;
    this.playClickAt(freq, when, gainValue, duration);
  }

  /**
   * Joue un click immédiatement (pour feedback utilisateur).
   */
  playClickImmediate(freq: number, gainValue = 0.15, duration = 0.04): void {
    if (!this.audioCtx) return;
    this.playClickAt(freq, this.audioCtx.currentTime, gainValue, duration);
  }

  /**
   * Planifie une séquence complète de clicks.
   * Retourne un tableau d'objets `{ time, freq }` pour permettre
   * au composant de synchroniser l'UI (dots, labels…).
   */
  scheduleSequence(
    totalClicks: number,
    intervalSeconds: number,
    freqResolver: (index: number) => number
  ): ReadonlyArray<ScheduledClick> {
    if (!this.audioCtx) return [];

    const sequence: ScheduledClick[] = [];
    const startTime = this.audioCtx.currentTime + 0.05; // petit décalage de sécurité

    for (let i = 0; i < totalClicks; i++) {
      const time = startTime + i * intervalSeconds;
      const freq = freqResolver(i);
      const gain = freq === 1320 ? 0.2 : 0.12;

      this.playClickAt(freq, time, gain, 0.04);

      sequence.push({ time, freq, gain, duration: 0.04 });
    }

    return sequence;
  }

  /* ═══════════════════════════════════════════════════════
     HELPERS PRIVÉS
     ═══════════════════════════════════════════════════════ */

  private playClickAt(
    freq: number,
    when: number,
    gainValue: number,
    duration: number
  ): void {
    if (!this.audioCtx) return;

    try {
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, when);

      gain.gain.setValueAtTime(gainValue, when);
      gain.gain.exponentialRampToValueAtTime(0.001, when + duration);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start(when);
      osc.stop(when + duration + 0.02);
    } catch {
      /* silencieux : AudioContext fermé ou erreur */
    }
  }
}