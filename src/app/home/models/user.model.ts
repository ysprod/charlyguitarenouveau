export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  role?: 'admin' | 'user' | 'subscriber';
  createdAt?: string | number;
  lastLogin?: string | number;
  disabled?: boolean;
}