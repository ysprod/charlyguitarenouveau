// src/app/offoland/innovation/innovation.component.ts

import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/* ═════════════════════════════════════════════════════════════════════
   TYPES
   ═════════════════════════════════════════════════════════════════════ */

interface InnovationPillar {
  id: string;
  icon: string;
  title: string;
  subtitle: string;
  description: string;
  color: string;
  route: string;
  tag?: string;
}

/* ═════════════════════════════════════════════════════════════════════
   DONNÉES
   ═════════════════════════════════════════════════════════════════════ */

const INNOVATION_PILLARS: readonly InnovationPillar[] = [
  {
    id: 'harmoniques',
    icon: '🎼',
    title: 'Harmoniques Sacrées',
    subtitle: 'Acoustique des Sept Notes',
    description:
      'Étude des vibrations primordiales et de leur influence sur les Sept Dimensions. Recherche sur la résonance des instruments sacrés.',
    color: '#b8860b',
    route: '/offoland/innovation/harmoniques',
    tag: 'Son & Vibration',
  },
  {
    id: 'portails',
    icon: '🌀',
    title: 'Portails Dimensionnels',
    subtitle: 'Technologie des Seuils',
    description:
      'Compréhension des mécanismes d\'ouverture des Sept Portails. Cartographie des flux dimensionnels et des points d\'ancrage.',
    color: '#7c3aed',
    route: '/offoland/innovation/portails',
    tag: 'Dimensions',
  },
  {
    id: 'totems',
    icon: '🐉',
    title: 'Interfaces Totémiques',
    subtitle: 'Symbiose Homme-Nature',
    description:
      'Développement d\'interfaces de communication avec les Sept Totems. Protocoles de symbiose et de coévolution consciente.',
    color: '#0891b2',
    route: '/offoland/innovation/totems',
    tag: 'Bio-Tech',
  },
  {
    id: 'memoire',
    icon: '📜',
    title: 'Mémoire des Origines',
    subtitle: 'Archives Vivantes',
    description:
      'Préservation numérique des Chroniques et des chants sacrés. Reconstitution holographique des Sept Temples originels.',
    color: '#db2777',
    route: '/offoland/innovation/memoire',
    tag: 'Archives',
  },
];

const INNOVATION_STATS = [
  { value: '7', label: 'Dimensions explorées' },
  { value: '21', label: 'Livres étudiés' },
  { value: '∞', label: 'Creations possibles' },
] as const;

/* ═════════════════════════════════════════════════════════════════════
   COMPOSANT
   ═════════════════════════════════════════════════════════════════════ */

@Component({
  selector: 'app-innovation',
  imports: [RouterLink],
  templateUrl: './innovation.component.html',
  styleUrl: './innovation.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InnovationComponent {
  protected readonly pillars = INNOVATION_PILLARS;
  protected readonly stats = INNOVATION_STATS;

  /* ═══════════════════════════════════════════════════════
     SCROLL INTERNE — ancres
     ═══════════════════════════════════════════════════════ */

  protected scrollTo(sectionId: string, event: Event): void {
    event.preventDefault();
    const el = document.getElementById(sectionId);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (typeof history !== 'undefined' && history.replaceState) {
      history.replaceState(null, '', `#${sectionId}`);
    }
  }
}