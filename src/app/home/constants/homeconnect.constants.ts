import { QuickAction, InboxFilter, WhyPillar } from "../models/homeconnect.model";

export const QUICK_ACTIONS: readonly QuickAction[] = [
  { label: 'Jouer', icon: '🎮', route: '/play', description: 'Accéder à tous les jeux', color: 'primary' },
  { label: 'Documents', icon: '📚', route: '/academie', description: 'Méthodes, partitions, livres', color: 'gold' },
  { label: 'Nos offres', icon: '👑', route: '/abonnement', description: 'Packs pédagogiques', color: 'success' },
  { label: 'Live', icon: '📺', route: '/live', description: 'Sessions interactives', color: 'danger' },
  { label: 'Mon profil', icon: '👤', route: '/profil', description: 'Gérer mon compte', color: 'violet' },
];

export const INBOX_FILTERS: readonly {
  value: InboxFilter;
  label: string;
  icon: string;
}[] = [
    { value: 'all', label: 'Tous', icon: '📥' },
    { value: 'unread', label: 'Non lus', icon: '✉️' },
    { value: 'sent', label: 'Envoyés', icon: '↗️' },  // ← AJOUTÉ
    { value: 'starred', label: 'Suivis', icon: '⭐' },
    { value: 'academie', label: 'Académie', icon: '📚' },
    { value: 'abonnement', label: 'Abonnement', icon: '💳' },
  ];

/* ═══════════════════════════════════════════════════════
   ICÔNES PAR CATÉGORIE
   ═══════════════════════════════════════════════════════ */

export const CATEGORY_ICON: Readonly<Record<string, string>> = {
  academie: '📚',
  abonnement: '💳',
  contenu: '🎬',
  evenement: '📅',
  systeme: '⚙️',
  autre: '💬',
};

/* ═══════════════════════════════════════════════════════
   CONTRAINTES UI
   ═══════════════════════════════════════════════════════ */

export const INBOX_PAGE_SIZE = 3;
export const INBOX_PREVIEW_MAX_LENGTH = 140;

export const WHY_PILLARS: readonly WhyPillar[] = [
  {
    icon: '🎯',
    title: 'Méthode éprouvée',
    description:
      "Un parcours progressif, structuré par niveaux, pensé par Charly Guitare lui-même."
  },
  {
    icon: '🎮',
    title: 'Apprendre en jouant',
    description:
      "Des jeux interactifs qui transforment chaque exercice en défi ludique et mémorable."
  },
  {
    icon: '🚀',
    title: 'Communauté active',
    description:
      "Masterclass, lives, entraide : progressez entouré de passionnés, pas seul face à votre écran."
  }
];
