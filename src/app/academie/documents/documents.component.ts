import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnDestroy,
  OnInit,
  computed,
  inject,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';

import { Auth, user } from '@angular/fire/auth';
import {
  Database,
  listVal,
  objectVal,
  ref,
  update
} from '@angular/fire/database';
import { catchError, map, of, switchMap } from 'rxjs';

import { DocumentItem } from '../../models/document.model';
import {
  INITIAL_TOAST_STATE,
  PendingPurchase,
  SortOption,
  ToastState,
  ToastType
} from '../../models/documents-ui.model';

import {
  DOCUMENTS_DB_PATHS,
  DOCUMENT_FILTERS,
  FILTER_ALL_LABEL,
  TOAST_DURATION_MS
} from '../../constants/documents-ui.constants';

import { PromoCodeService } from '../../services/promo-code.service';
import { PromoModalComponent } from '../../shared/promo-modal/promo-modal.component';

@Component({
  selector: 'app-documents',
  standalone: true,
  imports: [CommonModule, RouterLink, PromoModalComponent],
  templateUrl: './documents.component.html',
  styleUrls: ['./documents.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DocumentsComponent implements OnInit, OnDestroy {

  /* ─── Injection ─── */
  private readonly db = inject(Database);
  private readonly auth = inject(Auth);
  private readonly promoService = inject(PromoCodeService);
  private readonly destroyRef = inject(DestroyRef);

  /* ═══════════════════════════════════════════════════════
     UTILISATEUR CONNECTÉ — UN SEUL FLUX
     ═══════════════════════════════════════════════════════ */

  /** Utilisateur Firebase (source unique de vérité). */
  private readonly currentUser = toSignal(user(this.auth), {
    initialValue: null
  });

  /** UID dérivé (réactif). */
  readonly currentUserId = computed(() => this.currentUser()?.uid ?? null);

  /** Crédit lu depuis Realtime DB (réactif). */
  private readonly creditFromDb = toSignal(
    user(this.auth).pipe(
      switchMap(u => {
        if (!u) return of(null);
        return objectVal<number>(
          ref(this.db, `${DOCUMENTS_DB_PATHS.USERS}/${u.uid}/${DOCUMENTS_DB_PATHS.CREDIT}`)
        );
      })
    ),
    { initialValue: null as number | null }
  );

  /** ✅ Computed réactif — se met à jour dès que Firebase émet. */
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
     TOAST
     ═══════════════════════════════════════════════════════ */
  readonly toast = signal<ToastState>(INITIAL_TOAST_STATE);
  private toastTimeout: ReturnType<typeof setTimeout> | null = null;

  /* ═══════════════════════════════════════════════════════
     DOCUMENTS (Firebase → signal)
     ═══════════════════════════════════════════════════════ */
  readonly allDocs = toSignal(
    listVal<DocumentItem>(
      ref(this.db, DOCUMENTS_DB_PATHS.DOCUMENTS),
      { keyField: 'key' }
    ).pipe(
      catchError(err => {
        console.error('Erreur Firebase (documents) :', err);
        return of([] as DocumentItem[]);
      })
    ),
    { initialValue: [] as DocumentItem[] }
  );

  /* ═══════════════════════════════════════════════════════
     DOCUMENTS FILTRÉS / TRIÉS
     ═══════════════════════════════════════════════════════ */
  readonly visibleDocuments = computed(() => {
    let docs = [...this.allDocs()];

    /* Filtre catégorie */
    const filter = this.selectedFilter();
    if (filter !== FILTER_ALL_LABEL) {
      docs = docs.filter(d => this.matchesCategory(d, filter));
    }

    /* Recherche */
    const term = this.searchTerm().toLowerCase().trim();
    if (term) {
      docs = docs.filter(d =>
        d.title?.toLowerCase().includes(term) ||
        d.description?.toLowerCase().includes(term) ||
        d.format?.toLowerCase().includes(term)
      );
    }

    /* Tri */
    return this.sortDocuments(docs, this.sortBy());
  });

  /* ═══════════════════════════════════════════════════════
     CYCLE DE VIE
     ═══════════════════════════════════════════════════════ */
  constructor() {
    /* Nettoyage du timeout de toast à la destruction */
    this.destroyRef.onDestroy(() => {
      if (this.toastTimeout) {
        clearTimeout(this.toastTimeout);
        this.toastTimeout = null;
      }
    });
  }

  ngOnInit(): void {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }

  ngOnDestroy(): void {
    /* Nettoyage géré par DestroyRef */
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

  private matchesCategory(doc: DocumentItem, category: string): boolean {
    const type = doc.type?.toLowerCase().trim() ?? '';
    switch (category) {
      case 'Méthodes': return type.includes('méthode');
      case 'Livres numériques': return type.includes('livre');
      case 'Partitions': return type.includes('partition');
      case 'Supports pédagogiques': return type.includes('support');
      default: return true;
    }
  }

  private sortDocuments(docs: DocumentItem[], sort: SortOption): DocumentItem[] {
    const copy = [...docs];

    switch (sort) {
      case 'price-asc':
        return copy.sort((a, b) => (a.price || 0) - (b.price || 0));
      case 'price-desc':
        return copy.sort((a, b) => (b.price || 0) - (a.price || 0));
      case 'popular':
        return copy.sort((a, b) => (b.downloads || 0) - (a.downloads || 0));
      default:
        return copy.sort((a, b) => {
          const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return tb - ta;
        });
    }
  }

  /* ═══════════════════════════════════════════════════════
     ACHAT — Vérification code promo en amont
     ═══════════════════════════════════════════════════════ */

  async initiatePurchase(doc: DocumentItem, event?: Event): Promise<void> {
    event?.stopPropagation();

    /* 1. Vérifie le code promo (cache + Firebase) */
    const promoResult = await this.promoService.checkPromoCode();

    /* 2. Utilisateur sans code → modale */
    if (promoResult.status === 'missing') {
      this.pendingPurchase.set({
        doc,
        reason: (!doc.price || doc.price === 0) ? 'free' : 'paid'
      });
      this.promoError.set('');
      this.showPromoModal.set(true);
      return;
    }

    /* 3. Erreur réseau → toast */
    if (promoResult.status === 'error') {
      this.showToast(promoResult.message, 'error');
      return;
    }

    /* 4. Code valide → continue */
    this.performPurchase(doc);
  }

  private performPurchase(doc: DocumentItem): void {
    /* Gratuit → téléchargement direct */
    if (!doc.price || doc.price === 0) {
      window.open(doc.downloadUrl, '_blank');
      this.showToast(`Téléchargement de "${doc.title}" initié`, 'success');
      return;
    }

    /* Payant → modale de confirmation */
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

    void this.promoService.validatePromoCode(code).then(result => {
      this.isSavingPromo.set(false);

      if (!result.ok) {
        this.promoError.set(result.message);
        return;
      }

      this.showPromoModal.set(false);
      this.showToast(`Code « ${result.code} » validé ! Bon achat 🎸`, 'success');

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
      this.showToast('Veuillez vous connecter pour recharger votre compte.', 'error');
      return;
    }

    try {
      const newBalance = this.userCredit() + amount;
      await update(ref(this.db, `${DOCUMENTS_DB_PATHS.USERS}/${uid}`), {
        [DOCUMENTS_DB_PATHS.CREDIT]: newBalance
      });
      this.showToast(`Compte rechargé de ${this.formatPrice(amount)} !`, 'success');
      this.showRechargeInModal.set(false);
    } catch (error) {
      console.error('Erreur rechargement:', error);
      this.showToast('Échec du rechargement. Veuillez réessayer.', 'error');
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
      this.showToast('Veuillez vous connecter pour effectuer un achat.', 'error');
      return;
    }

    const currentBalance = this.userCredit();
    const docPrice = doc.price || 0;

    if (currentBalance < docPrice) {
      this.showToast('Crédit insuffisant ! Veuillez recharger votre compte.', 'error');
      return;
    }

    try {
      const newBalance = currentBalance - docPrice;
      await update(ref(this.db, `${DOCUMENTS_DB_PATHS.USERS}/${uid}`), {
        [DOCUMENTS_DB_PATHS.CREDIT]: newBalance
      });

      this.selectedDocForPurchase.set(null);
      this.showToast(`Achat réussi ! Téléchargement de "${doc.title}"...`, 'success');
      window.open(doc.downloadUrl, '_blank');
    } catch (error) {
      console.error('Erreur transaction:', error);
      this.showToast('Une erreur est survenue lors du paiement.', 'error');
    }
  }

  /* ═══════════════════════════════════════════════════════
     UTILITAIRES
     ═══════════════════════════════════════════════════════ */
  private showToast(message: string, type: ToastType = 'success'): void {
    if (this.toastTimeout) clearTimeout(this.toastTimeout);
    this.toast.set({ show: true, message, type });
    this.toastTimeout = setTimeout(
      () => {
        this.toast.update(t => ({ ...t, show: false }));
        this.toastTimeout = null;
      },
      TOAST_DURATION_MS
    );
  }

  formatPrice(price: number | undefined): string {
    if (!price || price === 0) return '0 FCFA';
    return new Intl.NumberFormat('fr-FR').format(price) + ' FCFA';
  }

  trackByDocumentKey(index: number, doc: DocumentItem): string {
    return doc.key ?? `doc-${index}`;
  }
}