import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  signal,
} from '@angular/core';

/* ═══════════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════════ */

type ChangeDirection = 'positive' | 'negative' | 'neutral';

interface FinanceModule {
  id: number;
  emoji: string;
  title: string;
  subtitle: string;
  description: string;
  features: string[];
  /** Variante fonctionnelle de couleur. */
  variant: 'primary' | 'success' | 'warning' | 'danger' | 'violet' | 'orange';
  route: string;
}

interface ExchangeRate {
  code: string;
  flag: string;
  name: string;
  rate: number;
  change: number;
}

interface ConversionStep {
  step: number;
  label: string;
  detail: string;
  icon: string;
}

interface LedgerEntry {
  id: string;
  user: string;
  op: string;
  debit: string;
  credit: string;
}

const TICK_SUPPLY_MS = 2000;
const TICK_RATES_MS = 4000;

/* ═══════════════════════════════════════════════════════════
   COMPOSANT
   ═══════════════════════════════════════════════════════════ */

@Component({
  selector: 'app-finance',
  standalone: true,
  imports: [],
  templateUrl: './finance.component.html',
  styleUrls: ['./finance.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FinanceComponent implements OnInit, OnDestroy {

  private supplyInterval?: ReturnType<typeof setInterval>;
  private ratesInterval?: ReturnType<typeof setInterval>;

  /* ─── Signal — Masse monétaire OFFO ─── */
  readonly totalSupply = signal(100_000_000_000_000);

  /* ─── Signal — Taux de change live ─── */
  readonly exchangeRates = signal<ExchangeRate[]>([
    { code: 'XOF', flag: '🇨🇮', name: 'Franc CFA', rate: 1.0,    change: 0 },
    { code: 'EUR', flag: '🇪🇺', name: 'Euro',      rate: 0.0015, change: +0.12 },
    { code: 'USD', flag: '🇺🇸', name: 'Dollar',    rate: 0.0016, change: -0.08 },
    { code: 'GBP', flag: '🇬🇧', name: 'Livre',     rate: 0.0013, change: +0.05 },
    { code: 'NGN', flag: '🇳🇬', name: 'Naira',     rate: 2.45,   change: +0.34 },
    { code: 'GHS', flag: '🇬🇭', name: 'Cedi',      rate: 0.024,  change: -0.02 },
  ]);

  /* ═══════════════════════════════════════════════════════════
     LES 7 GRANDS MODULES
     ═══════════════════════════════════════════════════════════ */
  readonly modules: FinanceModule[] = [
    {
      id: 1,
      emoji: '🏦',
      title: "Banque Centrale d'Offoland",
      subtitle: 'BCO — Le cœur monétaire',
      description:
        "Le pilier qui régule toute l'économie d'Offoland. La BCO contrôle la masse monétaire, fixe les taux et veille à la stabilité des Sept Dimensions financières.",
      features: [
        'Masse monétaire OFFO en temps réel',
        'Taux OFFO/FCFA, EUR, USD',
        "Politique d'inflation & dévaluation",
        'Réserves virtuelles & émissions',
        "Destruction contrôlée d'OFFO",
      ],
      variant: 'warning',
      route: '/offoland/bco',
    },
    {
      id: 2,
      emoji: '💳',
      title: 'Offo Money',
      subtitle: 'Le portefeuille personnel',
      description:
        "Chaque âme d'Offoland possède son propre portefeuille. Un espace sécurisé pour déposer, convertir, envoyer et dépenser ses OFFO.",
      features: [
        'Solde OFFO en temps réel',
        'Dépôt via Mobile Money / Carte',
        'Conversion instantanée',
        'Envoi & réception entre personnes',
        'Historique complet des transactions',
      ],
      variant: 'primary',
      route: '/offoland/wallet',
    },
    {
      id: 3,
      emoji: '🌍',
      title: 'Marché des Devises',
      subtitle: 'Offo Exchange',
      description:
        "Un bureau de change virtuel qui connecte les monnaies réelles au monde d'Offoland. Les taux évoluent selon les règles économiques du royaume.",
      features: [
        'Taux en temps réel (XOF, EUR, USD, GBP...)',
        'Double valeur : officielle & économique',
        'Spread contrôlé par la BCO',
        'Arbitrage entre les Sept Dimensions',
        'API publique pour les partenaires',
      ],
      variant: 'success',
      route: '/offoland/exchange',
    },
    {
      id: 4,
      emoji: '📒',
      title: 'Le Grand Livre',
      subtitle: "Ledger d'Offoland",
      description:
        "Le registre immuable de toutes les transactions. Chaque OFFO créé, échangé ou détruit est enregistré pour toujours dans la mémoire d'Offoland.",
      features: [
        'Chaque opération = 1 entrée unique',
        'ID, date, utilisateur, montant, devise',
        'Débit / Crédit équilibrés',
        'Traçabilité complète (audit)',
        'Sécurité renforcée vs simple "solde"',
      ],
      variant: 'violet',
      route: '/offoland/ledger',
    },
    {
      id: 5,
      emoji: '⚙️',
      title: 'Moteur Financier',
      subtitle: 'Financial Engine',
      description:
        'Le cerveau technique qui orchestre tout : Firebase, Cloud Functions, pricing, rewards et economy engine réunis en une seule architecture.',
      features: [
        'Firebase Auth + Firestore',
        'Cloud Functions sécurisées',
        'Wallet Engine & Pricing Engine',
        'Reward Engine (récompenses)',
        'Economy Engine (inflation)',
      ],
      variant: 'danger',
      route: '/offoland/engine',
    },
    {
      id: 6,
      emoji: '🛒',
      title: 'Offo Market',
      subtitle: "L'économie interne",
      description:
        "Tout ce qui s'achète et se vend dans Offoland. Jeux, niveaux, objets, formations, récompenses : la vie économique du royaume.",
      features: [
        'Achat de jeux & niveaux',
        'Objets & reliques virtuelles',
        'Formations & cours',
        'Récompenses communautaires',
        'Commerce entre villages',
      ],
      variant: 'orange',
      route: '/offoland/market',
    },
    {
      id: 7,
      emoji: '🚀',
      title: 'Offoland Finance',
      subtitle: "L'écosystème complet",
      description:
        'La vision à long terme : Offo Money, Offo Bank, BCO, Offo Exchange, Offo Pay, Offo Credit et Offo Invest réunis sous une seule bannière.',
      features: [
        'Offo Bank — banque virtuelle',
        'Offo Pay — paiement marchand',
        'Offo Credit — crédit virtuel',
        'Offo Invest — investissement',
        'API ouverte aux partenaires',
      ],
      variant: 'primary',
      route: '/offoland/finance',
    },
  ];

  /* ═══════════════════════════════════════════════════════════
     PIPELINE DE CONVERSION
     ═══════════════════════════════════════════════════════════ */
  readonly conversionSteps: ConversionStep[] = [
    { step: 1, label: 'Paiement réel',  detail: '5 000 FCFA via Mobile Money', icon: '📱' },
    { step: 2, label: 'Crédit OFFO',    detail: '5 000 OFFO crédités',         icon: '💰' },
    { step: 3, label: 'Ledger',         detail: 'Transaction enregistrée',     icon: '📒' },
    { step: 4, label: 'Wallet',         detail: 'Solde mis à jour',            icon: '💳' },
  ];

  /* ═══════════════════════════════════════════════════════════
     GRAND LIVRE (exemple)
     ═══════════════════════════════════════════════════════════ */
  readonly ledgerEntries: LedgerEntry[] = [
    { id: '001', user: 'Charly', op: 'Dépôt',        debit: '—',           credit: '5 000 OFFO' },
    { id: '002', user: 'Charly', op: 'Achat jeu',    debit: '1 000 OFFO',  credit: '—'          },
    { id: '003', user: 'Charly', op: 'Récompense',   debit: '—',           credit: '250 OFFO'   },
    { id: '004', user: 'Charly', op: 'Achat livre',  debit: '2 500 OFFO',  credit: '—'          },
  ];

  /* ═══════════════════════════════════════════════════════════
     LIFECYCLE
     ═══════════════════════════════════════════════════════════ */

  ngOnInit(): void {
    this.supplyInterval = setInterval(() => this.tickSupply(), TICK_SUPPLY_MS);
    this.ratesInterval = setInterval(() => this.tickRates(), TICK_RATES_MS);
  }

  ngOnDestroy(): void {
    if (this.supplyInterval) clearInterval(this.supplyInterval);
    if (this.ratesInterval) clearInterval(this.ratesInterval);
  }

  /* ═══════════════════════════════════════════════════════════
     SIMULATION LIVE
     ═══════════════════════════════════════════════════════════ */

  /**
   * Variation proportionnelle à la masse actuelle (±0,00005 %)
   * → visible mais crédible pour une simulation.
   */
  private tickSupply(): void {
    const current = this.totalSupply();
    const delta = Math.floor(current * 0.0000005 * (Math.random() - 0.5));
    this.totalSupply.update(v => Math.max(0, v + delta));
  }

  /** Variation très légère des taux, avec recalcul de la tendance. */
  private tickRates(): void {
    this.exchangeRates.update(list =>
      list.map(rate => {
        if (rate.code === 'XOF') return rate;

        const variation = (Math.random() - 0.5) * 0.00004;
        const nextRate = +(rate.rate + variation).toFixed(6);
        const nextChange = +(
          rate.change + (Math.random() - 0.5) * 0.1
        ).toFixed(2);

        return {
          ...rate,
          rate: Math.max(0.000001, nextRate),
          change: nextChange,
        };
      })
    );
  }

  /* ═══════════════════════════════════════════════════════════
     HELPERS UI
     ═══════════════════════════════════════════════════════════ */

  formatNumber(value: number): string {
    return new Intl.NumberFormat('fr-FR').format(Math.round(value));
  }

  formatRate(value: number): string {
    return value.toFixed(6);
  }

  getChangeClass(change: number): ChangeDirection {
    if (change > 0.01) return 'positive';
    if (change < -0.01) return 'negative';
    return 'neutral';
  }

  getChangeIcon(change: number): string {
    if (change > 0.01) return '▲';
    if (change < -0.01) return '▼';
    return '●';
  }

  formatChange(change: number): string {
    const sign = change > 0 ? '+' : '';
    return `${sign}${change.toFixed(2)}%`;
  }

  /* ═══════════════════════════════════════════════════════════
     TRACK (pour @for)
     ═══════════════════════════════════════════════════════════ */

  trackByModuleId = (_: number, m: FinanceModule): number => m.id;
  trackByStepNumber = (_: number, s: ConversionStep): number => s.step;
  trackByRateCode = (_: number, r: ExchangeRate): string => r.code;
  trackByLedgerId = (_: number, e: LedgerEntry): string => e.id;
}