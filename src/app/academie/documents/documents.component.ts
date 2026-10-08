import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { Auth, user } from '@angular/fire/auth';
import { Database, listVal, objectVal, ref, update } from '@angular/fire/database';
import { RouterLink } from '@angular/router';
import { Observable, Subscription, of } from 'rxjs';
import { catchError, map, shareReplay, switchMap } from 'rxjs/operators';

/* ═════════════════════════════════════════════════════════════════════
   TYPES
   ═════════════════════════════════════════════════════════════════════ */

export interface DocumentItem {
  key?: string;
  title: string;
  description: string;
  type: string;
  typeClass: string;
  icon: string;
  format: string;
  level: string;
  price: number;
  imageUrl?: string;
  imageStoragePath?: string;
  downloadUrl: string;
  storagePath?: string;
  fileName?: string;
  fileSize?: number;
  createdAt?: string;
  views?: number;
  downloads?: number;
}

export type SortOption = 'recent' | 'price-asc' | 'price-desc' | 'popular';
export type ToastType = 'success' | 'info' | 'error';

interface Toast {
  show: boolean;
  message: string;
  type: ToastType;
}

interface FilterOption {
  label: string;
  icon: string;
}

/* ═════════════════════════════════════════════════════════════════════
   COMPOSANT
   ═════════════════════════════════════════════════════════════════════ */
@Component({
  selector: 'app-documents',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './documents.component.html',
  styleUrls: ['./documents.component.scss']
})
export class DocumentsComponent implements OnInit, OnDestroy {

  private readonly database = inject(Database);
  private readonly auth = inject(Auth);

  /* ─── État utilisateur ─── */
  readonly userCredit = signal(0);
  readonly currentUserId = signal<string | null>(null);

  /* ─── Filtres, recherche, tri ─── */
  readonly selectedFilter = signal('Tous les documents');
  readonly searchTerm = signal('');
  readonly sortBy = signal<SortOption>('recent');

  /* ─── Modale & recharge ─── */
  readonly selectedDocForPurchase = signal<DocumentItem | null>(null);
  readonly showRechargeInModal = signal(false);
  readonly customRechargeAmount = signal(5000);

  /* ─── Toast ─── */
  readonly toast = signal<Toast>({ show: false, message: '', type: 'success' });
  private toastTimeout?: ReturnType<typeof setTimeout>;
  private userSub?: Subscription;

  /* ─── Filtres disponibles ─── */
  readonly filters: FilterOption[] = [
    { label: 'Tous les documents', icon: '✨' },
    { label: 'Méthodes', icon: '📙' },
    { label: 'Livres numériques', icon: '📘' },
    { label: 'Partitions', icon: '🎼' },
    { label: 'Supports pédagogiques', icon: '📑' }
  ];

  /* ─── Documents ─── */
  documents$: Observable<DocumentItem[]> = of([]);
  readonly allDocs = signal<DocumentItem[]>([]);

  readonly visibleDocuments = computed(() => {
    let docs = [...this.allDocs()];

    /* Filtre catégorie */
    const filter = this.selectedFilter();
    if (filter !== 'Tous les documents') {
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

  /* ═══════════════════════════════════════════════════════════════════
     LIFECYCLE
     ═══════════════════════════════════════════════════════════════════ */
  ngOnInit(): void {
    window.scrollTo({ top: 0, behavior: 'auto' });
    this.loadDocuments();
    this.listenToUserCredit();
  }

  ngOnDestroy(): void {
    this.userSub?.unsubscribe();
    if (this.toastTimeout) clearTimeout(this.toastTimeout);
  }

  /* ═══════════════════════════════════════════════════════════════════
     CHARGEMENT DES DONNÉES
     ═══════════════════════════════════════════════════════════════════ */
  private loadDocuments(): void {
    const documentsRef = ref(this.database, 'documents');

    this.documents$ = listVal<DocumentItem>(documentsRef, { keyField: 'key' }).pipe(
      map(docs => docs.map(d => ({ ...d, key: d.key }))),
      catchError(err => {
        console.error('Erreur Firebase:', err);
        return of([]);
      }),
      shareReplay({ bufferSize: 1, refCount: true })
    );

    this.documents$.subscribe(docs => this.allDocs.set(docs));
  }

  private listenToUserCredit(): void {
    this.userSub = user(this.auth).pipe(
      switchMap(currentUser => {
        if (!currentUser) {
          this.currentUserId.set(null);
          this.userCredit.set(0);
          return of(null);
        }
        this.currentUserId.set(currentUser.uid);
        return objectVal<number>(ref(this.database, `users/${currentUser.uid}/credit`));
      })
    ).subscribe({
      next: credit => {
        if (credit != null) this.userCredit.set(credit);
      },
      error: err => console.error('Erreur crédit:', err)
    });
  }

  /* ═══════════════════════════════════════════════════════════════════
     FILTRAGE / TRI / RECHERCHE
     ═══════════════════════════════════════════════════════════════════ */
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
    this.selectedFilter.set('Tous les documents');
    this.searchTerm.set('');
    this.sortBy.set('recent');
  }

  private matchesCategory(doc: DocumentItem, category: string): boolean {
    const type = doc.type.toLowerCase().trim();
    switch (category) {
      case 'Méthodes': return type.includes('méthode');
      case 'Livres numériques': return type.includes('livre');
      case 'Partitions': return type.includes('partition');
      case 'Supports pédagogiques': return type.includes('support');
      default: return true;
    }
  }

  private sortDocuments(docs: DocumentItem[], sort: SortOption): DocumentItem[] {
    switch (sort) {
      case 'price-asc': return docs.sort((a, b) => (a.price || 0) - (b.price || 0));
      case 'price-desc': return docs.sort((a, b) => (b.price || 0) - (a.price || 0));
      case 'popular': return docs.sort((a, b) => (b.downloads || 0) - (a.downloads || 0));
      default: return docs.sort((a, b) => {
        const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return tb - ta;
      });
    }
  }

  /* ═══════════════════════════════════════════════════════════════════
     ACHAT / RECHARGE
     ═══════════════════════════════════════════════════════════════════ */
  initiatePurchase(doc: DocumentItem, event?: Event): void {
    event?.stopPropagation();

    /* Gratuit → téléchargement direct */
    if (!doc.price || doc.price === 0) {
      window.open(doc.downloadUrl, '_blank');
      this.showToast(`Téléchargement de "${doc.title}" initié`, 'success');
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

  async processQuickRecharge(amount: number): Promise<void> {
    const uid = this.currentUserId();
    if (!uid) {
      this.showToast('Veuillez vous connecter pour recharger votre compte.', 'error');
      return;
    }

    try {
      const newBalance = this.userCredit() + amount;
      await update(ref(this.database, `users/${uid}`), { credit: newBalance });
      this.showToast(`Compte rechargé de ${this.formatPrice(amount)} !`, 'success');
      this.showRechargeInModal.set(false);
    } catch (error) {
      console.error('Erreur rechargement:', error);
      this.showToast('Échec du rechargement. Veuillez réessayer.', 'error');
    }
  }

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
      await update(ref(this.database, `users/${uid}`), { credit: newBalance });

      this.selectedDocForPurchase.set(null);
      this.showToast(`Achat réussi ! Téléchargement de "${doc.title}"...`, 'success');
      window.open(doc.downloadUrl, '_blank');
    } catch (error) {
      console.error('Erreur transaction:', error);
      this.showToast('Une erreur est survenue lors du paiement.', 'error');
    }
  }

  /* ═══════════════════════════════════════════════════════════════════
     UTILITAIRES
     ═══════════════════════════════════════════════════════════════════ */
  private showToast(message: string, type: ToastType = 'success'): void {
    if (this.toastTimeout) clearTimeout(this.toastTimeout);
    this.toast.set({ show: true, message, type });
    this.toastTimeout = setTimeout(
      () => this.toast.update(t => ({ ...t, show: false })),
      4000
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