import {   Portail} from '../models/offoland.model';

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