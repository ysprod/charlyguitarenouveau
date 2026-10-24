// src/app/academie/academie.component.ts

import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router, RouterLink, RouterOutlet, NavigationEnd } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map, startWith } from 'rxjs/operators';

@Component({
  selector: 'app-academie',
  imports: [RouterOutlet, RouterLink],
  templateUrl: './academie.component.html',
  styleUrls: ['./academie.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AcademieComponent {
  private readonly router = inject(Router);

  /* ═══════════════════════════════════════════════════════
     DÉTECTION DE LA ROUTE ACTIVE
     ═══════════════════════════════════════════════════════ */

  private readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map((e) => e.urlAfterRedirects),
      startWith(this.router.url),
    ),
    { initialValue: this.router.url },
  );

  /**
   * ✅ URL nettoyée (sans query params ni slash final)
   */
  private readonly cleanUrl = computed(() => {
    const url = this.currentUrl().split('?')[0].split('#')[0];
    return url.length > 1 && url.endsWith('/') ? url.slice(0, -1) : url;
  });

  /**
   * ✅ Affiche le bouton retour uniquement si on n'est PAS sur la page d'accueil
   */
  readonly showBackButton = computed(() => this.cleanUrl() !== '/academie');

  /**
   * ✅ Détermine le titre de la page en fonction de la route actuelle
   */
  readonly pageTitle = computed(() => {
    const url = this.cleanUrl();

    if (url === '/academie') return 'Ecole de Formation';
    if (url.startsWith('/academie/live')) return 'Apprendre en Live';
    if (url.startsWith('/academie/offres')) return 'Offres & Tarifs';
    if (url.startsWith('/academie/documents')) return 'Boutique';

    return 'Ecole de Formation';
  });
}