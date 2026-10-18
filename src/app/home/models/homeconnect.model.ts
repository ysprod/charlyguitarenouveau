// src/app/homeconnect/homeconnect.model.ts

/* ═════════════════════════════════════════════════════════════════════
   HOMECONNECT — MODÈLES PARTAGÉS
   ═════════════════════════════════════════════════════════════════════ */

/* ═══════════════════════════════════════════════════════
   MESSAGERIE
   ═══════════════════════════════════════════════════════ */

export type InboxFilter =
  | 'all'
  | 'unread'
  | 'starred'
  | 'sent'
  | 'academie'
  | 'abonnement';

export type InboxCategory =
  | 'academie'
  | 'abonnement'
  | 'contenu'
  | 'evenement'
  | 'systeme'
  | 'autre';

export type SenderRole = 'admin' | 'support' | 'student' | 'system';

/** Direction du message : reçu ou envoyé. */
export type MessageDirection = 'in' | 'out';

export interface InboxMessage {
  readonly id: string;
  readonly from: string;
  readonly fromRole: SenderRole;
  readonly avatarEmoji: string;
  readonly subject: string;
  readonly preview: string;
  readonly body: string;

  /** Timestamp en millisecondes (cohérent avec Firebase). */
  readonly receivedAt: number;

  readonly isUnread: boolean;
  readonly isStarred: boolean;
  readonly category: InboxCategory;

  /** ✅ 'in' = message reçu, 'out' = message envoyé. */
  readonly direction: MessageDirection;
}

/* ═══════════════════════════════════════════════════════
   UI — ACTIONS RAPIDES
   ═══════════════════════════════════════════════════════ */

export type QuickActionColor =
  | 'primary'
  | 'success'
  | 'warning'
  | 'danger'
  | 'gold'
  | 'violet';

/** Action rapide présentée dans la bannière de bienvenue. */
export interface QuickAction {
  icon: string;
  label: string;
  description: string;
  route: string;
  color: QuickActionColor;
}

/* ═══════════════════════════════════════════════════════
   UI — UNIVERS DE COULEUR
   ═══════════════════════════════════════════════════════ */

/** Univers de couleur (7 Dimensions d'Offoland). */
export interface ColorUniverse {
  emoji: string;
  name: string;
  description: string;
  route: string;
  color: string;
}

/* ═══════════════════════════════════════════════════════
   UI — POURQUOI NOUS
   ═══════════════════════════════════════════════════════ */

/** Pilier « Pourquoi nous ». */
export interface WhyPillar {
  icon: string;
  title: string;
  description: string;
}

/* ═══════════════════════════════════════════════════════
   UI — TÉMOIGNAGES
   ═══════════════════════════════════════════════════════ */

/** Témoignage d'élève. */
export interface Testimonial {
  quote: string;
  avatar: string;
  author: string;
  role: string;
}