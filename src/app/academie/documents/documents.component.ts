// src/app/features/documents/documents.component.ts

import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  afterNextRender,
  computed,
  inject,
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
  update,
} from '@angular/fire/database';

import { catchError, map, of, switchMap } from 'rxjs';

import { DocumentItem } from '../document.model';
import {
  PendingPurchase,
  SortOption,
} from '../documents-ui.model';

import {
  DOCUMENTS_DB_PATHS,
  DOCUMENT_FILTERS,
  FILTER_ALL_LABEL,
} from '../documents-ui.constants';

 import { PromoModalComponent } from '../../shared/promo-modal/promo-modal.component';
import { ToastService } from 'src/app/academie/toast.service';
import { FormatPricePipe } from 'src/app/academie/pipes/format-price.pipe';
import { ToastComponent } from 'src/app/academie/toast/toast.component';
import { matchesCategory, sortDocuments, formatPrice } from 'src/app/academie/documents.utils';
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
        return objectVal<number>(
          ref(this.db, `${DOCUMENTS_DB_PATHS.USERS}/${u.uid}/${DOCUMENTS_DB_PATHS.CREDIT}`)
        );
      })
    ),
    { initialValue: null as number | null }
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

  /* ═══════════════════════════════════════════════════════
     MODALE CODE PROMO
     ═══════════════════════════════════════════════════════ */

  readonly showPromoModal = signal(false);
  readonly isSavingPromo = signal(false);
  readonly promoError = signal('');
  private readonly pendingPurchase = signal<PendingPurchase | null>(null);

  /* ═══════════════════════════════════════════════════════
     DOCUMENTS (Firebase → signal)
     ═══════════════════════════════════════════════════════ */

  private readonly documentsStream$ = listVal<DocumentItem>(
    ref(this.db, DOCUMENTS_DB_PATHS.DOCUMENTS),
    { keyField: 'key' }
  ).pipe(
    catchError((err) => {
      console.error('Erreur Firebase (documents) :', err);
      return of([] as DocumentItem[]);
    })
  );

  readonly allDocs = toSignal(this.documentsStream$, {
    initialValue: [] as DocumentItem[],
  });

  /* ✅ État de chargement (tant que le flux n'a pas émis la 1ʳᵉ valeur) */
  readonly isLoading = signal(true);

  /* ✅ État dérivé : chargement vs vide */
  readonly isEmpty = computed(
    () => !this.isLoading() && this.allDocs().length === 0
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
          d.format?.toLowerCase().includes(term)
      );
    }

    return sortDocuments(docs, this.sortBy());
  });

  /* ═══════════════════════════════════════════════════════
     CYCLE DE VIE
     ═══════════════════════════════════════════════════════ */

  constructor() {
    /* Scroll top SSR-safe */
    afterNextRender(() => {
      window.scrollTo({ top: 0, behavior: 'auto' });
    });

    /* Marque le chargement terminé dès la 1ʳᵉ émission */
    const sub = this.documentsStream$.subscribe(() => {
      this.isLoading.set(false);
    });

    this.destroyRef.onDestroy(() => sub.unsubscribe());
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
     ACHAT — Vérification code promo en amont
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
      this.toastService.success(`Code « ${result.code} » validé ! Bon achat 🎸`);

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
     RECHARGE
     ═══════════════════════════════════════════════════════ */

  async processQuickRecharge(amount: number): Promise<void> {
    const uid = this.currentUserId();
    if (!uid) {
      this.toastService.error('Veuillez vous connecter pour recharger votre compte.');
      return;
    }

    try {
      const newBalance = this.userCredit() + amount;
      await update(ref(this.db, `${DOCUMENTS_DB_PATHS.USERS}/${uid}`), {
        [DOCUMENTS_DB_PATHS.CREDIT]: newBalance,
      });
      this.toastService.success(`Compte rechargé de ${formatPrice(amount)} !`);
      this.showRechargeInModal.set(false);
    } catch (error) {
      console.error('Erreur rechargement:', error);
      this.toastService.error('Échec du rechargement. Veuillez réessayer.');
    }
  }

  /* ═══════════════════════════════════════════════════════
     CONFIRMATION D'ACHAT
     ═══════════════════════════════════════════════════════ */

  async confirmPurchase(): Promise<void> {
    const doc = this.selectedDocForPurchase();
    const uid = this.currentUserId();

    if (!doc) return;
    if (!uid) {
      this.toastService.error('Veuillez vous connecter pour effectuer un achat.');
      return;
    }

    const currentBalance = this.userCredit();
    const docPrice = doc.price || 0;

    if (currentBalance < docPrice) {
      this.toastService.error('Crédit insuffisant ! Veuillez recharger votre compte.');
      return;
    }

    try {
      const newBalance = currentBalance - docPrice;
      await update(ref(this.db, `${DOCUMENTS_DB_PATHS.USERS}/${uid}`), {
        [DOCUMENTS_DB_PATHS.CREDIT]: newBalance,
      });

      this.selectedDocForPurchase.set(null);
      this.toastService.success(`Achat réussi ! Téléchargement de "${doc.title}"...`);
      window.open(doc.downloadUrl, '_blank');
    } catch (error) {
      console.error('Erreur transaction:', error);
      this.toastService.error('Une erreur est survenue lors du paiement.');
    }
  }
}