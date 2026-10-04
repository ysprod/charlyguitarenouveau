import { Component, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { trigger, style, animate, transition, keyframes, state } from '@angular/animations';

interface FinanceModule {
  id: number;
  emoji: string;
  title: string;
  subtitle: string;
  description: string;
  features: string[];
  color: string;
  gradient: string;
  route: string;
}

interface ExchangeRate {
  code: string;
  flag: string;
  name: string;
  rate: number;
  change: number;
}

@Component({
  selector: 'app-finance',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './finance.component.html',
  styleUrl: './finance.component.scss',
  animations: [
    trigger('fadeInUp', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(40px)' }),
        animate('700ms cubic-bezier(0.22, 1, 0.36, 1)',
          style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ]),
    trigger('staggerCards', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(60px) scale(0.95)' }),
        animate('800ms 100ms cubic-bezier(0.22, 1, 0.36, 1)',
          style({ opacity: 1, transform: 'translateY(0) scale(1)' }))
      ])
    ]),
    trigger('floatingCoin', [
      transition(':enter', [
        animate('3000ms ease-in-out', keyframes([
          style({ transform: 'translateY(0) rotate(0deg)', offset: 0 }),
          style({ transform: 'translateY(-20px) rotate(180deg)', offset: 0.5 }),
          style({ transform: 'translateY(0) rotate(360deg)', offset: 1 })
        ]))
      ])
    ]),
    trigger('pulse', [
      state('idle', style({ transform: 'scale(1)' })),
      state('active', style({ transform: 'scale(1.05)' })),
      transition('idle <=> active', animate('600ms ease-in-out'))
    ])
  ]
})
export class FinanceComponent implements OnInit, OnDestroy {
  private intervalId: any;
  private pulseInterval: any;

  // Signal pour le compteur animé
  totalSupply = signal(100_000_000_000_000);
  pulseState = signal<'idle' | 'active'>('idle');

  // Taux de change dynamiques
  exchangeRates: ExchangeRate[] = [
    { code: 'XOF', flag: '🇨🇮', name: 'Franc CFA', rate: 1.00, change: 0 },
    { code: 'EUR', flag: '🇪🇺', name: 'Euro', rate: 0.0015, change: +0.12 },
    { code: 'USD', flag: '🇺🇸', name: 'Dollar', rate: 0.0016, change: -0.08 },
    { code: 'GBP', flag: '🇬🇧', name: 'Livre', rate: 0.0013, change: +0.05 },
    { code: 'NGN', flag: '🇳🇬', name: 'Naira', rate: 2.45, change: +0.34 },
    { code: 'GHS', flag: '🇬🇭', name: 'Cedi', rate: 0.024, change: -0.02 }
  ];

  // Les 7 grands modules
  modules: FinanceModule[] = [
    {
      id: 1,
      emoji: '🏦',
      title: 'Banque Centrale d\'Offoland',
      subtitle: 'BCO — Le cœur monétaire',
      description: 'Le pilier qui régule toute l\'économie d\'Offoland. La BCO contrôle la masse monétaire, fixe les taux et veille à la stabilité des Sept Dimensions financières.',
      features: [
        'Masse monétaire OFFO en temps réel',
        'Taux OFFO/FCFA, EUR, USD',
        'Politique d\'inflation & dévaluation',
        'Réserves virtuelles & émissions',
        'Destruction contrôlée d\'OFFO'
      ],
      color: '#FFD700',
      gradient: 'linear-gradient(135deg, #FFD700 0%, #FF8C00 100%)',
      route: '/offoland/bco'
    },
    {
      id: 2,
      emoji: '💳',
      title: 'Offo Money',
      subtitle: 'Le portefeuille personnel',
      description: 'Chaque ame d\'Offoland possède son propre portefeuille. Un espace sécurisé pour déposer, convertir, envoyer et dépenser ses OFFO.',
      features: [
        'Solde OFFO en temps réel',
        'Dépôt via Mobile Money / Carte',
        'Conversion instantanée',
        'Envoi & réception entre personnes',
        'Historique complet des transactions'
      ],
      color: '#00D4FF',
      gradient: 'linear-gradient(135deg, #00D4FF 0%, #0066FF 100%)',
      route: '/offoland/wallet'
    },
    {
      id: 3,
      emoji: '🌍',
      title: 'Marché des Devises',
      subtitle: 'Offo Exchange',
      description: 'Un bureau de change virtuel qui connecte les monnaies réelles au monde d\'Offoland. Les taux évoluent selon les règles économiques du royaume.',
      features: [
        'Taux en temps réel (XOF, EUR, USD, GBP...)',
        'Double valeur : officielle & économique',
        'Spread contrôlé par la BCO',
        'Arbitrage entre les Sept Dimensions',
        'API publique pour les partenaires'
      ],
      color: '#00FF88',
      gradient: 'linear-gradient(135deg, #00FF88 0%, #00AA55 100%)',
      route: '/offoland/exchange'
    },
    {
      id: 4,
      emoji: '📒',
      title: 'Le Grand Livre',
      subtitle: 'Ledger d\'Offoland',
      description: 'Le registre immuable de toutes les transactions. Chaque OFFO créé, échangé ou détruit est enregistré pour toujours dans la mémoire d\'Offoland.',
      features: [
        'Chaque opération = 1 entrée unique',
        'ID, date, utilisateur, montant, devise',
        'Débit / Crédit équilibrés',
        'Traçabilité complète (audit)',
        'Sécurité renforcée vs simple "solde"'
      ],
      color: '#B266FF',
      gradient: 'linear-gradient(135deg, #B266FF 0%, #7B00FF 100%)',
      route: '/offoland/ledger'
    },
    {
      id: 5,
      emoji: '⚙️',
      title: 'Moteur Financier',
      subtitle: 'Financial Engine',
      description: 'Le cerveau technique qui orchestre tout : Firebase, Cloud Functions, pricing, rewards et economy engine réunis en une seule architecture.',
      features: [
        'Firebase Auth + Firestore',
        'Cloud Functions sécurisées',
        'Wallet Engine & Pricing Engine',
        'Reward Engine (récompenses)',
        'Economy Engine (inflation)'
      ],
      color: '#FF6B6B',
      gradient: 'linear-gradient(135deg, #FF6B6B 0%, #CC0000 100%)',
      route: '/offoland/engine'
    },
    {
      id: 6,
      emoji: '🛒',
      title: 'Offo Market',
      subtitle: 'L\'économie interne',
      description: 'Tout ce qui s\'achète et se vend dans Offoland. Jeux, niveaux, objets, formations, récompenses : la vie économique du royaume.',
      features: [
        'Achat de jeux & niveaux',
        'Objets & reliques virtuelles',
        'Formations & cours',
        'Récompenses communautaires',
        'Commerce entre villages'
      ],
      color: '#FFA500',
      gradient: 'linear-gradient(135deg, #FFA500 0%, #FF4500 100%)',
      route: '/offoland/market'
    },
    {
      id: 7,
      emoji: '🚀',
      title: 'Offoland Finance',
      subtitle: 'L\'écosystème complet',
      description: 'La vision à long terme : Offo Money, Offo Bank, BCO, Offo Exchange, Offo Pay, Offo Credit et Offo Invest réunis sous une seule bannière.',
      features: [
        'Offo Bank — banque virtuelle',
        'Offo Pay — paiement marchand',
        'Offo Credit — crédit virtuel',
        'Offo Invest — investissement',
        'API ouverte aux partenaires'
      ],
      color: '#FF00FF',
      gradient: 'linear-gradient(135deg, #FF00FF 0%, #6600CC 100%)',
      route: '/offoland/finance'
    }
  ];

  // Statistiques animées
  stats = [
    { label: 'Voyageurs actifs', value: 12450, suffix: '+', icon: '👥' },
    { label: 'OFFO en circulation', value: 2_450_000, suffix: '', icon: '💰' },
    { label: 'Transactions / jour', value: 8740, suffix: '', icon: '⚡' },
    { label: 'Dimensions connectées', value: 7, suffix: '/7', icon: '🌟' }
  ];

  // Architecture en couches
  architectureLayers = [
    { name: 'Utilisateur', icon: '👤', color: '#00D4FF' },
    { name: 'CharlyGuitare.com', icon: '🎸', color: '#FFD700' },
    { name: 'Offoland', icon: '🌍', color: '#00FF88' },
    { name: 'Offo Money', icon: '💳', color: '#B266FF' },
    { name: 'Financial Engine', icon: '⚙️', color: '#FF6B6B' },
    { name: 'Paiement réel (FCFA/EUR/USD)', icon: '🏦', color: '#FFA500' }
  ];

  // Pipeline de conversion
  conversionSteps = [
    { step: 1, label: 'Paiement réel', detail: '5 000 FCFA via Mobile Money', icon: '📱' },
    { step: 2, label: 'Crédit OFFO', detail: '5 000 OFFO crédités', icon: '💰' },
    { step: 3, label: 'Ledger', detail: 'Transaction enregistrée', icon: '📒' },
    { step: 4, label: 'Wallet', detail: 'Solde mis à jour', icon: '💳' }
  ];

  ngOnInit(): void {
    // Animation du compteur de masse monétaire
    this.intervalId = setInterval(() => {
      this.totalSupply.update(v => v + Math.floor(Math.random() * 500) - 200);
    }, 2000);

    // Pulse animation
    this.pulseInterval = setInterval(() => {
      this.pulseState.set(this.pulseState() === 'idle' ? 'active' : 'idle');
    }, 1500);
  }

  ngOnDestroy(): void {
    if (this.intervalId) clearInterval(this.intervalId);
    if (this.pulseInterval) clearInterval(this.pulseInterval);
  }

  formatNumber(value: number): string {
    return new Intl.NumberFormat('fr-FR').format(value);
  }

  getChangeClass(change: number): string {
    if (change > 0) return 'positive';
    if (change < 0) return 'negative';
    return 'neutral';
  }

  getChangeIcon(change: number): string {
    if (change > 0) return '▲';
    if (change < 0) return '▼';
    return '●';
  }
}
