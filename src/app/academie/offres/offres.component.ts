// src/app/offres/offres.component.ts

import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  afterNextRender,
  computed,
  inject,
  signal,
  viewChild,
  ElementRef,
} from '@angular/core';

import { RouterLink } from '@angular/router';

import { PackCategory, PackCategoryId } from '../models/pack.model';
import { PACK_CATEGORIES } from '../data/packs.data';

import { FormatPricePipe } from '../pipes/format-price.pipe';

/* ═════════════════════════════════════════════════════════════════════
   OFFRES — Packs pédagogiques
   ═════════════════════════════════════════════════════════════════════ */

@Component({
  selector: 'app-offres',
  imports: [
    RouterLink,
    FormatPricePipe,
  ],
  templateUrl: './offres.component.html',
  styleUrls: ['./offres.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OffresComponent {

  /* ─── Injection ─── */
  private readonly destroyRef = inject(DestroyRef);

  /* ─── ViewChild (signal-based) ─── */
  readonly packsSection = viewChild<ElementRef<HTMLElement>>('packsSection');

  /* ─── Données ─── */
  readonly categories: readonly PackCategory[] = PACK_CATEGORIES;

  /* ─── État UI ─── */
  readonly activeCategory = signal<PackCategoryId>('debutant');
  readonly hoveredPack = signal<string | null>(null);

  /* ─── Computed ─── */
  readonly currentCategory = computed<PackCategory | null>(() => {
    const id = this.activeCategory();
    return this.categories.find((c) => c.id === id) ?? this.categories[0] ?? null;
  });

  /* ─── Timeout actif (nettoyé à la destruction) ─── */
  private scrollTimeoutId: ReturnType<typeof setTimeout> | null = null;

  /* ═══════════════════════════════════════════════════════
     CONSTRUCTEUR — cleanup
     ═══════════════════════════════════════════════════════ */

  constructor() {
    this.destroyRef.onDestroy(() => {
      if (this.scrollTimeoutId !== null) {
        clearTimeout(this.scrollTimeoutId);
        this.scrollTimeoutId = null;
      }
    });
  }

  /* ═══════════════════════════════════════════════════════
     ACTIONS
     ═══════════════════════════════════════════════════════ */

  selectCategory(id: PackCategoryId): void {
    this.activeCategory.set(id);
    this.scheduleScrollToPacks();
  }

  onPackHover(id: string | null): void {
    this.hoveredPack.set(id);
  }

  /* ═══════════════════════════════════════════════════════
     SCROLL — planifié après le rendu
     ═══════════════════════════════════════════════════════ */

  private scheduleScrollToPacks(): void {
    if (this.scrollTimeoutId !== null) {
      clearTimeout(this.scrollTimeoutId);
    }

    this.scrollTimeoutId = setTimeout(() => {
      this.scrollTimeoutId = null;
      this.scrollToPacks();
    }, 50);
  }

  private scrollToPacks(): void {
    const element = this.packsSection()?.nativeElement;
    if (!element || typeof window === 'undefined') return;

    const prefersReducedMotion =
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

    element.scrollIntoView({
      behavior: prefersReducedMotion ? 'auto' : 'smooth',
      block: 'start',
    });
  }
}