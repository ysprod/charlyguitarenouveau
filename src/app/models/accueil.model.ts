// src/app/features/accueil/accueil.model.ts

export interface ArtistInfo {
  readonly name: string;
  readonly realName: string;
  readonly tagline: string;
  readonly youtubeVideoId: string;
  readonly youtubeWatchUrl: string;
  readonly youtubeEmbedUrl: string;
}

export interface AwardInfo {
  readonly title: string;
  readonly subtitle: string;
  readonly icon: string;
}

export interface StatItem {
  readonly value: string;
  readonly label: string;
  readonly highlight: boolean;
}

export interface CollaborationGroup {
  readonly label: string;
  readonly artists: string;
}

export interface FestivalItem {
  readonly badge: string;
  readonly description: string;
}

