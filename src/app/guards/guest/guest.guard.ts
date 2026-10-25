// src/app/guards/guest/guest.guard.ts

import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { Auth, user, User } from '@angular/fire/auth';
import { Observable, of } from 'rxjs';
import { catchError, filter, map, take } from 'rxjs/operators';

/**
 * Guard inverse de AuthGuard :
 * - Si l'utilisateur EST connecté → redirige vers /user/amanda (espace personnel)
 * - Si l'utilisateur N'EST PAS connecté → autorise l'accès (landing page)
 */
export const GuestGuard: CanActivateFn = (): Observable<boolean | UrlTree> => {
  const auth = inject(Auth);
  const router = inject(Router);

  return user(auth).pipe(
    // 1️⃣ Ignore l'état initial `undefined` de Firebase (session en cours de chargement)
    filter((u): u is User | null => u !== undefined),

    // 2️⃣ Prend uniquement la première valeur résolue et se désabonne automatiquement
    take(1),

    // 3️⃣ Si connecté (User présent) → redirige vers /user/amanda, sinon → autorise (true)
    map((currentUser) => 
      currentUser ? router.createUrlTree(['/user/amanda']) : true
    ),

    // 4️⃣ En cas d'erreur de flux, on laisse passer (mode visiteur de secours)
    catchError(() => of(true)),
  );
};