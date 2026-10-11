import { Injectable, inject } from '@angular/core';
import { Auth, User } from '@angular/fire/auth';
import {
  Database,
  get,
  ref,
  set,
  update
} from '@angular/fire/database';

import {
  CachedPromoValidation,
  FilleulEntry,
  ParrainEntry,
  PromotionMetadata,
  PromotionUserEntry,
  PromoValidationResult
} from '../models/promo.model';

import {
  PROMO_CACHE_PREFIX,
  PROMO_CACHE_TTL_MS,
  PROMO_MESSAGES
} from '../constants/promo.constants';

import { StorageService } from './storage.service';

/**
 * Service partagé de gestion des codes promo.
 *
 * Utilisé par :
 *  - `PlayComponent` (accès aux jeux)
 *  - `DocumentsComponent` (achat de documents)
 *  - Tout autre composant nécessitant la validation d'un code promo
 *
 * Responsabilités :
 *  - Vérifier si l'utilisateur a un code promo validé (cache + Firebase)
 *  - Valider un nouveau code promo (avec enregistrements secondaires)
 *  - Mettre à jour le cache localStorage
 */
@Injectable({ providedIn: 'root' })
export class PromoCodeService {

  private readonly db = inject(Database);
  private readonly auth = inject(Auth);
  private readonly storage = inject(StorageService);

  /* ═══════════════════════════════════════════════════════
     VÉRIFICATION
     ═══════════════════════════════════════════════════════ */

  /**
   * Vérifie si l'utilisateur connecté possède un code promo validé.
   *
   * Stratégie :
   *  1. Vérifie le cache localStorage (rapide)
   *  2. Sinon, lit `users/{uid}/codepromo` dans Firebase
   *  3. Met à jour le cache si Firebase trouve un code
   */
  async checkPromoCode(): Promise<PromoValidationResult> {
    const user = this.auth.currentUser;

    if (!user) {
      return { status: 'missing' };
    }

    /* ─── ÉTAPE 1 : Cache localStorage ─── */
    const cached = this.readCachedPromo(user.uid);
    if (cached) {
      return { status: 'valid', code: cached.code, fromCache: true };
    }

    /* ─── ÉTAPE 2 : Firebase ─── */
    try {
      const snapshot = await get(ref(this.db, `users/${user.uid}`));
      if (!snapshot.exists()) {
        return { status: 'missing' };
      }

      const data = snapshot.val() as { codepromo?: unknown };
      const promo = data?.codepromo;

      if (typeof promo === 'string' && promo.trim().length > 0) {
        const code = promo.trim();
        this.writeCachedPromo(user.uid, code);
        return { status: 'valid', code, fromCache: false };
      }

      return { status: 'missing' };

    } catch (error) {
      console.warn('[Promo] Lecture Firebase échouée :', error);
      return {
        status: 'error',
        message: PROMO_MESSAGES.NETWORK_ERROR
      };
    }
  }

  /* ═══════════════════════════════════════════════════════
     VALIDATION D'UN NOUVEAU CODE
     ═══════════════════════════════════════════════════════ */

  /**
   * Valide un nouveau code promo pour l'utilisateur connecté.
   * Retourne le code normalisé si succès, sinon une erreur.
   */
  async validatePromoCode(rawCode: string): Promise<
    { ok: true; code: string } | { ok: false; message: string }
  > {
    const user = this.auth.currentUser;

    if (!user) {
      return { ok: false, message: PROMO_MESSAGES.NOT_AUTHENTICATED };
    }

    const normalized = rawCode.replace(/\s+/g, '').toUpperCase();

    if (!normalized) {
      return { ok: false, message: PROMO_MESSAGES.INPUT_EMPTY };
    }

    try {
      /* ─── ÉTAPE 1 : Vérifie que le code existe ─── */
      const parrainSnapshot = await get(ref(this.db, `parrain/${normalized}`));

      if (!parrainSnapshot.exists()) {
        return { ok: false, message: PROMO_MESSAGES.CODE_INVALID(normalized) };
      }

      const parrainData = parrainSnapshot.val() as ParrainEntry;

      /* ─── ÉTAPE 2 : Met à jour users/{uid}/codepromo ─── */
      await update(ref(this.db, `users/${user.uid}`), {
        codepromo: normalized,
        updatedAt: Date.now()
      });

      /* ─── ÉTAPE 3 : Enregistrements secondaires (non bloquants) ─── */
      try {
        await this.registerFilleul(user, normalized, parrainData);
      } catch (error) {
        console.warn('[Promo] registerFilleul échoué (non bloquant) :', error);
      }

      try {
        await this.registerUserInPromotion(user, normalized);
      } catch (error) {
        console.warn('[Promo] registerUserInPromotion échoué (non bloquant) :', error);
      }

      /* ─── ÉTAPE 4 : Cache localStorage ─── */
      this.writeCachedPromo(user.uid, normalized);

      return { ok: true, code: normalized };

    } catch (error) {
      console.error('[Promo] Erreur critique :', error);
      return { ok: false, message: this.getErrorMessage(error) };
    }
  }

  /* ═══════════════════════════════════════════════════════
     CACHE LOCALSTORAGE
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
    const data: CachedPromoValidation = {
      code,
      validatedAt: Date.now()
    };
    this.storage.setJSON(key, data);
  }

  /** Supprime le cache promo d'un utilisateur (déconnexion, admin…). */
  clearCachedPromo(uid: string): void {
    this.storage.remove(`${PROMO_CACHE_PREFIX}${uid}`);
  }

  /* ═══════════════════════════════════════════════════════
     ENREGISTREMENTS SECONDAIRES
     ═══════════════════════════════════════════════════════ */

  private async registerFilleul(
    user: User,
    code: string,
    parrainData: ParrainEntry
  ): Promise<void> {
    const now = new Date().toISOString();

    const filleulEntry: FilleulEntry = {
      uid: user.uid,
      codepromo: code,
      displayName: user.displayName ?? user.email?.split('@')[0] ?? 'Utilisateur',
      email: user.email ?? '',
      photoURL: user.photoURL ?? undefined,
      usedAt: now
    };

    await set(
      ref(this.db, `parrain/${code}/filleuls/${user.uid}`),
      filleulEntry
    );

    /* Incrémente le compteur de filleuls du parrain (best-effort) */
    if (parrainData.filleulsCount !== undefined) {
      const nextCount = (parrainData.filleulsCount ?? 0) + 1;
      await update(ref(this.db, `parrain/${code}`), {
        filleulsCount: nextCount,
        updatedAt: Date.now()
      });
    }
  }

  private async registerUserInPromotion(
    user: User,
    promoCode: string
  ): Promise<void> {
    const now = new Date().toISOString();

    const userInfo: PromotionUserEntry = {
      uid: user.uid,
      codepromo: promoCode,
      displayName: user.displayName ?? user.email?.split('@')[0] ?? 'Utilisateur',
      email: user.email ?? '',
      registeredAt: now
    };

    await set(
      ref(this.db, `promotion/${promoCode}/${user.uid}`),
      userInfo
    );

    const metadataRef = ref(this.db, `promotion/${promoCode}/metadata`);
    const metadataSnapshot = await get(metadataRef);

    if (!metadataSnapshot.exists()) {
      const metadata: PromotionMetadata = {
        createdAt: now,
        userCount: 1,
        isActive: true
      };
      await set(metadataRef, metadata);
      return;
    }

    const existing = metadataSnapshot.val() as Partial<PromotionMetadata>;
    const currentCount = existing.userCount ?? 0;

    await update(metadataRef, { userCount: currentCount + 1 });
  }

  /* ═══════════════════════════════════════════════════════
     HELPERS
     ═══════════════════════════════════════════════════════ */

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