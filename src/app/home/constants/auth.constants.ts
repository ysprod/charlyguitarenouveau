export const AUTH_ROUTES = {
  LOGIN: '/login',
  REGISTER: '/register',
  HOME: '/connect',
  UNAUTHORIZED: '/unauthorized',
  NOT_FOUND: '/404'
} as const;

export const RETURN_URL_PARAM = 'returnUrl';

export const DEFAULT_RETURN_URL = '/';

/* ═════════════════════════════════════════════════════════════════════
   CONSTANTES AUTH
   ═════════════════════════════════════════════════════════════════════ */

/** Messages FR associés aux codes d'erreur Firebase Auth. */
export const FIREBASE_ERRORS: Readonly<Record<string, string>> = {
  /* ─── Connexion ─── */
  'auth/user-not-found': 'Email ou mot de passe incorrect.',
  'auth/wrong-password': 'Email ou mot de passe incorrect.',
  'auth/invalid-credential': 'Email ou mot de passe incorrect.',
  'auth/invalid-email': 'Adresse e-mail invalide.',
  'auth/user-disabled': 'Ce compte a été désactivé.',
  'auth/too-many-requests': 'Trop de tentatives échouées. Réessayez plus tard.',
  'auth/network-request-failed':
    'Problème de connexion réseau. Vérifiez votre internet.',
  'auth/popup-blocked':
    'La fenêtre de connexion Google a été bloquée par votre navigateur.',
  'auth/popup-closed-by-user': 'La connexion Google a été annulée.',
  'auth/cancelled-popup-request': 'La connexion Google a été annulée.',
  'auth/account-exists-with-different-credential':
    'Un compte existe déjà avec une autre méthode de connexion.',
  /* ─── Inscription ─── */
  'auth/email-already-in-use':
    'Cette adresse e-mail est déjà utilisée par un autre compte.',
  'auth/weak-password':
    'Le mot de passe doit contenir au moins 6 caractères.',
  'auth/operation-not-allowed':
    "L'inscription par e-mail n'est pas activée. Contactez l'administrateur.",
  /* ─── Configuration ─── */
  'auth/configuration-not-found':
    'Configuration Firebase introuvable. Vérifiez environment.ts.',
  'auth/unauthorized-domain':
    "Ce domaine n'est pas autorisé. Contactez l'administrateur.",
  'auth/invalid-api-key':
    'Clé API Firebase invalide. Vérifiez environment.ts.',
  'auth/api-key-not-valid':
    'Clé API Firebase invalide. Vérifiez environment.ts.',
  'auth/internal-error':
    'Erreur interne Firebase. Réessayez dans quelques instants.'
};

/** Message générique de fallback. */
export const FIREBASE_ERROR_FALLBACK =
  'Une erreur est survenue. Veuillez réessayer.';

/** URL de retour par défaut pour /login. */
export const DEFAULT_RETURN_URL_LOGIN = '/';

/** URL de retour par défaut pour /register. */
export const DEFAULT_RETURN_URL_REGISTER = '/';

/** Durée d'affichage d'un toast (ms). */
export const TOAST_DURATION_MS = 4000;