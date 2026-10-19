import type {
  NotificationFilterOption,
  NotificationType,
} from '../models/notification.model';

/* ═══════════════════════════════════════════════════════
   FILTRES
   ═══════════════════════════════════════════════════════ */

export const NOTIFICATION_FILTERS: readonly NotificationFilterOption[] = [
  { value: 'all',       label: 'Toutes',    icon: '🔔' },
  { value: 'unread',    label: 'Non lues',  icon: '●'  },
  { value: 'system',    label: 'Système',   icon: '⚙️' },
  { value: 'message',   label: 'Messages',  icon: '💬' },
  { value: 'promotion', label: 'Promotions', icon: '🎁' },
];

/* ═══════════════════════════════════════════════════════
   TYPES → ICÔNES PAR DÉFAUT
   ═══════════════════════════════════════════════════════ */

export const TYPE_DEFAULT_ICONS: Readonly<Record<NotificationType, string>> = {
  system:    '⚙️',
  message:   '💬',
  promotion: '🎁',
};

export const TYPE_LABELS: Readonly<Record<NotificationType, string>> = {
  system:    'Système',
  message:   'Message',
  promotion: 'Promotion',
};

/* ═══════════════════════════════════════════════════════
   DIVERS
   ═══════════════════════════════════════════════════════ */

export const NOTIFICATIONS_DB_PATH = 'notifications';
export const NOTIFICATIONS_MAX_DISPLAY = 50;