// src/app/home/utils/homeconnect.utils.ts

import type { InboxMessage, InboxFilter } from '../models/homeconnect.model';

/* ═════════════════════════════════════════════════════════════════════
   TRI
   ═════════════════════════════════════════════════════════════════════ */

/**
 * ✅ Tri récent → ancien.
 *    Comparaison directe des `number` (pas de `new Date()` par message).
 */
export function sortByRecent(
  messages: readonly InboxMessage[],
): InboxMessage[] {
  return [...messages].sort((a, b) => b.receivedAt - a.receivedAt);
}

/* ═════════════════════════════════════════════════════════════════════
   FILTRAGE
   ═════════════════════════════════════════════════════════════════════ */

export function filterMessages(
  messages: readonly InboxMessage[],
  filter: InboxFilter,
): InboxMessage[] {
  switch (filter) {
    case 'unread':
      return messages.filter((m) => m.isUnread);

    case 'starred':
      return messages.filter((m) => m.isStarred);

    case 'sent':
      return messages.filter((m) => m.direction === 'out');

    case 'academie':
      return messages.filter((m) => m.category === 'academie');

    case 'abonnement':
      return messages.filter((m) => m.category === 'abonnement');

    case 'all':
    default:
      /* ✅ Pas de copie inutile pour `all` */
      return messages as InboxMessage[];
  }
}

/* ═════════════════════════════════════════════════════════════════════
   FORMATAGE DATE RELATIVE
   ═════════════════════════════════════════════════════════════════════ */

export function formatRelativeDate(
  iso: string | number,
  now: Date = new Date(),
): string {
  const date = new Date(iso);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  const diffH = Math.floor(diffMin / 60);
  const diffD = Math.floor(diffH / 24);

  if (diffMin < 1) return "à l'instant";
  if (diffMin < 60) return `il y a ${diffMin} min`;
  if (diffH < 24) return `il y a ${diffH} h`;
  if (diffD < 7) return `il y a ${diffD} j`;

  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
  });
}

/* ═════════════════════════════════════════════════════════════════════
   TRONCATURE
   ═════════════════════════════════════════════════════════════════════ */

export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  const sliced = text.slice(0, maxLength).replace(/\s+$/, '');
  return `${sliced}…`;
}