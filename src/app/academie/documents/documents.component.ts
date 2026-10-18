// src/app/features/documents/documents.component.ts

import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  EnvironmentInjector,
  afterNextRender,
  computed,
  effect,
  inject,
  runInInjectionContext,
  signal,
} from '@angular/core';

import { RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';

import { Auth, user } from '@angular/fire/auth';
import {
  Database,
  listVal,
  objectVal,
  ref,
  runTransaction,
} from '@angular/fire/database';

import { catchError, map, of, switchMap } from 'rxjs';

import { DocumentItem } from '../models/document.model';
import {
  PendingPurchase,
  SortOption,
} from '../models/documents-ui.model';

import {
  DOCUMENTS_DB_PATHS,
  DOCUMENT_FILTERS,
  FILTER_ALL_LABEL,
} from '../constants/documents-ui.constants';

import { PromoModalComponent } from '../../shared/promo-modal/promo-modal.component';
import { ToastService } from 'src/app/academie/services/toast.service';
import { FormatPricePipe } from 'src/app/academie/pipes/format-price.pipe';
import { ToastComponent } from 'src/app/academie/toast/toast.component';
import {
  matchesCategory,
  sortDocuments,
  formatPrice,
} from 'src/app/academie/utils/documents.utils';
import { PromoCodeService } from 'src/app/shared/services/promo-code.service';

/* ═════════════════════════════════════════════════════════════════════
   DOCUMENTS — Boutique numérique
   ═════════════════════════════════════════════════════════════════════ */

@Component({
  selector: 'app-documents',
  imports: [
    RouterLink,
    PromoModalComponent,
    ToastComponent,
    FormatPricePipe,
  ],
  templateUrl: './documents.component.html',
  styleUrls: ['./documents.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DocumentsComponent {

  /* ─── Injection ─── */
  private readonly db = inject(Database);
  private readonly auth = inject(Auth);
  private readonly promoService = inject(PromoCodeService);
  private readonly toastService = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly environmentInjector = inject(EnvironmentInjector);

  /* ═══════════════════════════════════════════════════════
     UTILISATEUR CONNECTÉ
     ═══════════════════════════════════════════════════════ */

  private readonly currentUser = toSignal(user(this.auth), {
    initialValue: null,
  });

  readonly currentUserId = computed(() => this.currentUser()?.uid ?? null);

  private readonly creditFromDb = toSignal(
    user(this.auth).pipe(
      switchMap((u) => {
        if (!u) return of(null);

        return runInInjectionContext(this.environmentInjector, () =>
          objectVal<number>(
            ref(
              this.db,
              `${DOCUMENTS_DB_PATHS.USERS}/${u.uid}/${DOCUMENTS_DB_PATHS.CREDIT}`,
            ),
          ),
        );
      }),
    ),
    { initialValue: null as number | null },
  );

  readonly userCredit = computed(() => this.creditFromDb() ?? 0);

  /* ═══════════════════════════════════════════════════════
     FILTRES, RECHERCHE, TRI
     ═══════════════════════════════════════════════════════ */

  readonly filters = DOCUMENT_FILTERS;
  readonly selectedFilter = signal(FILTER_ALL_LABEL);
  readonly searchTerm = signal('');
  readonly sortBy = signal<SortOption>('recent');

  /* ═══════════════════════════════════════════════════════
     MODALE ACHAT
     ═══════════════════════════════════════════════════════ */

  readonly selectedDocForPurchase = signal<DocumentItem | null>(null);
  readonly showRechargeInModal = signal(false);
  readonly isProcessing = signal(false);

  /* ═══════════════════════════════════════════════════════
     MODALE CODE PROMO
     ═══════════════════════════════════════════════════════ */

  readonly showPromoModal = signal(false);
  readonly isSavingPromo = signal(false);
  readonly promoError = signal('');
  private readonly pendingPurchase = signal<PendingPurchase | null>(null);

  /* ═══════════════════════════════════════════════════════
     DOCUMENTS
     ═══════════════════════════════════════════════════════ */

  private readonly documentsStream$ = listVal<DocumentItem>(
    ref(this.db, DOCUMENTS_DB_PATHS.DOCUMENTS),
    { keyField: 'key' },
  ).pipe(
    catchError((err) => {
      console.error('Erreur Firebase (documents) :', err);
      return of([] as DocumentItem[]);
    }),
  );

  readonly allDocs = toSignal(this.documentsStream$, {
    initialValue: [] as DocumentItem[],
  });

  readonly isLoading = signal(true);

  readonly isEmpty = computed(
    () => !this.isLoading() && this.allDocs().length === 0,
  );

  /* ═══════════════════════════════════════════════════════
     DOCUMENTS FILTRÉS / TRIÉS
     ═══════════════════════════════════════════════════════ */

  readonly visibleDocuments = computed(() => {
    let docs = [...this.allDocs()];

    const filter = this.selectedFilter();
    if (filter !== FILTER_ALL_LABEL) {
      docs = docs.filter((d) => matchesCategory(d, filter));
    }

    const term = this.searchTerm().toLowerCase().trim();
    if (term) {
      docs = docs.filter(
        (d) =>
          d.title?.toLowerCase().includes(term) ||
          d.description?.toLowerCase().includes(term) ||
          d.format?.toLowerCase().includes(term),
      );
    }

    return sortDocuments(docs, this.sortBy());
  });

  /* ═══════════════════════════════════════════════════════
     CYCLE DE VIE
     ═══════════════════════════════════════════════════════ */

  constructor() {
    afterNextRender(() => {
      window.scrollTo({ top: 0, behavior: 'auto' });
    });

    /* ✅ isLoading passe à false dès que des docs arrivent */
    effect(() => {
      if (this.allDocs().length > 0) {
        this.isLoading.set(false);
      }
    });

    /* ✅ Filet de sécurité : jamais plus de 3s de skeleton */
    const safetyTimeout = setTimeout(() => {
      if (this.isLoading()) {
        this.isLoading.set(false);
      }
    }, 3000);

    this.destroyRef.onDestroy(() => {
      clearTimeout(safetyTimeout);
    });
  }

  /* ═══════════════════════════════════════════════════════
     FILTRAGE / TRI / RECHERCHE
     ═══════════════════════════════════════════════════════ */

  filterBy(category: string): void {
    this.selectedFilter.set(category);
  }

  onSearchInput(event: Event): void {
    this.searchTerm.set((event.target as HTMLInputElement).value);
  }

  onSortSelect(event: Event): void {
    this.sortBy.set((event.target as HTMLSelectElement).value as SortOption);
  }

  resetAll(): void {
    this.selectedFilter.set(FILTER_ALL_LABEL);
    this.searchTerm.set('');
    this.sortBy.set('recent');
  }

  /* ═══════════════════════════════════════════════════════
     ACHAT — Vérification code promo
     ═══════════════════════════════════════════════════════ */

  async initiatePurchase(doc: DocumentItem, event?: Event): Promise<void> {
    event?.stopPropagation();

    const promoResult = await this.promoService.checkPromoCode();

    if (promoResult.status === 'missing') {
      this.pendingPurchase.set({
        doc,
        reason: !doc.price || doc.price === 0 ? 'free' : 'paid',
      });
      this.promoError.set('');
      this.showPromoModal.set(true);
      return;
    }

    if (promoResult.status === 'error') {
      this.toastService.error(promoResult.message);
      return;
    }

    this.performPurchase(doc);
  }

  private performPurchase(doc: DocumentItem): void {
    if (!doc.price || doc.price === 0) {
      window.open(doc.downloadUrl, '_blank');
      this.toastService.success(`Téléchargement de "${doc.title}" initié`);
      return;
    }

    this.showRechargeInModal.set(false);
    this.selectedDocForPurchase.set(doc);
  }

  cancelPurchase(): void {
    this.selectedDocForPurchase.set(null);
    this.showRechargeInModal.set(false);
    this.isProcessing.set(false);
  }

  toggleRechargeView(show: boolean): void {
    this.showRechargeInModal.set(show);
  }

  /* ═══════════════════════════════════════════════════════
     MODALE CODE PROMO
     ═══════════════════════════════════════════════════════ */

  onPromoCodeSubmitted(code: string): void {
    if (this.isSavingPromo()) return;

    this.isSavingPromo.set(true);
    this.promoError.set('');

    void this.promoService.validatePromoCode(code).then((result) => {
      this.isSavingPromo.set(false);

      if (!result.ok) {
        this.promoError.set(result.message);
        return;
      }

      this.showPromoModal.set(false);
      this.toastService.success(
        `Code « ${result.code} » validé ! Bon achat 🎸`,
      );

      const pending = this.pendingPurchase();
      this.pendingPurchase.set(null);

      if (pending) {
        this.performPurchase(pending.doc);
      }
    });
  }

  closePromoModal(): void {
    if (this.isSavingPromo()) return;
    this.showPromoModal.set(false);
    this.pendingPurchase.set(null);
    this.promoError.set('');
  }

  /* ═══════════════════════════════════════════════════════
     RECHARGE — transaction atomique
     ═══════════════════════════════════════════════════════ */

  async processQuickRecharge(amount: number): Promise<void> {
    const uid = this.currentUserId();
    if (!uid) {
      this.toastService.error('Veuillez vous connecter pour recharger.');
      return;
    }
    if (this.isProcessing()) return;

    this.isProcessing.set(true);

    try {
      await runInInjectionContext(this.environmentInjector, async () => {
        const creditRef = ref(
          this.db,
          `${DOCUMENTS_DB_PATHS.USERS}/${uid}/${DOCUMENTS_DB_PATHS.CREDIT}`,
        );

        const result = await runTransaction(
          creditRef,
          (currentValue: number | null) => {
            return (currentValue ?? 0) + amount;
          },
        );

        if (!result.committed) {
          throw new Error('Transaction refusée');
        }
      });

      this.toastService.success(
        `Compte rechargé de ${formatPrice(amount)} !`,
      );
      this.showRechargeInModal.set(false);
    } catch (error) {
      console.error('Erreur rechargement:', error);
      this.toastService.error(
        'Échec du rechargement. Vérifiez vos permissions ou contactez le support.',
      );
    } finally {
      this.isProcessing.set(false);
    }
  }

  /* ═══════════════════════════════════════════════════════
     CONFIRMATION D'ACHAT — transaction atomique
     ═══════════════════════════════════════════════════════ */

  async confirmPurchase(): Promise<void> {
    const doc = this.selectedDocForPurchase();
    const uid = this.currentUserId();

    if (!doc) return;
    if (!uid) {
      this.toastService.error('Veuillez vous connecter pour acheter.');
      return;
    }
    if (this.isProcessing()) return;

    const docPrice = doc.price || 0;
    this.isProcessing.set(true);

    try {
      await runInInjectionContext(this.environmentInjector, async () => {
        const creditRef = ref(
          this.db,
          `${DOCUMENTS_DB_PATHS.USERS}/${uid}/${DOCUMENTS_DB_PATHS.CREDIT}`,
        );

        const result = await runTransaction(
          creditRef,
          (currentValue: number | null) => {
            const balance = currentValue ?? 0;
            if (balance < docPrice) {
              return undefined as any;
            }
            return balance - docPrice;
          },
        );

        if (!result.committed) {
          throw new Error('INSUFFICIENT_FUNDS');
        }
      });

      this.selectedDocForPurchase.set(null);
      this.toastService.success(
        `Achat réussi ! Téléchargement de "${doc.title}"...`,
      );
      window.open(doc.downloadUrl, '_blank');

    } catch (error) {
      const msg =
        error instanceof Error && error.message === 'INSUFFICIENT_FUNDS'
          ? 'Crédit insuffisant. Veuillez recharger votre compte.'
          : 'Une erreur est survenue lors du paiement.';

      console.error('Erreur transaction:', error);
      this.toastService.error(msg);
    } finally {
      this.isProcessing.set(false);
    }
  }
}