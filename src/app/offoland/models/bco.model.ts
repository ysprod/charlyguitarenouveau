/* ═══════════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════════ */

export type Trend = 'positive' | 'negative' | 'neutral';

export type EventType =
  | 'emission'
  | 'burn'
  | 'devaluation'
  | 'revaluation'
  | 'rate-change';

export type EventStatus = 'active' | 'pending' | 'archived';

export type CentralBankVariant =
  | 'primary'
  | 'success'
  | 'warning'
  | 'danger'
  | 'neutral';

/* ═══════════════════════════════════════════════════════════
   KPI
   ═══════════════════════════════════════════════════════════ */

export interface KpiCard {
  readonly id: string;
  readonly label: string;
  readonly value: number;
  readonly unit: string;
  readonly trend: number;
  readonly color: string;
  readonly history: readonly number[];
  readonly format: 'number' | 'currency' | 'percent';
}

/* ═══════════════════════════════════════════════════════════
   ÉVÉNEMENT MONÉTAIRE
   ═══════════════════════════════════════════════════════════ */

export interface MonetaryEvent {
  readonly id: string;
  readonly type: EventType;
  readonly title: string;
  readonly amount?: number;
  readonly rate?: number;
  readonly date: Date;
  readonly status: EventStatus;
}

/* ═══════════════════════════════════════════════════════════
   ACTION BCO
   ═══════════════════════════════════════════════════════════ */

export interface CentralBankAction {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly icon: string;
  readonly impact: string;
  readonly variant: CentralBankVariant;
  readonly action: () => void;
}

/* ═══════════════════════════════════════════════════════════
   TAUX DE CHANGE
   ═══════════════════════════════════════════════════════════ */

export interface ExchangeRate {
  readonly code: string;
  readonly flag: string;
  readonly name: string;
  readonly rate: number;
  readonly color: string;
}