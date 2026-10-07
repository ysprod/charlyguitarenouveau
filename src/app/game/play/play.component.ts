import {
  Component,
  NgZone,
  OnDestroy,
  OnInit,
  ElementRef,
  inject,
  ChangeDetectionStrategy,
  signal,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';

interface Particle {
  left: number;
  delay: number;
  duration: number;
  size: number;
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
  imports: [RouterLink],
  templateUrl: './play.component.html',
  styleUrls: ['./play.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlayComponent implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly ngZone = inject(NgZone);
  private readonly hostEl = inject(ElementRef) as ElementRef<HTMLElement>;

  /* ═══════════════════════════════════════════════════════
     DONNÉES DÉCORATIVES
     ═══════════════════════════════════════════════════════ */
  particles: Particle[] = [];
  musicNotes: MusicNote[] = [];

  readonly filters: Filter[] = [
    { id: 'all',      label: 'Tous',      icon: '🎮' },
    { id: 'live',     label: 'Live',      icon: '🎸' },
    { id: 'multi',    label: 'Multi',     icon: '👥' },
    { id: 'music',    label: 'Musique',   icon: '🎵' },
    { id: 'quiz',     label: 'Quiz',      icon: '🧠' },
    { id: 'learning', label: 'Apprendre', icon: '📚' },
    { id: 'tools',    label: 'Outils',    icon: '🛠️' },
  ];

  readonly selectedFilter = signal<string>('all');
  readonly visibleGameCount = signal<number>(0);

  private readonly MUSIC_SYMBOLS = ['♪', '♫', '♬', '♩', '🎵', '🎶', '🎸'];

  /* ═══════════════════════════════════════════════════════
     RÉFÉRENCES DOM ET LISTENERS
     ═══════════════════════════════════════════════════════ */
  private gameCards: HTMLElement[] = [];
  private glowElements: HTMLElement[] = [];
  private tiltHandlers = new Map<HTMLElement, {
    move: (e: MouseEvent) => void;
    leave: () => void;
  }>();
  private mouseMoveHandler?: (e: MouseEvent) => void;
  private rafId: number | null = null;

  /* ═══════════════════════════════════════════════════════
     LIFECYCLE
     ═══════════════════════════════════════════════════════ */
  ngOnInit(): void {
    this.particles = this.generateParticles(45);
    this.musicNotes = this.generateMusicNotes(12);

    this.ngZone.runOutsideAngular(() => {
      setTimeout(() => {
        this.cacheDomElements();
        this.visibleGameCount.set(this.gameCards.length);
        this.initTiltEffect();
        this.initParallax();
      }, 0);
    });
  }

  ngOnDestroy(): void {
    this.tiltHandlers.forEach((handlers, card) => {
      card.removeEventListener('mousemove', handlers.move);
      card.removeEventListener('mouseleave', handlers.leave);
    });
    this.tiltHandlers.clear();

    if (this.mouseMoveHandler) {
      document.removeEventListener('mousemove', this.mouseMoveHandler);
      this.mouseMoveHandler = undefined;
    }

    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }

    this.gameCards = [];
    this.glowElements = [];
  }

  /* ═══════════════════════════════════════════════════════
     GÉNÉRATION DÉCOR
     ═══════════════════════════════════════════════════════ */
  private generateParticles(count: number): Particle[] {
    return Array.from({ length: count }, () => ({
      left: Math.random() * 100,
      delay: Math.random() * 8,
      duration: 6 + Math.random() * 8,
      size: 2 + Math.random() * 4,
    }));
  }

  private generateMusicNotes(count: number): MusicNote[] {
    return Array.from({ length: count }, () => ({
      left: Math.random() * 100,
      delay: Math.random() * 12,
      duration: 10 + Math.random() * 10,
      symbol: this.MUSIC_SYMBOLS[
        Math.floor(Math.random() * this.MUSIC_SYMBOLS.length)
      ],
    }));
  }

  /* ═══════════════════════════════════════════════════════
     CACHE DOM
     ═══════════════════════════════════════════════════════ */
  private cacheDomElements(): void {
    this.gameCards = Array.from(
      this.hostEl.nativeElement.querySelectorAll<HTMLElement>('.btn-game')
    );
    this.glowElements = Array.from(
      this.hostEl.nativeElement.querySelectorAll<HTMLElement>('.glow')
    );
  }

  /* ═══════════════════════════════════════════════════════
     EFFET TILT 3D
     ═══════════════════════════════════════════════════════ */
  private initTiltEffect(): void {
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
  }

  /* ═══════════════════════════════════════════════════════
     PARALLAX HALOS
     ═══════════════════════════════════════════════════════ */
  private initParallax(): void {
    this.mouseMoveHandler = (e: MouseEvent) => {
      if (this.rafId !== null) return;

      this.rafId = requestAnimationFrame(() => {
        const x = (e.clientX / window.innerWidth - 0.5) * 20;
        const y = (e.clientY / window.innerHeight - 0.5) * 20;

        this.glowElements.forEach((glow, i) => {
          const factor = (i + 1) * 0.4;
          glow.style.transform = `translate(${x * factor}px, ${y * factor}px)`;
        });

        this.rafId = null;
      });
    };

    document.addEventListener('mousemove', this.mouseMoveHandler, { passive: true });
  }

  /* ═══════════════════════════════════════════════════════
     FILTRAGE
     ═══════════════════════════════════════════════════════ */
  selectFilter(id: string): void {
    if (this.selectedFilter() === id) return;
    this.selectedFilter.set(id);

    if (this.gameCards.length === 0) {
      setTimeout(() => this.applyFilter(id), 0);
      return;
    }
    this.applyFilter(id);
  }

  private applyFilter(id: string): void {
    let visible = 0;
    const filter = id === 'all' ? null : id;

    this.gameCards.forEach(card => {
      const cat = card.dataset['category'] || '';
      const show = filter === null || cat === filter;

      card.style.display = show ? '' : 'none';

      if (show) {
        visible++;
        card.style.animation = 'none';
        void card.offsetWidth;
        card.style.animation = 'cardPop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both';
      }
    });

    this.visibleGameCount.set(visible);
  }

  /* ═══════════════════════════════════════════════════════
     NAVIGATION
     ═══════════════════════════════════════════════════════ */
  onSelectLykoduo(): void {
    this.navigateToGame('/lykomode', '1');
  }

  onSelectBoubouni(): void {
    this.navigateToGame('/cards', '2');
  }

  onSelectDeDeKronos(): void {
    this.navigateToGame('/kronos', '3');
  }

  onSelectPiano(): void {
    this.router.navigate(['/piano']);
  }

  onSelectPianovirtuel(): void {
    this.router.navigate(['/pianovirtuel']);
  }
 // ═══════════ NOUVEAU : L'ORACLE ═══════════
  onSelectOracle(): void {
    this.router.navigate(['/oracle']);
  }
  
  private navigateToGame(route: string, etape: string): void {
    this.router.navigate([route], { queryParams: { etape } });
  }
}