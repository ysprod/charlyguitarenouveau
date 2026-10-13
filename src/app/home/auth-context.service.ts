import {
  EnvironmentInjector,
  Injectable,
  inject,
  runInInjectionContext
} from '@angular/core';

import { ActivatedRoute } from '@angular/router';

import { FirebaseAuthError } from './models/auth.model';
import {
  FIREBASE_ERRORS,
  FIREBASE_ERROR_FALLBACK
} from './constants/auth.constants';

/* ═════════════════════════════════════════════════════════════════════
   SERVICE PARTAGÉ AUTH
   ═════════════════════════════════════════════════════════════════════ */

@Injectable({ providedIn: 'root' })
export class AuthContextService {
  private readonly environmentInjector = inject(EnvironmentInjector);
  private readonly route = inject(ActivatedRoute);

  /**
   * Exécute une fonction Firebase dans le contexte d'injection Angular.
   */
  runInContext<T>(fn: () => T): T {
    return runInInjectionContext(this.environmentInjector, fn);
  }

  /**
   * Résout `returnUrl` depuis les query params, en bloquant les open-redirects.
   *
   * @param fallback URL par défaut si aucun `returnUrl` valide.
   */
  resolveReturnUrl(fallback: string): string {
    const raw = this.route.snapshot.queryParamMap.get('returnUrl');

    const isSafe =
      !!raw && raw.startsWith('/') && !raw.startsWith('//');

    return isSafe ? raw! : fallback;
  }

  /**
   * Convertit une erreur Firebase en message FR lisible.
   */
  getFrenchErrorMessage(error: unknown): string {
    const code = this.getFirebaseErrorCode(error);

    if (code && FIREBASE_ERRORS[code]) {
      return FIREBASE_ERRORS[code];
    }

    console.error('❌ Erreur Firebase inconnue :', error);
    console.error('   Code :', code);

    return FIREBASE_ERROR_FALLBACK;
  }

  /**
   * Extrait le code d'erreur Firebase (si présent).
   */
  getFirebaseErrorCode(error: unknown): string {
    if (typeof error === 'object' && error !== null && 'code' in error) {
      const firebaseError = error as FirebaseAuthError;
      return firebaseError.code ?? '';
    }
    return '';
  }
}