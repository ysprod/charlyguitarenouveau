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

export function toInboxMessage(message: MessagerieMessage): InboxMessage {
  const id = message.key ?? `msg-${message.createdAt}`;

  const subject = message.subject?.trim() || DEFAULT_SUBJECT;

  const body = message.body ?? '';

  const isUnread = message._direction !== 'out' && message.read === false;

  const from = message.fromName || message.fromEmail || DEFAULT_FROM;

  const category: InboxCategory =
    message.category && CATEGORY_MAP[message.category]
      ? CATEGORY_MAP[message.category]
      : 'autre';

  const direction = message._direction ?? 'in';

  /* ✅ Gère à la fois number et string ISO (Firebase peut stocker les 2) */
  const receivedAt = parseTimestamp(message.createdAt);

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

/**
 * ✅ Convertit un timestamp Firebase (number ou string ISO) en number.
 *    Retourne `Date.now()` si la valeur est invalide.
 */
function parseTimestamp(value: unknown): number {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : Date.now();
  }

  if (typeof value === 'string') {
    const ts = new Date(value).getTime();
    return Number.isFinite(ts) ? ts : Date.now();
  }

  return Date.now();
}

function truncateForPreview(text: string, maxLength: number): string {
  if (!text) return '';
  const cleaned = text.replace(/\s+/g, ' ').trim();
  if (cleaned.length <= maxLength) return cleaned;
  return `${cleaned.slice(0, maxLength).replace(/\s+$/, '')}…`;
}