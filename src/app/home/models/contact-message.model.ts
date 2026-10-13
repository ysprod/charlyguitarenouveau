export interface ContactMessage {
  key?: string;
  fullName: string;
  email: string;
  subject: string;
  message: string;
  createdAt: string;
  status: 'unread' | 'read';
}