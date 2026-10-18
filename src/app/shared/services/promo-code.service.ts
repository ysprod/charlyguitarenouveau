// src/app/home/services/promo-code.service.ts

import {
  EnvironmentInjector,
  Injectable,
  inject,
  runInInjectionContext,
} from '@angular/core';

import { Auth, User } from '@angular/fire/auth';

import {
  Database,
  get,
  ref,
  runTransaction,
  set,
  update,
} from '@angular/fire/database';

import {
  CachedPromoValidation,
  FilleulEntry,
  ParrainEntry,
  PromotionMetadata,
  PromotionUserEntry,
  PromoValidationResult,
} from '../../home/models/promo.model';

import {
  PROMO_CACHE_PREFIX,
  PROMO_CACHE_TTL_MS,
  PROMO_MESSAGES,
} from '../../home/constants/promo.constants';

import { StorageService } from './storage.service';

/* ═════════════════════════════════════════════════════════════════════
   SERVICE — Gestion des codes promo

   Responsabilités :
   - Vérifier si l'utilisateur possède un code promo validé
   - Valider un nouveau code (avec atomique + idempotent)
   - Gérer le cache localStorage
   ═════════════════════════════════════════════════════════════════════ */

@Injectable({ providedIn: 'root' })
export class PromoCodeService {

  private readonly db = inject(Database);
  private readonly auth = inject(Auth);
  private readonly storage = inject(StorageService);
  private readonly environmentInjector = inject(EnvironmentInjector);

  /** ✅ Verrou anti-double validation (par utilisateur) */
  private readonly pending = new Set<string>();

  /* ═══════════════════════════════════════════════════════
     VÉRIFICATION
     ═══════════════════════════════════════════════════════ */

  async checkPromoCode(): Promise<PromoValidationResult> {
    const user = this.auth.currentUser;
    if (!user) return { status: 'missing' };

    /* ─── 1. Cache localStorage ─── */
    const cached = this.readCachedPromo(user.uid);
    if (cached) {
      return { status: 'valid', code: cached.code, fromCache: true };
    }

    /* ─── 2. Firebase ─── */
    try {
      const snapshot = await this.runInContext(() =>
        get(ref(this.db, `users/${user.uid}/codepromo`)),
      );

      if (!snapshot.exists()) return { status: 'missing' };

      const promo = snapshot.val() as unknown;
      if (typeof promo === 'string' && promo.trim().length > 0) {
        const code = promo.trim();
        this.writeCachedPromo(user.uid, code);
        return { status: 'valid', code, fromCache: false };
      }

      return { status: 'missing' };

    } catch (error) {
      console.warn('[Promo] Lecture Firebase échouée :', error);
      return { status: 'error', message: PROMO_MESSAGES.NETWORK_ERROR };
    }
  }

  /* ═══════════════════════════════════════════════════════
     VALIDATION
     ═══════════════════════════════════════════════════════ */

  async validatePromoCode(rawCode: string): Promise<
    { ok: true; code: string } | { ok: false; message: string }
  > {
    const user = this.auth.currentUser;
    if (!user) return { ok: false, message: PROMO_MESSAGES.NOT_AUTHENTICATED };

    const normalized = rawCode.replace(/\s+/g, '').toUpperCase();
    if (!normalized) {
      return { ok: false, message: PROMO_MESSAGES.INPUT_EMPTY };
    }

    /* ✅ Anti-double-clic */
    if (this.pending.has(user.uid)) {
      return { ok: false, message: 'Validation déjà en cours...' };
    }
    this.pending.add(user.uid);

    try {
      /* ─── 1. Vérifie que le code parrain existe ─── */
      const parrainSnap = await this.runInContext(() =>
        get(ref(this.db, `parrain/${normalized}`)),
      );

      if (!parrainSnap.exists()) {
        return { ok: false, message: PROMO_MESSAGES.CODE_INVALID(normalized) };
      }

      const parrainData = parrainSnap.val() as ParrainEntry;

      /* ─── 2. Met à jour users/{uid}/codepromo ─── */
      await this.runInContext(() =>
        update(ref(this.db, `users/${user.uid}`), {
          codepromo: normalized,
          updatedAt: Date.now(),
        }),
      );

      /* ─── 3. Enregistrements secondaires (atomiques + idempotents) ─── */
      await Promise.allSettled([
        this.registerFilleul(user, normalized),
        this.registerUserInPromotion(user, normalized),
      ]);

      /* ─── 4. Cache local ─── */
      this.writeCachedPromo(user.uid, normalized);

      return { ok: true, code: normalized };

    } catch (error) {
      console.error('[Promo] Erreur critique :', error);
      return { ok: false, message: this.getErrorMessage(error) };

    } finally {
      this.pending.delete(user.uid);
    }
  }

  /* ═══════════════════════════════════════════════════════
     CACHE
     ═══════════════════════════════════════════════════════ */

  private readCachedPromo(uid: string): CachedPromoValidation | null {
    const key = `${PROMO_CACHE_PREFIX}${uid}`;
    const parsed = this.storage.getJSON<Partial<CachedPromoValidation>>(key);
    if (!parsed) return null;

    if (
      typeof parsed.code !== 'string' ||
      typeof parsed.validatedAt !== 'number'
    ) {
      this.storage.remove(key);
      return null;
    }

    const age = Date.now() - parsed.validatedAt;
    if (age > PROMO_CACHE_TTL_MS) {
      this.storage.remove(key);
      return null;
    }

    return { code: parsed.code, validatedAt: parsed.validatedAt };
  }

  private writeCachedPromo(uid: string, code: string): void {
    const key = `${PROMO_CACHE_PREFIX}${uid}`;
    this.storage.setJSON<CachedPromoValidation>(key, {
      code,
      validatedAt: Date.now(),
    });
  }

  clearCachedPromo(uid: string): void {
    this.storage.remove(`${PROMO_CACHE_PREFIX}${uid}`);
  }

  /* ═══════════════════════════════════════════════════════
     ENREGISTREMENTS SECONDAIRES
     ═══════════════════════════════════════════════════════ */

  /**
   * Ajoute l'utilisateur dans `/parrain/{code}/filleuls/{uid}` (idempotent)
   * et incrémente `filleulsCount` atomiquement.
   */
  private async registerFilleul(
    user: User,
    code: string,
  ): Promise<void> {
    const now = new Date().toISOString();
    const filleulRef = ref(this.db, `parrain/${code}/filleuls/${user.uid}`);

    /* ─── Idempotence : skip si déjà enregistré ─── */
    const existing = await this.runInContext(() => get(filleulRef));
    if (existing.exists()) return;

    const entry: FilleulEntry = {
      uid: user.uid,
      codepromo: code,
      displayName: user.displayName ?? user.email?.split('@')[0] ?? 'Utilisateur',
      email: user.email ?? '',
      photoURL: user.photoURL ?? undefined,
      usedAt: now,
    };

    await this.runInContext(() => set(filleulRef, entry));

    /* ─── Incrément atomique du compteur (évite les race conditions) ─── */
    const countRef = ref(this.db, `parrain/${code}/filleulsCount`);
    await this.runInContext(() =>
      runTransaction(countRef, (current: number | null) => {
        return (current ?? 0) + 1;
      }),
    );
  }

  /**
   * Ajoute l'utilisateur dans `/promotion/{code}/{uid}` (idempotent)
   * et incrémente `metadata.userCount` atomiquement.
   */
  private async registerUserInPromotion(
    user: User,
    promoCode: string,
  ): Promise<void> {
    const now = new Date().toISOString();
    const userRef = ref(this.db, `promotion/${promoCode}/${user.uid}`);

    /* ─── Idempotence ─── */
    const existing = await this.runInContext(() => get(userRef));
    if (existing.exists()) return;

    const userInfo: PromotionUserEntry = {
      uid: user.uid,
      codepromo: promoCode,
      displayName: user.displayName ?? user.email?.split('@')[0] ?? 'Utilisateur',
      email: user.email ?? '',
      registeredAt: now,
    };

    await this.runInContext(() => set(userRef, userInfo));

    /* ─── Crée la metadata si absente (idempotent) ─── */
    const metadataRef = ref(this.db, `promotion/${promoCode}/metadata`);
    await this.runInContext(() =>
      runTransaction(metadataRef, (current: PromotionMetadata | null) => {
        if (current === null) {
          return { createdAt: now, userCount: 1, isActive: true };
        }
        return {
          ...current,
          userCount: (current.userCount ?? 0) + 1,
        };
      }),
    );
  }

  /* ═══════════════════════════════════════════════════════
     HELPERS
     ═══════════════════════════════════════════════════════ */

  private runInContext<T>(fn: () => T): T {
    return runInInjectionContext(this.environmentInjector, fn);
  }

  private getErrorMessage(error: unknown): string {
    if (typeof error === 'object' && error !== null && 'code' in error) {
      const code = (error as { code?: unknown }).code;

      if (code === 'PERMISSION_DENIED' || code === 'permission-denied') {
        return PROMO_MESSAGES.PERMISSION_DENIED;
      }
      if (code === 'NETWORK_ERROR' || code === 'network-request-failed') {
        return PROMO_MESSAGES.NETWORK_ERROR;
      }
    }

    if (error instanceof Error) {
      return `Erreur : ${error.message}`;
    }

    return PROMO_MESSAGES.SAVE_ERROR;
  }
}