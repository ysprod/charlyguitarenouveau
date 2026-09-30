import { CommonModule } from '@angular/common';
import { Component, HostListener, NgZone, OnDestroy, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

interface Particle {
  left: number;
  delay: number;
  duration: number;
  size: number;
}

interface Star {
  top: number;
  left: number;
  delay: number;
}

interface MusicNote {
  left: number;
  delay: number;
  duration: number;
  symbol: string;
}

interface Filter {
  id: string;
  label: string;
  icon: string;
}

@Component({
  selector: 'app-play',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink
  ],
  templateUrl: './play.component.html',
  styleUrls: ['./play.component.scss']
})
export class PlayComponent implements OnInit, OnDestroy {
  particles: Particle[] = [];
  stars: Star[] = [];
  musicNotes: MusicNote[] = [];
  readonly filters: Filter[] = [
    { id: 'all', label: 'Tous', icon: '🎮' },
    { id: 'multi', label: 'Multi', icon: '👥' },
    { id: 'music', label: 'Musique', icon: '🎵' },
    { id: 'quiz', label: 'Quiz', icon: '🧠' },
    { id: 'learning', label: 'Apprendre', icon: '📚' },
    { id: 'tools', label: 'Outils', icon: '🛠️' }
  ];
  selectedFilter = 'all';
  visibleGameCount = 9;
  maxvies: number = 10;
  pointdebonus: number = 0;

  /* ----- Constantes ----- */
  private readonly MUSIC_SYMBOLS = ['♪', '♫', '♬', '♩', '🎵', '🎶', '🎸'] as const;
  private gameCards: HTMLElement[] = [];
  private glowElements: HTMLElement[] = [];
  private tiltHandlers = new Map<HTMLElement, { move: (e: MouseEvent) => void; leave: () => void }>();
  private rafId: number | null = null;

  constructor(
    private readonly router: Router,
    private readonly ngZone: NgZone
  ) { }

  /* ============================================================
     LIFECYCLE
     ============================================================ */
  ngOnInit(): void {
    this.router.routeReuseStrategy.shouldReuseRoute = () => false;

    // Génération des éléments décoratifs
    this.particles = this.generateParticles(45);
    this.stars = this.generateStars(70);
    this.musicNotes = this.generateMusicNotes(12);

    // Attendre le rendu DOM pour attacher les listeners
    this.ngZone.runOutsideAngular(() => {
      setTimeout(() => {
        this.cacheDomElements();
        this.initTiltEffect();
      }, 0);
    });
  }

  ngOnDestroy(): void {
    // Nettoyage des listeners tilt
    this.tiltHandlers.forEach((handlers, card) => {
      card.removeEventListener('mousemove', handlers.move);
      card.removeEventListener('mouseleave', handlers.leave);
    });
    this.tiltHandlers.clear();
    this.gameCards = [];
    this.glowElements = [];

    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
    }
  }

  /* ============================================================
     GÉNÉRATION DÉCOR (pures, pas de mutation)
     ============================================================ */
  private generateParticles(count: number): Particle[] {
    return Array.from({ length: count }, () => ({
      left: Math.random() * 100,
      delay: Math.random() * 8,
      duration: 6 + Math.random() * 8,
      size: 2 + Math.random() * 4
    }));
  }

  private generateStars(count: number): Star[] {
    return Array.from({ length: count }, () => ({
      top: Math.random() * 100,
      left: Math.random() * 100,
      delay: Math.random() * 3
    }));
  }

  private generateMusicNotes(count: number): MusicNote[] {
    return Array.from({ length: count }, () => ({
      left: Math.random() * 100,
      delay: Math.random() * 12,
      duration: 10 + Math.random() * 10,
      symbol: this.MUSIC_SYMBOLS[
        Math.floor(Math.random() * this.MUSIC_SYMBOLS.length)
      ]
    }));
  }

  /* ============================================================
     CACHE DOM
     ============================================================ */
  private cacheDomElements(): void {
    this.gameCards = Array.from(document.querySelectorAll<HTMLElement>('.btn-game'));
    this.glowElements = Array.from(document.querySelectorAll<HTMLElement>('.glow'));
  }

  /* ============================================================
     EFFET TILT 3D (hors zone Angular pour la perf)
     ============================================================ */
  private initTiltEffect(): void {
    this.ngZone.runOutsideAngular(() => {
      this.gameCards.forEach(card => {
        const move = (e: MouseEvent) => {
          const rect = card.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const y = e.clientY - rect.top;
          const centerX = rect.width / 2;
          const centerY = rect.height / 2;
          const rotateX = ((y - centerY) / centerY) * -6;
          const rotateY = ((x - centerX) / centerX) * 6;
          card.style.transform =
            `perspective(900px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-6px) scale(1.02)`;
        };
        const leave = () => { card.style.transform = ''; };

        card.addEventListener('mousemove', move);
        card.addEventListener('mouseleave', leave);
        this.tiltHandlers.set(card, { move, leave });
      });
    });
  }

  /* ============================================================
     PARALLAXE HALOS (throttle via requestAnimationFrame)
     ============================================================ */
  @HostListener('document:mousemove', ['$event'])
  onMouseMove(e: MouseEvent): void {
    if (this.rafId !== null) return; // throttle

    this.rafId = requestAnimationFrame(() => {
      const x = (e.clientX / window.innerWidth - 0.5) * 20;
      const y = (e.clientY / window.innerHeight - 0.5) * 20;

      this.glowElements.forEach((glow, i) => {
        const factor = (i + 1) * 0.4;
        glow.style.transform = `translate(${x * factor}px, ${y * factor}px)`;
      });

      this.rafId = null;
    });
  }

  /* ============================================================
     FILTRAGE DES JEUX (optimisé)
     ============================================================ */
  selectFilter(id: string): void {
    if (this.selectedFilter === id) return;
    this.selectedFilter = id;

    let visible = 0;
    const filter = id === 'all' ? null : id;

    this.gameCards.forEach(card => {
      const cat = card.dataset['category'] || '';
      const show = filter === null || cat === filter;

      card.style.display = show ? '' : 'none';

      if (show) {
        visible++;
        card.style.animation = 'none';
        // Force reflow pour relancer l'animation d'apparition
        void card.offsetWidth;
        card.style.animation = 'cardPop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both';
      }
    });

    this.visibleGameCount = visible;
  }

  /* ============================================================
     NAVIGATION (DRY)
     ============================================================ */
  onSelectLyko(): void {
    this.navigateToGame('/tictac', '1');
  }

  onSelectLykoduo(): void {
    this.navigateToGame('/lykomode', '1');
  }

  onSelectBoubouni(): void {
    this.navigateToGame('/cards', '2');
  }

  onSelectDeDeKronos(): void {
    this.navigateToGame('/kronos', '3');
  }

  private navigateToGame(route: string, etape: string): void {
    this.router.navigate([route], {
      queryParams: {
        etape
      }
    });
  }
}