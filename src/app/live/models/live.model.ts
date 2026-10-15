// src/app/live/models/live.model.ts

/* ═════════════════════════════════════════════════════════════════════
   LIVE — MODÈLES
   ═════════════════════════════════════════════════════════════════════ */

/** Carte vidéo mise en avant (YouTube embarqué). */
export interface LiveVideo {
  /** Titre affiché en haut de la carte. */
  readonly title: string;

  /** URL d'embed YouTube (iframe). */
  readonly embedUrl: string;

  /** URL publique YouTube (lien « Regarder sur YouTube »). */
  readonly watchUrl: string;

  /** Label du badge LIVE. */
  readonly badge: string;
}

/** Carte live secondaire (concerts, replay, etc.). */
export interface LiveCard {
  /** Identifiant unique (utilisé pour le track). */
  readonly id: string;

  /** Emoji de la carte. */
  readonly icon: string;

  /** Titre (ex : CONCERTS). */
  readonly title: string;

  /** Description courte. */
  readonly description: string;

  /** Label du lien d'action. */
  readonly actionLabel: string;

  /** URL externe de la carte. */
  readonly actionUrl: string;

  /** Classe CSS additionnelle (ex : card-concerts). */
  readonly cssClass: string;
}