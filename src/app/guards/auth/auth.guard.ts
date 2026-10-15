import { inject } from '@angular/core';
import {
  CanActivateFn,
  Router,
  UrlTree,
} from '@angular/router';

import { Auth, authState } from '@angular/fire/auth';

import { Observable, of } from 'rxjs';
import { catchError, map, take } from 'rxjs/operators';

import { getSafeReturnUrl } from 'src/app/home/utils/url.utils';
import {
  AUTH_ROUTES,
  RETURN_URL_PARAM,
} from 'src/app/home/constants/auth.constants';

/**
 * Guard d'authentification.
 *
 * - Utilise `authState(auth)` (au lieu de `user(auth)`) pour attendre
 *   la restauration de la session Firebase avant d'émettre.
 * - Redirige vers `/login?returnUrl=...` si l'utilisateur n'est pas connecté.
 * - Le `returnUrl` est **validé** pour empêcher les redirections externes.
 * - En cas d'erreur Firebase, redirige également vers `/login`.
 */
export const AuthGuard: CanActivateFn = (
  _route,
  state
): Observable<boolean | UrlTree> => {
  const auth = inject(Auth);
  const router = inject(Router);

  /* Factorisation : évite la duplication de la logique de redirection. */
  const redirectToLogin = (): UrlTree => {
    const safeReturnUrl = getSafeReturnUrl(state.url);

    return router.createUrlTree([AUTH_ROUTES.LOGIN], {
      queryParams: { [RETURN_URL_PARAM]: safeReturnUrl },
    });
  };

  return authState(auth).pipe(
    take(1),

    /* Utilisateur connecté → autorise, sinon → redirige. */
    map((currentUser) => (currentUser ? true : redirectToLogin())),

    /* En cas d'erreur Firebase → redirige vers /login. */
    catchError((error) => {
      console.warn('[AuthGuard] Erreur authState :', error);
      return of(redirectToLogin());
    })
  );
};