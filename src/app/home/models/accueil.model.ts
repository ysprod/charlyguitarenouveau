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



export interface CollaborationGroup {
  readonly label: string;
  readonly artists: string;
}

// export interface FestivalItem {
//   readonly badge: string;
//   readonly description: string;
// }

// src/app/home/accueil/models/accueil.model.ts

/* ═════════════════════════════════════════════════════════════════════
   ACCUEIL — MODÈLES
   ═════════════════════════════════════════════════════════════════════ */

/** Statistique affichée dans le hero. */
export interface StatItem {
  readonly id: string;
  readonly number: string;
  readonly numericValue: number;
  readonly suffix: string; 
  readonly label: string;
  readonly highlight: boolean;
}

/** Tag de compétence. */
export interface SkillTag {
  readonly label: string;
}

/** Groupe de collaborations par genre musical. */
export interface CollaborationGroup {
  readonly id: string;
  readonly label: string;
  readonly color: string;
  readonly artists: string;
}

/** Événement / festival affiché dans la timeline. */
export interface FestivalItem {
  readonly id: string;
  readonly year: string;
  readonly description: string;
}

/** Distinction / prix affiché dans la section Awards. */
export interface Award {
  readonly id: string;
  readonly icon: string;
  readonly title: string;
  readonly description: string;
}

