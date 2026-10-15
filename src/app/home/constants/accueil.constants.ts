// src/app/features/accueil/accueil.constants.ts

/**
 * Constantes globales du composant Accueil.
 * Centralise les données statiques pour faciliter la maintenance.
 */

export const ARTIST_INFO = {
  name: 'CHARLY GUITARE',
  realName: 'M. Kotchi Kacou Jean-Charles',
  tagline: 'Arranger, Composer & Afro-Guitar Master',
  youtubeVideoId: '6S8m0-hQ29k',
  youtubeWatchUrl: 'https://www.youtube.com/watch?v=6S8m0-hQ29k',
  youtubeEmbedUrl: 'https://www.youtube.com/embed/6S8m0-hQ29k?rel=0',
} as const;

 

export const EXPERTISE_TAGS: readonly string[] = [
  'Guitare Solo & Rythmique',
  'Coupé-Décalé Method',
  'Arrangement Studio',
  'Direction Artistique',
  'World Music & Jazz Fusion',
] as const;

export const STATS = [
  { value: '15+', label: "Années d'Expérience", highlight: false },
  { value: '25+', label: 'Artistes Majeurs Accompagnés', highlight: false },
] as const;

export const COLLABORATIONS = [
  {
    label: 'Urban & Coupé-Décalé',
    artists:
      'Ariel Sheney, Kerozen, Safarel Obiang, DJ Mix Premier, DJ Léo, Feu Ericson le Zoulou, Vitale, Bamba Ami Sarah, Abou Nidal...',
  },
  {
    label: 'Reggae & World Music',
    artists:
      'Ismaël Isaac, Hamed Faras, Alain Spyrow, Jim Kamson, Rass Julian, Kadjim, Ken de Korhogo, Feu Larry Cheick...',
  },
  {
    label: 'Gospel & International',
    artists:
      "O'nel Mala, Purichi Apo (Guinée Équatoriale), Nafasi, Two Boys, Afou Keïta...",
  },
] as const;

export const FESTIVALS = [
  { badge: 'FEMUA', description: 'Éditions majeures 2017, 2018, 2019' },
  { badge: 'MASA', description: 'Présence continue (2015 → 2019)' },
  { badge: 'Maroc', description: 'Equipo Completo (Rabat 2014-2015)' },
  { badge: 'Jazz', description: 'Jazz Inter 1ère Édition (Prix Don du Talent)' },
] as const;