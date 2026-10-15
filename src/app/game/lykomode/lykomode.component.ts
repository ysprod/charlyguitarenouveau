// src/app/game/lykomode/lykomode.component.ts

import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  inject,
  signal,
  viewChild,
} from '@angular/core';

import { Router } from '@angular/router';

import {
  ROUTE_BACK_TO_MENU,
  ROUTE_LOCAL_DUO,
  ROUTE_VS_AI,
} from '../constants/lykomode.constants';

/* ═══════════════════════════════════════════════════════════
   COMPOSANT
   ═══════════════════════════════════════════════════════════ */

@Component({
  selector: 'app-lykomode',
  imports: [],
  templateUrl: './lykomode.component.html',
  styleUrls: ['./lykomode.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LykomodeComponent {

  /* ═══════════════════════════════════════════════════════
     INJECTION
     ═══════════════════════════════════════════════════════ */

  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  /* ═══════════════════════════════════════════════════════
     RÉFÉRENCE DOM (focus initial)
     ═══════════════════════════════════════════════════════ */

  private readonly primaryBtn =
    viewChild<ElementRef<HTMLButtonElement>>('primaryBtn');

  /* ═══════════════════════════════════════════════════════
     ÉTAT
     ═══════════════════════════════════════════════════════ */

  /** Contrôle l'animation d'apparition de la carte. */
  readonly showDialog = signal(false);

  /* ═══════════════════════════════════════════════════════
     CONSTRUCTEUR
     ═══════════════════════════════════════════════════════ */

  constructor() {
    afterNextRender(() => {
      /* Déclenche l'animation d'entrée */
      this.showDialog.set(true);

      /* Focus initial sur le bouton principal (accessibilité) */
      this.primaryBtn()?.nativeElement.focus();
    });

    /* Nettoyage : rien à nettoyer explicitement, mais le DestroyRef
       garantit que les callbacks sont bien liés au cycle de vie. */
    this.destroyRef.onDestroy(() => {
      /* placeholder pour futurs cleanups */
    });
  }

  /* ═══════════════════════════════════════════════════════
     ACTIONS
     ═══════════════════════════════════════════════════════ */

  /** Défier l'IA (OFFOWA). */
  playAgainstAI(): void {
    void this.router.navigate([ROUTE_VS_AI]);
  }

  /** Jouer avec un ami en local. */
  playWithFriend(): void {
    void this.router.navigate([ROUTE_LOCAL_DUO]);
  }

  /** Retour au menu des jeux. */
  backToMenu(): void {
    void this.router.navigate([ROUTE_BACK_TO_MENU]);
  }
}