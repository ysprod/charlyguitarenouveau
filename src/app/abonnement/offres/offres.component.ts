import { Component, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import {
  trigger, style, animate, transition,
  query, stagger, state
} from '@angular/animations';

/* ============================================================
   INTERFACES
   ============================================================ */

interface Pack {
  id: string;
  category: 'debutant' | 'intermediaire' | 'solo' | 'chansons';
  badge?: string;
  badgeColor?: 'blue' | 'green' | 'gold';
  name: string;
  price: number;
  priceUnit: string;
  session: string;
  duration: string;
  features: string[];
  highlight?: boolean;
  premium?: boolean;
}

interface PackCategory {
  id: 'debutant' | 'intermediaire' | 'solo' | 'chansons';
  title: string;
  subtitle: string;
  objective: string;
  icon: string;
  accentColor: string;
  image: string;
  packs: Pack[];
}

/* ============================================================
   COMPOSANT
   ============================================================ */

@Component({
  selector: 'app-offres',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './offres.component.html',
  styleUrls: ['./offres.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [
    trigger('fadeInUp', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(40px)' }),
        animate('700ms cubic-bezier(0.22, 1, 0.36, 1)',
          style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ]),
    trigger('staggerPacks', [
      transition(':enter', [
        query('.pack-card', [
          style({ opacity: 0, transform: 'translateY(60px) scale(0.95)' }),
          stagger(120, [
            animate('800ms cubic-bezier(0.22, 1, 0.36, 1)',
              style({ opacity: 1, transform: 'translateY(0) scale(1)' }))
          ])
        ], { optional: true })
      ])
    ]),
    trigger('heroEnter', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(30px)' }),
        animate('900ms cubic-bezier(0.22, 1, 0.36, 1)',
          style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ])
  ]
})
export class OffresComponent {
 /* ============================================================
     SIGNAUX UI
     ============================================================ */

  activeCategory = signal<'debutant' | 'intermediaire' | 'solo' | 'chansons'>('debutant');
  hoveredPack = signal<string | null>(null);

  /* ============================================================
     DONNÉES — 4 CATÉGORIES (issues des visuels)
     ============================================================ */

  categories: PackCategory[] = [
    /* ─────────────────────────────────────────────
       CATÉGORIE 1 : DÉBUTANTS
       ───────────────────────────────────────────── */
    {
      id: 'debutant',
      title: 'Pack de formation Débutants',
      subtitle: 'Faire ses premiers pas sur la guitare',
      objective: 'Apprendre les bases, prendre confiance et jouer ses premières chansons.',
      icon: '🎯',
      accentColor: '#00D4FF',
      image: 'assets/images/packs/debutant.jpg',
      packs: [
        {
          id: 'deb-jeune',
          category: 'debutant',
          badge: 'Recommandé - Juniors',
          badgeColor: 'blue',
          name: 'PACK JEUNESSE',
          price: 100_000,
          priceUnit: 'FR / MOIS',
          session: '2h / séance',
          duration: '+ 1 doc pédagogique',
          features: [
            'Cours adaptés aux enfants et adolescents',
            'Éveil musical et rythme',
            'Apprentissage des premiers accords',
            '1 document pédagogique offert'
          ]
        },
        {
          id: 'deb-adulte',
          category: 'debutant',
          badge: 'Le plus populaire',
          badgeColor: 'green',
          name: 'PACK ADULTE',
          price: 120_000,
          priceUnit: 'FR / MOIS',
          session: '2h / séance',
          duration: '+ 2 docs + 3 mois premium',
          highlight: true,
          features: [
            'Méthode progressive et structurée',
            'Théorie musicale appliquée',
            '2 documents pédagogiques offerts',
            '3 mois d\'accès premium à la plateforme',
            'Suivi personnalisé'
          ]
        },
        {
          id: 'deb-premium',
          category: 'debutant',
          badge: 'L\'Excellence Totale',
          badgeColor: 'gold',
          name: 'PACK PREMIUM',
          price: 200_000,
          priceUnit: 'FR / MOIS',
          session: '2h / séance',
          duration: '+ 4 docs + 1 an + Gold + Certificat',
          premium: true,
          features: [
            '4 documents pédagogiques offerts',
            '1 an d\'abonnement à la plateforme',
            'Statut Élève Intermédiaire Gold',
            'Certificat de fin de cycle',
            'Suivi haut de gamme',
            'Accès aux masterclass'
          ]
        }
      ]
    },

    /* ─────────────────────────────────────────────
       CATÉGORIE 2 : INTERMÉDIAIRES
       ───────────────────────────────────────────── */
    {
      id: 'intermediaire',
      title: 'Pack Intermédiaire',
      subtitle: 'Gagner en fluidité et en autonomie',
      objective: 'Maîtriser les transitions, les rythmes avancés et commencer à jouer en autonomie.',
      icon: '🎸',
      accentColor: '#FFD700',
      image: 'assets/images/packs/intermediaire.jpg',
      packs: [
        {
          id: 'int-jeune',
          category: 'intermediaire',
          badge: 'Recommandé - Jeunes',
          badgeColor: 'blue',
          name: 'PACK JEUNE',
          price: 90_000,
          priceUnit: 'FR / MOIS',
          session: '1h / séance',
          duration: 'Rythme hebdomadaire',
          features: [
            'Transitions entre accords',
            'Rythmes avancés',
            'Picking et arpèges',
            'Morceaux complets adaptés'
          ]
        },
        {
          id: 'int-adulte',
          category: 'intermediaire',
          badge: 'Le plus populaire',
          badgeColor: 'green',
          name: 'PACK ADULTE',
          price: 110_000,
          priceUnit: 'FR / MOIS',
          session: '1h20 / séance',
          duration: '+ 1 doc pédagogique offert',
          highlight: true,
          features: [
            'Transitions entre accords',
            'Rythmes avancés',
            'Picking et arpèges',
            'Morceaux complets',
            '1 document pédagogique offert'
          ]
        },
        {
          id: 'int-premium',
          category: 'intermediaire',
          badge: 'L\'Excellence',
          badgeColor: 'gold',
          name: 'PACK PREMIUM',
          price: 160_000,
          priceUnit: 'FR / MOIS',
          session: '2h / séance',
          duration: '+ 4 docs + accès premium',
          premium: true,
          features: [
            'Transitions entre accords',
            'Rythmes avancés',
            'Picking et arpèges',
            'Morceaux complets',
            '4 documents pédagogiques offerts',
            'Accès premium à la plateforme',
            'Statut Élève Intermédiaire Gold'
          ]
        }
      ]
    },

    /* ─────────────────────────────────────────────
       CATÉGORIE 3 : SOLO & TECHNIQUES
       ───────────────────────────────────────────── */
    {
      id: 'solo',
      title: 'Pack Solo et Techniques',
      subtitle: 'Développer son jeu personnel',
      objective: 'Explorer les gammes, le bend, l\'improvisation et les techniques avancées.',
      icon: '⚡',
      accentColor: '#B266FF',
      image: 'assets/images/packs/solo.jpg',
      packs: [
        {
          id: 'solo-jeune',
          category: 'solo',
          badge: 'Recommandé - Jeunes',
          badgeColor: 'blue',
          name: 'PACK JEUNE',
          price: 70_000,
          priceUnit: 'FR / MOIS',
          session: '1h / séance',
          duration: 'Rythme hebdomadaire',
          features: [
            'Gammes et solos',
            'Initiation au bend et vibrato',
            'Improvisation simple',
            'Techniques blues et rock'
          ]
        },
        {
          id: 'solo-adulte',
          category: 'solo',
          badge: 'Le plus populaire',
          badgeColor: 'green',
          name: 'PACK ADULTE',
          price: 80_000,
          priceUnit: 'FR / MOIS',
          session: '1h / séance',
          duration: '+ 1 doc pédagogique offert',
          highlight: true,
          features: [
            'Gammes et solos',
            'Bend, vibrato et hammer-on',
            'Improvisation',
            'Techniques blues et rock',
            'Techniques coupé décalé et zouglou',
            '1 document pédagogique offert'
          ]
        },
        {
          id: 'solo-premium',
          category: 'solo',
          badge: 'L\'Excellence',
          badgeColor: 'gold',
          name: 'PACK PREMIUM',
          price: 150_000,
          priceUnit: 'FR / MOIS',
          session: '2h / séance',
          duration: '+ 3 docs + 1 an plateforme',
          premium: true,
          features: [
            'Gammes et solos',
            'Bend, vibrato, hammer-on',
            'Improvisation avancée',
            'Techniques blues, rock, zouglou',
            '3 documents pédagogiques offerts',
            'Accès complet à la plateforme (1 an)',
            'Statut Élève Gold affiché'
          ]
        }
      ]
    },

    /* ─────────────────────────────────────────────
       CATÉGORIE 4 : CHANSONS & ACCOMPAGNEMENT
       ───────────────────────────────────────────── */
    {
      id: 'chansons',
      title: 'Pack Chansons et Accompagnement',
      subtitle: 'Jouer et chanter ses morceaux préférés',
      objective: 'Maîtriser l\'accompagnement, le chant et se produire en public.',
      icon: '🎤',
      accentColor: '#FF6B6B',
      image: 'assets/images/packs/chansons.jpg',
      packs: [
        {
          id: 'chan-jeune',
          category: 'chansons',
          badge: 'Recommandé Jeunes',
          badgeColor: 'blue',
          name: 'PACK JEUNE',
          price: 140_000,
          priceUnit: 'FR / MOIS',
          session: '2h / séance',
          duration: 'Suivi personnalisé inclus',
          features: [
            'Accompagnement de chansons',
            'Suivi personnalisé inclus',
            '2 documents pédagogiques offerts',
            'Répertoire adapté à l\'âge'
          ]
        },
        {
          id: 'chan-adulte',
          category: 'chansons',
          badge: 'Le plus populaire',
          badgeColor: 'green',
          name: 'PACK ADULTE',
          price: 160_000,
          priceUnit: 'FR / MOIS',
          session: '2h / séance',
          duration: '+ 4 docs + certificat',
          highlight: true,
          features: [
            'Suivi personnalisé inclus',
            'Possibilité de cours à domicile privé',
            '4 documents pédagogiques offerts',
            '1 Tee-shirt et 1 Stylo offerts',
            'Délivrance de certificat de formation',
            'Accompagnement scénique'
          ]
        },
        {
          id: 'chan-premium',
          category: 'chansons',
          badge: 'L\'Offre Ultime',
          badgeColor: 'gold',
          name: 'PACK PREMIUM',
          price: 250_000,
          priceUnit: 'FR / MOIS',
          session: '2h / séance',
          duration: '+ 5 docs + 1 an + Taekwondo',
          premium: true,
          features: [
            '1h de Taekwondo offerte / semaine',
            '5 documents pédagogiques offerts',
            'Accès illimité à l\'application (1 an)',
            'Affichage Gold chant et accompagnement',
            'Certificat de fin de cycle',
            'Suivi haut de gamme'
          ]
        }
      ]
    }
  ];

  /* ============================================================
     COMPUTED
     ============================================================ */

  currentCategory = computed(() =>
    this.categories.find(c => c.id === this.activeCategory())!
  );

  /* ============================================================
     HELPERS
     ============================================================ */

  formatPrice(price: number): string {
    return new Intl.NumberFormat('fr-FR').format(price);
  }

  selectCategory(id: Pack['category']): void {
    this.activeCategory.set(id);
    // Scroll fluide vers les packs
    setTimeout(() => {
      document.querySelector('.packs-section')
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  }

  onPackHover(id: string | null): void {
    this.hoveredPack.set(id);
  }
}
