// src/app/live/models/live.model.ts

export interface LiveVideo {
  title: string;
  embedUrl: string;
  watchUrl: string;
  badge: string;
}

export interface LiveCard {
  id: string;
  icon: string;
  title: string;
  description: string;
  date?: string;
  actionLabel: string;
  actionUrl: string;
  cssClass: string;
}

/** ✅ Nouveau modèle pour la section "À la une" */
export interface FeaturedVideo {
  id: string;
  title: string;
  artist: string;
  duration: string;
  thumbnailUrl: string;
  youtubeUrl: string;
  views: number; // Le nombre de vues (pour la sélection)
}