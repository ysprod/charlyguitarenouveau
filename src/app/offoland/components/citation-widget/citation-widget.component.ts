// src/app/offoland/components/citation-widget/citation-widget.component.ts

import {
  ChangeDetectionStrategy,
  Component,
  computed,
  signal,
} from '@angular/core';
import { OFFOLAND_CITATIONS, OffolandCitation } from '../../data/citations.data';

@Component({
  selector: 'app-citation-widget',
  standalone: true,
  templateUrl: './citation-widget.component.html',
  styleUrl: './citation-widget.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CitationWidgetComponent {
  
  // Signal pour l'index de la citation actuelle
  private readonly currentIndex = signal(0);
  
  // Citation calculée
  readonly currentCitation = computed<OffolandCitation>(() => 
    OFFOLAND_CITATIONS[this.currentIndex()]
  );

  nextCitation(): void {
    this.currentIndex.update((index) => {
      let next = Math.floor(Math.random() * OFFOLAND_CITATIONS.length);
      // On s'assure de ne pas retomber sur la même citation immédiatement
      while (next === index && OFFOLAND_CITATIONS.length > 1) {
        next = Math.floor(Math.random() * OFFOLAND_CITATIONS.length);
      }
      return next;
    });
  }
}