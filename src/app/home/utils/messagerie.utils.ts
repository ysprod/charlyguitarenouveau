// src/app/features/messagerie/messagerie.utils.ts

import { STATUS_RANK, DEFAULT_STATUS_RANK } from "../constants/messagerie.constants";
import { SortMode } from "../messagerie.model";
import { UserMessage, MessageReply } from "../models/user-message.model";

 

/**
 * Fonctions utilitaires pures (testables, sans état).
 * Toute la logique de tri / formatage est centralisée ici.
 */

/* ─── Timestamps ─── */

export function getTimestamp(value: string | undefined | null): number {
  if (!value) return 0;
  const ts = new Date(value).getTime();
  return Number.isNaN(ts) ? 0 : ts;
}

/* ─── Tri des messages ─── */

export function sortByRecent(messages: UserMessage[]): UserMessage[] {
  return [...messages].sort(
    (a, b) => getTimestamp(b.createdAt) - getTimestamp(a.createdAt)
  );
}

export function sortMessages(
  messages: UserMessage[],
  mode: SortMode
): UserMessage[] {
  switch (mode) {
    case 'oldest':
      return [...messages].sort(
        (a, b) => getTimestamp(a.createdAt) - getTimestamp(b.createdAt)
      );

    case 'unread-first':
      return [...messages].sort((a, b) => {
        const rankA = STATUS_RANK[a.status] ?? DEFAULT_STATUS_RANK;
        const rankB = STATUS_RANK[b.status] ?? DEFAULT_STATUS_RANK;
        if (rankA !== rankB) return rankA - rankB;
        return getTimestamp(b.createdAt) - getTimestamp(a.createdAt);
      });

    case 'recent':
    default:
      return sortByRecent(messages);
  }
}

/* ─── Réponses ─── */

export function toRepliesArray(
  replies: Record<string, MessageReply> | MessageReply[] | undefined | null
): MessageReply[] {
  if (!replies) return [];

  if (Array.isArray(replies)) {
    return [...replies].sort(
      (a, b) => getTimestamp(a.createdAt) - getTimestamp(b.createdAt)
    );
  }

  return Object.entries(replies)
    .map(([key, reply]) => ({ ...reply, key }))
    .sort(
      (a, b) => getTimestamp(a.createdAt) - getTimestamp(b.createdAt)
    );
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

/* ─── Formatage temps de réponse ─── */

export function formatResponseTime(milliseconds: number): string {
  if (milliseconds <= 0) return '—';

  const minutes = Math.floor(milliseconds / 60_000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days} j`;
  if (hours > 0) return `${hours} h`;
  return `${minutes} min`;
}

/* ─── Recherche ─── */

export function matchesSearch(
  message: UserMessage,
  search: string
): boolean {
  const term = search.trim().toLowerCase();
  if (!term) return true;

  const subject = message.subject?.toLowerCase() ?? '';
  const content = message.message.toLowerCase();
  return subject.includes(term) || content.includes(term);
}

/* ─── Filtrage complet ─── */

export function applyFilters(
  messages: UserMessage[],
  search: string,
  status: string,
  sort: SortMode
): UserMessage[] {
  let result = messages;

  if (search.trim()) {
    result = result.filter((m) => matchesSearch(m, search));
  }

  if (status !== 'all') {
    result = result.filter((m) => m.status === status);
  }

  return sortMessages(result, sort);
}