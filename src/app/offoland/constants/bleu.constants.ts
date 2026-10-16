// src/app/offoland/dimensions/bleu/constants/bleu.constants.ts

import {
  CharlyBleu,
  Climat,
  Correspondance,
  Creature,
  Piege,
  TextBlock,
} from '../models/bleu.model';

/* ═══════════════════════════════════════════════════════════
   DÉCOR — NUAGES & PARTICULES
   ═══════════════════════════════════════════════════════════ */

export const CLOUDS: readonly number[] = [1, 2, 3, 4, 5, 6, 7, 8];

export const BLUE_PARTICLES: readonly number[] = Array.from(
  { length: 25 },
  (_, i) => i + 1
);

/* ═══════════════════════════════════════════════════════════
   CRÉATURES DE LA NUIT
   ═══════════════════════════════════════════════════════════ */

export const CREATURES: readonly Creature[] = [
  {
    nom: 'VAMPIRES',
    icone: '🧛',
    couleur: '#dc2626',
    description:
      "Créatures de la nuit qui sucent le sang à chaque fois qu'elles touchent leur victime.",
    danger: 'Drain de vie',
  },
  {
    nom: 'LOUPS-GAROUS',
    icone: '🐺',
    couleur: '#78716c',
    description:
      'Bêtes sauvages assoiffées de sang, elles rôdent dans les brumes du labyrinthe.',
    danger: 'Morsure mortelle',
  },
  {
    nom: 'CHAUVES-SOURIS',
    icone: '🦇',
    couleur: '#a855f7',
    description:
      "Créatures volantes qui attaquent en essaim et drainent l'énergie vitale.",
    danger: 'Attaque en groupe',
  },
  {
    nom: 'HIBOUX & CHOUETTES',
    icone: '🦉',
    couleur: '#f59e0b',
    description:
      'Sentinelles nocturnes, ils observent silencieusement les intrus du monde bleu.',
    danger: 'Vigilance éternelle',
  },
  {
    nom: 'ANGES GARDIENS',
    icone: '👼',
    couleur: '#06b6d4',
    description:
      'Entités bienveillantes qui veillent sur les rêveurs endormis, mais qui peuvent aussi juger.',
    danger: 'Jugement divin',
  },
  {
    nom: 'OURAGANS & TEMPÊTES',
    icone: '🌪️',
    couleur: '#3b82f6',
    description:
      "Les éléments eux-mêmes sont vivants dans ce monde. Ils se déchaînent sans prévenir.",
    danger: 'Cataclysme naturel',
  },
];

/* ═══════════════════════════════════════════════════════════
   PIÈGES DU LABYRINTHE
   ═══════════════════════════════════════════════════════════ */

export const PIEGES: readonly Piege[] = [
  { nom: 'MINES',           icone: '💣', description: 'Explosifs invisibles dissimulés dans les nuages.' },
  { nom: 'SABLES MOUVANTS', icone: '🏜️', description: 'Zones où les nuages deviennent traîtres et engloutissent.' },
  { nom: 'RIVIÈRES',        icone: '🌊', description: 'Courants oniriques qui emportent les rêveurs.' },
  { nom: 'MANGROVES',       icone: '🌿', description: "Forêts de nuages sombres où l'on se perd." },
  { nom: 'VOLCANS',         icone: '🌋', description: 'Éruptions de cauchemars purs.' },
  { nom: 'OURAGANS',        icone: '🌀', description: 'Tempêtes qui déchirent la réalité.' },
  { nom: 'TROUS',           icone: '🕳️', description: 'Failles vers le néant.' },
];

/* ═══════════════════════════════════════════════════════════
   CLIMATS DU MONDE BLEU
   ═══════════════════════════════════════════════════════════ */

export const CLIMATS: readonly Climat[] = [
  { nom: 'Ensoleillé', icone: '☀️' },
  { nom: 'Pluvieux',   icone: '🌧️' },
  { nom: 'Neige',      icone: '❄️' },
  { nom: 'Tempête',    icone: '⛈️' },
  { nom: 'Désert',     icone: '🏜️' },
  { nom: 'Forêt',      icone: '🌲' },
];

/* ═══════════════════════════════════════════════════════════
   CHARLY BLEU
   ═══════════════════════════════════════════════════════════ */

export const CHARLY_BLEU: CharlyBleu = {
  titre: 'LE CHARLY GUITARE BLEU',
  description:
    "Le Bleu ne meurt pas — mais il dort trop. Le Charly Guitare Bleu ne se réveille qu'avec un chargement de vie automatique d'un siècle (1 heure du temps réel) ou par sacrifice de 1000 points.",
  reveil: [
    { type: 'Automatique', valeur: '1 siècle (1h réelle)', icone: '⏰' },
    { type: 'Sacrifice',   valeur: '1000 points',          icone: '💎' },
  ],
};

/* ═══════════════════════════════════════════════════════════
   CORRESPONDANCES ENTRE MONDES
   ═══════════════════════════════════════════════════════════ */

export const CORRESPONDANCES: readonly Correspondance[] = [
  { monde: 'BLEU',  couleur: '#3b82f6', repere: 'Univers de Zeus' },
  { monde: 'ROUGE', couleur: '#dc2626', repere: 'Univers de Bafum' },
  { monde: 'VERT',  couleur: '#22c55e', repere: 'Univers de Poséidon' },
  { monde: 'BLANC', couleur: '#f8fafc', repere: 'Univers du Léviathan' },
];

/* ═══════════════════════════════════════════════════════════
   TEXTES DES CARTES
   ═══════════════════════════════════════════════════════════ */

export const FAIBLESSE_CREATURES: TextBlock = {
  titre: 'LA FAIBLESSE DES CRÉATURES',
  description:
    "Pour vaincre les créatures de la nuit, il faut jouer le son d'une guitare verte. Ce son brise leur emprise et les repousse dans les ombres.",
};

export const REGLE_POINTS: TextBlock = {
  titre: 'RÈGLE DES DIMENSIONS',
  description:
    "Pour pouvoir utiliser une guitare d'une autre couleur dans un monde X, il faut sacrifier 500 points.",
};

export const CONTEXTE_HISTOIRE: TextBlock = {
  titre: "LE CONTEXTE DE L'HISTOIRE",
  description:
    "L'histoire se passe dans un labyrinthe, au plein milieu d'une guerre qui consiste à tuer THUNDERFULL, son maître.",
};