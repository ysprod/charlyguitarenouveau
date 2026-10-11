/* ═══════════════════════════════════════════════════════
   CACHE PROMO — localStorage
   ═══════════════════════════════════════════════════════ */

/** Durée de validité du cache (30 jours). */
export const PROMO_CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/** Préfixe des clés localStorage pour le cache promo. */
export const PROMO_CACHE_PREFIX = 'promo_validated_';

/* ═══════════════════════════════════════════════════════
   MESSAGES
   ═══════════════════════════════════════════════════════ */

export const PROMO_MESSAGES = {
  INPUT_EMPTY: 'Le code promo est obligatoire pour continuer.',
  CODE_INVALID: (code: string) => `Le code « ${code} » est invalide.`,
  NOT_AUTHENTICATED: 'Utilisateur non authentifié.',
  NETWORK_ERROR: 'Problème de connexion. Vérifiez votre réseau.',
  PERMISSION_DENIED: "Erreur de permissions. Contactez l'administrateur.",
  SAVE_ERROR: "Impossible d'enregistrer votre code promo. Réessayez.",
  SUCCESS: (code: string) => `Code « ${code} » validé ! Bon jeu 🎸`
} as const;