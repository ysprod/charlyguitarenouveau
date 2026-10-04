import {
  Component,
  OnInit,
  OnDestroy,
  signal,
  computed,
  ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  trigger,
  style,
  animate,
  transition,
  query,
  stagger,
  state
} from '@angular/animations';
import { SparklineComponent } from '../shared/sparkline/sparkline.component';
import { GaugeComponent } from '../shared/gauge/gauge.component';

/* ============================================================
   INTERFACES
   ============================================================ */

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
  type: 'emission' | 'burn' | 'devaluation' | 'revaluation' | 'rate-change';
  title: string;
  amount?: number;
  rate?: number;
  date: Date;
  status: 'active' | 'pending' | 'archived';
}

interface CentralBankAction {
  id: string;
  label: string;
  description: string;
  icon: string;
  impact: string;
  color: string;
  action: () => void;
}

/* ============================================================
   COMPOSANT
   ============================================================ */

@Component({
  selector: 'app-bco',
  standalone: true,
  imports: [CommonModule, FormsModule, SparklineComponent, GaugeComponent],
  templateUrl: './bco.component.html',
  styleUrls: ['./bco.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [
    trigger('fadeInUp', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(30px)' }),
        animate('600ms cubic-bezier(0.22, 1, 0.36, 1)',
          style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ]),
    trigger('staggerKpis', [
      transition(':enter', [
        query('.kpi-card', [
          style({ opacity: 0, transform: 'translateY(40px) scale(0.95)' }),
          stagger(100, [
            animate('700ms cubic-bezier(0.22, 1, 0.36, 1)',
              style({ opacity: 1, transform: 'translateY(0) scale(1)' }))
          ])
        ], { optional: true })
      ])
    ]),
    trigger('staggerActions', [
      transition(':enter', [
        query('.action-card', [
          style({ opacity: 0, transform: 'translateX(-30px)' }),
          stagger(80, [
            animate('500ms cubic-bezier(0.22, 1, 0.36, 1)',
              style({ opacity: 1, transform: 'translateX(0)' }))
          ])
        ], { optional: true })
      ])
    ]),
    trigger('eventSlide', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateX(20px)' }),
        animate('400ms ease-out', style({ opacity: 1, transform: 'translateX(0)' }))
      ]),
      transition(':leave', [
        animate('300ms ease-in', style({ opacity: 0, transform: 'translateX(-20px)' }))
      ])
    ]),
    trigger('pulse', [
      state('idle', style({ transform: 'scale(1)' })),
      state('active', style({ transform: 'scale(1.03)', boxShadow: '0 0 30px rgba(255, 215, 0, 0.5)' })),
      transition('idle <=> active', animate('400ms ease-in-out'))
    ])
  ]
})
export class BcoComponent implements OnInit, OnDestroy {

  private tickInterval?: ReturnType<typeof setInterval>;

  /* ============================================================
     ÉTAT DE LA SIMULATION
     ============================================================ */

  totalSupply = signal(2_450_000_000_000);
  circulatingSupply = signal(2_180_000_000_000);
  reserves = signal(1_200_000_000_000);
  inflationRate = signal(2.4);
  ofoToXof = signal(1.00);
  ofoToEur = signal(0.0015);
  ofoToUsd = signal(0.0016);

  /* ============================================================
     HISTORIQUES (SPARKLINES)
     ============================================================ */

  supplyHistory = signal<number[]>(this.generateHistory(2_450_000_000_000, 30, 0.02));
  reservesHistory = signal<number[]>(this.generateHistory(1_200_000_000_000, 30, 0.03));
  inflationHistory = signal<number[]>(this.generateHistory(2.4, 30, 0.15));
  volumeHistory = signal<number[]>(this.generateHistory(8740, 30, 0.25));

  /* ============================================================
     ÉTAT UI
     ============================================================ */

  activeKpi = signal<string | null>(null);
  selectedAction = signal<string | null>(null);
  isEmitting = signal(false);

  /* ============================================================
     ÉVÉNEMENTS MONÉTAIRES
     ============================================================ */

  events = signal<MonetaryEvent[]>([
    { id: 'e1', type: 'emission', title: 'Émission initiale', amount: 1_000_000_000, date: new Date(Date.now() - 86400000 * 30), status: 'archived' },
    { id: 'e2', type: 'rate-change', title: 'Ajustement taux OFO/EUR', rate: 0.0015, date: new Date(Date.now() - 86400000 * 12), status: 'archived' },
    { id: 'e3', type: 'emission', title: 'Récompenses communauté', amount: 250_000_000, date: new Date(Date.now() - 86400000 * 5), status: 'active' },
    { id: 'e4', type: 'burn', title: 'Destruction OFO excédentaires', amount: 45_000_000, date: new Date(Date.now() - 86400000 * 2), status: 'active' },
    { id: 'e5', type: 'devaluation', title: 'Dévaluation programmée', rate: -0.10, date: new Date(), status: 'pending' }
  ]);

  /* ============================================================
     KPIs (COMPUTED)
     ============================================================ */

  kpis = computed<KpiCard[]>(() => [
    {
      id: 'supply',
      label: 'Masse monétaire',
      value: this.totalSupply(),
      unit: 'OFO',
      trend: this.calcTrend(this.supplyHistory()),
      color: '#FFD700',
      history: this.supplyHistory(),
      format: 'number'
    },
    {
      id: 'circulating',
      label: 'En circulation',
      value: this.circulatingSupply(),
      unit: 'OFO',
      trend: this.calcTrend(this.supplyHistory()),
      color: '#00D4FF',
      history: this.supplyHistory(),
      format: 'number'
    },
    {
      id: 'reserves',
      label: 'Réserves virtuelles',
      value: this.reserves(),
      unit: 'OFO',
      trend: this.calcTrend(this.reservesHistory()),
      color: '#00FF88',
      history: this.reservesHistory(),
      format: 'number'
    },
    {
      id: 'inflation',
      label: 'Inflation',
      value: this.inflationRate(),
      unit: '%',
      trend: this.calcTrend(this.inflationHistory()),
      color: '#FF6B6B',
      history: this.inflationHistory(),
      format: 'percent'
    }
  ]);

  /* ============================================================
     TAUX DE CHANGE (COMPUTED)
     ============================================================ */

  exchangeRates = computed(() => [
    { code: 'XOF', flag: '🇨🇮', name: 'Franc CFA', rate: this.ofoToXof(), previous: 1.00, color: '#FFD700' },
    { code: 'EUR', flag: '🇪🇺', name: 'Euro', rate: this.ofoToEur(), previous: 0.0015, color: '#00D4FF' },
    { code: 'USD', flag: '🇺🇸', name: 'Dollar', rate: this.ofoToUsd(), previous: 0.0016, color: '#00FF88' }
  ]);

  /* ============================================================
     ACTIONS DE LA BANQUE CENTRALE
     ============================================================ */

  actions: CentralBankAction[] = [
    {
      id: 'emit',
      label: 'Émettre des OFO',
      description: 'Créer de nouveaux OFO et les injecter dans l\'économie',
      icon: '🪙',
      impact: '+ Masse monétaire · - Valeur unitaire',
      color: '#FFD700',
      action: () => this.emitOfo(50_000)
    },
    {
      id: 'burn',
      label: 'Détruire des OFO',
      description: 'Retirer des OFO de la circulation pour réduire la masse',
      icon: '🔥',
      impact: '- Masse monétaire · + Valeur unitaire',
      color: '#FF6B6B',
      action: () => this.burnOfo(25_000)
    },
    {
      id: 'devalue',
      label: 'Dévaluer l\'OFO',
      description: 'Baisser la valeur officielle de l\'OFO face aux devises',
      icon: '📉',
      impact: '- Taux de change · + Compétitivité',
      color: '#FFA500',
      action: () => this.devalueOfo(5)
    },
    {
      id: 'revalue',
      label: 'Réévaluer l\'OFO',
      description: 'Augmenter la valeur officielle de l\'OFO',
      icon: '📈',
      impact: '+ Taux de change · - Exportations',
      color: '#00FF88',
      action: () => this.revalueOfo(5)
    },
    {
      id: 'adjustRate',
      label: 'Ajuster les taux',
      description: 'Modifier les taux de change face aux monnaies réelles',
      icon: '⚖️',
      impact: 'Neutre · Rééquilibrage',
      color: '#00D4FF',
      action: () => this.adjustRates()
    },
    {
      id: 'freeze',
      label: 'Geler les émissions',
      description: 'Suspendre temporairement toute nouvelle émission d\'OFO',
      icon: '❄️',
      impact: 'Stabilité · Contrôle',
      color: '#B266FF',
      action: () => this.freezeEmissions()
    }
  ];

  /* ============================================================
     SIGNAUX DÉRIVÉS (JUGES)
     ============================================================ */

  stabilityScore = computed(() => {
    const inflation = this.inflationRate();
    const reserveRatio = (this.reserves() / this.totalSupply()) * 100;
    const inflationScore = Math.max(0, 100 - Math.abs(inflation - 2) * 20);
    const reserveScore = Math.min(100, reserveRatio * 2);
    return Math.round((inflationScore * 0.6 + reserveScore * 0.4));
  });

  liquidityScore = computed(() => {
    const ratio = (this.circulatingSupply() / this.totalSupply()) * 100;
    return Math.round(Math.min(100, ratio * 1.2));
  });

  reserveRatio = computed(() => {
    return Math.round((this.reserves() / this.totalSupply()) * 100);
  });

  /* ============================================================
     LIFECYCLE
     ============================================================ */

  ngOnInit(): void {
    this.tickInterval = setInterval(() => this.tick(), 3000);
  }

  ngOnDestroy(): void {
    if (this.tickInterval) clearInterval(this.tickInterval);
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
    const interval = setInterval(() => {
      this.totalSupply.update(v => v + stepAmount);
      this.circulatingSupply.update(v => v + stepAmount * 0.9);
      i++;
      if (i >= steps) {
        clearInterval(interval);
        this.isEmitting.set(false);
        this.addEvent({
          id: `e${Date.now()}`,
          type: 'emission',
          title: 'Émission manuelle',
          amount,
          date: new Date(),
          status: 'active'
        });
        this.inflationRate.update(r => +(r + 0.3).toFixed(2));
        this.ofoToEur.update(r => +(r * 0.995).toFixed(6));
      }
    }, 30);
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
      status: 'active'
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
      status: 'active'
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
      status: 'active'
    });
  }

  adjustRates(): void {
    this.ofoToXof.set(1.00);
    this.ofoToEur.update(r => +(r * (0.98 + Math.random() * 0.04)).toFixed(6));
    this.ofoToUsd.update(r => +(r * (0.98 + Math.random() * 0.04)).toFixed(6));
    this.addEvent({
      id: `e${Date.now()}`,
      type: 'rate-change',
      title: 'Ajustement des taux',
      date: new Date(),
      status: 'active'
    });
  }

  freezeEmissions(): void {
    this.addEvent({
      id: `e${Date.now()}`,
      type: 'rate-change',
      title: 'Gel des émissions',
      date: new Date(),
      status: 'active'
    });
    this.inflationRate.update(r => +Math.max(0, r - 0.5).toFixed(2));
  }

  private addEvent(event: MonetaryEvent): void {
    this.events.update(list => [event, ...list].slice(0, 10));
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
    return (value > 0 ? '+' : '') + value.toFixed(2) + '%';
  }

  trendClass(value: number): string {
    if (value > 0.5) return 'positive';
    if (value < -0.5) return 'negative';
    return 'neutral';
  }

  eventIcon(type: string): string {
    switch (type) {
      case 'emission': return '🪙';
      case 'burn': return '🔥';
      case 'devaluation': return '📉';
      case 'revaluation': return '📈';
      case 'rate-change': return '⚖️';
      default: return '●';
    }
  }

  eventColor(type: string): string {
    switch (type) {
      case 'emission': return '#FFD700';
      case 'burn': return '#FF6B6B';
      case 'devaluation': return '#FFA500';
      case 'revaluation': return '#00FF88';
      case 'rate-change': return '#00D4FF';
      default: return '#A0A0C0';
    }
  }

  eventAmountLabel(event: MonetaryEvent): string {
    if (event.amount) return `${this.formatNumber(event.amount)} OFO`;
    if (event.rate) return `${(event.rate * 100).toFixed(2)}%`;
    return '—';
  }

  timeAgo(date: Date): string {
    const diff = Date.now() - date.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'à l\'instant';
    if (mins < 60) return `il y a ${mins} min`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `il y a ${hours}h`;
    const days = Math.floor(hours / 24);
    return `il y a ${days}j`;
  }

  /* ============================================================
     TRACK BY (CORRIGÉ)
     ============================================================ */

  /**
   * ✅ CORRECTION : Angular appelle trackBy avec (index, item)
   * L'ancienne signature `trackByEvent(event: MonetaryEvent)` était incorrecte.
   */
  trackByEvent(index: number, event: MonetaryEvent): string {
    return event.id;
  }

  trackByCode(index: number, rate: { code: string }): string {
    return rate.code;
  }

  trackByKpi(index: number, kpi: KpiCard): string {
    return kpi.id;
  }

  trackByAction(index: number, action: CentralBankAction): string {
    return action.id;
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
}