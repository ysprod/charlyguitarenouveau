import { FilterOption } from '../models/documents-ui.model';

/* ═══════════════════════════════════════════════════════
   FILTRES
   ═══════════════════════════════════════════════════════ */

export const DOCUMENT_FILTERS: readonly FilterOption[] = [
  { label: 'Tous les documents', icon: '✨' },
  { label: 'Méthodes', icon: '📙' },
  { label: 'Livres numériques', icon: '📘' },
  { label: 'Partitions', icon: '🎼' },
  { label: 'Supports pédagogiques', icon: '📑' }
];

export const FILTER_ALL_LABEL = 'Tous les documents';

/* ═══════════════════════════════════════════════════════
   FIREBASE
   ═══════════════════════════════════════════════════════ */

export const DOCUMENTS_DB_PATHS = {
  DOCUMENTS: 'documents',
  USERS: 'users',
  CREDIT: 'credit'
} as const;

export const TOAST_DURATION_MS = 4000;