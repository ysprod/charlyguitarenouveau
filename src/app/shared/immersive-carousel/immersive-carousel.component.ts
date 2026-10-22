// src/app/shared/immersive-carousel/immersive-carousel.component.ts

import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnDestroy,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, NavigationEnd } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map, startWith } from 'rxjs/operators';

import { ImmersiveCard, DEFAULT_IMMERSIVE_CARDS } from './immersive-carousel.data';

@Component({
  selector: 'app-immersive-carousel',
  imports: [CommonModule, RouterLink],
  templateUrl: './immersive-carousel.component.html',
  styleUrls: ['./immersive-carousel.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImmersiveCarouselComponent implements OnInit, OnDestroy {
  private readonly router = inject(Router);

  /** 
   * ✅ Si aucune carte n'est passée en @Input, on utilise les données par défaut.
   */
  @Input() cards: readonly ImmersiveCard[] = DEFAULT_IMMERSIVE_CARDS;
  
  /** Délai de rotation en millisecondes (désactiver avec 0) */
  @Input() autoRotateDelay: number = 6000;

  /** Index de la carte actuellement au centre */
  readonly activeIndex = signal(0);
  
  private rotationInterval?: ReturnType<typeof setInterval>;

  /* ═══════════════════════════════════════════════════════
     URL COURANTE (Signal)
     ═══════════════════════════════════════════════════════ */
  private readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map((e) => e.urlAfterRedirects),
      startWith(this.router.url),
    ),
    { initialValue: this.router.url }
  );

  /* ═══════════════════════════════════════════════════════
     FILTRAGE DES CARTES
     ═══════════════════════════════════════════════════════ */
  readonly filteredCards = computed(() => {
    const url = this.currentUrl().split('?')[0]; // On ignore les query params
    
    return this.cards.filter(card => {
      // Si la route de la carte est la page actuelle, on la retire
      // On vérifie si l'URL actuelle commence par la route (pour gérer les sous-pages)
      return !url.startsWith(card.route);
    });
  });

  ngOnInit(): void {
    this.checkAutoRotation();
  }

  ngOnDestroy(): void {
    this.stopAutoRotation();
  }

  /* ═══════════════════════════════════════════════════════
     LOGIQUE DE ROTATION
     ═══════════════════════════════════════════════════════ */

  next(): void {
    const len = this.filteredCards().length;
    if (len === 0) return;
    this.activeIndex.update((i) => (i + 1) % len);
    this.resetAutoRotation();
  }

  prev(): void {
    const len = this.filteredCards().length;
    if (len === 0) return;
    this.activeIndex.update((i) => (i - 1 + len) % len);
    this.resetAutoRotation();
  }

  goTo(index: number): void {
    this.activeIndex.set(index);
    this.resetAutoRotation();
  }

  private checkAutoRotation(): void {
    if (this.filteredCards().length > 1 && this.autoRotateDelay > 0) {
      this.startAutoRotation();
    } else {
      this.stopAutoRotation();
    }
  }

  private startAutoRotation(): void {
    this.stopAutoRotation();
    this.rotationInterval = setInterval(() => {
      const len = this.filteredCards().length;
      if (len > 1) {
        this.activeIndex.update((i) => (i + 1) % len);
      }
    }, this.autoRotateDelay);
  }

  stopAutoRotation(): void {
    if (this.rotationInterval) {
      clearInterval(this.rotationInterval);
    }
  }

  resetAutoRotation(): void {
    this.stopAutoRotation();
    if (this.autoRotateDelay > 0) {
      this.startAutoRotation();
    }
  }
}