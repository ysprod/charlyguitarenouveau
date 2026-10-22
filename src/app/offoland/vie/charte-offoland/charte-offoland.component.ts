// src/app/charte/charte-offoland.component.ts

import { ChangeDetectionStrategy, Component } from '@angular/core';

import { ArticleCardComponent } from './components/article-card.component';
import { DimensionCardComponent } from './components/dimension-card.component';
import { PrincipleCardComponent } from './components/principle-card.component';

import {
  CHARTER_ARTICLES,
  CHARTER_DIMENSIONS,
  CHARTER_FOOTER,
  CHARTER_GARDIENS,
  CHARTER_HERO,
  CHARTER_NAVIGATION,
  CHARTER_PREAMBULE,
  CHARTER_PRINCIPES,
  CHARTER_SECTION_IDS,
  CHARTER_SERMENT,
} from './charte-offoland.constants';

import {
  CHARTER_ARTICLES_LIST as ARTICLES_DATA,
  CHARTER_DIMENSIONS_LIST as DIMENSIONS_DATA,
  CHARTER_GUARDIAN_DUTIES as DUTIES_DATA,
  CHARTER_OATH_PARAGRAPHS as OATH_DATA,
  CHARTER_PRINCIPLES as PRINCIPLES_DATA,
} from './charte-offoland.data';

@Component({
  selector: 'app-charte-offoland',
  standalone: true,
  imports: [
    ArticleCardComponent,
    DimensionCardComponent,
    PrincipleCardComponent,
  ],
  templateUrl: './charte-offoland.component.html',
  styleUrl: './charte-offoland.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CharteOffolandComponent {
  /* ─── Constantes exposées au template ─── */
  protected readonly SECTION_IDS = CHARTER_SECTION_IDS;
  protected readonly HERO = CHARTER_HERO;
  protected readonly PREAMBULE = CHARTER_PREAMBULE;
  protected readonly PRINCIPES = CHARTER_PRINCIPES;
  protected readonly ARTICLES_SECTION = CHARTER_ARTICLES;
  protected readonly DIMENSIONS_SECTION = CHARTER_DIMENSIONS;
  protected readonly GARDIENS = CHARTER_GARDIENS;
  protected readonly SERMENT = CHARTER_SERMENT;
  protected readonly FOOTER = CHARTER_FOOTER;

  /* ─── Navigation ─── */
  protected readonly navigation = CHARTER_NAVIGATION;

  /* ─── Données ─── */
  protected readonly articles = ARTICLES_DATA;
  protected readonly principles = PRINCIPLES_DATA;
  protected readonly dimensions = DIMENSIONS_DATA;
  protected readonly guardianDuties = DUTIES_DATA;
  protected readonly oathParagraphs = OATH_DATA;

  /* ═══════════════════════════════════════════════════════
     SCROLL INTERNE — évite la navigation Angular
     ═══════════════════════════════════════════════════════ */

  /**
   * Fait défiler la page jusqu'à la section ciblée SANS
   * déclencher la navigation du Router Angular.
   *
   * ✅ Accepte `Event` (et non `MouseEvent`) pour être compatible
   *    avec les événements `(click)` ET `(keydown.enter)`.
   */
  protected scrollTo(sectionId: string, event: Event): void {
    event.preventDefault();

    const el = document.getElementById(sectionId);
    if (!el) return;

    el.scrollIntoView({ behavior: 'smooth', block: 'start' });

    /* Met à jour l'URL sans recharger (facultatif mais sympa) */
    if (typeof history !== 'undefined' && history.replaceState) {
      history.replaceState(null, '', `#${sectionId}`);
    }
  }
}