// src/app/features/messagerie/messagerie.constants.ts

import { MessageStatus, MessageCategory } from "../models/user-message.model";

 

/**
 * Constantes globales du composant Messagerie.
 * Centralise les libellés, icônes et classes CSS pour éviter
 * les switchs dans le template et faciliter la maintenance.
 */

/* ─── Statuts ─── */

export const STATUS_BADGE_CLASS: Readonly<Record<MessageStatus, string>> = {
  unread: 'badge-unread',
  read: 'badge-read',
  replied: 'badge-replied',
  archived: 'badge-archived',
} as const;

export const STATUS_LABEL: Readonly<Record<MessageStatus, string>> = {
  unread: 'En attente',
  read: 'Lu',
  replied: 'Répondu',
  archived: 'Archivé',
} as const;

export const STATUS_ICON: Readonly<Record<MessageStatus, string>> = {
  unread: '●',
  read: '✓',
  replied: '✓✓',
  archived: '📦',
} as const;

export const STATUS_RANK: Readonly<Record<MessageStatus, number>> = {
  unread: 0,
  replied: 1,
  read: 2,
  archived: 3,
} as const;

/* ─── Catégories ─── */

 

/* ─── Valeurs par défaut ─── */

export const DEFAULT_CATEGORY_ICON = '💬';
export const DEFAULT_STATUS_BADGE = 'badge-unread';
export const DEFAULT_STATUS_LABEL = 'En attente';
export const DEFAULT_STATUS_ICON = '●';
export const DEFAULT_STATUS_RANK = 4;

/* ─── Contraintes UI ─── */

export const REPLY_MAX_LENGTH = 1500;
export const REPLY_WARNING_THRESHOLD = 1200;
export const PREVIEW_MAX_LENGTH = 140;

/* ─── Messages utilisateur ─── */

export const EMPTY_STATE_MESSAGES = {
  noMessages: {
    title: 'Aucun message envoyé',
    description: 'Vos échanges avec le support apparaîtront ici.',
  },
  noResults: {
    title: 'Aucun résultat',
    description: 'Essayez d’ajuster votre recherche ou vos filtres.',
  },
} as const;

export const SORT_OPTIONS = [
  { value: 'recent', label: 'Plus récents' },
  { value: 'oldest', label: 'Plus anciens' },
  { value: 'unread-first', label: 'En attente d’abord' },
] as const;

export const FILTER_TABS = [
  { value: 'all', label: 'Tous' },
  { value: 'unread', label: 'En attente' },
  { value: 'replied', label: 'Répondus' },
] as const;