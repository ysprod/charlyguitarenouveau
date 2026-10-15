import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnDestroy,
  OnInit,
  inject,
  signal
} from '@angular/core';

import { Router } from '@angular/router';

import {
  FRETS,
  GUITAR_STRINGS,
  STRING_COLORS
} from '../constants/fretboard.constants';

import { GuitarAudioService } from '../services/guitar-audio.service';

@Component({
  selector: 'app-guitar-live',
  standalone: true,
  imports: [],
  templateUrl: './guitar-live.component.html',
  styleUrls: ['./guitar-live.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class GuitarLiveComponent implements OnInit, OnDestroy {

  /* ─── Injection ─── */
  private readonly router = inject(Router);
  private readonly guitarAudio = inject(GuitarAudioService);
  private readonly destroyRef = inject(DestroyRef);

  /* ─── Constantes exposées au template ─── */
  readonly strings = GUITAR_STRINGS;
  readonly cases = Array.from({ length: 12 }, (_, i) => i + 1);
  readonly frets = FRETS;

  /* ─── État UI ─── */
  readonly activeVibratingString = signal(-1);
  readonly lastPlayedNote = signal('');

  /* ─── Timers gérés ─── */
  private readonly timeouts = new Set<ReturnType<typeof setTimeout>>();
  private lastPlayedNoteTimeout?: ReturnType<typeof setTimeout>;

  /* ─── Anti-doublon tactile ─── */
  private lastTouchTime = 0;
  private lastPressKey = '';
  private lastPressTime = 0;
  private readonly PRESS_DEBOUNCE_MS = 120;
  private readonly TOUCH_GHOST_WINDOW_MS = 500;

  /* ─── Cycle de vie ─── */
  ngOnInit(): void {
    this.destroyRef.onDestroy(() => {
      this.clearAllTimers();
    });
  }

  ngOnDestroy(): void {
    this.clearAllTimers();
  }

  /* ═══════════════════════════════════════════════════════
     TIMERS
     ═══════════════════════════════════════════════════════ */

  private setManagedTimeout(fn: () => void, delayMs: number): void {
    const id = setTimeout(() => {
      this.timeouts.delete(id);
      fn();
    }, delayMs);
    this.timeouts.add(id);
  }

  private clearAllTimers(): void {
    this.timeouts.forEach(id => clearTimeout(id));
    this.timeouts.clear();
    if (this.lastPlayedNoteTimeout) {
      clearTimeout(this.lastPlayedNoteTimeout);
      this.lastPlayedNoteTimeout = undefined;
    }
  }

  /* ═══════════════════════════════════════════════════════
     INTERACTION JOUEUR
     ═══════════════════════════════════════════════════════ */

  onFretPress(stringIdx: number, caseNum: number, event: Event): void {
    const isTouch = event.type === 'touchstart';
    const now = performance.now();

    /* Ignore le "ghost click" après un touch */
    if (!isTouch && (now - this.lastTouchTime) < this.TOUCH_GHOST_WINDOW_MS) {
      return;
    }
    if (isTouch) this.lastTouchTime = now;

    /* Anti-répétition sur la même cellule */
    const key = `${stringIdx}-${caseNum}`;
    if (key === this.lastPressKey && (now - this.lastPressTime) < this.PRESS_DEBOUNCE_MS) {
      return;
    }
    this.lastPressKey = key;
    this.lastPressTime = now;

    void this.playFret(stringIdx, caseNum);
  }

  private async playFret(stringIdx: number, caseNum: number): Promise<void> {
    await this.guitarAudio.ensureReady();

    if (navigator.vibrate) navigator.vibrate(8);

    const toneNote = this.guitarAudio.getToneNote(stringIdx, caseNum);
    this.guitarAudio.playNote(stringIdx, toneNote, 3.5, 0.85);

    /* Vibration visuelle */
    this.activeVibratingString.set(stringIdx);
    this.setManagedTimeout(() => {
      if (this.activeVibratingString() === stringIdx) {
        this.activeVibratingString.set(-1);
      }
    }, 450);

    /* Affichage de la note jouée */
    const displayName = this.guitarAudio.getDisplayNote(stringIdx, caseNum);
    this.lastPlayedNote.set(displayName);

    if (this.lastPlayedNoteTimeout) {
      clearTimeout(this.lastPlayedNoteTimeout);
    }
    this.lastPlayedNoteTimeout = setTimeout(() => {
      this.lastPlayedNote.set('');
      this.lastPlayedNoteTimeout = undefined;
    }, 1500);
  }

  /* ═══════════════════════════════════════════════════════
     HELPERS EXPOSÉS AU TEMPLATE
     ═══════════════════════════════════════════════════════ */

  getStringColor(stringIdx: number): string {
     return STRING_COLORS[stringIdx - 1] ?? '#D4AF37';
  }

  /* ═══════════════════════════════════════════════════════
     NAVIGATION
     ═══════════════════════════════════════════════════════ */

  goBack(): void {
    void this.router.navigate(['/play']);
  }
}