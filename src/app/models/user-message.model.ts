export interface MessageReply {
  key?: string;
  senderId: string;
  senderRole: 'user' | 'admin';
  senderName: string;
  message: string;
  createdAt: string;
}

export type MessageStatus = 'unread' | 'read' | 'replied' | 'archived';
export type MessageCategory = 'technique' | 'abonnement' | 'contenu' | 'autre';

export interface UserMessage {
  key?: string;
  userId: string;
  subject?: string;
  category?: MessageCategory;
  message: string;
  status: MessageStatus;
  createdAt: string;
  updatedAt?: string;
  replies?: Record<string, MessageReply> | MessageReply[];
}