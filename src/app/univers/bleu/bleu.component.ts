import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';

export interface Creature {
  nom: string;
  icone: string;
  couleur: string;
  description: string;
  danger: string;
}

export interface Piege {
  nom: string;
  icone: string;
  description: string;
}

export interface Climat {
  nom: string;
  icone: string;
}


@Component({
  selector: 'app-bleu',
  standalone: true,
  imports: [
    CommonModule
  ],
  templateUrl: './bleu.component.html',
  styleUrls: ['./bleu.component.scss']
})
export class BleuComponent implements OnInit {

  creatures: Creature[] = [
    {
      nom: 'VAMPIRES',
      icone: '🧛',
      couleur: '#dc2626',
      description: 'Créatures de la nuit qui sucent le sang à chaque fois qu\'elles touchent leur victime.',
      danger: 'Drain de vie'
    },
    {
      nom: 'LOUPS-GAROUS',
      icone: '🐺',
      couleur: '#78716c',
      description: 'Bêtes sauvages assoiffées de sang, elles rôdent dans les brumes du labyrinthe.',
      danger: 'Morsure mortelle'
    },
    {
      nom: 'CHAUVES-SOURIS',
      icone: '🦇',
      couleur: '#a855f7',
      description: 'Créatures volantes qui attaquent en essaim et drainent l\'énergie vitale.',
      danger: 'Attaque en groupe'
    },
    {
      nom: 'HIBOUX & CHOUETTES',
      icone: '🦉',
      couleur: '#f59e0b',
      description: 'Sentinelles nocturnes, ils observent silencieusement les intrus du monde bleu.',
      danger: 'Vigilance éternelle'
    },
    {
      nom: 'ANGES GARDIENS',
      icone: '👼',
      couleur: '#06b6d4',
      description: 'Entités bienveillantes qui veillent sur les rêveurs endormis, mais qui peuvent aussi juger.',
      danger: 'Jugement divin'
    },
    {
      nom: 'OURAGANS & TEMPÊTES',
      icone: '🌪️',
      couleur: '#3b82f6',
      description: 'Les éléments eux-mêmes sont vivants dans ce monde. Ils se déchaînent sans prévenir.',
      danger: 'Cataclysme naturel'
    }
  ];

  pieges: Piege[] = [
    { nom: 'MINES', icone: '💣', description: 'Explosifs invisibles dissimulés dans les nuages.' },
    { nom: 'SABLES MOUVANTS', icone: '🏜️', description: 'Zones où les nuages deviennent traîtres et engloutissent.' },
    { nom: 'RIVIÈRES', icone: '🌊', description: 'Courants oniriques qui emportent les rêveurs.' },
    { nom: 'MANGROVES', icone: '🌿', description: 'Forêts de nuages sombres où l\'on se perd.' },
    { nom: 'VOLCANS', icone: '🌋', description: 'Éruptions de cauchemars purs.' },
    { nom: 'OURAGANS', icone: '🌀', description: 'Tempêtes qui déchirent la réalité.' },
    { nom: 'TROUS', icone: '🕳️', description: 'Failles vers le néant.' }
  ];

  climats: Climat[] = [
    { nom: 'Ensoleillé', icone: '☀️' },
    { nom: 'Pluvieux', icone: '🌧️' },
    { nom: 'Neige', icone: '❄️' },
    { nom: 'Tempête', icone: '⛈️' },
    { nom: 'Désert', icone: '🏜️' },
    { nom: 'Forêt', icone: '🌲' }
  ];

  charlyBleu = {
    titre: 'LE CHARLY GUITARE BLEU',
    description: 'Le Bleu ne meurt pas — mais il dort trop. Le Charly Guitare Bleu ne se réveille qu\'avec un chargement de vie automatique d\'un siècle (1 heure du temps réel) ou par sacrifice de 1000 points.',
    reveil: [
      { type: 'Automatique', valeur: '1 siècle (1h réelle)', icone: '⏰' },
      { type: 'Sacrifice', valeur: '1000 points', icone: '💎' }
    ]
  };

  correspondances = [
    { monde: 'BLEU', couleur: '#3b82f6', repere: 'Univers de Zeus' },
    { monde: 'ROUGE', couleur: '#dc2626', repere: 'Univers de Bafum' },
    { monde: 'VERT', couleur: '#22c55e', repere: 'Univers de Poséidon' },
    { monde: 'BLANC', couleur: '#f8fafc', repere: 'Univers du Léviathan' }
  ];

  faiblesseCreatures = {
    titre: 'LA FAIBLESSE DES CRÉATURES',
    description: 'Pour vaincre les créatures de la nuit, il faut jouer le son d\'une guitare verte. Ce son brise leur emprise et les repousse dans les ombres.'
  };

  reglePoints = {
    titre: 'RÈGLE DES DIMENSIONS',
    description: 'Pour pouvoir utiliser une guitare d\'une autre couleur dans un monde X, il faut sacrifier 500 points.'
  };

  contexteHistoire = {
    titre: 'LE CONTEXTE DE L\'HISTOIRE',
    description: 'L\'histoire se passe dans un labyrinthe, au plein milieu d\'une guerre qui consiste à tuer THUNDERFULL, son maître.'
  };

  constructor() { }

  ngOnInit(): void { }

}
