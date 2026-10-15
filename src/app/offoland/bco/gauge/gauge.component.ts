// src/app/shared/gauge/gauge.component.ts

import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  linkedSignal,
} from '@angular/core';

/* ═══════════════════════════════════════════════════════════
   CONSTANTES
   ═══════════════════════════════════════════════════════════ */

const RADIUS = 50;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const ANIMATION_DURATION_MS = 1200;

/* ═══════════════════════════════════════════════════════════
   COMPOSANT
   ═══════════════════════════════════════════════════════════ */

@Component({
  selector: 'app-gauge',
  imports: [],
  templateUrl: './gauge.component.html',
  styleUrls: ['./gauge.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GaugeComponent {

  /* ═══════════════════════════════════════════════════════
     INJECTION
     ═══════════════════════════════════════════════════════ */

  private readonly destroyRef = inject(DestroyRef);

  /* ═══════════════════════════════════════════════════════
     ENTRÉES
     ═══════════════════════════════════════════════════════ */

  /** Valeur 0-100. */
  readonly value = input(0);

  /** Libellé sous la jauge. */
  readonly label = input('');

  /** Unité affichée sous la valeur. */
  readonly unit = input('%');

  /** Couleur de départ du dégradé. */
  readonly colorFrom = input('#FFD700');

  /** Couleur de fin du dégradé. */
  readonly colorTo = input('#FF8C00');

  /* ═══════════════════════════════════════════════════════
     CONSTANTES EXPOSÉES
     ═══════════════════════════════════════════════════════ */

  readonly circumference = CIRCUMFERENCE;

  readonly gradientId = `gauge-gradient-${Math.random().toString(36).slice(2, 11)}`;

  /* ═══════════════════════════════════════════════════════
     VALEUR ANIMÉE (linkedSignal)
     ═══════════════════════════════════════════════════════ */

  /** Valeur cible clampée 0-100. */
  private readonly clampedValue = computed(() =>
    Math.max(0, Math.min(100, this.value()))
  );

  /**
   * Valeur animée : se met à jour quand `clampedValue` change.
   * L'animation est déclenchée dans l'`effect` ci-dessous.
   */
  readonly animatedValue = linkedSignal(() => this.clampedValue());

  /* ═══════════════════════════════════════════════════════
     COMPUTED — GÉOMÉTRIE
     ═══════════════════════════════════════════════════════ */

  /** Décalage du trait de progression (stroke-dashoffset). */
  readonly dashOffset = computed(() => {
    const ratio = this.animatedValue() / 100;
    return CIRCUMFERENCE - ratio * CIRCUMFERENCE;
  });

  /** Valeur affichée au centre (1 décimale). */
  readonly displayValue = computed(() => this.animatedValue().toFixed(1));

  /* ═══════════════════════════════════════════════════════
     CYCLE DE VIE
     ═══════════════════════════════════════════════════════ */

  constructor() {
    /* Cleanup de l'animation en cours à la destruction */
    this.destroyRef.onDestroy(() => {
      if (this.rafId !== null) {
        cancelAnimationFrame(this.rafId);
        this.rafId = null;
      }
    });

    /* Déclenche l'animation quand la valeur cible change */
    effect(() => {
      const target = this.clampedValue();
      this.animateTo(target);
    });
  }

  /* ═══════════════════════════════════════════════════════
     ANIMATION
     ═══════════════════════════════════════════════════════ */

  private rafId: number | null = null;

  private animateTo(target: number): void {
    /* Annule l'animation précédente */
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;

    if (prefersReducedMotion || typeof window === 'undefined') {
      this.animatedValue.set(target);
      return;
    }

    const startValue = this.animatedValue();
    const startTime = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / ANIMATION_DURATION_MS);
      const eased = 1 - Math.pow(1 - t, 3);

      this.animatedValue.set(startValue + (target - startValue) * eased);

      if (t < 1) {
        this.rafId = requestAnimationFrame(animate);
      } else {
        this.animatedValue.set(target);
        this.rafId = null;
      }
    };

    this.rafId = requestAnimationFrame(animate);
  }
}