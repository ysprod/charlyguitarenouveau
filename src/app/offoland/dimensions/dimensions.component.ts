// src/app/offoland/dimensions/dimensions.component.ts

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
import { filter, map } from 'rxjs/operators';

/* ═════════════════════════════════════════════════════════════════════
   TYPES
   ═════════════════════════════════════════════════════════════════════ */

interface DimensionInfo {
  /** Segment d'URL (ex: 'blanc', 'rouge', 'charlyguitaregame') */
  segment: string;
  /** Nom affiché (ex: 'Blanc', 'Rouge', 'Galerie des dimensions') */
  label: string;
  /** Symbole décoratif */
  icon: string;
}

/* ═════════════════════════════════════════════════════════════════════
   CONSTANTES
   ═════════════════════════════════════════════════════════════════════ */

/** URL de la galerie — utilisée pour savoir si on affiche le bouton retour. */
const GALLERY_SEGMENT = 'charlyguitaregame';

/** Mapping segment → infos d'affichage. */
const DIMENSION_INFO_MAP: Record<string, DimensionInfo> = {
  blanc:            { segment: 'blanc',            label: 'Dimension Blanc',                icon: '✨' },
  rouge:            { segment: 'rouge',            label: 'Dimension Rouge',                icon: '🔥' },
  vert:             { segment: 'vert',             label: 'Dimension Vert',                 icon: '🌿' },
  bleu:             { segment: 'bleu',             label: 'Dimension Bleu',                 icon: '🌊' },
  noir:             { segment: 'noir',             label: 'Dimension Noir',                 icon: '🖤' },
  pourpre:          { segment: 'pourpre',          label: 'Dimension Violet',              icon: '👁️' },
  violet:           { segment: 'violet',           label: 'Dimension Jaune',               icon: '👑' },
  charlyguitaregame:{ segment: 'charlyguitaregame', label: 'Les 7 dimensions', icon: '🌌' },
};

/* ═════════════════════════════════════════════════════════════════════
   COMPOSANT
   ═════════════════════════════════════════════════════════════════════ */

@Component({
  selector: 'app-dimensions',
  imports: [RouterOutlet, RouterLink],
  templateUrl: './dimensions.component.html',
  styleUrls: ['./dimensions.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DimensionsComponent {

  private readonly router = inject(Router);

  /* ═══════════════════════════════════════════════════════
     URL COURANTE (réactive)
     ═══════════════════════════════════════════════════════ */

  private readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map((e) => e.urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );

  /* ═══════════════════════════════════════════════════════
     SEGMENT ACTIF
     ═══════════════════════════════════════════════════════ */

  /**
   * Extrait le segment de dimension depuis l'URL.
   * Ex: `/offoland/dimensions/blanc` → `'blanc'`
   */
  private readonly activeSegment = computed<string | null>(() => {
    const url = this.currentUrl();
    const match = url.match(/\/offoland\/dimensions\/([^/?#]+)/);
    return match?.[1] ?? null;
  });

  /* ═══════════════════════════════════════════════════════
     INFOS DE LA DIMENSION ACTIVE
     ═══════════════════════════════════════════════════════ */

  readonly activeDimension = computed<DimensionInfo | null>(() => {
    const seg = this.activeSegment();
    if (!seg) return null;
    return DIMENSION_INFO_MAP[seg] ?? null;
  });

  /* ═══════════════════════════════════════════════════════
     VISIBILITÉ DU BOUTON RETOUR
     ═══════════════════════════════════════════════════════ */

  /**
   * ✅ Le bouton retour est masqué sur la galerie (`charlyguitaregame`),
   *    affiché sur toutes les dimensions.
   */
  readonly showBackButton = computed(
    () => this.activeSegment() !== null && this.activeSegment() !== GALLERY_SEGMENT,
  );

  /* ═══════════════════════════════════════════════════════
     LIBELLÉ DE LA DIMENSION
     ═══════════════════════════════════════════════════════ */

  readonly currentLabel = computed(
    () => this.activeDimension()?.label ?? 'Dimensions',
  );

  readonly currentIcon = computed(
    () => this.activeDimension()?.icon ?? '🌌',
  );
}