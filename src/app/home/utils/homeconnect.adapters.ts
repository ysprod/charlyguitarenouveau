// src/app/home/utils/homeconnect.adapters.ts

import type {
  InboxCategory,
  InboxMessage,
  SenderRole,
} from '../models/homeconnect.model';

import type {
  Message,
  MessagerieMessage,
  MessageCategory,
} from 'src/app/home/models/message.model';

/* ═════════════════════════════════════════════════════════════════════
   MAPPINGS
   ═════════════════════════════════════════════════════════════════════ */

const CATEGORY_MAP: Readonly<Record<MessageCategory, InboxCategory>> = {
  academie: 'academie',
  abonnement: 'abonnement',
  contenu: 'contenu',
  evenement: 'evenement',
  systeme: 'systeme',
  autre: 'autre',
};

const DEFAULT_SENDER_ROLE: SenderRole = 'support';
const DEFAULT_AVATAR = '✉️';
const DEFAULT_SUBJECT = '(Sans sujet)';
const DEFAULT_FROM = 'Utilisateur';
const PREVIEW_MAX_LENGTH = 140;

/* ═════════════════════════════════════════════════════════════════════
   ADAPTATEUR
   ═════════════════════════════════════════════════════════════════════ */

export function toInboxMessage(
  message: MessagerieMessage,
): InboxMessage {
  const id = message.key ?? `msg-${message.createdAt}`;

  const subject = message.subject?.trim() || DEFAULT_SUBJECT;

  const body = message.body ?? '';

  const isUnread =
    message._direction !== 'out' && message.read === false;

  const from = message.fromName || message.fromEmail || DEFAULT_FROM;

  const category: InboxCategory =
    message.category && CATEGORY_MAP[message.category]
      ? CATEGORY_MAP[message.category]
      : 'autre';

  const direction = message._direction ?? 'in';

  const receivedAt =
    typeof message.createdAt === 'number'
      ? message.createdAt
      : Date.now();

  return {
    id,
    from,
    fromRole: DEFAULT_SENDER_ROLE,
    avatarEmoji: DEFAULT_AVATAR,
    subject,
    preview: truncateForPreview(body, PREVIEW_MAX_LENGTH),
    body,
    receivedAt,
    isUnread,
    isStarred: false,
    category,
    direction,
  };
}

export function toInboxMessages(
  messages: readonly MessagerieMessage[],
): InboxMessage[] {
  return messages.map(toInboxMessage);
}

/* ═════════════════════════════════════════════════════════════════════
   HELPERS
   ═════════════════════════════════════════════════════════════════════ */

function truncateForPreview(text: string, maxLength: number): string {
  if (!text) return '';
  const cleaned = text.replace(/\s+/g, ' ').trim();
  if (cleaned.length <= maxLength) return cleaned;
  return `${cleaned.slice(0, maxLength).replace(/\s+$/, '')}…`;
}