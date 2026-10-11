/* ═══════════════════════════════════════════════════════
   TYPES PARTAGÉS — Code promo
   ═══════════════════════════════════════════════════════ */

export interface CachedPromoValidation {
  readonly code: string;
  readonly validatedAt: number;
}

export interface ParrainEntry {
  readonly uid?: string;
  readonly codeparrain: string;
  readonly displayName?: string;
  readonly email?: string;
  readonly photoURL?: string;
  readonly phone?: string;
  readonly createdAt?: string;
  readonly registeredAt?: string;
  readonly updatedAt?: number;
  readonly filleulsCount?: number;
}

export interface FilleulEntry {
  readonly uid: string;
  readonly codepromo: string;
  readonly displayName: string;
  readonly email: string;
  readonly photoURL?: string;
  readonly usedAt: string;
}

export interface PromotionUserEntry {
  readonly uid: string;
  readonly codepromo: string;
  readonly displayName: string;
  readonly email: string;
  readonly registeredAt: string;
}

export interface PromotionMetadata {
  readonly createdAt: string;
  readonly userCount: number;
  readonly isActive: boolean;
}

/**
 * Résultat d'une vérification de code promo.
 */
export type PromoValidationResult =
  | { readonly status: 'valid'; readonly code: string; readonly fromCache: boolean }
  | { readonly status: 'missing' }
  | { readonly status: 'error'; readonly message: string };