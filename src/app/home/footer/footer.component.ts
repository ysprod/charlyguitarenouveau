// src/app/home/footer/footer.component.ts

import {
  ChangeDetectionStrategy,
  Component,
  inject,
} from '@angular/core';

import { RouterLink, RouterLinkActive } from '@angular/router';

import { InstallComponent } from '../install/install.component';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-footer',
  imports: [RouterLink, RouterLinkActive, InstallComponent],
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FooterComponent {

  /* ─── Injection ─── */
  readonly auth = inject(AuthService);

  /* ─── Constantes ─── */
  readonly currentYear = new Date().getFullYear();

  /* ═══════════════════════════════════════════════════════
     SCROLL
     ═══════════════════════════════════════════════════════ */

  scrollToTop(): void {
    if (typeof window === 'undefined') return;

    const prefersReducedMotion =
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

    window.scrollTo({
      top: 0,
      behavior: prefersReducedMotion ? 'auto' : 'smooth',
    });
  }
}