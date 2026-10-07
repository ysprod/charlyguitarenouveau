import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';

export interface Dimension {
  nom: string;
  couleur: string;
  couleurSecondaire: string;
  symbole: string;
  note: string;
  sage: string;
  description: string;
  image: string;
  route: string;
}

@Component({
  selector: 'app-charlyguitaregame',
  standalone: true,
  imports: [
    CommonModule, RouterLink
  ],
  templateUrl: './charlyguitaregame.component.html',
  styleUrls: ['./charlyguitaregame.component.scss']
})
export class CharlyguitaregameComponent implements OnInit {

  dimensions: Dimension[] = [
    /* ═══════════════════════════════════════════════════════
       ORDRE SACRÉ DES 7 DIMENSIONS (selon la Bible d'Offoland)
       Do → Ré → Mi → Fa → Sol → La → Si
       ═══════════════════════════════════════════════════════ */

    {
      nom: 'BLANC',
      couleur: '#f8fafc',
      couleurSecondaire: '#cbd5e1',
      symbole: '✨',
      note: 'Do',
      sage: 'Offodo',
      description: 'La Dimension du Commencement',
      image: 'assets/blanc.jpg',
      route: '/blanc'
    },
    {
      nom: 'ROUGE',
      couleur: '#dc2626',
      couleurSecondaire: '#f87171',
      symbole: '🔥',
      note: 'Ré',
      sage: 'Offoré',
      description: 'La Dimension du Courage',
      image: 'assets/rouge.jpg',
      route: '/rouge'
    },
    {
      nom: 'VERT',
      couleur: '#22c55e',
      couleurSecondaire: '#4ade80',
      symbole: '🌿',
      note: 'Mi',
      sage: 'Offomi',
      description: 'La Dimension de la Vie',
      image: 'assets/vert.jpg',
      route: '/vert'
    },
    {
      nom: 'BLEU',
      couleur: '#3b82f6',
      couleurSecondaire: '#60a5fa',
      symbole: '🌊',
      note: 'Fa',
      sage: 'Offofa',
      description: 'La Dimension de la Connaissance',
      image: 'assets/bleu.jpg',
      route: '/bleu'
    },
    {
      nom: 'NOIR',
      couleur: '#1a1a1a',
      couleurSecondaire: '#4a4a4a',
      symbole: '🖤',
      note: 'Sol',
      sage: 'Offosol',
      description: 'La Dimension de l\'Épreuve',
      image: 'assets/noir.jpg',
      route: '/noir'
    },

    /* ═══════════════════════════════════════════════════════
       NOUVELLES DIMENSIONS
       ═══════════════════════════════════════════════════════ */

    {
      nom: 'POURPRE',
      couleur: '#9333ea',
      couleurSecondaire: '#c084fc',
      symbole: '👁️',
      note: 'La',
      sage: 'Offola',
      description: 'La Dimension de la Vision',
      image: 'assets/pourpre.jpg',
      route: '/pourpre'
    },   
    {
  nom: 'JAUNE',
  couleur: '#eab308',
  couleurSecondaire: '#fde047',
  symbole: '👑',
  note: 'Si',
  sage: 'Offosi',
  description: 'La Dimension de l\'Accomplissement',
  image: 'assets/jaune.jpg',
  route: '/violet'
}
  ];

  constructor() { }

  ngOnInit(): void { }

}