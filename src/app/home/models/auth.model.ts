 // src/app/auth/models/auth.model.ts

/* ═════════════════════════════════════════════════════════════════════
   AUTH — Modèles
   ═════════════════════════════════════════════════════════════════════ */

export type UserRole = 'admin' | 'user' | 'subscriber';

export type UserOrigin = 'email' | 'google';

export interface RealtimeUserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  role: UserRole;
  createdAt: string;
  lastLogin: string;
  disabled: boolean;
  origine: UserOrigin;
}

/** Erreur Firebase Auth (typage minimal). */
export interface FirebaseAuthError {
  code?: string;
  message?: string;
}