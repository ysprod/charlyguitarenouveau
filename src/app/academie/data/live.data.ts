export interface LiveCard {
  id: string;
  title: string;
  description: string;
  icon: string;
  backgroundIcon: string;
  actionLabel: string;
  actionRoute: string;
}

export const LIVE_CARDS: readonly LiveCard[] = [
  {
    id: 'masterclass',
    title: 'Masterclass Guitare',
    description: 'Apprenez les techniques avancées avec Charly en direct. Posez vos questions en temps réel.',
    icon: '🎸',
    backgroundIcon: '🎸',
    actionLabel: 'Rejoindre la session',
    actionRoute: '/user/contact'
  },
  {
    id: 'cours-collectif',
    title: 'Cours Collectif',
    description: 'Une session de groupe pour progresser ensemble. Idéal pour les débutants.',
    icon: '👥',
    backgroundIcon: '🎶',
    actionLabel: 'Voir les horaires',
    actionRoute: '/user/contact'
  },
  {
    id: 'analyse-morceau',
    title: 'Analyse de Morceau',
    description: 'Décortiquons ensemble un titre célèbre pour comprendre sa structure et ses accords.',
    icon: '🎼',
    backgroundIcon: '🎵',
    actionLabel: 'Découvrir l\'analyse',
    actionRoute: '/user/contact'
  },
  {
    id: 'studio-live',
    title: 'Studio Live',
    description: 'Assistez à une session d\'enregistrement en direct depuis notre studio professionnel.',
    icon: '🎙️',
    backgroundIcon: '🎧',
    actionLabel: 'Regarder le stream',
    actionRoute: '/user/contact'
  }
];