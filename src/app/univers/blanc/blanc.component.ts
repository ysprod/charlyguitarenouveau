import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';

export interface Caracteristique {
  titre: string;
  icone: string;
  description: string;
  couleur: string;
}

export interface Trait {
  nom: string;
  icone: string;
  description: string;
  type: 'force' | 'faiblesse';
}

@Component({
  selector: 'app-blanc',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './blanc.component.html',
  styleUrls: ['./blanc.component.scss']
})
export class BlancComponent implements OnInit {


  caracteristiques: Caracteristique[] = [
    {
      titre: 'LE DÉSERT INFINI',
      icone: '🏜️',
      description: 'Un désert où l\'on est toujours seul à marcher. Aucune compagnie, seulement le silence du sable.',
      couleur: '#fbbf24'
    },
    {
      titre: 'LE SOLEIL IMPÉTUEUX',
      icone: '☀️',
      description: 'Un soleil qui brille sans jamais se coucher sur la moitié du territoire.',
      couleur: '#f59e0b'
    },
    {
      titre: 'LA LUNE ÉTERNELLE',
      icone: '🌙',
      description: 'Une lune qui ne disparaît jamais et qui siège sur l\'autre partie du même univers, à l\'infini.',
      couleur: '#94a3b8'
    },
    {
      titre: 'LA QUÊTE DE SAVOIR',
      icone: '📖',
      description: 'Le monde de la réalité psychologique d\'un être humain en quête de connaissance.',
      couleur: '#e2e8f0'
    }
  ];

  forces: Trait[] = [
    {
      nom: 'FORCE COLOSSALE',
      icone: '💪',
      description: 'Le Charly Blanc peut soulever jusqu\'à 1 tonne d\'obstacles devant lui.',
      type: 'force'
    },
    {
      nom: 'SYMBOLE DE PAIX',
      icone: '🕊️',
      description: 'Il incarne la paix absolue, un être de sérénité et de contemplation.',
      type: 'force'
    },
    {
      nom: 'ÉTAT BRUT',
      icone: '⚡',
      description: 'Il est à l\'état pur, sans artifice, dans toute sa puissance originelle.',
      type: 'force'
    }
  ];

  faiblesses: Trait[] = [
    {
      nom: 'CORDE FRAGILE',
      icone: '🎸',
      description: 'Il casse toujours les cordes de sa guitare et perd toute sa force jusqu\'à en mourir.',
      type: 'faiblesse'
    },
    {
      nom: 'LENTEUR',
      icone: '🐢',
      description: 'Il prend beaucoup de temps pour agir, préférant la contemplation à l\'action.',
      type: 'faiblesse'
    },
    {
      nom: 'TROP JOUEUR',
      icone: '🎮',
      description: 'Il aime trop s\'amuser et casse sa guitare sans faire exprès, ce qui handicape ses missions.',
      type: 'faiblesse'
    }
  ];

  correspondances = [
    { monde: 'BLEU', couleur: '#3b82f6', repere: 'Univers de Zeus' },
    { monde: 'ROUGE', couleur: '#dc2626', repere: 'Univers de Bafum' },
    { monde: 'VERT', couleur: '#22c55e', repere: 'Univers de Poséidon' },
    { monde: 'BLANC', couleur: '#f8fafc', repere: 'Univers du Léviathan' }
  ];

  reglePoints = {
    titre: 'RÈGLE DES DIMENSIONS',
    description: 'Pour pouvoir utiliser une guitare d\'une autre couleur dans un monde X, il faut sacrifier 500 points.'
  };

  constructor() { }

  ngOnInit(): void { }

}
