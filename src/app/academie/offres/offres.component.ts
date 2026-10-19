// src/app/offres/offres.component.ts

import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  EnvironmentInjector,
  afterNextRender,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';

import { RouterLink } from '@angular/router';

import { PackCategory, PackCategoryId } from '../models/pack.model';
import { PACK_CATEGORIES } from '../data/packs.data';

import { FormatPricePipe } from '../pipes/format-price.pipe';

/* ═════════════════════════════════════════════════════════════════════
   OFFRES — Packs pédagogiques (optimisé)
   ═════════════════════════════════════════════════════════════════════ */

@Component({
  selector: 'app-offres',
  imports: [RouterLink, FormatPricePipe],
  templateUrl: './offres.component.html',
  styleUrls: ['./offres.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OffresComponent {

  private readonly destroyRef = inject(DestroyRef);

  /* ─── ViewChild signal-based ─── */
  readonly packsSection = viewChild<ElementRef<HTMLElement>>('packsSection');

  /* ─── Données (constantes) ─── */
  readonly categories: readonly PackCategory[] = PACK_CATEGORIES;

  /* ─── État UI ─── */
  readonly activeCategory = signal<PackCategoryId>('debutant');

  /* ─── Computed ─── */
  readonly currentCategory = computed<PackCategory | null>(() => {
    const id = this.activeCategory();
    return this.categories.find((c) => c.id === id) ?? this.categories[0] ?? null;
  });

  /** ✅ Couleur d'accent exposée via un computed (mise en cache) */
  readonly currentAccent = computed(
    () => this.currentCategory()?.accentColor ?? '#a87400',
  );

  /* ─── Flag "scroll demandé" (pour déclencher afterNextRender) ─── */
  private pendingScroll = false;

  /* ═══════════════════════════════════════════════════════
     CONSTRUCTEUR — cleanup
     ═══════════════════════════════════════════════════════ */

  constructor() {
    /* ✅ Cleanup : plus de setTimeout à nettoyer manuellement.
       Le `pendingScroll` est un simple booléen. */
    this.destroyRef.onDestroy(() => {
      this.pendingScroll = false;
    });
  }

  /* ═══════════════════════════════════════════════════════
     ACTIONS
     ═══════════════════════════════════════════════════════ */

  selectCategory(id: PackCategoryId): void {
    if (this.activeCategory() === id) return;

    this.activeCategory.set(id);
    this.scheduleScrollToPacks();
  }

  /* ═══════════════════════════════════════════════════════
     SCROLL — via afterNextRender (fiable, sans setTimeout)
     ═══════════════════════════════════════════════════════ */

  private scheduleScrollToPacks(): void {
    if (this.pendingScroll) return;
    this.pendingScroll = true;

    /* ✅ `afterNextRender` exécute la callback après le prochain rendu
       du composant — donc après que le nouveau `<section>` soit dans le DOM. */
    afterNextRender(
      () => {
        this.pendingScroll = false;
        this.scrollToPacks();
      },
      { injector: inject(EnvironmentInjector) },
    );
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