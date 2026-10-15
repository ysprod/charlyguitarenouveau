// src/app/game/cardgame/rdialog/rdialog.component.ts

import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterNextRender,
  inject,
  viewChild,
} from '@angular/core';

import {
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';

/* ═════════════════════════════════════════════════════════════════════
   TYPES
   ═════════════════════════════════════════════════════════════════════ */

/**
 * Valeur de sortie de la modale :
 *  - 'replay' : le joueur veut rejouer sur la même grille
 *  - 'menu'   : le joueur veut retourner au menu des jeux
 */
export type RdialogResult = 'replay' | 'menu';

/* ═════════════════════════════════════════════════════════════════════
   COMPOSANT
   ═════════════════════════════════════════════════════════════════════ */

@Component({
  selector: 'app-rdialog',
  imports: [MatDialogModule],
  templateUrl: './rdialog.component.html',
  styleUrls: ['./rdialog.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RdialogComponent {

  /* ─── Injection ─── */
  private readonly dialogRef =
    inject<MatDialogRef<RdialogComponent, RdialogResult>>(MatDialogRef);

  /* ─── ViewChild (signal-based) ─── */
  private readonly replayButton =
    viewChild<ElementRef<HTMLButtonElement>>('replayBtn');

  /* ═══════════════════════════════════════════════════════
     CONSTRUCTEUR — afterNextRender (focus initial)
     ═══════════════════════════════════════════════════════ */

  constructor() {
    /* Focus initial sur le bouton principal (action par défaut) */
    afterNextRender(() => {
      this.replayButton()?.nativeElement.focus();
    });
  }

  /* ═══════════════════════════════════════════════════════
     ACTIONS
     ═══════════════════════════════════════════════════════ */

  /** Ferme la modale avec la valeur 'replay'. */
  replay(): void {
    this.dialogRef.close('replay');
  }

  /** Ferme la modale avec la valeur 'menu'. */
  goToMenu(): void {
    this.dialogRef.close('menu');
  }
}