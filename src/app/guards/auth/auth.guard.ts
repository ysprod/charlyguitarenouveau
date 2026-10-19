// src/app/home/guards/auth/auth.guard.ts

import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { Auth, user } from '@angular/fire/auth';
import { Observable, of } from 'rxjs';
import { catchError, filter, map, take } from 'rxjs/operators';

import { getSafeReturnUrl } from 'src/app/home/utils/url.utils';
import {
  AUTH_ROUTES,
  RETURN_URL_PARAM,
} from 'src/app/home/constants/auth.constants';

/**
 * Guard d'authentification optimisé pour Angular 21.
 *
 * Comportement :
 * - Attend que Firebase ait fini de restaurer la session via `user(auth)`.
 * - Filtre l'état indéfini (`undefined`) pour éviter les faux négatifs au rafraîchissement.
 * - Redirige vers `/login?returnUrl=...` si non connecté (avec URL sécurisée).
 * - Gère proprement les erreurs Firebase de manière réactive.
 */
export const AuthGuard: CanActivateFn = (_route, state): Observable<boolean | UrlTree> => {
  const auth = inject(Auth);
  const router = inject(Router);

  const redirectToLogin = (): UrlTree => {
    const safeReturnUrl = getSafeReturnUrl(state.url);
    return router.createUrlTree([AUTH_ROUTES.LOGIN], {
      queryParams: { [RETURN_URL_PARAM]: safeReturnUrl },
    });
  };

  return user(auth).pipe(
    // Ignore l'état initial où Firebase n'a pas encore restauré la session
    filter((u): u is NonNullable<typeof u> | null => u !== undefined),
    
    // Prend uniquement la première valeur résolue
    take(1),
    
    // Si l'utilisateur existe (User object), on autorise (true), sinon on redirige vers le login
    map((currentUser) => (currentUser ? true : redirectToLogin())),
    
    // Sécurité en cas d'erreur de flux Firebase
    catchError((error) => {
      console.warn(
        '[AuthGuard] Erreur d\'authentification Firebase :',
        error?.code ?? error,
        error?.message ?? ''
      );
      return of(redirectToLogin());
    }),
  );
};