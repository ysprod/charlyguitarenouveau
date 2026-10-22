// src/app/offoland/vie/vie.component.ts

import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';

import {
  NavigationEnd,
  Router,
  RouterLink,
  RouterOutlet,
} from '@angular/router';

import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map, startWith } from 'rxjs/operators';

/* ═════════════════════════════════════════════════════════════════════
   TYPES
   ═════════════════════════════════════════════════════════════════════ */

interface VieSectionInfo {
  segment: string;
  label: string;
  icon: string;
}

/* ═════════════════════════════════════════════════════════════════════
   CONSTANTES
   ═════════════════════════════════════════════════════════════════════ */

/** Info affichée quand on est sur la page hub (pas de sous-segment). */
const HUB_INFO: VieSectionInfo = {
  segment: '',
  label: 'Offoland City',
  icon: '🌍',
};

const VIE_INFO_MAP: Record<string, VieSectionInfo> = {
  bco:     { segment: 'bco',     label: 'BCO',           icon: '🏦' },
  finance: { segment: 'finance', label: 'Finance',       icon: '💰' },
  charte:  { segment: 'charte',  label: 'La Charte',     icon: '📜' },
  innovation: { segment: 'innovation', label: 'C.R.I.O.', icon: '⚙️' },
};

/* ═════════════════════════════════════════════════════════════════════
   COMPOSANT
   ═════════════════════════════════════════════════════════════════════ */

@Component({
  selector: 'app-vie',
  imports: [RouterOutlet, RouterLink],
  templateUrl: './vie.component.html',
  styleUrls: ['./vie.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VieComponent {

  private readonly router = inject(Router);

  /* ═══════════════════════════════════════════════════════
     URL COURANTE
     ═══════════════════════════════════════════════════════ */

  private readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map((e) => e.urlAfterRedirects),
      startWith(this.router.url),
    ),
    { initialValue: this.router.url },
  );

  /* ═══════════════════════════════════════════════════════
     SEGMENT ACTIF
     ═══════════════════════════════════════════════════════ */

  private readonly activeSegment = computed<string | null>(() => {
    const url = this.currentUrl().split('?')[0].split('#')[0];
    const match = url.match(/\/offoland\/vie\/([^/]+)/);
    return match?.[1] ?? null;
  });

  /* ═══════════════════════════════════════════════════════
     INFOS DE LA SECTION ACTIVE
     ═══════════════════════════════════════════════════════ */

  readonly activeSection = computed<VieSectionInfo>(() => {
    const seg = this.activeSegment();
    if (!seg) return HUB_INFO;
    return VIE_INFO_MAP[seg] ?? HUB_INFO;
  });

  readonly currentLabel = computed(() => this.activeSection().label);
  readonly currentIcon = computed(() => this.activeSection().icon);

  /* ═══════════════════════════════════════════════════════
     VISIBILITÉ DU BOUTON RETOUR
     ═══════════════════════════════════════════════════════ */

  /**
   * ✅ Le bouton retour n'apparaît que sur les sous-pages (bco, finance, charte).
   *    Sur la page hub (/offoland/vie), il est masqué.
   */
  readonly showBackButton = computed(() => this.activeSegment() !== null);
}