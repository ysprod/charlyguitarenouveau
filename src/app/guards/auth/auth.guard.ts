// src/app/home/guards/auth/auth.guard.ts

import { inject } from '@angular/core';
import {
  CanActivateFn,
  Router,
  UrlTree,
} from '@angular/router';

import { Auth, user } from '@angular/fire/auth';

import { Observable, of } from 'rxjs';
import {
  catchError,
  filter,
  map,
  take,
} from 'rxjs/operators';

import { getSafeReturnUrl } from 'src/app/home/utils/url.utils';
import {
  AUTH_ROUTES,
  RETURN_URL_PARAM,
} from 'src/app/home/constants/auth.constants';

/**
 * Guard d'authentification.
 *
 * Comportement :
 * - Attend que Firebase ait **fini de restaurer la session** avant de décider.
 * - `user(auth)` émet `undefined` tant que la session n'est pas restaurée,
 *   puis `User | null` une fois la réponse Firebase obtenue.
 * - On filtre `undefined` pour éviter les faux négatifs au refresh.
 * - Redirige vers `/login?returnUrl=...` si non connecté.
 * - Le `returnUrl` est validé contre les redirections externes.
 * - En cas d'erreur Firebase, redirige vers `/login` et log le code.
 */
export const AuthGuard: CanActivateFn = (
  _route,
  state,
): Observable<boolean | UrlTree> => {
  const auth = inject(Auth);
  const router = inject(Router);

  /* Factorisation de la redirection login */
  const redirectToLogin = (): UrlTree => {
    const safeReturnUrl = getSafeReturnUrl(state.url);

    return router.createUrlTree([AUTH_ROUTES.LOGIN], {
      queryParams: { [RETURN_URL_PARAM]: safeReturnUrl },
    });
  };

  return user(auth).pipe(
    /* ⚠️ Crucial : ignore l'état "session pas encore restaurée" */
    filter((u) => u !== undefined),

    /* On ne garde que la première réponse ferme (User ou null) */
    take(1),

    /* Connecté → autorise, sinon → redirige */
    map((currentUser) => (currentUser ? true : redirectToLogin())),

    /* En cas d'erreur Firebase → redirige + log le code */
    catchError((error) => {
      console.warn(
        '[AuthGuard] Erreur Firebase:',
        error?.code ?? error,
        error?.message ?? '',
      );
      return of(redirectToLogin());
    }),
  );
};