import { UserProfile } from './user.model';

/* ═════════════════════════════════════════════════════════════════════
   TYPES PARTAGÉS AUTH
   ═════════════════════════════════════════════════════════════════════ */

/** Origine d'inscription — traçabilité utilisateur. */
export type UserOrigin = 'google' | 'email';

/** Profil Realtime Database (étend UserProfile). */
export interface RealtimeUserProfile extends UserProfile {
  lastLogin: string;
  disabled: boolean;
  origine: UserOrigin;
  codepromo?: string;
  updatedAt?: string;
}

/** Erreur Firebase Auth (typage minimal). */
export interface FirebaseAuthError {
  code?: string;
  message?: string;
}