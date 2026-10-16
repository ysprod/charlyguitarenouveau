// src/app/offoland/bco/utils/bco.util.ts

import { NUMBER_FORMATTER } from '../constants/bco.constants';
import {
  CentralBankVariant,
  EventStatus,
  EventType,
  MonetaryEvent,
  Trend,
} from '../models/bco.model';

/* ═══════════════════════════════════════════════════════════
   FORMATAGE
   ═══════════════════════════════════════════════════════════ */

export function formatNumber(value: number): string {
  return NUMBER_FORMATTER.format(Math.round(value));
}

export function formatRate(value: number): string {
  return value.toFixed(6);
}

export function formatTrend(value: number): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

/* ═══════════════════════════════════════════════════════════
   TENDANCE
   ═══════════════════════════════════════════════════════════ */

export function trendClass(value: number): Trend {
  if (value > 0.5) return 'positive';
  if (value < -0.5) return 'negative';
  return 'neutral';
}

/* ═══════════════════════════════════════════════════════════
   ÉVÉNEMENTS — ICÔNES & VARIANTES
   ═══════════════════════════════════════════════════════════ */

export function eventIcon(type: EventType): string {
  switch (type) {
    case 'emission':    return '🪙';
    case 'burn':        return '🔥';
    case 'devaluation': return '📉';
    case 'revaluation': return '📈';
    case 'rate-change': return '⚖️';
  }
}

export function eventVariant(type: EventType): CentralBankVariant {
  switch (type) {
    case 'emission':    return 'primary';
    case 'burn':        return 'danger';
    case 'devaluation': return 'warning';
    case 'revaluation': return 'success';
    case 'rate-change': return 'neutral';
  }
}

export function eventAmountLabel(event: MonetaryEvent): string {
  if (typeof event.amount === 'number') {
    return `${formatNumber(event.amount)} OFO`;
  }
  if (typeof event.rate === 'number') {
    return `${(event.rate * 100).toFixed(2)}%`;
  }
  return '—';
}

export function eventStatusLabel(status: EventStatus): string {
  switch (status) {
    case 'active':   return 'Active';
    case 'pending':  return 'En attente';
    case 'archived': return 'Archivée';
  }
}

/* ═══════════════════════════════════════════════════════════
   TEMPS RELATIF
   ═══════════════════════════════════════════════════════════ */

export function timeAgo(date: Date): string {
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60_000);

  if (mins < 1) return "à l'instant";
  if (mins < 60) return `il y a ${mins} min`;

  const hours = Math.floor(mins / 60);
  if (hours < 24) return `il y a ${hours}h`;

  const days = Math.floor(hours / 24);
  return `il y a ${days}j`;
}

/* ═══════════════════════════════════════════════════════════
   GÉNÉRATION D'HISTORIQUE
   ═══════════════════════════════════════════════════════════ */

export function generateHistory(
  start: number,
  points: number,
  volatility: number
): number[] {
  const arr: number[] = [];
  let current = start;

  for (let i = 0; i < points; i++) {
    const change = current * volatility * (Math.random() - 0.5);
    current = Math.max(0, current + change);
    arr.push(current);
  }

  return arr;
}

export function calcTrend(history: readonly number[]): number {
  if (history.length < 2) return 0;
  const first = history[0];
  const last = history[history.length - 1];
  if (first === 0) return 0;
  return ((last - first) / first) * 100;
}