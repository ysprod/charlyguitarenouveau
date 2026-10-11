export type OfflineWriteOperation = 'set' | 'update' | 'remove';

export interface OfflineWrite {
  /** ID auto-incrémenté par IndexedDB. */
  id?: number;

  /** Chemin RTDB (ex. `users/{uid}/scores`). */
  path: string;

  /** Opération à effectuer. */
  operation: OfflineWriteOperation;

  /** Données associées (payload). */
  data: unknown;

  /** Timestamp de mise en queue. */
  queuedAt: number;

  /** Nombre de tentatives de synchronisation. */
  attempts: number;
}