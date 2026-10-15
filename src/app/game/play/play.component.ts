import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  NgZone,
  OnDestroy,
  computed,
  inject,
  signal
} from '@angular/core';
import { NgClass } from '@angular/common';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { GameItem } from '../models/play.model';
import { GAME_FILTERS, TOAST_DURATION_MS, buildGamesList } from '../constants/play.constants';

import { PromoCodeService } from '../../shared/services/promo-code.service';
import { PromoModalComponent } from '../../shared/promo-modal/promo-modal.component';

const LOG_PREFIX = '[Play]';

@Component({
  selector: 'app-play',
  standalone: true,
  imports: [NgClass, PromoModalComponent],
  templateUrl: './play.component.html',
  styleUrls: ['./play.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PlayComponent implements AfterViewInit, OnDestroy {

  /* ─── Injection ─── */
  private readonly router = inject(Router);
  private readonly ngZone = inject(NgZone);
  private readonly hostEl = inject(ElementRef) as ElementRef<HTMLElement>;
  private readonly promoService = inject(PromoCodeService);
  private readonly destroyRef = inject(DestroyRef);

  /* ═══════════════════════════════════════════════════════
     FILTRES
     ═══════════════════════════════════════════════════════ */
  readonly filters = GAME_FILTERS;
  readonly selectedFilter = signal<string>('all');

  /* ═══════════════════════════════════════════════════════
     JEUX
     ═══════════════════════════════════════════════════════ */
  readonly games: readonly GameItem[] = buildGamesList(path =>
    void this.router.navigateByUrl(path)
  );

  readonly visibleGames = computed(() => {
    const filter = this.selectedFilter();
    if (filter === 'all') return this.games;
    return this.games.filter(g => g.category === filter);
  });

  readonly visibleGameCount = computed(() => this.visibleGames().length);

  /* ═══════════════════════════════════════════════════════
     MODALE CODE PROMO
     ═══════════════════════════════════════════════════════ */
  readonly showPromoModal = signal(false);
  readonly isSavingPromo = signal(false);
  readonly promoError = signal('');

  /** Jeu en attente de validation du code promo. */
  private readonly pendingGame = signal<GameItem | null>(null);

  /* ═══════════════════════════════════════════════════════
     TOAST
     ═══════════════════════════════════════════════════════ */
  readonly toastMessage = signal('');
  readonly toastType = signal<'success' | 'error'>('success');
  private toastTimeoutId: ReturnType<typeof setTimeout> | null = null;

  /* ═══════════════════════════════════════════════════════
     TILT 3D
     ═══════════════════════════════════════════════════════ */
  private readonly tiltHandlers = new Map<HTMLElement, {
    move: (e: MouseEvent) => void;
    leave: () => void;
  }>();

  /* ═══════════════════════════════════════════════════════
     CYCLE DE VIE
     ═══════════════════════════════════════════════════════ */
  ngAfterViewInit(): void {
    this.ngZone.runOutsideAngular(() => this.initTiltEffect());
  }

  ngOnDestroy(): void {
    this.tiltHandlers.forEach((handlers, card) => {
      card.removeEventListener('mousemove', handlers.move);
      card.removeEventListener('mouseleave', handlers.leave);
    });
    this.tiltHandlers.clear();

    if (this.toastTimeoutId !== null) {
      clearTimeout(this.toastTimeoutId);
      this.toastTimeoutId = null;
    }
  }

  /* ═══════════════════════════════════════════════════════
     EFFET TILT 3D
     ═══════════════════════════════════════════════════════ */
  private initTiltEffect(): void {
    const cards = Array.from(
      this.hostEl.nativeElement.querySelectorAll<HTMLElement>('.btn-game')
    );

    cards.forEach(card => {
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
      const leave = () => {
        card.style.transform = '';
      };

      card.addEventListener('mousemove', move);
      card.addEventListener('mouseleave', leave);
      this.tiltHandlers.set(card, { move, leave });
    });
  }

  /* ═══════════════════════════════════════════════════════
     FILTRAGE
     ═══════════════════════════════════════════════════════ */
  selectFilter(id: string): void {
    if (this.selectedFilter() === id) return;
    this.selectedFilter.set(id);
  }

  /* ═══════════════════════════════════════════════════════
     LANCEMENT D'UN JEU
     ═══════════════════════════════════════════════════════ */
  async tryLaunchGame(game: GameItem): Promise<void> {
    this.clearToast();
    this.promoError.set('');

    /* Vérifie le code promo via le service partagé */
    const result = await this.promoService.checkPromoCode();

    if (result.status === 'valid') {
      this.launchGame(game);
      return;
    }

    if (result.status === 'error') {
      this.showToast(result.message, 'error');
      return;
    }

    /* Aucun code → ouvre la modale */
    this.openPromoModal(game);
  }

  private openPromoModal(game: GameItem): void {
    this.pendingGame.set(game);
    this.promoError.set('');
    this.showPromoModal.set(true);
  }

  /* ═══════════════════════════════════════════════════════
     MODALE CODE PROMO — Callbacks
     ═══════════════════════════════════════════════════════ */

  /** Appelé quand l'utilisateur soumet un code depuis la modale. */
  onPromoCodeSubmitted(code: string): void {
    if (this.isSavingPromo()) return;

    this.isSavingPromo.set(true);
    this.promoError.set('');

    void this.promoService.validatePromoCode(code).then(result => {
      this.isSavingPromo.set(false);

      if (!result.ok) {
        this.promoError.set(result.message);
        return;
      }

      /* Succès → ferme la modale + lance le jeu */
      this.showPromoModal.set(false);
      this.showToast(`Code « ${result.code} » validé ! Bon jeu 🎸`, 'success');

      const game = this.pendingGame();
      this.pendingGame.set(null);

      if (game) {
        this.launchGame(game);
      }
    });
  }

  closePromoModal(): void {
    if (this.isSavingPromo()) return;
    this.showPromoModal.set(false);
    this.pendingGame.set(null);
    this.promoError.set('');
  }

  /* ═══════════════════════════════════════════════════════
     LANCEMENT EFFECTIF
     ═══════════════════════════════════════════════════════ */
  private launchGame(game: GameItem): void {
    if (game.action) {
      game.action();
      return;
    }
    if (game.route) {
      void this.router.navigate([game.route]);
    }
  }

  /* ═══════════════════════════════════════════════════════
     TOAST
     ═══════════════════════════════════════════════════════ */
  private showToast(message: string, type: 'success' | 'error'): void {
    this.toastMessage.set(message);
    this.toastType.set(type);

    if (this.toastTimeoutId !== null) {
      clearTimeout(this.toastTimeoutId);
    }

    this.toastTimeoutId = setTimeout(() => {
      if (this.toastMessage() === message) {
        this.toastMessage.set('');
      }
      this.toastTimeoutId = null;
    }, TOAST_DURATION_MS);
  }

  private clearToast(): void {
    this.toastMessage.set('');
    if (this.toastTimeoutId !== null) {
      clearTimeout(this.toastTimeoutId);
      this.toastTimeoutId = null;
    }
  }
}