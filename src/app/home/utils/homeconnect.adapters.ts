// src/app/utils/homeconnect.adapters.ts

import type {
  MessageCategory,
  UserMessage,
} from 'src/app/home/models/user-message.model';

import type {
  InboxCategory,
  InboxMessage,
  SenderRole,
} from 'src/app/home/models/homeconnect.model';

/* ═══════════════════════════════════════════════════════
   MAPPINGS
   ═══════════════════════════════════════════════════════ */

const CATEGORY_MAP: Readonly<Record<MessageCategory, InboxCategory>> = {
  technique: 'systeme',
  abonnement: 'abonnement',
  contenu: 'contenu',
  autre: 'autre',
};

const DEFAULT_SENDER_ROLE: SenderRole = 'support';
const DEFAULT_AVATAR = '🛠️';
const DEFAULT_SUBJECT = '(Sans sujet)';
const PREVIEW_MAX_LENGTH = 140;

/* ═══════════════════════════════════════════════════════
   ADAPTATEUR
   ═══════════════════════════════════════════════════════ */

/**
 * Convertit un UserMessage (modèle métier Firebase)
 * en InboxMessage (modèle d'affichage du widget d'accueil).
 *
 * ⚠️ Fonction PURE : aucun effet de bord, aucun appel réseau.
 */
export function toInboxMessage(message: UserMessage): InboxMessage {
  const id = message.key ?? `msg-${message.createdAt}`;
  const subject = message.subject?.trim() || DEFAULT_SUBJECT;

  return {
    id,
    from: subject,
    fromRole: DEFAULT_SENDER_ROLE,
    avatarEmoji: DEFAULT_AVATAR,
    subject,
    preview: truncateForPreview(message.message, PREVIEW_MAX_LENGTH),
    body: message.message,
    receivedAt: message.createdAt,
    isUnread: message.status === 'unread',
    isStarred: false,
    category: CATEGORY_MAP[message.category ?? 'autre'] ?? 'autre',
  };
}

/**
 * Convertit un tableau de UserMessage en InboxMessage[].
 * Retourne un NOUVEAU tableau mutable.
 */
export function toInboxMessages(
  messages: readonly UserMessage[]
): InboxMessage[] {
  return messages.map(toInboxMessage);
}

/* ═══════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════ */

function truncateForPreview(text: string, maxLength: number): string {
  const cleaned = text.replace(/\s+/g, ' ').trim();
  if (cleaned.length <= maxLength) return cleaned;
  return `${cleaned.slice(0, maxLength).replace(/\s+$/, '')}…`;
}