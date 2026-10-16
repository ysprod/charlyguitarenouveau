// src/app/game/gamecard/gamecard.component.ts

import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';

import { CardData } from '../CardData';

/* ═══════════════════════════════════════════════════════════
   COMPOSANT
   ═══════════════════════════════════════════════════════════ */

@Component({
  selector: 'app-gamecard',
  imports: [],
  templateUrl: './gamecard.component.html',
  styleUrls: ['./gamecard.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GamecardComponent {

  /* ═══════════════════════════════════════════════════════
     ENTRÉES / SORTIES
     ═══════════════════════════════════════════════════════ */

  /** Données de la carte (obligatoire). */
  readonly data = input.required<CardData>();

  /** Événement émis quand la carte est cliquée. */
  readonly cardClicked = output<void>();

  /* ═══════════════════════════════════════════════════════
     COMPUTED
     ═══════════════════════════════════════════════════════ */

  /** Vrai si la carte doit être visible (non trouvée). */
  readonly isVisible = computed(() => this.data().state !== 'matched');

  /** Vrai si la carte est retournée. */
  readonly isFlipped = computed(() => this.data().state === 'flipped');

  /** Vrai si la carte a été trouvée (matched). */
  readonly isMatched = computed(() => this.data().state === 'matched');

  /** Label ARIA dynamique selon l'état. */
  readonly ariaLabel = computed(() => {
    switch (this.data().state) {
      case 'default': return 'Carte face cachée — appuyez pour retourner';
      case 'flipped': return 'Carte révélée';
      case 'matched': return 'Carte trouvée';
    }
  });
}