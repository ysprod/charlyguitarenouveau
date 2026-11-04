import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  NgZone,
  afterNextRender,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FunctionsError } from '@angular/fire/functions';
import {
  TOAST_DURATION_MS,
  buildGamesList,
} from '../constants/play.constants';
import { GameItem } from '../models/play.model';
import { ImmersiveCarouselComponent } from 'src/app/shared/immersive-carousel/immersive-carousel.component';
import {
  GAME_SUBSCRIPTION_PLANS,
  GameSubscriptionService,
} from '../services/game-subscription.service';
import type {
  GameSubscriptionPlanId,
  GameSubscriptionStatus,
} from '../services/game-subscription.service';
import type { PaymentMethod } from '../../academie/services/purchase.service';

const PAYMENT_METHODS: readonly {
  readonly value: PaymentMethod;
  readonly label: string;
}[] = [
  { value: 'wave', label: 'Wave' },
  { value: 'orange', label: 'Orange Money' },
  { value: 'mtn', label: 'MTN MoMo' },
  { value: 'moov', label: 'Moov Money' },
  { value: 'djamo', label: 'Djamo' },
  { value: 'jeko', label: 'Jèko' },
];

export type ToastType = 'success' | 'error' | 'info';

export interface Toast {
  readonly message: string;
  readonly type: ToastType;
  readonly icon: string;
  readonly id: number;
}

@Component({
  selector: 'app-play',
  imports: [ImmersiveCarouselComponent],
  templateUrl: './play.component.html',
  styleUrls: ['./play.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlayComponent {
  /* ═══════════════════════════════════════════════════════
     INJECTION
     ═══════════════════════════════════════════════════════ */

  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly ngZone = inject(NgZone);
  private readonly hostEl = inject(ElementRef) as ElementRef<HTMLElement>;
  private readonly subscriptionService = inject(GameSubscriptionService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly isPaymentReturn =
    this.route.snapshot.queryParamMap.get('payment') === 'success';
  private subscriptionRefreshTimer: ReturnType<typeof setTimeout> | null = null;
  private subscriptionPollAttempts = 0;

  readonly subscriptionPlans = GAME_SUBSCRIPTION_PLANS;
  readonly paymentMethods = PAYMENT_METHODS;
  readonly selectedPlanId = signal<GameSubscriptionPlanId>('three-months');
  readonly selectedPaymentMethod = signal<PaymentMethod>('wave');
  readonly subscriptionStatus = signal<GameSubscriptionStatus | null>(null);
  readonly subscriptionLoading = signal(true);
  readonly subscriptionError = signal('');
  readonly checkoutStatus = signal('');
  readonly isCheckoutProcessing = signal(false);

  /* ═══════════════════════════════════════════════════════
     PRÉFÉRENCE D'ANIMATION
     ═══════════════════════════════════════════════════════ */

  private readonly prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;

  /* ═══════════════════════════════════════════════════════
     FILTRES
     ═══════════════════════════════════════════════════════ */

  readonly selectedFilter = signal<string>('all');

  /* ═══════════════════════════════════════════════════════
     JEUX
     ═══════════════════════════════════════════════════════ */

  readonly games: readonly GameItem[] = buildGamesList((path) =>
    void this.router.navigateByUrl(path),
  );

  readonly visibleGames = computed(() => {
    const filter = this.selectedFilter();
    if (filter === 'all') return this.games;
    return this.games.filter((g) => g.category === filter);
  });

  readonly visibleGameCount = computed(() => this.visibleGames().length);

  /* ═══════════════════════════════════════════════════════
     TOAST — nouveau système multi-toasts empilés
     ═══════════════════════════════════════════════════════ */

  readonly toasts = signal<Toast[]>([]);
  private toastIdCounter = 0;
  private readonly toastTimers = new Map<number, ReturnType<typeof setTimeout>>();

  /* Compat ancien template si besoin */
  readonly toastMessage = computed(() => {
    const list = this.toasts();
    return list.length > 0 ? list[list.length - 1].message : '';
  });
  readonly toastType = computed<ToastType>(() => {
    const list = this.toasts();
    return list.length > 0 ? list[list.length - 1].type : 'success';
  });

  /* ═══════════════════════════════════════════════════════
     TILT 3D
     ═══════════════════════════════════════════════════════ */

  private readonly tiltHandlers = new Map<
    HTMLElement,
    {
      move: (e: MouseEvent) => void;
      leave: () => void;
    }
  >();

  /* ═══════════════════════════════════════════════════════
     CONSTRUCTEUR
     ═══════════════════════════════════════════════════════ */

  constructor() {
    const queryParams = this.route.snapshot.queryParamMap;
    if (queryParams.get('payment') === 'success') {
      this.showToast(
        'Paiement reçu. Votre accès sera activé après confirmation.',
        'success',
      );
    } else if (queryParams.get('payment') === 'error') {
      this.showToast('Le paiement n’a pas abouti.', 'error');
    } else if (queryParams.get('accessRequired') === 'true') {
      this.showToast(
        'Un abonnement actif est nécessaire pour jouer.',
        'info',
      );
    }

    void this.refreshGameSubscription();

    afterNextRender(() => {
      if (this.prefersReducedMotion) return;
      const isTouch = window.matchMedia?.('(hover: none)').matches === true;
      if (isTouch) return;
      this.ngZone.runOutsideAngular(() => this.initTiltEffect());
    });

    this.destroyRef.onDestroy(() => {
      if (this.subscriptionRefreshTimer !== null) {
        clearTimeout(this.subscriptionRefreshTimer);
        this.subscriptionRefreshTimer = null;
      }

      this.tiltHandlers.forEach((handlers, card) => {
        card.removeEventListener('mousemove', handlers.move);
        card.removeEventListener('mouseleave', handlers.leave);
      });
      this.tiltHandlers.clear();

      this.toastTimers.forEach((timer) => clearTimeout(timer));
      this.toastTimers.clear();
    });
  }

  /* ═══════════════════════════════════════════════════════
     EFFET TILT 3D
     ═══════════════════════════════════════════════════════ */

  private initTiltEffect(): void {
    const cards = Array.from(
      this.hostEl.nativeElement.querySelectorAll<HTMLElement>('.btn-game'),
    );

    cards.forEach((card) => {
      const move = (e: MouseEvent) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const rotateX = ((y - centerY) / centerY) * -6;
        const rotateY = ((x - centerX) / centerX) * 6;
        card.style.transform = `perspective(900px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-6px) scale(1.02)`;
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
    if (this.subscriptionLoading()) {
      await this.refreshGameSubscription();
    }

    if (this.subscriptionStatus()?.active) {
      this.launchGame(game);
      return;
    }

    this.showToast(
      'Un abonnement actif est nécessaire pour jouer.',
      'info',
    );
    this.scrollToSubscription();
  }

  selectPlan(planId: GameSubscriptionPlanId): void {
    this.selectedPlanId.set(planId);
  }

  onPaymentMethodChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    const method = PAYMENT_METHODS.find((item) => item.value === value);
    if (method) {
      this.selectedPaymentMethod.set(method.value);
    }
  }

  async subscribeToGames(): Promise<void> {
    if (this.isCheckoutProcessing()) return;

    this.isCheckoutProcessing.set(true);
    this.subscriptionError.set('');
    this.checkoutStatus.set('Connexion au service de paiement…');
    try {
      const checkout = await this.subscriptionService.createCheckout(
        this.selectedPlanId(),
        this.selectedPaymentMethod(),
      );
      this.checkoutStatus.set('Ouverture de la page de paiement…');
      window.location.assign(checkout.redirectUrl);
    } catch (error) {
      console.error('Erreur de création de l’abonnement jeux :', error);
      this.checkoutStatus.set('');
      const message = this.getCheckoutErrorMessage(error);
      this.subscriptionError.set(message);
      this.showToast(message, 'error');
      this.isCheckoutProcessing.set(false);
    }
  }

  private getCheckoutErrorMessage(error: unknown): string {
    if (error instanceof FunctionsError) {
      if (error.code === 'functions/not-found') {
        return 'Le service de paiement n’est pas encore déployé. Contactez-nous ou réessayez plus tard.';
      }
      if (error.code === 'functions/failed-precondition') {
        return error.message;
      }
      if (error.code === 'functions/unauthenticated') {
        return 'Votre session a expiré. Reconnectez-vous pour souscrire.';
      }
      if (
        error.code === 'functions/unavailable' ||
        error.code === 'functions/deadline-exceeded'
      ) {
        return 'Le service de paiement est indisponible. Vérifiez votre connexion puis réessayez.';
      }
    }
    return 'Impossible de joindre le service de paiement. Vérifiez votre connexion puis réessayez.';
  }

  async refreshGameSubscription(): Promise<void> {
    this.subscriptionLoading.set(true);
    this.subscriptionError.set('');
    try {
      const status = await this.subscriptionService.getMySubscription();
      this.subscriptionStatus.set(status);
      if (status.active && this.isPaymentReturn) {
        this.showToast('Votre abonnement jeux est actif. Bon jeu !', 'success');
      }
    } catch (error) {
      console.error('Erreur de chargement de l’abonnement jeux :', error);
      this.subscriptionError.set(
        'Impossible de vérifier votre abonnement pour le moment.',
      );
    } finally {
      this.subscriptionLoading.set(false);
      if (this.isPaymentReturn && !this.subscriptionStatus()?.active) {
        this.scheduleSubscriptionRefresh();
      }
    }
  }

  private scheduleSubscriptionRefresh(): void {
    if (
      this.subscriptionRefreshTimer !== null ||
      this.subscriptionPollAttempts >= 10
    ) {
      return;
    }
    this.subscriptionPollAttempts += 1;
    this.subscriptionRefreshTimer = setTimeout(() => {
      this.subscriptionRefreshTimer = null;
      void this.refreshGameSubscription();
    }, 3_000);
  }

  formatSubscriptionExpiry(timestamp: number): string {
    return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' }).format(
      new Date(timestamp),
    );
  }

  formatActiveSubscriptionExpiry(): string {
    const expiresAt = this.subscriptionStatus()?.expiresAt;
    return expiresAt === null || expiresAt === undefined
      ? ''
      : this.formatSubscriptionExpiry(expiresAt);
  }

  formatPrice(priceXof: number): string {
    return new Intl.NumberFormat('fr-FR').format(priceXof);
  }

  /* ═══════════════════════════════════════════════════════
     SCROLL VERS ABONNEMENT
     ═══════════════════════════════════════════════════════ */

  private scrollToSubscription(): void {
    if (typeof document === 'undefined') return;
    const section = this.hostEl.nativeElement.querySelector<HTMLElement>(
      '.game-subscription',
    );
    if (!section) return;

    section.scrollIntoView({
      behavior: this.prefersReducedMotion ? 'auto' : 'smooth',
      block: 'start',
    });
    section.setAttribute('tabindex', '-1');
    section.focus({ preventScroll: true });
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
     TOAST — Nouvelle API
     ═══════════════════════════════════════════════════════ */

  private showToast(message: string, type: ToastType): void {
    if (!message) return;

    const id = ++this.toastIdCounter;
    const icon =
      type === 'success' ? '✓' : type === 'error' ? '⚠' : 'ℹ';

    this.toasts.update((list) => [
      ...list.slice(-2), // max 3 toasts empilés
      { message, type, icon, id },
    ]);

    const timer = setTimeout(() => {
      this.dismissToast(id);
    }, TOAST_DURATION_MS);

    this.toastTimers.set(id, timer);
  }

  dismissToast(id: number): void {
    const timer = this.toastTimers.get(id);
    if (timer !== undefined) {
      clearTimeout(timer);
      this.toastTimers.delete(id);
    }
    this.toasts.update((list) => list.filter((t) => t.id !== id));
  }

  trackToast(_: number, toast: Toast): number {
    return toast.id;
  }
}