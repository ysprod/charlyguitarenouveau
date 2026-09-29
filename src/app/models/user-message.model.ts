export interface MessageReply {
  key?: string;
  senderId: string;
  senderRole: 'user' | 'admin';
  senderName?: string;
  senderAvatar?: string;
  message: string;
  createdAt: string;
  attachments?: { name: string; url: string; type: string }[];
}

export interface UserMessage {
  key?: string;
  userId: string;
  userEmail?: string;
  userName?: string;
  subject?: string;
  message: string;
  category?: 'technique' | 'abonnement' | 'contenu' | 'autre';
  priority?: 'low' | 'normal' | 'high';
  status: 'unread' | 'read' | 'replied' | 'archived';
  createdAt: string;
  updatedAt?: string;
  replies?: Record<string, MessageReply> | MessageReply[];
}