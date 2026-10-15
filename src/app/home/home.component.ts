// src/app/home/home.component.ts

import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  untracked,
} from '@angular/core';

import { Router, RouterLink } from '@angular/router';
import { Auth, authState } from '@angular/fire/auth';
import { toSignal } from '@angular/core/rxjs-interop';

import { FooterComponent } from './footer/footer.component';

@Component({
  selector: 'app-home',
  imports: [RouterLink, FooterComponent],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeComponent {

  /* ═══════════════════════════════════════════════════════
     INJECTION
     ═══════════════════════════════════════════════════════ */

  private readonly auth = inject(Auth);
  private readonly router = inject(Router);

  /* ═══════════════════════════════════════════════════════
     UTILISATEUR FIREBASE (null si déconnecté)
     ═══════════════════════════════════════════════════════ */

  private readonly currentUser = toSignal(authState(this.auth), {
    initialValue: null,
  });

  /* ═══════════════════════════════════════════════════════
     REDIRECTION AUTOMATIQUE (avec garde anti-boucle)
     ═══════════════════════════════════════════════════════ */

  private static readonly REDIRECT_TARGET = '/amanda';

  constructor() {
    effect(() => {
      const user = this.currentUser();
      if (!user) return;

      /* Garde anti-boucle : ne redirige que si on n'est pas déjà sur la cible */
      if (this.router.url.startsWith(HomeComponent.REDIRECT_TARGET)) return;

      untracked(() => {
        void this.router.navigateByUrl(HomeComponent.REDIRECT_TARGET, {
          replaceUrl: true,
        });
      });
    });
  }
}