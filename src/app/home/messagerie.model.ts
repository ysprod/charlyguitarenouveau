// src/app/features/messagerie/messagerie.model.ts

/**
 * Types locaux au composant Messagerie.
 * Les modèles métier (UserMessage, MessageReply, etc.) restent
 * dans ../../models/user-message.model.ts.
 */

export type FilterStatus = 'all' | 'unread' | 'read' | 'replied';

export type SortMode = 'recent' | 'oldest' | 'unread-first';

export interface MessageFilters {
  readonly search: string;
  readonly status: FilterStatus;
  readonly sort: SortMode;
}

export interface MessageStats {
  readonly total: number;
  readonly unread: number;
  readonly replied: number;
  readonly avgResponseTime: string;
}

export const INITIAL_FILTERS: MessageFilters = {
  search: '',
  status: 'all',
  sort: 'recent',
} as const;

export const INITIAL_STATS: MessageStats = {
  total: 0,
  unread: 0,
  replied: 0,
  avgResponseTime: '—',
} as const;