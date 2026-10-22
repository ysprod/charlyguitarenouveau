// src/app/home/guards/auth/auth.guard.ts

import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { Auth, user, User } from '@angular/fire/auth';
import { Observable, of } from 'rxjs';
import {
  catchError,
  distinctUntilChanged,
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
 * Guard d'authentification optimisé.
 *
 * Optimisations apportées :
 *  - `redirectToLogin()` extrait et réutilisé (map + catchError)
 *  - `distinctUntilChanged()` sur `uid` → évite les émissions redondantes
 *    (ex : refresh de token Firebase avec le même utilisateur)
 *  - `take(1)` placé APRÈS `filter` → garantit la 1ʳᵉ valeur *stable*
 *  - Log d'erreur structuré (code + message) plus lisible dans la console
 *  - Typage strict `unknown` pour l'erreur (compatible `strict: true`)
 *  - Pipeline commenté et lisible
 */
export const AuthGuard: CanActivateFn = (
  _route,
  state,
): Observable<boolean | UrlTree> => {
  const auth = inject(Auth);
  const router = inject(Router);

  /** Construit l'URL de login avec le returnUrl sécurisé. */
  const redirectToLogin = (): UrlTree =>
    router.createUrlTree([AUTH_ROUTES.LOGIN], {
      queryParams: { [RETURN_URL_PARAM]: getSafeReturnUrl(state.url) },
    });

  return user(auth).pipe(
    // 1️⃣ Ignore l'état initial `undefined` de Firebase (chargement de session)
    filter((u): u is User | null => u !== undefined),

    // 2️⃣ Évite les émissions redondantes (ex : refresh de token identique)
    distinctUntilChanged((prev, curr) => prev?.uid === curr?.uid),

    // 3️⃣ On ne garde que la 1ʳᵉ valeur stable → désinscription auto
    take(1),

    // 4️⃣ Autorise si connecté, sinon redirige
    map((currentUser) => (currentUser ? true : redirectToLogin())),

    // 5️⃣ Capture d'erreur centralisée + log enrichi
    catchError((error: unknown) => {
      const e = error as { code?: string; message?: string };
      console.warn('[AuthGuard] Erreur Firebase :', {
        code: e?.code ?? 'unknown',
        message: e?.message ?? String(error),
      });
      return of(redirectToLogin());
    }),
  );
};