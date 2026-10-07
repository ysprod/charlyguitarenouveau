import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-violet',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './violet.component.html',
  styleUrls: ['./violet.component.scss']
})
export class VioletComponent implements OnInit {

  /* ═══════════════════════════════════════════════════════
     DIMENSION VIOLETTE — 7ème Dimension
     Couleur : Violet | Note : Si | Sage : Offosi
     Temple : Accomplissement | Totem : Dragon Violet | Esprit : L'Hologramme Organique
     ═══════════════════════════════════════════════════════ */
  readonly dimension = {
    numero: 7,
    nom: 'JAUNE',
    couleur: '#7c3aed',
    couleurSecondaire: '#a78bfa',
    note: 'Si',
    sage: 'Offosi',
    sageTitre: 'Gardien de la Destinée',
    temple: 'Temple de l\'Accomplissement',
    totem: 'Dragon Jaune',
    totemEmoji: '🐉',
    instrument: 'Harpe sacrée',
    instrumentEmoji: '🎻',
    esprit: 'L\'Hologramme Organique',
    espritEmoji: '💠',
    don: 'L\'accomplissement',
    epreuve: 'Es-tu prêt à accepter ta destinée ?',
    question: 'Embrasser pleinement son don',
    citation: '« On n\'y entre ni par la force, ni par le savoir. On y entre lorsque toutes les dimensions vibrent enfin en harmonie. »'
  };

  constructor() { }

  ngOnInit(): void { }
}