/* ═══════════════════════════════════════════════════════
   DOCUMENT — Modèle partagé
   ═══════════════════════════════════════════════════════ */

export interface DocumentItem {
  /** Clé Firebase (optionnelle, injectée par `keyField`). */
  readonly key?: string;

  /* ─── Métadonnées ─── */
  readonly title: string;
  readonly description: string;
  readonly type: string;
  readonly typeClass: string;
  readonly icon: string;
  readonly format: string;
  readonly level: string;

  /* ─── Prix (0 = gratuit) ─── */
  readonly price: number;

  /* ─── Fichiers ─── */
  readonly imageUrl?: string;
  readonly imageStoragePath?: string;
  readonly downloadUrl: string;
  readonly storagePath?: string;
  readonly fileName?: string;
  readonly fileSize?: number;

  /* ─── Statistiques ─── */
  readonly createdAt?: string;
  readonly views?: number;
  readonly downloads?: number;
}