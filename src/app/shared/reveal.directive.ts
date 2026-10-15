// src/app/shared/directives/reveal.directive.ts

import {
  Directive,
  ElementRef,
  afterNextRender,
  inject,
  input,
  signal,
  DestroyRef,
} from '@angular/core';

/* ═════════════════════════════════════════════════════════════════════
   REVEAL DIRECTIVE — Révélation d'un élément au scroll
   ─────────────────────────────────────────────────────────────────────
   Utilise `IntersectionObserver` pour ajouter la classe `.reveal-in`
   lorsque l'élément entre dans le viewport.

   SSR-safe : l'observation démarre uniquement côté navigateur.
   ═════════════════════════════════════════════════════════════════════ */

@Directive({
  selector: '[appReveal]',

  /* ═══════════════════════════════════════════════════════
     HOST BINDINGS — pas de manipulation DOM directe
     ═══════════════════════════════════════════════════════ */
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
  /** Délai d'animation en ms (permet un effet cascade). */
  readonly revealDelay = input<number>(0);

  /* ─── État interne ─── */
  private readonly _isRevealed = signal(false);

  /** Exposé pour les host bindings. */
  protected readonly isRevealed = this._isRevealed.asReadonly();

  /* ─── Observer ─── */
  private observer?: IntersectionObserver;

  /* ═══════════════════════════════════════════════════════
     CONSTRUCTEUR — afterNextRender + cleanup
     ═══════════════════════════════════════════════════════ */

  constructor() {

    /* Démarre l'observation uniquement côté navigateur */
    afterNextRender(() => {
      if (typeof window === 'undefined') return;
      if (typeof IntersectionObserver === 'undefined') {
        /* Navigateur sans support → révélation immédiate */
        this._isRevealed.set(true);
        return;
      }

      const host = this.el.nativeElement;

      this.observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              this._isRevealed.set(true);
              this.observer?.unobserve(host);
            }
          }
        },
        {
          threshold: 0.12,
          rootMargin: '0px 0px -60px 0px',
        }
      );

      this.observer.observe(host);
    });

    /* Nettoyage automatique à la destruction */
    this.destroyRef.onDestroy(() => {
      this.observer?.disconnect();
      this.observer = undefined;
    });
  }
}