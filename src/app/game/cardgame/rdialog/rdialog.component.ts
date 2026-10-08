import { Component, OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';

/**
 * Valeur de sortie de la modale :
 *  - 'replay' : le joueur veut rejouer sur la même grille
 *  - 'menu'   : le joueur veut retourner au menu des jeux
 */
export type RdialogResult = 'replay' | 'menu';

@Component({
  selector: 'app-rdialog',
  standalone: true,
  imports: [
    MatDialogModule,
    MatButtonModule
  ],
  templateUrl: './rdialog.component.html',
  styleUrls: ['./rdialog.component.css']
})
export class RdialogComponent implements OnInit {

  constructor() { }

  ngOnInit(): void {
  }
}