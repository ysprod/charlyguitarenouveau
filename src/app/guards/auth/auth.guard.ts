import { inject } from '@angular/core';
import {
  CanActivateFn,
  Router,
  UrlTree
} from '@angular/router';
import { Auth, authState } from '@angular/fire/auth';
import { Observable } from 'rxjs';
import { map, take } from 'rxjs/operators';
import { getSafeReturnUrl } from 'src/app/utils/url.utils';
import { AUTH_ROUTES, RETURN_URL_PARAM } from 'src/app/constants/auth.constants';

 

/**
 * Guard d'authentification.
 *
 * - Utilise `authState(auth)` (au lieu de `user(auth)`) pour attendre
 *   la restauration de la session Firebase avant d'émettre.
 * - Redirige vers `/login?returnUrl=...` si l'utilisateur n'est pas connecté.
 * - Le `returnUrl` est **validé** pour empêcher les redirections externes.
 */
export const AuthGuard: CanActivateFn = (
  _route,
  state
): Observable<boolean | UrlTree> => {
  const auth = inject(Auth);
  const router = inject(Router);

  return authState(auth).pipe(
    take(1),
    map(currentUser => {
      if (currentUser) return true;

      const safeReturnUrl = getSafeReturnUrl(state.url);

      return router.createUrlTree([AUTH_ROUTES.LOGIN], {
        queryParams: { [RETURN_URL_PARAM]: safeReturnUrl }
      });
    })
  );
};