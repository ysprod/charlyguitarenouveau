// src/app/home/accueil/data/accueil.data.ts

import {
  Award,
  CollaborationGroup,
  FestivalItem,
  SkillTag,
  StatItem,
} from '../models/accueil.model';

/* ═════════════════════════════════════════════════════════════════════
   IDENTITÉ
   ═════════════════════════════════════════════════════════════════════ */

export const ARTIST_NAME = 'CHARLY GUITARE';

export const ARTIST_TAGLINE =
  'M. Kotchi Kacou Jean-Charles • Arranger, Composer & Afro-Guitar Master';

export const ARTIST_VIDEO_URL = 'https://www.youtube.com/embed/6S8m0-hQ29k?rel=0';
export const ARTIST_YOUTUBE_URL = 'https://www.youtube.com/watch?v=6S8m0-hQ29k';

/* ═════════════════════════════════════════════════════════════════════
   STATISTIQUES
   ═════════════════════════════════════════════════════════════════════ */

export const STATS: readonly StatItem[] = [
  {
    id: 'experience',
    number: '15+',
    numericValue: 15,
    suffix: '+',
    label: "Années d'Expérience",
    highlight: false,
  },
  {
    id: 'artists',
    number: '25+',
    numericValue: 25,
    suffix: '+',
    label: 'Artistes Majeurs Accompagnés',
    highlight: false,
  },
];

/* ═════════════════════════════════════════════════════════════════════
   BIO
   ═════════════════════════════════════════════════════════════════════ */

export const BIO_INTRO =
  'connu sous le nom scénique de Charly Guitare, figure parmi les leaders incontournables de la musique ivoirienne contemporaine. Arrangeur recherché, auteur-compositeur et guitariste d’exception, il incarne l’excellence rythmique du Coupé-Décalé, du Reggae et de la Pop Africaine.';

export const BIO_NAME = 'M. Kotchi Kacou Jean-Charles';

/* ═════════════════════════════════════════════════════════════════════
   EXPERTISES
   ═════════════════════════════════════════════════════════════════════ */

export const SKILLS: readonly SkillTag[] = [
  { label: 'Guitare Solo & Rythmique' },
  { label: 'Coupé-Décalé Method' },
  { label: 'Arrangement Studio' },
  { label: 'Direction Artistique' },
  { label: 'World Music & Jazz Fusion' },
];

/* ═════════════════════════════════════════════════════════════════════
   COLLABORATIONS
   ═════════════════════════════════════════════════════════════════════ */

export const COLLABORATIONS: readonly CollaborationGroup[] = [
  {
    id: 'urban',
    label: 'Urban & Coupé-Décalé',
    color: '#ea580c', // 🟠
    artists:
      'Ariel Sheney, Kerozen, Safarel Obiang, DJ Mix Premier, DJ Léo, Feu Ericson le Zoulou, Vitale, Bamba Ami Sarah, Abou Nidal…',
  },
  {
    id: 'reggae',
    label: 'Reggae & World Music',
    color: '#16a34a', // 🟢
    artists:
      'Ismaël Isaac, Hamed Faras, Alain Spyrow, Jim Kamson, Rass Julian, Kadjim, Ken de Korhogo, Feu Larry Cheick…',
  },
  {
    id: 'gospel',
    label: 'Gospel & International',
    color: '#2563eb', // 🔵
    artists:
      'O’nel Mala, Purichi Apo (Guinée Équatoriale), Nafasi, Two Boys, Afou Keïta…',
  },
];

/* ═════════════════════════════════════════════════════════════════════
   FESTIVALS
   ═════════════════════════════════════════════════════════════════════ */

export const SCENIC_DESC =
  'Ancien collaborateur de la compagnie de danse contemporaine Jenny Mezile et révélé sur les scènes de Podium (2007, 2008).';

export const FESTIVALS: readonly FestivalItem[] = [
  {
    id: 'femua',
    year: 'FEMUA',
    description: 'Éditions majeurs 2017, 2018, 2019',

  },
  {
    id: 'masa',
    year: 'MASA',
    description: 'Présence continue (2015, 2016, 2017, 2018, 2019)',
  },
  {
    id: 'maroc',
    year: 'Maroc',
    description: 'Equipo Completo (Rabat 2014-2015)',
  },
  {
    id: 'jazz',
    year: 'Jazz',
    description: 'Jazz Inter 1ère Édition (Prix Don du Talent)',
  },
];

/* ═════════════════════════════════════════════════════════════════════
   AWARDS
   ═════════════════════════════════════════════════════════════════════ */

export const AWARDS: readonly Award[] = [
  {
    id: 'don-du-talent',
    icon: '🏆',
    title: 'Prix Don du Talent',
    description: 'Décerné lors de Jazz Inter 1ère Édition',
  },
];