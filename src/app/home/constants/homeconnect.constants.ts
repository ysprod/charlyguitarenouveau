import type { QuickAction, InboxFilter, WhyPillar, } from '../models/homeconnect.model';

export const QUICK_ACTIONS: readonly QuickAction[] = [
  {
    label: 'Jeux',
    icon: '🎮',
    route: '/game/play',
    color: 'primary',
  },
  {
    label: 'Boutique',
    icon: '📚',
    route: '/store',
    color: 'success',
  },
  {
    label: 'Académie',
    icon: '🎓',
    route: '/academie',
    color: 'warning',
  },
  {
    label: 'Studio',
    icon: '💳',
    route: '/studio',
    color: 'danger',
  },
  {
    label: 'Offoland',
    icon: '💬',
    route: '/offoland',
    color: 'violet',
  }
] as const;

export const INBOX_FILTERS: readonly {
  value: InboxFilter;
  label: string;
  icon: string;
}[] = [
  { value: 'all', label: 'Tous', icon: '📥' },
  { value: 'unread', label: 'Non lus', icon: '✉️' },
  { value: 'sent', label: 'Envoyés', icon: '↗️' },
] as const;

/* ═════════════════════════════════════════════════════════════════════
   CATEGORY ICONS — Icônes par catégorie de message
   ═════════════════════════════════════════════════════════════════════ */

export const CATEGORY_ICON: Readonly<Record<string, string>> = {
  academie: '📚',
  abonnement: '💳',
  contenu: '🎬',
  evenement: '📅',
  systeme: '⚙️',
  autre: '💬',
} as const;

/* ═════════════════════════════════════════════════════════════════════
   CONTRAINTES UI
   ═════════════════════════════════════════════════════════════════════ */

/** Nombre de messages par page dans l'inbox. */
export const INBOX_PAGE_SIZE = 1;

/** Longueur maximale de l'aperçu d'un message (caractères). */
export const INBOX_PREVIEW_MAX_LENGTH = 140;

/* ═════════════════════════════════════════════════════════════════════
   WHY PILLARS — Les 3 piliers de l'écosystème
   ═════════════════════════════════════════════════════════════════════ */

export const WHY_PILLARS: readonly WhyPillar[] = [
  {
    icon: '🎯',
    title: 'Méthode éprouvée',
    description:
      'Un parcours progressif, structuré par niveaux, pensé par Charly Guitare lui-même.',
  },
  {
    icon: '🎮',
    title: 'Apprendre en jouant',
    description:
      'Des jeux interactifs qui transforment chaque exercice en défi ludique et mémorable.',
  },
  {
    icon: '🚀',
    title: 'Communauté active',
    description:
      'Masterclass, lives, entraide : progressez entouré de passionnés, pas seul face à votre écran.',
  },
] as const;