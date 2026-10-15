import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';

export interface Divinite {
  nom: string;
  titre: string;
  territoire: string;
  symbole: string;
  couleur: string;
  description: string;
  gardien?: string;
}

export interface Passage {
  de: string;
  vers: string;
  gardien: string;
  couleur: string;
}

@Component({
  selector: 'app-noir',
     standalone: true,
     imports: [
    CommonModule
  ],
  templateUrl: './noir.component.html',
  styleUrls: ['./noir.component.scss']
})
export class NoirComponent implements OnInit {

  divinites: Divinite[] = [
    {
      nom: 'ZEUS',
      titre: 'Le Dieu des Éclairs',
      territoire: 'Le Ciel Noir',
      symbole: '⚡',
      couleur: '#fbbf24',
      description: 'Maître de la foudre, il règne sur les cieux ténébreux. Ses éclairs sont la seule lumière qui ose percer l\'obscurité éternelle.'
    },
    {
      nom: 'POSÉIDON',
      titre: 'Le Dieu des Eaux',
      territoire: 'L\'Océan',
      symbole: '🔱',
      couleur: '#06b6d4',
      description: 'Seigneur des abysses, il contrôle les mers noires. Il est le Gardien du passage entre le Noir et le Vert.',
      gardien: 'Noir ↔ Vert'
    },
    {
      nom: 'BAFUM',
      titre: 'Le Dieu des Enfers',
      territoire: 'Les Volcans',
      symbole: '🔥',
      couleur: '#dc2626',
      description: 'Souverain des flammes infernales, il règne sur les volcans en éruption. Son univers est le repère du Monde Rouge.',
      gardien: 'Noir ↔ Rouge'
    },
    {
      nom: 'LÉVIATHAN',
      titre: 'Le Serpent Pétrifiant',
      territoire: 'Le Sable de la Plage',
      symbole: '🐍',
      couleur: '#a855f7',
      description: 'Gros serpent aux yeux rouges, il pétrifie ses victimes rien qu\'en les regardant. Il est le Gardien du passage entre le Noir et le Blanc.',
      gardien: 'Noir ↔ Blanc'
    }
  ];

  passages: Passage[] = [
    { de: 'Noir', vers: 'Vert', gardien: 'Poséidon', couleur: '#22c55e' },
    { de: 'Noir', vers: 'Blanc', gardien: 'Léviathan', couleur: '#f8fafc' },
    { de: 'Noir', vers: 'Rouge', gardien: 'Bafum', couleur: '#dc2626' },
    { de: 'Noir', vers: 'Bleu', gardien: 'Zeus', couleur: '#3b82f6' }
  ];

  constructor() { }

  ngOnInit(): void { }

}
