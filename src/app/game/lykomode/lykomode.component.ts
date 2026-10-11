import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  inject,
  signal,
} from '@angular/core';

import { Router } from '@angular/router';

/* ═════════════════════════════════════════════════════════════════════
   COMPOSANT
   ═════════════════════════════════════════════════════════════════════ */

@Component({
  selector: 'app-lykomode',
  standalone: true,
  imports: [],
  templateUrl: './lykomode.component.html',
  styleUrls: ['./lykomode.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LykomodeComponent implements OnInit, OnDestroy {

  private readonly router = inject(Router);

  /** Contrôle l'animation d'apparition de la carte. */
  readonly showDialog = signal(false);

  private showDialogTimeoutId: ReturnType<typeof setTimeout> | null = null;

  /* ═══════════════════════════════════════════════════════════════════
     LIFECYCLE
     ═══════════════════════════════════════════════════════════════════ */

  ngOnInit(): void {
    /* Petite animation d'entrée (déclenche les transitions CSS). */
    this.showDialogTimeoutId = setTimeout(() => {
      this.showDialog.set(true);
      this.showDialogTimeoutId = null;
    }, 50);
  }

  ngOnDestroy(): void {
    if (this.showDialogTimeoutId !== null) {
      clearTimeout(this.showDialogTimeoutId);
      this.showDialogTimeoutId = null;
    }
  }

  /* ═══════════════════════════════════════════════════════════════════
     ACTIONS
     ═══════════════════════════════════════════════════════════════════ */

  /** Défier l'IA (OFFOWA). */
  playAgainstAI(): void {
    void this.router.navigate(['/tictac']);
  }

  /** Jouer avec un ami en local. */
  playWithFriend(): void {
    void this.router.navigate(['/tictacduo']);
  }

  /** Retour au menu des jeux. */
  backToMenu(): void {
    void this.router.navigate(['/play']);
  }
}