// src/app/offoland/data/offoland.data.ts

import {
  AccordOrigine,
  CheminSection,
  Divinite,
  NoteSacree,
  OffolandQuote,
  Portail,
} from '../models/offoland.model';

/* ═════════════════════════════════════════════════════════════════════
   BASELINE
   ═════════════════════════════════════════════════════════════════════ */

export const OFFLOLAND_BASELINE =
  'La terre cachée entre les eaux, les montagnes et les forêts.';

/* ═════════════════════════════════════════════════════════════════════
   MÉLODIE DES ORIGINES
   ═════════════════════════════════════════════════════════════════════ */

export const MELODIE_ORIGINES: readonly AccordOrigine[] = [
  { label: 'La m', color: '#64748b' },
  { label: 'Ré m', color: '#dc2626' },
  { label: 'Fa M', color: '#b8860b' },
  { label: 'Sol M', color: '#16a34a' },
];

/* ═════════════════════════════════════════════════════════════════════
   LES SEPT NOTES DE LA CRÉATION
   ═════════════════════════════════════════════════════════════════════ */

export const SEPT_NOTES: readonly NoteSacree[] = [
  { label: 'Do', color: '#94a3b8' },
  { label: 'Ré', color: '#dc2626' },
  { label: 'Mi', color: '#16a34a' },
  { label: 'Fa', color: '#2563eb' },
  { label: 'Sol', color: '#1c1917' },
  { label: 'La', color: '#9333ea' },
  { label: 'Si', color: '#7c3aed' },
];

/* ═════════════════════════════════════════════════════════════════════
   PORTAILS
   ═════════════════════════════════════════════════════════════════════ */

export const PORTAILS_INTRO =
  'Choisis ton chemin. Deux voies sont déjà ouvertes. Les autres attendent leur voyageur.';

export const PORTAILS: readonly Portail[] = [
  {
    id: 'economie',
    icon: '🏦',
    label: 'ÉCONOMIE',
    sub: 'Offo Money · BCO · Marché',
    route: '/finance',
    cssClass: 'portail-economie',
  },
  {
    id: 'banque',
    icon: '⚖️',
    label: 'BANQUE CENTRALE',
    sub: 'Masse monétaire · Réserves',
    route: '/bco',
    cssClass: 'portail-banque',
  },
  {
    id: 'patrimoine',
    icon: '🎼',
    label: 'PATRIMOINE',
    sub: 'Instruments · Mélodies sacrées',
    route: null,
    cssClass: '',
  },
  {
    id: 'nature',
    icon: '🌿',
    label: 'NATURE',
    sub: 'Forêts · Rivières · Totems',
    route: null,
    cssClass: '',
  },
  {
    id: 'destinee',
    icon: '⭐',
    label: 'DESTINÉE',
    sub: 'Sept Portails · Offolomou',
    route: null,
    cssClass: '',
  },
];

/* ═════════════════════════════════════════════════════════════════════
   CITATION SACRÉE
   ═════════════════════════════════════════════════════════════════════ */

export const HERO_QUOTE: OffolandQuote = {
  text:
    '« Celui qui découvrira l’harmonie des Sept Dimensions connaîtra Offolomou, »',
  author: '— Le Conseil des Sages d’Offoland',
};

/* ═════════════════════════════════════════════════════════════════════
   DIVINITÉS
   ═════════════════════════════════════════════════════════════════════ */

export const DIVINITES: readonly Divinite[] = [
  {
    id: 'offomiji',
    icon: '💧',
    name: 'Offomiji',
    role: 'Gardienne des Eaux Éternelles',
    quote: '« Rien ne guérit sans être d’abord reconnu. »',
  },
  {
    id: 'offocolo',
    icon: '❤️',
    name: 'Offocolo',
    role: 'Roi de l’Amour et de la Cohésion',
    quote:
      '« Celui qui marche seul va vite. Celui qui marche avec les autres va plus loin. »',
  },
  {
    id: 'offowa',
    icon: '🔑',
    name: 'Offowa',
    role: 'Gardienne des Sept Portails',
    quote:
      '« Le portail ne refuse personne. Il révèle le moment où chacun est prêt. »',
  },
];

/* ═════════════════════════════════════════════════════════════════════
   SECTION « LE CHEMIN »
   ═════════════════════════════════════════════════════════════════════ */

export const CHEMIN_SECTION: CheminSection = {
  title: 'Le Chemin',
  icon: '🥁',
  paragraphs: [
    'Offoland ne s’ouvre ni par la force, ni par le savoir. Elle s’ouvre à celui qui accepte de marcher avec humilité, vérité et respect.',
    '« Celui qui joue pour être admiré entendra seulement les sons. Celui qui joue pour servir entendra la musique. Celui qui joue avec vérité ouvrira les Sept Portails. »',
  ],
};