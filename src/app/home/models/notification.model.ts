// src/app/notifications/models/notification.model.ts

export type NotificationType = 'system' | 'message' | 'promotion';

export type NotificationFilter = 'all' | 'unread' | NotificationType;

export interface NotificationItem {
  /** Clé Firebase (remplie par listVal({ keyField: 'key' })) */
  key?: string;

  /** UID du destinataire */
  userId: string;

  /** Type de notification */
  type: NotificationType;

  /** Titre court */
  title: string;

  /** Corps / description */
  body: string;

  /** Lien optionnel (route Angular) */
  link?: string;

  /** Emoji / icône affiché */
  icon?: string;

  /** Statut de lecture */
  read: boolean;

  /** Timestamp de création (ms) */
  createdAt: number;

  /** Données libres */
  metadata?: Record<string, unknown>;
}

export interface NotificationFilterOption {
  value: NotificationFilter;
  label: string;
  icon: string;
}