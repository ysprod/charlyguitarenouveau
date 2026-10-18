// src/app/homeconnect/homeconnect.constants.ts

import { QuickAction, ColorUniverse, InboxMessage, InboxFilter, Testimonial, WhyPillar } from "../models/homeconnect.model";

 

/* ═══════════════════════════════════════════════════════
   ACTIONS RAPIDES
   ═══════════════════════════════════════════════════════ */

export const QUICK_ACTIONS: readonly QuickAction[] = [
  { label: 'Jouer', icon: '🎮', route: '/play', description: 'Accéder à tous les jeux', color: 'primary' },
  { label: 'Documents', icon: '📚', route: '/academie', description: 'Méthodes, partitions, livres', color: 'gold' },
  { label: 'Nos offres', icon: '👑', route: '/abonnement', description: 'Packs pédagogiques', color: 'success' },
  { label: 'Live', icon: '📺', route: '/live', description: 'Sessions interactives', color: 'danger' },
  { label: 'Mon profil', icon: '👤', route: '/profil', description: 'Gérer mon compte', color: 'violet' },
];

/* ═══════════════════════════════════════════════════════
   UNIVERS COULEURS — 7 DIMENSIONS
   ═══════════════════════════════════════════════════════ */

export const COLOR_UNIVERSES: readonly ColorUniverse[] = [
  { name: 'Blanc', route: '/blanc', emoji: '⚪', color: '#e2e8f0', description: 'Pureté' },
  { name: 'Bleu', route: '/bleu', emoji: '🔵', color: '#2563eb', description: 'Sérénité' },
  { name: 'Vert', route: '/vert', emoji: '🟢', color: '#16a34a', description: 'Nature' },
  { name: 'Rouge', route: '/rouge', emoji: '🔴', color: '#dc2626', description: 'Passion' },
  { name: 'Noir', route: '/noir', emoji: '⚫', color: '#0f172a', description: 'Mystère' },
  { name: 'Violet', route: '/violet', emoji: '🟣', color: '#7c3aed', description: 'Créativité' },
  { name: 'Pourpre', route: '/pourpre', emoji: '🟪', color: '#be185d', description: 'Royauté' },
];

 

 

/* ═══════════════════════════════════════════════════════
   FILTRES DE LA BOÎTE DE RÉCEPTION
   ═══════════════════════════════════════════════════════ */

export const INBOX_FILTERS: readonly {
  value: InboxFilter;
  label: string;
  icon: string;
}[] = [
  { value: 'all',       label: 'Tous',      icon: '📥' },
  { value: 'unread',    label: 'Non lus',   icon: '✉️' },
  { value: 'sent',      label: 'Envoyés',   icon: '↗️' },  // ← AJOUTÉ
  { value: 'starred',   label: 'Suivis',    icon: '⭐' },
  { value: 'academie',  label: 'Académie',  icon: '📚' },
  { value: 'abonnement',label: 'Abonnement',icon: '💳' },
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

/* ═════════════════════════════════════════════════════════════════════
   TÉMOIGNAGES
   ═════════════════════════════════════════════════════════════════════ */

export const TESTIMONIALS: readonly Testimonial[] = [
  {
    quote:
      "En 6 mois, j'ai progressé plus qu'en 3 ans seul avec YouTube. La méthode est claire et motivante.",
    avatar: '🎸',
    author: 'Sarah M.',
    role: 'Élève depuis 2026'
  },
  {
    quote:
      "Les jeux pédagogiques sont géniaux. On apprend sans s'en rendre compte, c'est addictif !",
    avatar: '🎵',
    author: 'Thomas L.',
    role: 'Membre Premium'
  },
  {
    quote:
      "Enfin une plateforme complète : cours, lives, suivi. Charly a créé une vraie école numérique.",
    avatar: '🎼',
    author: 'Amina K.',
    role: 'Élève depuis 2026'
  }
];