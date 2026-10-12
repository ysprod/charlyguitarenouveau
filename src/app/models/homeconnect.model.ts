// src/app/homeconnect/homeconnect.model.ts

export type QuickActionColor =
  | 'primary'
  | 'success'
  | 'warning'
  | 'danger'
  | 'gold'
  | 'violet';

 

 

export type InboxFilter =
  | 'all'
  | 'unread'
  | 'starred'
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

export interface InboxMessage {
  readonly id: string;
  readonly from: string;
  readonly fromRole: SenderRole;
  readonly avatarEmoji: string;
  readonly subject: string;
  readonly preview: string;
  readonly body: string;
  readonly receivedAt: string;
  readonly isUnread: boolean;
  readonly isStarred: boolean;
  readonly category: InboxCategory;
}

/* ═════════════════════════════════════════════════════════════════════
   HOMECONNECT — MODÈLES PARTAGÉS
   ═════════════════════════════════════════════════════════════════════ */

/** Action rapide présentée dans la bannière de bienvenue. */
export interface QuickAction {
  icon: string;
  label: string;
  description: string;
  route: string;
  color: 'primary' | 'success' | 'warning' | 'danger' | 'gold' | 'violet';
}

/** Univers de couleur (7 Dimensions d'Offoland). */
export interface ColorUniverse {
  emoji: string;
  name: string;
  description: string;
  route: string;
  color: string;
}

/** Pilier « Pourquoi nous ». */
export interface WhyPillar {
  icon: string;
  title: string;
  description: string;
}

/** Témoignage d'élève. */
export interface Testimonial {
  quote: string;
  avatar: string;
  author: string;
  role: string;
}