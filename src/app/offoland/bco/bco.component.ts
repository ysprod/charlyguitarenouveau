import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  computed,
  signal,
} from '@angular/core';

import { GaugeComponent } from 'src/app/offoland/bco/gauge/gauge.component';
import { SparklineComponent } from 'src/app/offoland/bco/sparkline/sparkline.component';

/* ============================================================
   TYPES
   ============================================================ */

type Trend = 'positive' | 'negative' | 'neutral';
type EventType = 'emission' | 'burn' | 'devaluation' | 'revaluation' | 'rate-change';
type EventStatus = 'active' | 'pending' | 'archived';

interface KpiCard {
  id: string;
  label: string;
  value: number;
  unit: string;
  trend: number;
  color: string;
  history: number[];
  format: 'number' | 'currency' | 'percent';
}

interface MonetaryEvent {
  id: string;
  type: EventType;
  title: string;
  amount?: number;
  rate?: number;
  date: Date;
  status: EventStatus;
}

interface CentralBankAction {
  id: string;
  label: string;
  description: string;
  icon: string;
  impact: string;
  /** Palette fonctionnelle : primary, success, warning, danger, neutral. */
  variant: 'primary' | 'success' | 'warning' | 'danger' | 'neutral';
  action: () => void;
}

const MAX_EVENTS = 10;
const TICK_INTERVAL_MS = 3000;

/* ============================================================
   COMPOSANT
   ============================================================ */

@Component({
  selector: 'app-bco',
  standalone: true,
  imports: [SparklineComponent, GaugeComponent],
  templateUrl: './bco.component.html',
  styleUrls: ['./bco.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BcoComponent implements OnInit, OnDestroy {

  /** Timers actifs (tick global + animations d'émission). */
  private readonly timers = new Set<ReturnType<typeof setInterval>>();

  /* ============================================================
     ÉTAT DE LA SIMULATION
     ============================================================ */

  readonly totalSupply = signal(2_450_000_000_000);
  readonly circulatingSupply = signal(2_180_000_000_000);
  readonly reserves = signal(1_200_000_000_000);
  readonly inflationRate = signal(2.4);
  readonly ofoToXof = signal(1.0);
  readonly ofoToEur = signal(0.0015);
  readonly ofoToUsd = signal(0.0016);

  /* ============================================================
     HISTORIQUES (SPARKLINES)
     ============================================================ */

  readonly supplyHistory = signal<number[]>(
    this.generateHistory(2_450_000_000_000, 30, 0.02)
  );
  readonly reservesHistory = signal<number[]>(
    this.generateHistory(1_200_000_000_000, 30, 0.03)
  );
  readonly inflationHistory = signal<number[]>(
    this.generateHistory(2.4, 30, 0.15)
  );
  readonly volumeHistory = signal<number[]>(
    this.generateHistory(8740, 30, 0.25)
  );

  /* ============================================================
     ÉTAT UI
     ============================================================ */

  readonly activeKpi = signal<string | null>(null);
  readonly selectedAction = signal<string | null>(null);
  readonly isEmitting = signal(false);

  /* ============================================================
     ÉVÉNEMENTS MONÉTAIRES
     ============================================================ */

  readonly events = signal<MonetaryEvent[]>([
    { id: 'e1', type: 'emission',      title: 'Émission initiale',          amount: 1_000_000_000, date: new Date(Date.now() - 86_400_000 * 30), status: 'archived' },
    { id: 'e2', type: 'rate-change',   title: 'Ajustement taux OFO/EUR',    rate: 0.0015,          date: new Date(Date.now() - 86_400_000 * 12), status: 'archived' },
    { id: 'e3', type: 'emission',      title: 'Récompenses communauté',     amount: 250_000_000,   date: new Date(Date.now() - 86_400_000 * 5),  status: 'active'   },
    { id: 'e4', type: 'burn',          title: 'Destruction OFO excédentaires', amount: 45_000_000, date: new Date(Date.now() - 86_400_000 * 2),  status: 'active'   },
    { id: 'e5', type: 'devaluation',   title: 'Dévaluation programmée',     rate: -0.10,           date: new Date(),                              status: 'pending'  },
  ]);

  /* ============================================================
     KPIs (COMPUTED)
     ============================================================ */

  readonly kpis = computed<KpiCard[]>(() => [
    {
      id: 'supply',
      label: 'Masse monétaire',
      value: this.totalSupply(),
      unit: 'OFO',
      trend: this.calcTrend(this.supplyHistory()),
      color: 'var(--kpi-supply)',
      history: this.supplyHistory(),
      format: 'number',
    },
    {
      id: 'circulating',
      label: 'En circulation',
      value: this.circulatingSupply(),
      unit: 'OFO',
      trend: this.calcTrend(this.supplyHistory()),
      color: 'var(--kpi-circulating)',
      history: this.supplyHistory(),
      format: 'number',
    },
    {
      id: 'reserves',
      label: 'Réserves virtuelles',
      value: this.reserves(),
      unit: 'OFO',
      trend: this.calcTrend(this.reservesHistory()),
      color: 'var(--kpi-reserves)',
      history: this.reservesHistory(),
      format: 'number',
    },
    {
      id: 'inflation',
      label: 'Inflation',
      value: this.inflationRate(),
      unit: '%',
      trend: this.calcTrend(this.inflationHistory()),
      color: 'var(--kpi-inflation)',
      history: this.inflationHistory(),
      format: 'percent',
    },
  ]);

  /* ============================================================
     TAUX DE CHANGE (COMPUTED)
     ============================================================ */

  readonly exchangeRates = computed(() => [
    { code: 'XOF', flag: '🇨🇮', name: 'Franc CFA',  rate: this.ofoToXof(), color: 'var(--rate-xof)' },
    { code: 'EUR', flag: '🇪🇺', name: 'Euro',       rate: this.ofoToEur(), color: 'var(--rate-eur)' },
    { code: 'USD', flag: '🇺🇸', name: 'Dollar',     rate: this.ofoToUsd(), color: 'var(--rate-usd)' },
  ]);

  /* ============================================================
     ACTIONS DE LA BANQUE CENTRALE
     ============================================================ */

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

  /* ============================================================
     SIGNAUX DÉRIVÉS (JUGES)
     ============================================================ */

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

  /* ============================================================
     LIFECYCLE
     ============================================================ */

  ngOnInit(): void {
    const id = setInterval(() => this.tick(), TICK_INTERVAL_MS);
    this.timers.add(id);
  }

  ngOnDestroy(): void {
    this.timers.forEach(id => clearInterval(id));
    this.timers.clear();
  }

  /* ============================================================
     SIMULATION LIVE
     ============================================================ */

  private tick(): void {
    const delta = Math.floor(Math.random() * 3000) - 1000;
    this.totalSupply.update(v => Math.max(0, v + delta));
    this.circulatingSupply.update(v => Math.max(0, v + Math.floor(delta * 0.85)));

    this.supplyHistory.update(h => [...h.slice(1), this.totalSupply()]);
    this.reservesHistory.update(h => [...h.slice(1), this.reserves()]);
    this.inflationHistory.update(h => [...h.slice(1), this.inflationRate()]);

    this.ofoToEur.update(r => +(r + (Math.random() - 0.5) * 0.00002).toFixed(6));
    this.ofoToUsd.update(r => +(r + (Math.random() - 0.5) * 0.00002).toFixed(6));
  }

  private generateHistory(start: number, points: number, volatility: number): number[] {
    const arr: number[] = [];
    let current = start;
    for (let i = 0; i < points; i++) {
      const change = current * volatility * (Math.random() - 0.5);
      current = Math.max(0, current + change);
      arr.push(current);
    }
    return arr;
  }

  private calcTrend(history: number[]): number {
    if (history.length < 2) return 0;
    const first = history[0];
    const last = history[history.length - 1];
    if (first === 0) return 0;
    return ((last - first) / first) * 100;
  }

  /* ============================================================
     ACTIONS DE LA BANQUE CENTRALE (IMPLÉMENTATION)
     ============================================================ */

  emitOfo(amount: number): void {
    if (this.isEmitting()) return;
    this.isEmitting.set(true);

    const steps = 20;
    const stepAmount = amount / steps;
    let i = 0;

    const id = setInterval(() => {
      this.totalSupply.update(v => v + stepAmount);
      this.circulatingSupply.update(v => v + stepAmount * 0.9);
      i++;
      if (i >= steps) {
        clearInterval(id);
        this.timers.delete(id);
        this.isEmitting.set(false);
        this.addEvent({
          id: `e${Date.now()}`,
          type: 'emission',
          title: 'Émission manuelle',
          amount,
          date: new Date(),
          status: 'active',
        });
        this.inflationRate.update(r => +(r + 0.3).toFixed(2));
        this.ofoToEur.update(r => +(r * 0.995).toFixed(6));
      }
    }, 30);

    this.timers.add(id);
  }

  burnOfo(amount: number): void {
    if (this.totalSupply() < amount) return;
    this.totalSupply.update(v => v - amount);
    this.circulatingSupply.update(v => v - amount * 0.9);
    this.inflationRate.update(r => +Math.max(0, r - 0.2).toFixed(2));
    this.ofoToEur.update(r => +(r * 1.005).toFixed(6));
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
    this.ofoToEur.update(r => +(r * factor).toFixed(6));
    this.ofoToUsd.update(r => +(r * factor).toFixed(6));
    this.inflationRate.update(r => +(r + percent * 0.5).toFixed(2));
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
    this.ofoToEur.update(r => +(r * factor).toFixed(6));
    this.ofoToUsd.update(r => +(r * factor).toFixed(6));
    this.inflationRate.update(r => +Math.max(0, r - percent * 0.3).toFixed(2));
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
    this.ofoToEur.update(r => +(r * (0.98 + Math.random() * 0.04)).toFixed(6));
    this.ofoToUsd.update(r => +(r * (0.98 + Math.random() * 0.04)).toFixed(6));
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
    this.inflationRate.update(r => +Math.max(0, r - 0.5).toFixed(2));
  }

  private addEvent(event: MonetaryEvent): void {
    this.events.update(list => [event, ...list].slice(0, MAX_EVENTS));
  }

  /* ============================================================
     HELPERS UI
     ============================================================ */

  formatNumber(value: number): string {
    return new Intl.NumberFormat('fr-FR').format(Math.round(value));
  }

  formatRate(value: number): string {
    return value.toFixed(6);
  }

  formatTrend(value: number): string {
    const sign = value > 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}%`;
  }

  trendClass(value: number): Trend {
    if (value > 0.5) return 'positive';
    if (value < -0.5) return 'negative';
    return 'neutral';
  }

  eventIcon(type: EventType): string {
    switch (type) {
      case 'emission':    return '🪙';
      case 'burn':        return '🔥';
      case 'devaluation': return '📉';
      case 'revaluation': return '📈';
      case 'rate-change': return '⚖️';
    }
  }

  eventVariant(type: EventType): 'primary' | 'danger' | 'warning' | 'success' | 'neutral' {
    switch (type) {
      case 'emission':    return 'primary';
      case 'burn':        return 'danger';
      case 'devaluation': return 'warning';
      case 'revaluation': return 'success';
      case 'rate-change': return 'neutral';
    }
  }

  eventAmountLabel(event: MonetaryEvent): string {
    if (typeof event.amount === 'number') {
      return `${this.formatNumber(event.amount)} OFO`;
    }
    if (typeof event.rate === 'number') {
      return `${(event.rate * 100).toFixed(2)}%`;
    }
    return '—';
  }

  eventStatusLabel(status: EventStatus): string {
    switch (status) {
      case 'active':   return 'Active';
      case 'pending':  return 'En attente';
      case 'archived': return 'Archivée';
    }
  }

  timeAgo(date: Date): string {
    const diff = Date.now() - date.getTime();
    const mins = Math.floor(diff / 60_000);
    if (mins < 1) return "à l'instant";
    if (mins < 60) return `il y a ${mins} min`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `il y a ${hours}h`;
    const days = Math.floor(hours / 24);
    return `il y a ${days}j`;
  }

  /* ============================================================
     INTERACTIONS
     ============================================================ */

  onKpiHover(id: string | null): void {
    this.activeKpi.set(id);
  }

  triggerAction(action: CentralBankAction): void {
    this.selectedAction.set(action.id);
    action.action();
    setTimeout(() => this.selectedAction.set(null), 800);
  }

  /* ============================================================
     TRACK (pour @for)
     ============================================================ */

  trackByKpiId = (_: number, kpi: KpiCard): string => kpi.id;
  trackByRateCode = (_: number, rate: { code: string }): string => rate.code;
  trackByActionId = (_: number, action: CentralBankAction): string => action.id;
  trackByEventId = (_: number, event: MonetaryEvent): string => event.id;
}