import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';

export interface Sirene {
  numero: number;
  nom: string;
  pouvoir: string;
  description: string;
  couleur: string;
  icone: string;
  danger: string;
}

export interface Pouvoir {
  nom: string;
  icone: string;
  description: string;
  limite: string;
}

export interface PhenomeneNaturel {
  nom: string;
  icone: string;
  description: string;
}

@Component({
  selector: 'app-vert',
     standalone: true,
        imports: [
    CommonModule
  ],
  templateUrl: './vert.component.html',
  styleUrls: ['./vert.component.scss']
})
export class VertComponent implements OnInit {

  
  sirenes: Sirene[] = [
    {
      numero: 1,
      nom: 'LA SIRÈNE DU RÊVE',
      pouvoir: 'Son Médium Berçant',
      description: 'Émet un son médium qui transforme l\'univers de celui qui l\'entend en une île paradisiaque. Le offolandais ne veut plus jamais partir.',
      couleur: '#22c55e',
      icone: '🎵',
      danger: 'Illusion paradisiaque'
    },
    {
      numero: 2,
      nom: 'LA SIRÈNE DE L\'ULTRA-SON',
      pouvoir: 'Ultra-Son Divin',
      description: 'Émet un ultra-son capté uniquement pendant le sommeil. Le dormeur se croit dans l\'univers noir, comme un Dieu. Il refuse d\'être humain jusqu\'à ce qu\'une marée monte et l\'emporte dans le lac.',
      couleur: '#06b6d4',
      icone: '🌊',
      danger: 'Illusion de divinité'
    },
    {
      numero: 3,
      nom: 'LA SIRÈNE CHARMEUSE',
      pouvoir: 'Métamorphose Féminine',
      description: 'Prend une forme humaine féminine pour charmer tout être représentant une menace pour le monde vert — c\'est-à-dire tout être qui n\'est pas vert ou qui ne dort pas.',
      couleur: '#ec4899',
      icone: '💃',
      danger: 'Séduction mortelle'
    }
  ];

  pouvoirsCharlyVert: Pouvoir[] = [
    {
      nom: 'OMNIPRÉSENCE',
      icone: '👁️',
      description: 'Le Charly Vert est un hologramme qui peut apparaître partout à la fois.',
      limite: 'Aucune limite physique'
    },
    {
      nom: 'SIMULATION',
      icone: '🎭',
      description: 'Il peut simuler tous les pouvoirs des autres Charly, sauf celui du Rouge (guérison et résurrection).',
      limite: 'Impossible de guérir ou ressusciter'
    },
    {
      nom: 'AVANT-GARDE',
      icone: '⚔️',
      description: 'Il apparaît avant que le Charly ne passe en mode Noir, car après lui vient le chaos total.',
      limite: 'Reçoit un ordre ultime avant de laisser sa place'
    }
  ];

  phenomenes: PhenomeneNaturel[] = [
    {
      nom: 'TREMBLEMENTS DE TERRE',
      icone: '🌋',
      description: 'Le monde vert provoque exprès des séismes pour rétablir l\'équilibre de sa réalité virtuelle.'
    },
    {
      nom: 'CLIMATS EXTRÊMES',
      icone: '🌪️',
      description: 'La nature fait ce qu\'elle veut, en bien comme en mal, sans tenir compte des habitants.'
    },
    {
      nom: 'RELIEFS VARIÉS',
      icone: '🏔️',
      description: 'Tous les reliefs et climats naturels du monde sont regroupés dans cette dimension.'
    }
  ];

  correspondances = [
    { monde: 'BLEU', couleur: '#3b82f6', repere: 'Univers de Zeus' },
    { monde: 'ROUGE', couleur: '#dc2626', repere: 'Univers de Bafum' },
    { monde: 'VERT', couleur: '#22c55e', repere: 'Univers de Poséidon' },
    { monde: 'BLANC', couleur: '#f8fafc', repere: 'Univers du Léviathan' }
  ];

  faiblesseSirenes = {
    titre: 'LA FAIBLESSE DES SIRÈNES',
    description: 'Le son d\'une guitare joué par le Charly Guitare Rouge brise leur emprise. C\'est le seul pouvoir capable de libérer les âmes prisonnières du lac Wata.'
  };

  avertissementFinal = {
    titre: 'AVERTISSEMENT',
    description: 'Le Charly Blanc et le Charly Vert ne sont pas suffisamment forts pour défendre THUNDERFULL contre les lions indomptables du labyrinthe. Ces Charly sont juste des débarrasseurs d\'obstacles physiques, et non magiques.'
  };

  constructor() { }

  ngOnInit(): void { }

}
