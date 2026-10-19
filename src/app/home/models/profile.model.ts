import { FormControl } from '@angular/forms';

/* ═══════════════════════════════════════════════════════════
   RÔLES
   ═══════════════════════════════════════════════════════════ */

export type UserRole = 'admin' | 'user' | 'subscriber';

/* ═══════════════════════════════════════════════════════════
   PROFIL UTILISATEUR
   ═══════════════════════════════════════════════════════════ */

export interface UserProfile {
  uid: string;
  email: string;
  fullName?: string;
  displayName?: string;
  phone?: string;
  photoURL?: string;
  role?: UserRole;
  updatedAt?: number;
  createdAt?: number;
}

/* ═══════════════════════════════════════════════════════════
   FORMULAIRE
   ═══════════════════════════════════════════════════════════ */

export interface ProfileFormControls {
  fullName: FormControl<string>;
  email: FormControl<string>;
  phone: FormControl<string>;
  currentPassword: FormControl<string>;
  newPassword: FormControl<string>;
  confirmPassword: FormControl<string>;
}