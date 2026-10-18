// src/app/home/models/message.model.ts

/* ═════════════════════════════════════════════════════════════════════
   MESSAGES — Modèle unifié pour toute l'app
   ═════════════════════════════════════════════════════════════════════ */

/** Catégorie d'un message. */
export type MessageCategory =
  | 'academie'
  | 'abonnement'
  | 'contenu'
  | 'evenement'
  | 'systeme'
  | 'autre';

/** Rôle de l'expéditeur. */
export type SenderRole = 'admin' | 'support' | 'student' | 'system';

/** Direction du message dans une boîte. */
export type MessageDirection = 'in' | 'out';

/** Message tel que stocké dans Firebase. */
export interface Message {
  key?: string;
  threadId: string;

  from: string;
  fromName: string;
  fromEmail: string;
  fromPhoto?: string;

  to: string;
  toName?: string;

  subject: string;
  body: string;

  createdAt: number;
  read: boolean;

  category?: MessageCategory;
  replyToId?: string | null;
}

/** Message enrichi de sa direction (inbox = 'in', sent = 'out'). */
export interface MessagerieMessage extends Message {
  _direction?: MessageDirection;
}

/** Fil de discussion (regroupement de messages). */
export interface Thread {
  threadId: string;
  subject: string;
  messages: MessagerieMessage[];
  lastMessage: MessagerieMessage;
  unreadCount: number;
  interlocutor: string;
  avatar: string;
  updatedAt: number;
}

/** Payload d'envoi (ContactComponent). */
export interface MessageData {
  from: string;
  fromEmail: string;
  fromName: string;
  fromPhoto?: string;
  to: string;
  toName?: string;
  subject: string;
  body: string;
  createdAt: number;
  read: boolean;
  threadId: string;
  replyToId?: string | null;
  category?: MessageCategory;
}

/** Payload de réponse (MessagerieComponent). */
export interface ReplyPayload {
  subject: string;
  body: string;
  to: string;
  toName?: string;
  threadId: string;
  replyToId: string;
}