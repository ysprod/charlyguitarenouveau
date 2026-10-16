// src/app/offoland/bco/bco.component.ts

import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  afterNextRender,
  computed,
  inject,
  signal,
} from '@angular/core';

import { GaugeComponent } from 'src/app/offoland/bco/gauge/gauge.component';
import { SparklineComponent } from 'src/app/offoland/bco/sparkline/sparkline.component';

import {
  CentralBankAction,
  EventType,
  KpiCard,
  MonetaryEvent,
} from '../models/bco.model';

import {
  INITIAL_CIRCULATING_SUPPLY,
  INITIAL_INFLATION_RATE,
  INITIAL_OFO_TO_EUR,
  INITIAL_OFO_TO_USD,
  INITIAL_OFO_TO_XOF,
  INITIAL_RESERVES,
  INITIAL_TOTAL_SUPPLY,
  MAX_EVENTS,
  TICK_INTERVAL_MS,
} from '../constants/bco.constants';

import {
  calcTrend,
  eventAmountLabel,
  eventIcon,
  eventStatusLabel,
  eventVariant,
  formatNumber,
  formatRate,
  formatTrend,
  generateHistory,
  timeAgo,
  trendClass,
} from '../utils/bco.util';

/* ═══════════════════════════════════════════════════════════
   COMPOSANT
   ═══════════════════════════════════════════════════════════ */

@Component({
  selector: 'app-bco',
  imports: [SparklineComponent, GaugeComponent],
  templateUrl: './bco.component.html',
  styleUrls: ['./bco.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BcoComponent {

  /* ═══════════════════════════════════════════════════════
     INJECTION
     ═══════════════════════════════════════════════════════ */

  private readonly destroyRef = inject(DestroyRef);

  /* ═══════════════════════════════════════════════════════
     TIMERS
     ═══════════════════════════════════════════════════════ */

  private readonly intervals = new Set<ReturnType<typeof setInterval>>();
  private readonly timeouts = new Set<ReturnType<typeof setTimeout>>();

  /* ═══════════════════════════════════════════════════════
     ÉTAT DE LA SIMULATION
     ═══════════════════════════════════════════════════════ */

  readonly totalSupply = signal(INITIAL_TOTAL_SUPPLY);
  readonly circulatingSupply = signal(INITIAL_CIRCULATING_SUPPLY);
  readonly reserves = signal(INITIAL_RESERVES);
  readonly inflationRate = signal(INITIAL_INFLATION_RATE);
  readonly ofoToXof = signal(INITIAL_OFO_TO_XOF);
  readonly ofoToEur = signal(INITIAL_OFO_TO_EUR);
  readonly ofoToUsd = signal(INITIAL_OFO_TO_USD);

  /* ═══════════════════════════════════════════════════════
     HISTORIQUES
     ═══════════════════════════════════════════════════════ */

  readonly supplyHistory = signal<number[]>(
    generateHistory(INITIAL_TOTAL_SUPPLY, 30, 0.02)
  );
  readonly reservesHistory = signal<number[]>(
    generateHistory(INITIAL_RESERVES, 30, 0.03)
  );
  readonly inflationHistory = signal<number[]>(
    generateHistory(INITIAL_INFLATION_RATE, 30, 0.15)
  );
  readonly volumeHistory = signal<number[]>(
    generateHistory(8740, 30, 0.25)
  );

  /* ═══════════════════════════════════════════════════════
     ÉTAT UI
     ═══════════════════════════════════════════════════════ */

  readonly activeKpi = signal<string | null>(null);
  readonly selectedAction = signal<string | null>(null);
  readonly isEmitting = signal(false);

  /* ═══════════════════════════════════════════════════════
     ÉVÉNEMENTS
     ═══════════════════════════════════════════════════════ */

  readonly events = signal<MonetaryEvent[]>([
    { id: 'e1', type: 'emission',    title: 'Émission initiale',            amount: 1_000_000_000, date: new Date(Date.now() - 86_400_000 * 30), status: 'archived' },
    { id: 'e2', type: 'rate-change', title: 'Ajustement taux OFO/EUR',      rate: 0.0015,          date: new Date(Date.now() - 86_400_000 * 12), status: 'archived' },
    { id: 'e3', type: 'emission',    title: 'Récompenses communauté',       amount: 250_000_000,   date: new Date(Date.now() - 86_400_000 * 5),  status: 'active'   },
    { id: 'e4', type: 'burn',        title: 'Destruction OFO excédentaires', amount: 45_000_000,   date: new Date(Date.now() - 86_400_000 * 2),  status: 'active'   },
    { id: 'e5', type: 'devaluation', title: 'Dévaluation programmée',       rate: -0.10,           date: new Date(),                              status: 'pending'  },
  ]);

  /* ═══════════════════════════════════════════════════════
     COMPUTED — KPIs
     ═══════════════════════════════════════════════════════ */

  readonly kpis = computed<KpiCard[]>(() => [
    {
      id: 'supply',
      label: 'Masse monétaire',
      value: this.totalSupply(),
      unit: 'OFO',
      trend: calcTrend(this.supplyHistory()),
      color: 'var(--kpi-supply)',
      history: this.supplyHistory(),
      format: 'number',
    },
    {
      id: 'circulating',
      label: 'En circulation',
      value: this.circulatingSupply(),
      unit: 'OFO',
      trend: calcTrend(this.supplyHistory()),
      color: 'var(--kpi-circulating)',
      history: this.supplyHistory(),
      format: 'number',
    },
    {
      id: 'reserves',
      label: 'Réserves virtuelles',
      value: this.reserves(),
      unit: 'OFO',
      trend: calcTrend(this.reservesHistory()),
      color: 'var(--kpi-reserves)',
      history: this.reservesHistory(),
      format: 'number',
    },
    {
      id: 'inflation',
      label: 'Inflation',
      value: this.inflationRate(),
      unit: '%',
      trend: calcTrend(this.inflationHistory()),
      color: 'var(--kpi-inflation)',
      history: this.inflationHistory(),
      format: 'percent',
    },
  ]);

  /* ═══════════════════════════════════════════════════════
     COMPUTED — TAUX
     ═══════════════════════════════════════════════════════ */

  readonly exchangeRates = computed(() => [
    { code: 'XOF', flag: '🇨🇮', name: 'Franc CFA', rate: this.ofoToXof(), color: 'var(--rate-xof)' },
    { code: 'EUR', flag: '🇪🇺', name: 'Euro',      rate: this.ofoToEur(), color: 'var(--rate-eur)' },
    { code: 'USD', flag: '🇺🇸', name: 'Dollar',    rate: this.ofoToUsd(), color: 'var(--rate-usd)' },
  ]);

  /* ═══════════════════════════════════════════════════════
     COMPUTED — SCORES
     ═══════════════════════════════════════════════════════ */

  readonly stabilityScore = computed(() => {
    const inflation = this.inflationRate();
    const reserveRatio = (this.reserves() / this.totalSupply()) * 100;
    const inflationScore = Math.max(0, 100 - Math.abs(inflation - 2) * 20);
    const reserveScore = Math.min(100, reserveRatio * 2);
    return Math.round(inflationScore * 0.6 + reserveScore * 0.4);
  });

  readonly liquidityScore = computed(() => {
    const ratio = (this.circulatingSupply() / this.totalSupply()) * 100;
    return Math.round(Math.min(100, ratio * 1.2));
  });

  readonly reserveRatio = computed(() =>
    Math.round((this.reserves() / this.totalSupply()) * 100)
  );

  /* ═══════════════════════════════════════════════════════
     HELPERS EXPOSÉS AU TEMPLATE
     ═══════════════════════════════════════════════════════ */

  readonly formatNumber = formatNumber;
  readonly formatRate = formatRate;
  readonly formatTrend = formatTrend;
  readonly trendClass = trendClass;
  readonly eventIcon = eventIcon;
  readonly eventVariant = eventVariant;
  readonly eventAmountLabel = eventAmountLabel;
  readonly eventStatusLabel = eventStatusLabel;
  readonly timeAgo = timeAgo;

  /* ═══════════════════════════════════════════════════════
     ACTIONS DE LA BANQUE CENTRALE
     ═══════════════════════════════════════════════════════ */

  readonly actions: CentralBankAction[] = [
    {
      id: 'emit',
      label: 'Émettre des OFO',
      description: "Créer de nouveaux OFO et les injecter dans l'économie",
      icon: '🪙',
      impact: '+ Masse monétaire · − Valeur unitaire',
      variant: 'primary',
      action: () => this.emitOfo(50_000),
    },
    {
      id: 'burn',
      label: 'Détruire des OFO',
      description: 'Retirer des OFO de la circulation pour réduire la masse',
      icon: '🔥',
      impact: '− Masse monétaire · + Valeur unitaire',
      variant: 'danger',
      action: () => this.burnOfo(25_000),
    },
    {
      id: 'devalue',
      label: "Dévaluer l'OFO",
      description: "Baisser la valeur officielle de l'OFO face aux devises",
      icon: '📉',
      impact: '− Taux de change · + Compétitivité',
      variant: 'warning',
      action: () => this.devalueOfo(5),
    },
    {
      id: 'revalue',
      label: "Réévaluer l'OFO",
      description: "Augmenter la valeur officielle de l'OFO",
      icon: '📈',
      impact: '+ Taux de change · − Exportations',
      variant: 'success',
      action: () => this.revalueOfo(5),
    },
    {
      id: 'adjustRate',
      label: 'Ajuster les taux',
      description: 'Modifier les taux de change face aux monnaies réelles',
      icon: '⚖️',
      impact: 'Neutre · Rééquilibrage',
      variant: 'neutral',
      action: () => this.adjustRates(),
    },
    {
      id: 'freeze',
      label: 'Geler les émissions',
      description: "Suspendre temporairement toute nouvelle émission d'OFO",
      icon: '❄️',
      impact: 'Stabilité · Contrôle',
      variant: 'success',
      action: () => this.freezeEmissions(),
    },
  ];

  /* ═══════════════════════════════════════════════════════
     CONSTRUCTEUR
     ═══════════════════════════════════════════════════════ */

  constructor() {
    afterNextRender(() => {
      const id = setInterval(() => this.tick(), TICK_INTERVAL_MS);
      this.intervals.add(id);
    });

    this.destroyRef.onDestroy(() => {
      this.intervals.forEach((id) => clearInterval(id));
      this.intervals.clear();

      this.timeouts.forEach((id) => clearTimeout(id));
      this.timeouts.clear();
    });
  }

  /* ═══════════════════════════════════════════════════════
     SIMULATION LIVE
     ═══════════════════════════════════════════════════════ */

  private tick(): void {
    const delta = Math.floor(Math.random() * 3000) - 1000;

    this.totalSupply.update((v) => Math.max(0, v + delta));
    this.circulatingSupply.update((v) =>
      Math.max(0, v + Math.floor(delta * 0.85))
    );

    this.supplyHistory.update((h) => [...h.slice(1), this.totalSupply()]);
    this.reservesHistory.update((h) => [...h.slice(1), this.reserves()]);
    this.inflationHistory.update((h) => [...h.slice(1), this.inflationRate()]);

    this.ofoToEur.update((r) =>
      +(r + (Math.random() - 0.5) * 0.00002).toFixed(6)
    );
    this.ofoToUsd.update((r) =>
      +(r + (Math.random() - 0.5) * 0.00002).toFixed(6)
    );
  }

  /* ═══════════════════════════════════════════════════════
     ACTIONS — IMPLÉMENTATION
     ═══════════════════════════════════════════════════════ */

  emitOfo(amount: number): void {
    if (this.isEmitting()) return;
    this.isEmitting.set(true);

    const steps = 20;
    const stepAmount = amount / steps;
    let i = 0;

    const id = setInterval(() => {
      this.totalSupply.update((v) => v + stepAmount);
      this.circulatingSupply.update((v) => v + stepAmount * 0.9);
      i++;

      if (i >= steps) {
        clearInterval(id);
        this.intervals.delete(id);
        this.isEmitting.set(false);

        this.addEvent({
          id: `e${Date.now()}`,
          type: 'emission',
          title: 'Émission manuelle',
          amount,
          date: new Date(),
          status: 'active',
        });

        this.inflationRate.update((r) => +(r + 0.3).toFixed(2));
        this.ofoToEur.update((r) => +(r * 0.995).toFixed(6));
      }
    }, 30);

    this.intervals.add(id);
  }

  burnOfo(amount: number): void {
    if (this.totalSupply() < amount) return;

    this.totalSupply.update((v) => v - amount);
    this.circulatingSupply.update((v) => v - amount * 0.9);
    this.inflationRate.update((r) => +Math.max(0, r - 0.2).toFixed(2));
    this.ofoToEur.update((r) => +(r * 1.005).toFixed(6));

    this.addEvent({
      id: `e${Date.now()}`,
      type: 'burn',
      title: 'Destruction OFO',
      amount,
      date: new Date(),
      status: 'active',
    });
  }

  devalueOfo(percent: number): void {
    const factor = 1 - percent / 100;

    this.ofoToEur.update((r) => +(r * factor).toFixed(6));
    this.ofoToUsd.update((r) => +(r * factor).toFixed(6));
    this.inflationRate.update((r) => +(r + percent * 0.5).toFixed(2));

    this.addEvent({
      id: `e${Date.now()}`,
      type: 'devaluation',
      title: `Dévaluation de ${percent}%`,
      rate: -percent / 100,
      date: new Date(),
      status: 'active',
    });
  }

  revalueOfo(percent: number): void {
    const factor = 1 + percent / 100;

    this.ofoToEur.update((r) => +(r * factor).toFixed(6));
    this.ofoToUsd.update((r) => +(r * factor).toFixed(6));
    this.inflationRate.update((r) =>
      +Math.max(0, r - percent * 0.3).toFixed(2)
    );

    this.addEvent({
      id: `e${Date.now()}`,
      type: 'revaluation',
      title: `Réévaluation de ${percent}%`,
      rate: percent / 100,
      date: new Date(),
      status: 'active',
    });
  }

  adjustRates(): void {
    this.ofoToXof.set(1.0);
    this.ofoToEur.update((r) => +(r * (0.98 + Math.random() * 0.04)).toFixed(6));
    this.ofoToUsd.update((r) => +(r * (0.98 + Math.random() * 0.04)).toFixed(6));

    this.addEvent({
      id: `e${Date.now()}`,
      type: 'rate-change',
      title: 'Ajustement des taux',
      date: new Date(),
      status: 'active',
    });
  }

  freezeEmissions(): void {
    this.addEvent({
      id: `e${Date.now()}`,
      type: 'rate-change',
      title: 'Gel des émissions',
      date: new Date(),
      status: 'active',
    });
    this.inflationRate.update((r) => +Math.max(0, r - 0.5).toFixed(2));
  }

  private addEvent(event: MonetaryEvent): void {
    this.events.update((list) => [event, ...list].slice(0, MAX_EVENTS));
  }

  /* ═══════════════════════════════════════════════════════
     INTERACTIONS
     ═══════════════════════════════════════════════════════ */

  onKpiHover(id: string | null): void {
    this.activeKpi.set(id);
  }

  triggerAction(action: CentralBankAction): void {
    this.selectedAction.set(action.id);
    action.action();

    const id = setTimeout(() => this.selectedAction.set(null), 800);
    this.timeouts.add(id);
  }
}