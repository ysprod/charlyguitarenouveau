import {
  ChangeDetectionStrategy,
  Component,
  input,
  output
} from '@angular/core';

import { DuoEndGameSummary } from '../../models/duo-end-game-summary.model';

@Component({
  selector: 'app-duo-end-game-dialog',
  standalone: true,
  templateUrl: './duo-end-game-dialog.component.html',
  styleUrls: ['./duo-end-game-dialog.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DuoEndGameDialogComponent {
  readonly summary = input.required<DuoEndGameSummary>();

  readonly replay = output<void>();
  readonly nextLevel = output<void>();
  readonly previousLevel = output<void>();
  readonly backToMenu = output<void>();

  icon(): string {
    switch (this.summary().result) {
      case 'player1': return '🏆';
      case 'player2': return '🎉';
      case 'draw':    return '⚖️';
    }
  }

  title(): string {
    switch (this.summary().result) {
      case 'player1': return 'VICTOIRE JOUEUR 1';
      case 'player2': return 'VICTOIRE JOUEUR 2';
      case 'draw':    return 'MATCH NUL';
    }
  }

  message(): string {
    const s = this.summary();
    switch (s.result) {
      case 'player1':
        return `Le Joueur 1 remporte le duel (${s.player1Score} – ${s.player2Score}) !`;
      case 'player2':
        return `Le Joueur 2 remporte le duel (${s.player2Score} – ${s.player1Score}) !`;
      case 'draw':
        return `Égalité parfaite (${s.player1Score} – ${s.player2Score}). Qui prendra l'avantage ?`;
    }
  }
}