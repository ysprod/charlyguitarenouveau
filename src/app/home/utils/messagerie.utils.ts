import type { MessagerieMessage } from 'src/app/home/models/message.model';
import type { SortMode } from 'src/app/home/models/messagerie.model';

/* ═════════════════════════════════════════════════════════════════════
   UTILITAIRES — Fonctions pures
   ═════════════════════════════════════════════════════════════════════ */

/* ─── Timestamps ─── */

export function getTimestamp(
  value: string | number | Date | undefined | null,
): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') {
    return Number.isFinite(value) && value > 0 ? value : 0;
  }
  if (value instanceof Date) return value.getTime();
  const ts = new Date(value).getTime();
  return Number.isNaN(ts) ? 0 : ts;
}

/* ─── Tri ─── */

export function sortByRecent(
  messages: MessagerieMessage[],
): MessagerieMessage[] {
  return [...messages].sort(
    (a, b) => getTimestamp(b.createdAt) - getTimestamp(a.createdAt),
  );
}

export function sortByOldest(
  messages: MessagerieMessage[],
): MessagerieMessage[] {
  return [...messages].sort(
    (a, b) => getTimestamp(a.createdAt) - getTimestamp(b.createdAt),
  );
}

export function sortMessages(
  messages: MessagerieMessage[],
  mode: SortMode,
): MessagerieMessage[] {
  switch (mode) {
    case 'oldest':
      return sortByOldest(messages);
    case 'unread-first':
      return [...messages].sort((a, b) => {
        if (a.read === b.read) {
          return getTimestamp(b.createdAt) - getTimestamp(a.createdAt);
        }
        return a.read ? 1 : -1;
      });
    case 'recent':
    default:
      return sortByRecent(messages);
  }
}

/* ─── Formatage ─── */

export function formatResponseTime(milliseconds: number): string {
  if (milliseconds <= 0) return '—';
  const minutes = Math.floor(milliseconds / 60_000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days} j`;
  if (hours > 0) return `${hours} h`;
  return `${minutes} min`;
}

/* ─── Initiales ─── */

export function getInitials(name: string | null | undefined): string {
  if (!name?.trim()) return '?';
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0))
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

/* ─── Recherche ─── */

export function matchesSearch(
  message: MessagerieMessage,
  search: string,
): boolean {
  const term = search.trim().toLowerCase();
  if (!term) return true;

  const subject = message.subject?.toLowerCase() ?? '';
  const content = message.body?.toLowerCase() ?? '';
  const fromName = message.fromName?.toLowerCase() ?? '';

  return (
    subject.includes(term) ||
    content.includes(term) ||
    fromName.includes(term)
  );
}