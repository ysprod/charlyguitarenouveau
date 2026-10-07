/* ═══════════════════════════════════════════════════════
   TYPES ET DONNÉES STATIQUES D'OFFOLAND
   ═══════════════════════════════════════════════════════ */

export type MicrophonePermission =
  | 'granted' | 'denied' | 'prompt' | 'unsupported';

export interface MicrophoneDiagnostic {
  secureContext: boolean;
  hasMediaDevices: boolean;
  hasRecognitionApi: boolean;
  permission: MicrophonePermission;
  usable: boolean;
  userMessage: string;
}

export interface Dimension {
  id: number;
  name: string;
  color: string;
  colorHex: string;
  note: string;
  sage: string;
  sageTitle: string;
  totem: string;
  totemEmoji: string;
  instrument: string;
  instrumentEmoji: string;
  spirit: string;
  spiritTitle: string;
  spiritEmoji: string;
  gift: string;
  trial: string;
  question: string;
}

export interface Quest {
  id: string;
  dimensionId: number;
  title: string;
  description: string;
  acceptedAnswers: string[];
  xpReward: number;
  hint: string;
  icon: string;
  difficulty: 'facile' | 'moyen' | 'expert';
  lore: string;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
  unlockedAt?: number;
}

export type RecognitionError =
  | 'not-allowed' | 'service-not-allowed' | 'no-speech'
  | 'audio-capture' | 'network' | 'aborted' | 'unknown';


/* ═══════════════════════════════════════════════════════
   LES 7 DIMENSIONS D'OFFOLAND
   ═══════════════════════════════════════════════════════ */
export const DIMENSIONS: readonly Dimension[] = [
  {
    id: 1,
    name: 'Dimension Blanche',
    color: 'Blanc',
    colorHex: '#FFFFFF',
    note: 'Do',
    sage: 'Offodo',
    sageTitle: 'Gardien du Commencement',
    totem: 'Éléphant Blanc',
    totemEmoji: '🐘',
    instrument: 'Tambour sacré',
    instrumentEmoji: '🥁',
    spirit: 'Leustanné',
    spiritTitle: 'Gardien du Voile Blanc',
    spiritEmoji: '👻',
    gift: 'La mémoire et l\'origine',
    trial: 'Qui es-tu vraiment ?',
    question: 'Accepter de se présenter sans masque'
  },
  {
    id: 2,
    name: 'Dimension Rouge',
    color: 'Rouge',
    colorHex: '#DC2626',
    note: 'Ré',
    sage: 'Offoré',
    sageTitle: 'Gardien du Courage',
    totem: 'Lion Rouge',
    totemEmoji: '🦁',
    instrument: 'Djembé',
    instrumentEmoji: '🪘',
    spirit: 'Houssou',
    spiritTitle: 'Dévoreur Rouge',
    spiritEmoji: '👹',
    gift: 'Le courage et la maîtrise',
    trial: 'Que fais-tu de ta force ?',
    question: 'Transformer la force en protection'
  },
  {
    id: 3,
    name: 'Dimension Verte',
    color: 'Vert',
    colorHex: '#10B981',
    note: 'Mi',
    sage: 'Offomi',
    sageTitle: 'Gardien de la Vie',
    totem: 'Gazelle Verte',
    totemEmoji: '🦌',
    instrument: 'Balafon',
    instrumentEmoji: '🎵',
    spirit: 'Klin',
    spiritTitle: 'La Dame aux Mille Voix',
    spiritEmoji: '🧜‍♀️',
    gift: 'L\'amour et la compassion',
    trial: 'Qu\'aimes-tu au point de le protéger ?',
    question: 'Choisir la fidélité et la responsabilité'
  },
  {
    id: 4,
    name: 'Dimension Bleue',
    color: 'Bleu',
    colorHex: '#3B82F6',
    note: 'Fa',
    sage: 'Offofa',
    sageTitle: 'Gardien de la Connaissance',
    totem: 'Aigle Bleu',
    totemEmoji: '🦅',
    instrument: 'Flûte sacrée',
    instrumentEmoji: '🪈',
    spirit: 'Yayus',
    spiritTitle: 'Maître des Énigmes',
    spiritEmoji: '🌀',
    gift: 'La connaissance et l\'écoute',
    trial: 'Que cherches-tu à comprendre ?',
    question: 'Écouter avant de parler'
  },
  {
    id: 5,
    name: 'Dimension Noire',
    color: 'Noir',
    colorHex: '#1F2937',
    note: 'Sol',
    sage: 'Offosol',
    sageTitle: 'Gardien de l\'Épreuve',
    totem: 'Panthère Noire',
    totemEmoji: '🐆',
    instrument: 'Guitare sacrée',
    instrumentEmoji: '🎸',
    spirit: 'Skardah',
    spiritTitle: 'Serpent des Abîmes',
    spiritEmoji: '🐍',
    gift: 'La persévérance',
    trial: 'Que fais-tu quand tout semble perdu ?',
    question: 'Avancer malgré les ténèbres'
  },
  {
    id: 6,
    name: 'Dimension Pourpre',
    color: 'Pourpre',
    colorHex: '#9333EA',
    note: 'La',
    sage: 'Offola',
    sageTitle: 'Gardien de la Vision',
    totem: 'Caméléon Pourpre',
    totemEmoji: '🦎',
    instrument: 'Kora',
    instrumentEmoji: '🎼',
    spirit: 'Le Caméléon du Néant',
    spiritTitle: 'Le Caméléon du Néant',
    spiritEmoji: '🌫️',
    gift: 'La vision et le discernement',
    trial: 'Sais-tu reconnaître l\'illusion ?',
    question: 'Distinguer la vérité des apparences'
  },
  {
    id: 7,
    name: 'Dimension Violette',
    color: 'Violet',
    colorHex: '#7C3AED',
    note: 'Si',
    sage: 'Offosi',
    sageTitle: 'Gardien de la Destinée',
    totem: 'Dragon Violet',
    totemEmoji: '🐉',
    instrument: 'Harpe sacrée',
    instrumentEmoji: '🎻',
    spirit: 'L\'Hologramme Organique',
    spiritTitle: 'Dévoreur des Destinées',
    spiritEmoji: '💠',
    gift: 'L\'accomplissement',
    trial: 'Es-tu prêt à accepter ta destinée ?',
    question: 'Embrasser pleinement son don'
  }
];


/* ═══════════════════════════════════════════════════════
   LES 7 QUÊTES (une par dimension)
   ═══════════════════════════════════════════════════════ */
export const QUESTS: readonly Quest[] = [
  {
    id: 'quest_1',
    dimensionId: 1,
    title: 'Le Premier Battement',
    description: 'Avant toute musique, il y eut un rythme. Quelle est la première note de la Création, celle qui ouvre le Premier Temple ?',
    acceptedAnswers: ['do', 'la note do', 'c', 'le do'],
    xpReward: 50,
    hint: 'C\'est la note qui commence la gamme, celle de l\'aube et de la mémoire.',
    icon: '🥁',
    difficulty: 'facile',
    lore: '« Celui qui cherche le pouvoir se perdra. Celui qui cherche la vérité avancera. »'
  },
  {
    id: 'quest_2',
    dimensionId: 2,
    title: 'Le Cercle de Flammes',
    description: 'Pour franchir le Portail du Courage, tu dois traverser un cercle de flammes. Quelle est la quinte juste de Do, qui donne la force d\'avancer ?',
    acceptedAnswers: ['sol', 'g', 'la quinte de do', 'sol juste'],
    xpReward: 60,
    hint: 'Compte 7 demi-tons depuis Do : Do → Do# → Ré → Ré# → Mi → Fa → Fa# → Sol.',
    icon: '🔥',
    difficulty: 'moyen',
    lore: '« Le courage consiste d\'abord à vaincre ses propres peurs. » — Offoré'
  },
  {
    id: 'quest_3',
    dimensionId: 3,
    title: 'Le Chant de la Vie',
    description: 'Offomi joue du balafon pour apaiser les conflits. Quelle note représente la Vie dans la Dimension Verte ?',
    acceptedAnswers: ['mi', 'e', 'la note mi', 'mi naturel'],
    xpReward: 60,
    hint: 'C\'est la troisième note de la gamme, celle de l\'amour et de la compassion.',
    icon: '💚',
    difficulty: 'facile',
    lore: '« L\'amour véritable est un choix quotidien. » — Offomi'
  },
  {
    id: 'quest_4',
    dimensionId: 4,
    title: 'Le Silence de la Flûte',
    description: 'Dans la Dimension Bleue, le silence enseigne autant que les paroles. Quelle note porte la Connaissance ?',
    acceptedAnswers: ['fa', 'f', 'la note fa'],
    xpReward: 70,
    hint: 'C\'est la quarte juste de Do, la note qui invite à écouter avant de parler.',
    icon: '💙',
    difficulty: 'moyen',
    lore: '« La parole juste naît du silence écouté. » — Offofa'
  },
  {
    id: 'quest_5',
    dimensionId: 5,
    title: 'La Nuit Sans Étoiles',
    description: 'Offosol joue de la guitare sacrée dans les ténèbres. Quelle note soutient le offolandais dans l\'Épreuve ?',
    acceptedAnswers: ['sol', 'g', 'la note sol'],
    xpReward: 80,
    hint: 'C\'est la même note que la quinte juste de Do — celle de la Dimension Noire.',
    icon: '🖤',
    difficulty: 'moyen',
    lore: '« Les plus grandes victoires naissent des plus grandes difficultés. » — Offosol'
  },
  {
    id: 'quest_6',
    dimensionId: 6,
    title: 'Le Miroir des Illusions',
    description: 'Le Caméléon du Néant prend toutes les formes. Quelle note aide à discerner la vérité de l\'illusion ?',
    acceptedAnswers: ['la', 'a', 'la note la'],
    xpReward: 80,
    hint: 'C\'est la sixième note de la gamme, celle de la Vision et de la kora.',
    icon: '💜',
    difficulty: 'expert',
    lore: '« Seule demeure la vérité. » — Offola'
  },
  {
    id: 'quest_7',
    dimensionId: 7,
    title: 'Le Don Révélé',
    description: 'Devant le dernier portail, Offosi pose une seule question. Quelle est la septième note, celle de l\'Accomplissement ?',
    acceptedAnswers: ['si', 'b', 'la note si'],
    xpReward: 100,
    hint: 'C\'est la note qui mène à Offolomou, le Don de Dieu révélé',
    icon: '💎',
    difficulty: 'expert',
    lore: '« La destinée ne se reçoit pas ; elle se construit pas à pas. » — Offosi'
  }
];


/* ═══════════════════════════════════════════════════════
   CONSTANTES DE JEU
   ═══════════════════════════════════════════════════════ */
export const HINT_COST = 10;
export const XP_PER_LEVEL = 100;
export const MAX_ATTEMPTS_BEFORE_HINT = 3;

export const STORAGE_KEY_XP = 'oracle_xp_v2';
export const STORAGE_KEY_QUEST_INDEX = 'oracle_quest_index_v2';
export const STORAGE_KEY_COMPLETED = 'oracle_completed_v2';
export const STORAGE_KEY_SOUND = 'oracle_sound_v2';
export const STORAGE_KEY_ACHIEVEMENTS = 'oracle_achievements_v2';