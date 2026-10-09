import {
  Component,
  signal,
  computed,
  ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import {
  trigger,
  style,
  animate,
  transition,
  query,
  stagger
} from '@angular/animations';

import { PackCategory, PackCategoryId } from '../models/pack.model';
import { PACK_CATEGORIES } from '../data/packs.data';

/* ============================================================
   COMPOSANT
   ============================================================ */

@Component({
  selector: 'app-offres',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './offres.component.html',
  styleUrls: ['./offres.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [
    trigger('fadeInUp', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(40px)' }),
        animate(
          '700ms cubic-bezier(0.22, 1, 0.36, 1)',
          style({ opacity: 1, transform: 'translateY(0)' })
        )
      ])
    ]),
    trigger('staggerPacks', [
      transition(':enter', [
        query(
          '.pack-card',
          [
            style({ opacity: 0, transform: 'translateY(60px) scale(0.95)' }),
            stagger(120, [
              animate(
                '800ms cubic-bezier(0.22, 1, 0.36, 1)',
                style({ opacity: 1, transform: 'translateY(0) scale(1)' })
              )
            ])
          ],
          { optional: true }
        )
      ])
    ]),
    trigger('heroEnter', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(30px)' }),
        animate(
          '900ms cubic-bezier(0.22, 1, 0.36, 1)',
          style({ opacity: 1, transform: 'translateY(0)' })
        )
      ])
    ])
  ]
})
export class OffresComponent {
  /* ============================================================
     DONNÉES
     ============================================================ */

  readonly categories: PackCategory[] = PACK_CATEGORIES;

  /* ============================================================
     SIGNAUX UI
     ============================================================ */

  readonly activeCategory = signal<PackCategoryId>('debutant');
  readonly hoveredPack = signal<string | null>(null);

  readonly currentCategory = computed(() =>
    this.categories.find(c => c.id === this.activeCategory())!
  );

  /* ============================================================
     HELPERS
     ============================================================ */

  formatPrice(price: number): string {
    return new Intl.NumberFormat('fr-FR').format(price);
  }

  selectCategory(id: PackCategoryId): void {
    this.activeCategory.set(id);
    setTimeout(() => {
      document
        .querySelector('.packs-section')
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  }

  onPackHover(id: string | null): void {
    this.hoveredPack.set(id);
  }
}