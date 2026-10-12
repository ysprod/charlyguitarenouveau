// src/app/homeconnect/homeconnect.model.ts

export type QuickActionColor =
  | 'primary'
  | 'success'
  | 'warning'
  | 'danger'
  | 'gold'
  | 'violet';

export interface QuickAction {
  readonly label: string;
  readonly icon: string;
  readonly route: string;
  readonly description: string;
  readonly color: QuickActionColor;
}

export interface ColorUniverse {
  readonly name: string;
  readonly route: string;
  readonly emoji: string;
  readonly color: string;
  readonly description: string;
}

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