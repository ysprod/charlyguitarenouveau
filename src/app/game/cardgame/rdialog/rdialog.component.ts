import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  viewChild,
} from '@angular/core';

import {
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';

/**
 * Valeur de sortie de la modale :
 *  - 'replay' : le joueur veut rejouer sur la même grille
 *  - 'menu'   : le joueur veut retourner au menu des jeux
 */
export type RdialogResult = 'replay' | 'menu';

@Component({
  selector: 'app-rdialog',
  standalone: true,
  imports: [MatDialogModule],
  templateUrl: './rdialog.component.html',
  styleUrls: ['./rdialog.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RdialogComponent implements AfterViewInit {

  /** Référence à la modale pour fermer avec un résultat typé. */
  private readonly dialogRef =
    inject<MatDialogRef<RdialogComponent, RdialogResult>>(MatDialogRef);

  /** Référence au bouton "Rejouer" pour le focus initial garanti. */
  private readonly replayButton =
    viewChild<ElementRef<HTMLButtonElement>>('replayBtn');

  ngAfterViewInit(): void {
    /* Focus initial sur le bouton principal (action par défaut). */
    this.replayButton()?.nativeElement.focus();
  }

  /** Ferme la modale avec la valeur 'replay'. */
  replay(): void {
    this.dialogRef.close('replay');
  }

  /** Ferme la modale avec la valeur 'menu'. */
  goToMenu(): void {
    this.dialogRef.close('menu');
  }
}