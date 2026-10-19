import {
  AccordOrigine,
  NoteSacree,
  Portail
} from '../models/offoland.model';

export const MELODIE_ORIGINES: readonly AccordOrigine[] = [
  { label: 'La m', color: '#64748b' },
  { label: 'Ré m', color: '#dc2626' },
  { label: 'Fa M', color: '#b8860b' },
  { label: 'Sol M', color: '#16a34a' },
];

export const SEPT_NOTES: readonly NoteSacree[] = [
  { label: 'Do', color: '#94a3b8' },
  { label: 'Ré', color: '#dc2626' },
  { label: 'Mi', color: '#16a34a' },
  { label: 'Fa', color: '#2563eb' },
  { label: 'Sol', color: '#1c1917' },
  { label: 'La', color: '#9333ea' },
  { label: 'Si', color: '#7c3aed' },
];

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