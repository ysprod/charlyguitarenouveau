import {
  Component,
  ElementRef,
  ViewChild,
  signal,
  computed,
  ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

import { PackCategory, PackCategoryId } from '../../home/models/pack.model';
import { PACK_CATEGORIES } from '../packs.data';

/* ============================================================
   COMPOSANT — sans animations
   ============================================================ */

@Component({
  selector: 'app-offres',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './offres.component.html',
  styleUrls: ['./offres.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OffresComponent {

  @ViewChild('packsSection') packsSection?: ElementRef<HTMLElement>;

  readonly categories: PackCategory[] = PACK_CATEGORIES;

  readonly activeCategory = signal<PackCategoryId>('debutant');
  readonly hoveredPack = signal<string | null>(null);

  readonly currentCategory = computed(() =>
    this.categories.find(c => c.id === this.activeCategory())!
  );

  formatPrice(price: number): string {
    return new Intl.NumberFormat('fr-FR').format(price);
  }

  selectCategory(id: PackCategoryId): void {
    this.activeCategory.set(id);
    this.scrollToPacks();
  }

  onPackHover(id: string | null): void {
    this.hoveredPack.set(id);
  }

  private scrollToPacks(): void {
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    setTimeout(() => {
      this.packsSection?.nativeElement?.scrollIntoView({
        behavior: prefersReducedMotion ? 'auto' : 'smooth',
        block: 'start',
      });
    }, 50);
  }
}