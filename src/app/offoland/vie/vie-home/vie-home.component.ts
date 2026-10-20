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