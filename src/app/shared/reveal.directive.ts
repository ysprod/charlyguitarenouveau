// src/app/shared/directives/reveal.directive.ts

import {
  DestroyRef,
  Directive,
  ElementRef,
  afterNextRender,
  inject,
  input,
  numberAttribute,
  signal,
} from '@angular/core';

/* ═════════════════════════════════════════════════════════════════════
   REVEAL DIRECTIVE — Révélation d'un élément au scroll
   ─────────────────────────────────────────────────────────────────────
   Utilise `IntersectionObserver` pour ajouter la classe `.reveal-in`
   lorsque l'élément entre dans le viewport.

   SSR-safe : l'observation démarre uniquement côté navigateur.
   Accessibilité : respecte `prefers-reduced-motion`.
   ═════════════════════════════════════════════════════════════════════ */

@Directive({
  selector: '[appReveal]',
  host: {
    '[class.reveal-init]': '!isRevealed()',
    '[class.reveal-in]': 'isRevealed()',
    '[style.transition-delay.ms]': 'revealDelay()',
  },
})
export class RevealDirective {

  /* ─── Injection ─── */
  private readonly el = inject(ElementRef<HTMLElement>);
  private readonly destroyRef = inject(DestroyRef);

  /* ─── Inputs ─── */
  /**
   * Délai d'animation en ms (permet un effet cascade).
   * ✅ `numberAttribute` garantit que `revealDelay="300"` est bien un number.
   */
  readonly revealDelay = input<number, unknown>(0, {
    transform: numberAttribute,
  });

  /* ─── État interne ─── */
  protected readonly isRevealed = signal(false);

  /* ─── Observer ─── */
  private observer?: IntersectionObserver;

  /* ═══════════════════════════════════════════════════════
     CONSTRUCTEUR
     ═══════════════════════════════════════════════════════ */

  constructor() {
    afterNextRender(() => {
      /* ─── 1. Environnement sans DOM → rien à faire ─── */
      if (typeof window === 'undefined') return;

      /* ─── 2. Respect de `prefers-reduced-motion` ─── */
      const prefersReducedMotion =
        window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ??
        false;

      if (prefersReducedMotion) {
        /* ✅ Utilisateur sensible aux animations : on révèle immédiatement,
           sans transition visuelle. */
        this.isRevealed.set(true);
        return;
      }

      /* ─── 3. Navigateur sans IntersectionObserver ─── */
      if (typeof IntersectionObserver === 'undefined') {
        this.isRevealed.set(true);
        return;
      }

      /* ─── 4. Observation ─── */
      const host = this.el.nativeElement;

      this.observer = new IntersectionObserver(
        (entries, observer) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              this.isRevealed.set(true);
              observer.unobserve(host);
              /* ✅ On libère complètement l'observer dès qu'il a rempli
                 son rôle — plus de référence à l'élément. */
              observer.disconnect();
              this.observer = undefined;
              break;
            }
          }
        },
        {
          threshold: 0.12,
          rootMargin: '0px 0px -60px 0px',
        },
      );

      this.observer.observe(host);
    });

    /* Nettoyage automatique à la destruction du composant hôte */
    this.destroyRef.onDestroy(() => {
      this.observer?.disconnect();
      this.observer = undefined;
    });
  }
}