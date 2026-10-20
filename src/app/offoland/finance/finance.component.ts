// src/app/offoland/finance/finance.component.ts

import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  afterNextRender,
  computed,
  inject,
  signal,
} from '@angular/core';

import {
  ChangeDirection,
  ConversionStep,
  ExchangeRate,
  FinanceModule,
  LedgerEntry,
} from '../models/finance.model';

import {
  CHANGE_THRESHOLD,
  CHANGE_VARIATION_FACTOR,
  CONVERSION_STEPS,
  EXCHANGE_RATES_INIT,
  FINANCE_MODULES,
  FLOATING_COINS,
  INITIAL_TOTAL_SUPPLY,
  LEDGER_ENTRIES,
  MIN_RATE,
  RATE_VARIATION_FACTOR,
  SUPPLY_VARIATION_FACTOR,
  TICK_RATES_MS,
  TICK_SUPPLY_MS,
} from '../constants/finance.constants';

/* ═══════════════════════════════════════════════════════════
   FORMATTERS
   ═══════════════════════════════════════════════════════════ */

const NUMBER_FORMATTER = new Intl.NumberFormat('fr-FR');

/* ═══════════════════════════════════════════════════════════
   COMPOSANT
   ═══════════════════════════════════════════════════════════ */

@Component({
  selector: 'app-finance',
  imports: [],
  templateUrl: './finance.component.html',
  styleUrls: ['./finance.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FinanceComponent {

  /* ═══════════════════════════════════════════════════════
     INJECTION
     ═══════════════════════════════════════════════════════ */

  private readonly destroyRef = inject(DestroyRef);

  /* ═══════════════════════════════════════════════════════
     ÉTAT — SIGNALS
     ═══════════════════════════════════════════════════════ */

  readonly totalSupply = signal(INITIAL_TOTAL_SUPPLY);
  readonly exchangeRates = signal<readonly ExchangeRate[]>(EXCHANGE_RATES_INIT);

  /* ═══════════════════════════════════════════════════════
     DONNÉES STATIQUES EXPOSÉES
     ═══════════════════════════════════════════════════════ */

  readonly modules: readonly FinanceModule[] = FINANCE_MODULES;
  readonly conversionSteps: readonly ConversionStep[] = CONVERSION_STEPS;
  readonly ledgerEntries: readonly LedgerEntry[] = LEDGER_ENTRIES;
  readonly floatingCoins: readonly number[] = FLOATING_COINS;

  /* ═══════════════════════════════════════════════════════
     COMPUTED
     ═══════════════════════════════════════════════════════ */

  readonly formattedSupply = computed(() =>
    NUMBER_FORMATTER.format(Math.round(this.totalSupply())),
  );

  /* ═══════════════════════════════════════════════════════
     CYCLE DE VIE
     ═══════════════════════════════════════════════════════ */

  constructor() {
    afterNextRender(() => {
      const supplyId = setInterval(() => this.tickSupply(), TICK_SUPPLY_MS);
      const ratesId = setInterval(() => this.tickRates(), TICK_RATES_MS);

      this.destroyRef.onDestroy(() => {
        clearInterval(supplyId);
        clearInterval(ratesId);
      });
    });
  }

  /* ═══════════════════════════════════════════════════════
     SIMULATION LIVE
     ═══════════════════════════════════════════════════════ */

  private tickSupply(): void {
    const current = this.totalSupply();
    const delta = Math.floor(
      current * SUPPLY_VARIATION_FACTOR * (Math.random() - 0.5),
    );
    this.totalSupply.update((v) => Math.max(0, v + delta));
  }

  private tickRates(): void {
    this.exchangeRates.update((list) =>
      list.map((rate) => {
        if (rate.code === 'XOF') return rate;

        const variation = (Math.random() - 0.5) * RATE_VARIATION_FACTOR;
        const nextRate = +(rate.rate + variation).toFixed(6);
        const nextChange = +(
          rate.change +
          (Math.random() - 0.5) * CHANGE_VARIATION_FACTOR
        ).toFixed(2);

        return {
          ...rate,
          rate: Math.max(MIN_RATE, nextRate),
          change: nextChange,
        };
      }),
    );
  }

  /* ═══════════════════════════════════════════════════════
     HELPERS UI
     ═══════════════════════════════════════════════════════ */

  formatRate(value: number): string {
    return value.toFixed(6);
  }

  getChangeClass(change: number): ChangeDirection {
    if (change > CHANGE_THRESHOLD) return 'positive';
    if (change < -CHANGE_THRESHOLD) return 'negative';
    return 'neutral';
  }

  getChangeIcon(change: number): string {
    if (change > CHANGE_THRESHOLD) return '▲';
    if (change < -CHANGE_THRESHOLD) return '▼';
    return '●';
  }

  formatChange(change: number): string {
    const sign = change > 0 ? '+' : '';
    return `${sign}${change.toFixed(2)}%`;
  }
}