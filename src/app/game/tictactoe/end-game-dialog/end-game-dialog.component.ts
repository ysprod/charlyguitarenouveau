import {
  ChangeDetectionStrategy,
  Component,
  input,
  output
} from '@angular/core';

import { EndGameSummary } from '../../models/end-game-summary.model';

@Component({
  selector: 'app-end-game-dialog',
  standalone: true,
  templateUrl: './end-game-dialog.component.html',
  styleUrls: ['./end-game-dialog.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EndGameDialogComponent {
  readonly summary = input.required<EndGameSummary>();

  readonly replay = output<void>();
  readonly nextLevel = output<void>();
  readonly previousLevel = output<void>();
  readonly backToMenu = output<void>();

  icon(): string {
    switch (this.summary().result) {
      case 'victory': return '🏆';
      case 'defeat':  return '⚖️';
      case 'draw':    return '⚖️';
    }
  }

  title(): string {
    switch (this.summary().result) {
      case 'victory': return 'VICTOIRE';
      case 'defeat':  return 'DÉFAITE';
      case 'draw':    return 'MATCH NUL';
    }
  }

  message(): string {
    switch (this.summary().result) {
      case 'victory': return 'Vous remportez le duel contre Lykö le Sage !';
      case 'defeat':  return 'Lykö le Sage a été plus malin… Retente ta chance !';
      case 'draw':    return 'Égalité parfaite. Qui prendra l’avantage ?';
    }
  }
}