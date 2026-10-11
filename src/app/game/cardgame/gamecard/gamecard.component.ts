import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';

import {
  animate,
  keyframes,
  state,
  style,
  transition,
  trigger,
} from '@angular/animations';

import { CardData } from '../CardData';

/* ═════════════════════════════════════════════════════════════════════
   COMPOSANT
   ═════════════════════════════════════════════════════════════════════ */

@Component({
  selector: 'app-gamecard',
  standalone: true,
  imports: [],
  templateUrl: './gamecard.component.html',
  styleUrls: ['./gamecard.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [
    trigger('cardFlip', [
      /* ─── États ─── */
      state(
        'default',
        style({
          transform: 'perspective(1200px) rotateY(0deg)',
          opacity: 1,
        })
      ),
      state(
        'flipped',
        style({
          transform: 'perspective(1200px) rotateY(180deg)',
          opacity: 1,
        })
      ),
      state(
        'matched',
        style({
          transform: 'perspective(1200px) rotateY(180deg) scale(0)',
          opacity: 0,
          pointerEvents: 'none',
        })
      ),

      /* ─── Retournement fluide ─── */
      transition(
        'default <=> flipped',
        animate('500ms cubic-bezier(0.34, 1.56, 0.64, 1)')
      ),

      /* ─── Animation « WAHOU » de la paire trouvée ─── */
      transition(
        '* => matched',
        animate(
          '800ms cubic-bezier(0.4, 0, 0.2, 1)',
          keyframes([
            style({
              transform: 'perspective(1200px) rotateY(180deg) scale(1)',
              filter: 'brightness(1)',
              offset: 0,
            }),
            style({
              transform: 'perspective(1200px) rotateY(200deg) scale(1.2)',
              filter: 'brightness(1.5) drop-shadow(0 0 30px #b45309)',
              offset: 0.4,
            }),
            style({
              transform: 'perspective(1200px) rotateY(280deg) scale(0.95)',
              filter: 'brightness(1.3)',
              offset: 0.7,
            }),
            style({
              transform: 'perspective(1200px) rotateY(360deg) scale(0)',
              opacity: 0,
              offset: 1,
            }),
          ])
        )
      ),
    ]),
  ],
})
export class GamecardComponent {

  /** Données de la carte (obligatoire). */
  readonly data = input.required<CardData>();

  /** Événement émis quand la carte est cliquée. */
  readonly cardClicked = output<void>();

  /** Retourne vrai si la carte doit être visible. */
  isVisible(): boolean {
    const state = this.data().state;
    return state === 'flipped' || state === 'default';
  }

  /** Déclenche le clic (utilisé par le template). */
  onClick(): void {
    this.cardClicked.emit();
  }
}