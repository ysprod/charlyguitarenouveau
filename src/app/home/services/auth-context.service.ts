import {
  EnvironmentInjector,
  Injectable,
  inject,
  runInInjectionContext,
} from '@angular/core';

import { ActivatedRoute } from '@angular/router';

import {
  FIREBASE_ERROR_FALLBACK,
  FIREBASE_ERRORS,
} from '../constants/auth.constants';
import { FirebaseAuthError } from '../models/auth.model';

/* ═════════════════════════════════════════════════════════════════════
   SERVICE PARTAGÉ AUTH
   ═════════════════════════════════════════════════════════════════════ */

@Injectable({ providedIn: 'root' })
export class AuthContextService {

  private readonly environmentInjector = inject(EnvironmentInjector);
  private readonly route = inject(ActivatedRoute);

  /** ✅ Déduplication des warnings pour éviter le spam console */
  private readonly warnedCodes = new Set<string>();

  /* ═══════════════════════════════════════════════════════
     CONTEXTE D'INJECTION
     ═══════════════════════════════════════════════════════ */

  /**
   * Exécute une fonction Firebase dans le contexte d'injection Angular.
   *
   * ✅ Encapsule l'appel dans un try/catch explicite : si le contexte
   *    est corrompu (usage hors lifecycle), l'erreur est plus claire.
   */
  runInContext<T>(fn: () => T): T {
    try {
      return runInInjectionContext(this.environmentInjector, fn);
    } catch (error) {
      console.error(
        '[AuthContextService] Impossible d\'exécuter la fonction dans le contexte Angular :',
        error,
      );
      throw error;
    }
  }

  /* ═══════════════════════════════════════════════════════
     RETURN URL — SÉCURISÉ
     ═══════════════════════════════════════════════════════ */

  /**
   * Résout `returnUrl` depuis les query params, en bloquant les open-redirects.
   *
   * ✅ Rejette :
   *    - URLs absolues (`https://evil.com`)
   *    - Protocol-relative (`//evil.com`)
   *    - Variantes encodées qui décodent vers `//` (ex: `%2F%2F`)
   *    - Retours vides ou whitespace-only
   *
   * @param fallback URL par défaut si aucun `returnUrl` valide.
   */
  resolveReturnUrl(fallback: string): string {
    const raw = this.route.snapshot.queryParamMap.get('returnUrl');
    if (!raw) return fallback;

    /* ✅ Décodage pour attraper les tentatives d'encodage */
    let decoded: string;
    try {
      decoded = decodeURIComponent(raw);
    } catch {
      return fallback;
    }

    /* ✅ Trim pour gérer les variantes `"  /admin"` */
    const trimmed = decoded.trim();
    if (!trimmed) return fallback;

    /* ✅ Bloque les open-redirects :
       - doit commencer par `/` (chemin interne)
       - ne doit PAS commencer par `//` (protocol-relative)
       - ne doit PAS contenir de protocole (`http:`, `javascript:`, etc.) */
    const isSafe =
      trimmed.startsWith('/') &&
      !trimmed.startsWith('//') &&
      !/^[a-zA-Z][a-zA-Z0-9+.-]*:/i.test(trimmed);

    return isSafe ? trimmed : fallback;
  }

  /* ═══════════════════════════════════════════════════════
     ERREURS FIREBASE
     ═══════════════════════════════════════════════════════ */

  /**
   * Convertit une erreur Firebase en message FR lisible.
   *
   * ✅ Déduplique les warnings pour ne pas spammer la console
   *    si la même erreur revient plusieurs fois.
   */
  getFrenchErrorMessage(error: unknown): string {
    const code = this.getFirebaseErrorCode(error);

    /* ✅ Code Firebase connu → message traduit */
    if (code && FIREBASE_ERRORS[code]) {
      return FIREBASE_ERRORS[code];
    }

    /* ✅ Log unique par code inconnu (évite le spam) */
    const warnKey = code || '__unknown__';
    if (!this.warnedCodes.has(warnKey)) {
      this.warnedCodes.add(warnKey);

      if (code) {
        console.warn(
          `[Auth] Code Firebase non traduit : "${code}"`,
          error,
        );
      } else {
        console.warn(
          '[Auth] Erreur non-Firebase reçue (pas de code) :',
          error,
        );
      }
    }

    return FIREBASE_ERROR_FALLBACK;
  }

  /**
   * Extrait le code d'erreur Firebase (si présent).
   *
   * ✅ Retourne `null` au lieu de `''` pour permettre la distinction
   *    entre "pas de code" et "code vide".
   */
  getFirebaseErrorCode(error: unknown): string | null {
    if (typeof error !== 'object' || error === null) return null;

    if ('code' in error) {
      const code = (error as FirebaseAuthError).code;
      return typeof code === 'string' && code.length > 0 ? code : null;
    }

    return null;
  }
}