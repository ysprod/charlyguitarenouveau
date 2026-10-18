// src/app/home/models/contact.model.ts

import { FormControl } from '@angular/forms';

/* ═══════════════════════════════════════════════════════
   FORMULAIRE
   ═══════════════════════════════════════════════════════ */

export interface ContactForm {
  subject: FormControl<string>;
  message: FormControl<string>;
}

/* ═══════════════════════════════════════════════════════
   MESSAGE
   ═══════════════════════════════════════════════════════ */

/**
 * Structure d'un message stocké dans Firebase.
 *
 * ⚠️ Le DESTINATAIRE n'est PAS dans l'objet : il est dans le chemin
 *    /messages/{uid_destinataire}/{messageId}
 *
 * Direction :
 *   - Reçu  → /messages/{mon-uid}/{msgId}       (read: false)
 *   - Envoyé → /messages/{mon-uid}/sent/{msgId}  (read: true)
 */
export interface MessageData {
  /** UID de l'expéditeur */
  from: string;
  fromEmail: string;
  fromName: string;
  fromPhoto?: string;

  subject: string;
  body: string;

  /** Timestamp en millisecondes */
  createdAt: number;

  /** Lu par le destinataire ? */
  read: boolean;

  /** Catégorie optionnelle */
  category?: 'academie' | 'abonnement' | 'contenu' | 'evenement' | 'systeme' | 'autre';
}