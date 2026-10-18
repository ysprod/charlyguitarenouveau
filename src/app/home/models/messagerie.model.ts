// src/app/home/models/messagerie.model.ts

/* ═════════════════════════════════════════════════════════════════════
   MESSAGERIE — Modèles UI (tri, filtres, stats)
   ═════════════════════════════════════════════════════════════════════ */

/** Mode de tri des messages. */
export type SortMode = 'recent' | 'oldest' | 'unread-first';

/** Filtre de statut. */
export type FilterStatus = 'all' | 'unread' | 'replied';

/** Statistiques affichées dans le header. */
export interface MessageStats {
  total: number;
  unread: number;
  replied: number;
  avgResponseTime: string;
}