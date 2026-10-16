import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';

import {
  FRETS,
  GUITAR_STRINGS,
} from '../constants/fretboard.constants';

import { GuitarAudioService } from '../services/guitar-audio.service';
import { getStringColor } from '../utils/string.utils';

/* ═══════════════════════════════════════════════════════════
   COMPOSANT
   ═══════════════════════════════════════════════════════════ */

@Component({
  selector: 'app-guitar-live',
  imports: [],
  templateUrl: './guitar-live.component.html',
  styleUrls: ['./guitar-live.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GuitarLiveComponent {
  /* ═══════════════════════════════════════════════════════
     INJECTION
     ═══════════════════════════════════════════════════════ */
  private readonly guitarAudio = inject(GuitarAudioService);
  private readonly destroyRef = inject(DestroyRef);

  /* ═══════════════════════════════════════════════════════
     CONSTANTES EXPOSÉES AU TEMPLATE
     ═══════════════════════════════════════════════════════ */

  readonly strings = GUITAR_STRINGS;
  readonly cases: readonly number[] = Array.from(
    { length: 12 },
    (_, i) => i + 1
  );
  readonly frets = FRETS;

  /* ═══════════════════════════════════════════════════════
     ÉTAT UI
     ═══════════════════════════════════════════════════════ */

  readonly activeVibratingString = signal(-1);
  readonly lastPlayedNote = signal('');

  /* ═══════════════════════════════════════════════════════
     TIMERS GÉRÉS
     ═══════════════════════════════════════════════════════ */

  private readonly timeouts = new Set<ReturnType<typeof setTimeout>>();

  /* ═══════════════════════════════════════════════════════
     ANTI-DOUBLON TACTILE
     ═══════════════════════════════════════════════════════ */

  private lastTouchTime = 0;
  private lastPressKey = '';
  private lastPressTime = 0;
  private readonly PRESS_DEBOUNCE_MS = 120;
  private readonly TOUCH_GHOST_WINDOW_MS = 500;

  /* ═══════════════════════════════════════════════════════
     HELPERS EXPOSÉS
     ═══════════════════════════════════════════════════════ */

  readonly getStringColor = getStringColor;

  /* ═══════════════════════════════════════════════════════
     CONSTRUCTEUR
     ═══════════════════════════════════════════════════════ */

  constructor() {
    this.destroyRef.onDestroy(() => {
      this.clearAllTimers();
    });
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
    this.timeouts.forEach((id) => clearTimeout(id));
    this.timeouts.clear();
  }

  /* ═══════════════════════════════════════════════════════
     INTERACTION JOUEUR
     ═══════════════════════════════════════════════════════ */

  onFretPress(stringIdx: number, caseNum: number, event: Event): void {
    const isTouch = event.type === 'touchstart';
    const now = performance.now();

    /* Ignore le "ghost click" après un touch */
    if (!isTouch && now - this.lastTouchTime < this.TOUCH_GHOST_WINDOW_MS) {
      return;
    }
    if (isTouch) this.lastTouchTime = now;

    /* Anti-répétition sur la même cellule */
    const key = `${stringIdx}-${caseNum}`;
    if (
      key === this.lastPressKey &&
      now - this.lastPressTime < this.PRESS_DEBOUNCE_MS
    ) {
      return;
    }
    this.lastPressKey = key;
    this.lastPressTime = now;

    void this.playFret(stringIdx, caseNum);
  }

  private async playFret(stringIdx: number, caseNum: number): Promise<void> {
    await this.guitarAudio.ensureReady();

    if (typeof navigator.vibrate === 'function') {
      navigator.vibrate(8);
    }

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

    this.setManagedTimeout(() => {
      /* Ne pas écraser si une nouvelle note a été jouée entre-temps */
      if (this.lastPlayedNote() === displayName) {
        this.lastPlayedNote.set('');
      }
    }, 1500);
  }

}