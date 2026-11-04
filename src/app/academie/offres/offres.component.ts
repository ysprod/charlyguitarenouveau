// src/app/offres/offres.component.ts

import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  EnvironmentInjector,
  afterNextRender,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { Auth } from '@angular/fire/auth';
import { FunctionsError } from '@angular/fire/functions';
import { ActivatedRoute } from '@angular/router';

import { Pack, PackCategory, PackCategoryId } from '../models/pack.model';
import { PACK_CATEGORIES } from '../data/packs.data';
import { FormatPricePipe } from '../pipes/format-price.pipe';
import {
  PaymentMethod,
  PurchaseService,
} from '../services/purchase.service';
import { PurchaseHistoryComponent } from 'src/app/shared/purchase-history/purchase-history.component';

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

/* ═════════════════════════════════════════════════════════════════════
   OFFRES — Packs pédagogiques (optimisé)
   ═════════════════════════════════════════════════════════════════════ */

@Component({
  selector: 'app-offres',
  imports: [FormatPricePipe, PurchaseHistoryComponent],
  templateUrl: './offres.component.html',
  styleUrls: ['./offres.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OffresComponent {
  private readonly auth = inject(Auth);
  private readonly purchaseService = inject(PurchaseService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  /* ─── ViewChild signal-based ─── */
  readonly packsSection = viewChild<ElementRef<HTMLElement>>('packsSection');

  /* ─── Données (constantes) ─── */
  readonly categories: readonly PackCategory[] = PACK_CATEGORIES;

  /* ─── État UI ─── */
  readonly activeCategory = signal<PackCategoryId>('debutant');
  readonly selectedPack = signal<Pack | null>(null);
  readonly selectedPaymentMethod = signal<PaymentMethod>('wave');
  readonly isProcessing = signal(false);
  readonly paymentError = signal('');
  readonly paymentReturn = signal<'success' | 'error' | null>(null);
  readonly paymentMethods = PAYMENT_METHODS;

  /* ─── Computed ─── */
  readonly currentCategory = computed<PackCategory | null>(() => {
    const id = this.activeCategory();
    return this.categories.find((c) => c.id === id) ?? this.categories[0] ?? null;
  });

  /** ✅ Couleur d'accent exposée via un computed (mise en cache) */
  readonly currentAccent = computed(
    () => this.currentCategory()?.accentColor ?? '#a87400',
  );

  /* ─── Flag "scroll demandé" (pour déclencher afterNextRender) ─── */
  private pendingScroll = false;

  /* ═══════════════════════════════════════════════════════
     CONSTRUCTEUR — cleanup
     ═══════════════════════════════════════════════════════ */

  constructor() {
    const payment = this.route.snapshot.queryParamMap.get('payment');
    if (payment === 'success' || payment === 'error') {
      this.paymentReturn.set(payment);
    }

    /* ✅ Cleanup : plus de setTimeout à nettoyer manuellement.
       Le `pendingScroll` est un simple booléen. */
    this.destroyRef.onDestroy(() => {
      this.pendingScroll = false;
    });
  }

  /* ═══════════════════════════════════════════════════════
     ACTIONS
     ═══════════════════════════════════════════════════════ */

  selectCategory(id: PackCategoryId): void {
    if (this.activeCategory() === id) return;

    this.activeCategory.set(id);
    this.scheduleScrollToPacks();
  }

  selectPack(pack: Pack): void {
    this.selectedPack.set(pack);
    this.selectedPaymentMethod.set('wave');
    this.paymentError.set('');
  }

  closePackCheckout(): void {
    if (!this.isProcessing()) {
      this.selectedPack.set(null);
      this.paymentError.set('');
    }
  }

  onPaymentMethodChange(event: Event): void {
    const method = (event.target as HTMLSelectElement).value;
    if (PAYMENT_METHODS.some((option) => option.value === method)) {
      this.selectedPaymentMethod.set(method as PaymentMethod);
    }
  }

  async confirmPackPurchase(): Promise<void> {
    const pack = this.selectedPack();
    if (!pack || this.isProcessing()) {
      return;
    }

    if (!this.auth.currentUser) {
      this.paymentError.set('Veuillez vous connecter pour acheter ce pack.');
      return;
    }

    this.isProcessing.set(true);
    this.paymentError.set('');
    try {
      const checkout = await this.purchaseService.createCoursePackCheckout(
        pack.id,
        this.selectedPaymentMethod(),
      );
      window.location.assign(checkout.redirectUrl);
    } catch (error) {
      console.error('Erreur création commande de pack de cours :', error);
      this.paymentError.set(
        error instanceof FunctionsError &&
          error.code === 'functions/failed-precondition'
          ? error.message
          : 'Impossible de créer le paiement. Veuillez réessayer.',
      );
      this.isProcessing.set(false);
    }
  }

  /* ═══════════════════════════════════════════════════════
     SCROLL — via afterNextRender (fiable, sans setTimeout)
     ═══════════════════════════════════════════════════════ */

  private scheduleScrollToPacks(): void {
    if (this.pendingScroll) return;
    this.pendingScroll = true;

    /* ✅ `afterNextRender` exécute la callback après le prochain rendu
       du composant — donc après que le nouveau `<section>` soit dans le DOM. */
    afterNextRender(
      () => {
        this.pendingScroll = false;
        this.scrollToPacks();
      },
      { injector: inject(EnvironmentInjector) },
    );
  }

  private scrollToPacks(): void {
    const element = this.packsSection()?.nativeElement;
    if (!element || typeof window === 'undefined') return;

    const prefersReducedMotion =
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

    element.scrollIntoView({
      behavior: prefersReducedMotion ? 'auto' : 'smooth',
      block: 'start',
    });
  }
}