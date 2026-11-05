// src/app/shared/cookie-banner/cookie-banner.component.ts

import {
  ChangeDetectionStrategy,
  Component,
  afterNextRender,
  signal,
} from '@angular/core';

import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-cookie-banner',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './cookie-banner.component.html',
  styleUrls: ['./cookie-banner.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CookieBannerComponent {
  private static readonly STORAGE_KEY = 'cg.cookie.consent.v1';

  readonly visible = signal(false);

  constructor() {
    afterNextRender(() => {
      if (typeof window === 'undefined') return;

      try {
        const stored = window.localStorage.getItem(
          CookieBannerComponent.STORAGE_KEY,
        );
        this.visible.set(stored !== 'accepted');
      } catch {
        // localStorage indisponible (mode privé strict) → on n'affiche pas
        this.visible.set(false);
      }
    });
  }

  accept(): void {
    try {
      window.localStorage.setItem(
        CookieBannerComponent.STORAGE_KEY,
        'accepted',
      );
    } catch {
      /* ignore */
    }
    this.visible.set(false);
  }
}