// src/app/user/user.component.ts

import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router, RouterLink, RouterOutlet, NavigationEnd } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map, startWith } from 'rxjs/operators';

@Component({
  selector: 'app-user',
  imports: [RouterOutlet, RouterLink],
  templateUrl: './user.component.html',
  styleUrls: ['./user.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserComponent {
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

  private readonly cleanUrl = computed(() => {
    const url = this.currentUrl().split('?')[0].split('#')[0];
    return url.length > 1 && url.endsWith('/') ? url.slice(0, -1) : url;
  });

  /**
   * ✅ Masque le bouton retour UNIQUEMENT sur les vraies pages d'accueil
   * → /user, /user/, 
   */
  readonly showBackButton = computed(() => {
    const url = this.cleanUrl();
    const homeUrls = ['/user', '/user/amanda'];
    return !homeUrls.includes(url);
  });

  /**
   * ✅ Détermine le titre de la page en fonction de la route actuelle
   */
  readonly pageTitle = computed(() => {
    const url = this.cleanUrl();

    if (url === '/user' || url === '/user/amanda') return 'Bienvenue / Welcome';
    if (url === '/user/accueil') return 'Charly Guitare';
    if (url.startsWith('/user/profil')) return 'Mon Profil';
    if (url.startsWith('/user/inbox')) return 'Messages';
    if (url.startsWith('/user/notifications')) return 'Notifications';
    if (url.startsWith('/user/studio')) return 'Studio Professionnel';
    if (url.startsWith('/user/noslives')) return 'ShowCases';
    if (url.startsWith('/user/contact')) return 'Contact';
    if (url.startsWith('/user/again')) return 'LA DREAM TEAM';
    if (url.startsWith('/user/privacy')) return 'Confidentialité';
    if (url.startsWith('/user/mentions')) return 'Mentions Légales';

    return 'Bienvenue / Welcome'; // Fallback
  });
}