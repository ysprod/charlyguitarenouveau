// src/app/academie/components/chord-of-the-day/chord-of-the-day.component.ts

import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { GUITAR_CHORDS, GuitarChord } from './chord-of-the-day/chords.data';
 

@Component({
  selector: 'app-chord-of-the-day',
  templateUrl: './chord-of-the-day.component.html',
  styleUrls: ['./chord-of-the-day.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChordOfTheDayComponent {
  
  /** Index calculé selon le jour de l'année (change automatiquement chaque jour) */
  private readonly dayOfYear = this.getDayOfYear();
  
  /** Signal de l'accord affiché (initialisé avec l'accord du jour) */
  private readonly currentIndex = signal(this.dayOfYear % GUITAR_CHORDS.length);
  
  readonly chord = computed<GuitarChord>(() => GUITAR_CHORDS[this.currentIndex()]);
  
  readonly isPlaying = signal(false);
  
  private audioContext: AudioContext | null = null;

  /* ═══════════════════════════════════════════════════════
     JOUR DE L'ANNÉE (pour la rotation quotidienne)
     ═══════════════════════════════════════════════════════ */

  private getDayOfYear(): number {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 0);
    const diff = now.getTime() - start.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }

  /* ═══════════════════════════════════════════════════════
     LECTURE DE L'ACCORD (Web Audio API)
     ═══════════════════════════════════════════════════════ */

  async playChord(): Promise<void> {
    if (this.isPlaying()) return;
    this.isPlaying.set(true);

    try {
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      const ctx = this.audioContext;
      const now = ctx.currentTime;
      const duration = 2.0;

      // Jouer chaque note de l'accord en parallèle
      this.chord().frequencies.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now);

        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.15, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + i * 0.03); // Petit décalage "strumming"
        osc.stop(now + duration);
      });

      setTimeout(() => this.isPlaying.set(false), duration * 1000);
    } catch (error) {
      console.warn('[ChordOfTheDay] Audio error:', error);
      this.isPlaying.set(false);
    }
  }

  /* ═══════════════════════════════════════════════════════
     TIRAGE ALÉATOIRE (pour le bouton "Autre accord")
     ═══════════════════════════════════════════════════════ */

  shuffleChord(): void {
    this.currentIndex.update((current) => {
      let next = Math.floor(Math.random() * GUITAR_CHORDS.length);
      while (next === current && GUITAR_CHORDS.length > 1) {
        next = Math.floor(Math.random() * GUITAR_CHORDS.length);
      }
      return next;
    });
  }

  /* ═══════════════════════════════════════════════════════
     TRACKING (pour le @for dans le template)
     ═══════════════════════════════════════════════════════ */

  trackByIndex(index: number): number {
    return index;
  }
}