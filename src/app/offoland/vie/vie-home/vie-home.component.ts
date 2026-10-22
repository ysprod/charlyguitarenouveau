// src/app/offoland/vie/vie-home/vie-home.component.ts

import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/* ═════════════════════════════════════════════════════════════════════
   TYPES
   ═════════════════════════════════════════════════════════════════════ */

interface VieSection {
  id: string;
  label: string;
  subtitle: string;
  description: string;
  icon: string;
  color: string;
  route: string;
  tag?: string;
}

/* ═════════════════════════════════════════════════════════════════════
   DONNÉES
   ═════════════════════════════════════════════════════════════════════ */

const VIE_SECTIONS: readonly VieSection[] = [
   {
    id: 'charte',
    label: 'La Charte',
    subtitle: 'Texte fondateur d\'Offoland',
    description:
      'Le texte fondateur de l\'univers d\'Offoland : l\'écoute, la connaissance, le respect de la vie et la transmission.',
    icon: '📜',
    color: '#b8860b',
    route: '/offoland/vie/charte',
    tag: 'Fondateur',
  },
  {
  id: 'innovation',
  label: 'C.R.I.O.',
  subtitle: 'Centre de Recherche & Innovation',
  description:
    'Notre portail technologique avancé : harmoniques sacrées, portails dimensionnels, interfaces totémiques et archives vivantes.',
  icon: '⚙️',
  color: '#b8860b',
  route: '/offoland/vie/innovation',
  tag: 'Technologie',
},
  {
    id: 'bco',
    label: 'BCO',
    subtitle: 'Banque Centrale d\'Offoland',
    description:
      'Le régulateur monétaire du royaume. Surveille la masse monétaire, l\'inflation et les taux de change.',
    icon: '🏦',
    color: '#7c3aed',
    route: '/offoland/vie/bco',
    tag: 'Monétaire',
  },
  {
    id: 'finance',
    label: 'Finance',
    subtitle: 'Économie d\'Offoland',
    description:
      'Les flux financiers, la masse monétaire et les indicateurs économiques du royaume.',
    icon: '💰',
    color: '#0891b2',
    route: '/offoland/vie/finance',
    tag: 'Économie',
  },
 
];

/* ═════════════════════════════════════════════════════════════════════
   COMPOSANT
   ═════════════════════════════════════════════════════════════════════ */

@Component({
  selector: 'app-vie-home',
  imports: [RouterLink],
  templateUrl: './vie-home.component.html',
  styleUrls: ['./vie-home.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VieHomeComponent {
  readonly sections: readonly VieSection[] = VIE_SECTIONS;
}