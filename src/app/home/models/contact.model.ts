import { FormControl } from '@angular/forms';

/* ═════════════════════════════════════════════════════════════════════
   CONTACT — MODÈLES
   ═════════════════════════════════════════════════════════════════════ */

/** Structure typée du formulaire de contact. */
export interface ContactForm {
  subject: FormControl<string>;
  message: FormControl<string>;
}

/** Données envoyées dans Firebase Realtime Database. */
export interface MessageData {
  userId: string;
  userEmail: string;
  userName: string;
  userPhoto: string;
  subject: string;
  message: string;
  createdAt: string;
  status: 'unread';
  to: '4gKIsx61Ief3iIvNgWgIy8PKVpm2'  // ← ✅ UID du support
}