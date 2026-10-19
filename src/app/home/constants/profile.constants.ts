import { UserRole } from '../models/profile.model';

/* ═══════════════════════════════════════════════════════════
   LABELS DE RÔLES
   ═══════════════════════════════════════════════════════════ */

export const ROLE_LABELS: Readonly<Record<UserRole, string>> = {
  admin: 'Administrateur',
  user: 'Utilisateur',
  subscriber: 'Abonné',
};

/* ═══════════════════════════════════════════════════════════
   VALIDATION
   ═══════════════════════════════════════════════════════════ */

export const PHONE_PATTERN = /^\+?[0-9\s\-()]{8,20}$/;
export const MAX_AVATAR_SIZE = 2 * 1024 * 1024;
export const AUTH_GRACE_PERIOD_MS = 800;

/* ═══════════════════════════════════════════════════════════
   MESSAGES D'ERREUR FIREBASE
   ═══════════════════════════════════════════════════════════ */

export const FIREBASE_ERROR_MESSAGES: Readonly<Record<string, string>> = {
  'auth/wrong-password': 'Mot de passe actuel incorrect.',
  'auth/invalid-credential': 'Mot de passe actuel incorrect.',
  'auth/requires-recent-login': 'Veuillez vous reconnecter avant de poursuivre.',
  'auth/email-already-in-use': 'Cet email est déjà utilisé.',
  'auth/invalid-email': 'Email invalide.',
  'auth/weak-password': 'Mot de passe trop faible.',
  'auth/network-request-failed': 'Problème de connexion réseau.',
  'storage/unauthorized': "Vous n'êtes pas autorisé à modifier cette photo.",
  'storage/canceled': "L'envoi de la photo a été annulé.",
  'storage/quota-exceeded': 'La capacité de stockage est dépassée.',
};