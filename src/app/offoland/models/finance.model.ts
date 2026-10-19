/* ═══════════════════════════════════════════════════════════
   TYPES FONCTIONNELS
   ═══════════════════════════════════════════════════════════ */

/** Direction d'une variation de taux. */
export type ChangeDirection = 'positive' | 'negative' | 'neutral';

/** Variante fonctionnelle de couleur (charte boutons). */
export type FinanceVariant =
  | 'primary'
  | 'success'
  | 'warning'
  | 'danger'
  | 'violet'
  | 'orange';

/* ═══════════════════════════════════════════════════════════
   MODÈLES MÉTIER
   ═══════════════════════════════════════════════════════════ */

export interface FinanceModule {
  readonly id: number;
  readonly emoji: string;
  readonly title: string;
  readonly subtitle: string;
  readonly description: string;
  readonly features: readonly string[];
  readonly variant: FinanceVariant;
  readonly route: string;
}

export interface ExchangeRate {
  readonly code: string;
  readonly flag: string;
  readonly name: string;
  readonly rate: number;
  readonly change: number;
}

export interface ConversionStep {
  readonly step: number;
  readonly label: string;
  readonly detail: string;
  readonly icon: string;
}

export interface LedgerEntry {
  readonly id: string;
  readonly user: string;
  readonly op: string;
  readonly debit: string;
  readonly credit: string;
}