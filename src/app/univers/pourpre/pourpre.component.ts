import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-pourpre',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pourpre.component.html',
  styleUrls: ['./pourpre.component.scss']
})
export class PourpreComponent implements OnInit {

  /* ═══════════════════════════════════════════════════════
     DIMENSION POURPRE — 6ème Dimension
     Couleur : Pourpre | Note : La | Sage : Offola
     Temple : Vision | Totem : Caméléon Pourpre | Esprit : Le Caméléon du Néant
     ═══════════════════════════════════════════════════════ */
  readonly dimension = {
    numero: 6,
    nom: 'POURPRE',
    couleur: '#9333ea',
    couleurSecondaire: '#c084fc',
    note: 'La',
    sage: 'Offola',
    sageTitre: 'Gardien de la Vision',
    temple: 'Temple de la Vision',
    totem: 'Caméléon Pourpre',
    totemEmoji: '🦎',
    instrument: 'Kora',
    instrumentEmoji: '🎼',
    esprit: 'Le Caméléon du Néant',
    espritEmoji: '🌫️',
    don: 'La vision et le discernement',
    epreuve: 'Sais-tu reconnaître l\'illusion ?',
    question: 'Distinguer la vérité des apparences',
    citation: '« Les apparences disparaissent. Les illusions tombent. Seule demeure la vérité. »'
  };

  constructor() { }

  ngOnInit(): void { }
}