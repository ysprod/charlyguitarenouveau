import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { Auth, user } from '@angular/fire/auth';
import { Database, listVal, objectVal, ref, update } from '@angular/fire/database';
import { RouterLink } from '@angular/router';
import { Observable, Subscription, of } from 'rxjs';
import { catchError, map, shareReplay, switchMap } from 'rxjs/operators';

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

  /* ============================================================
     SIGNAUX & ÉTAT UTILISATEUR
     ============================================================ */
  readonly selectedFilter = signal<string>('Tous les documents');
  readonly searchTerm     = signal<string>('');
  readonly sortBy         = signal<'recent' | 'price-asc' | 'price-desc' | 'popular'>('recent');
  
  readonly userCredit = signal<number>(0);
  readonly currentUserId = signal<string | null>(null);
  
  readonly selectedDocForPurchase = signal<DocumentItem | null>(null);
  readonly showRechargeInModal = signal<boolean>(false);
  readonly customRechargeAmount = signal<number>(5000);
  
  readonly toast = signal<{ show: boolean; message: string; type: 'success' | 'info' | 'error' }>(
    { show: false, message: '', type: 'success' }
  );

  private userSub?: Subscription;

  /* ============================================================
     FILTRES AVEC ICÔNES ET MÉTADONNÉES
     ============================================================ */
  readonly filters: { label: string; icon: string }[] = [
    { label: 'Tous les documents', icon: '✨' },
    { label: 'Méthodes',           icon: '📙' },
    { label: 'Livres numériques',  icon: '📘' },
    { label: 'Partitions',         icon: '🎼' },
    { label: 'Supports pédagogiques', icon: '📑' }
  ];

  /* ============================================================
     DONNÉES & CALCULS
     ============================================================ */
  documents$: Observable<DocumentItem[]> = of([]);
  readonly allDocs = signal<DocumentItem[]>([]);

  readonly visibleDocuments = computed(() => {
    let docs = [...this.allDocs()];

    if (this.selectedFilter() !== 'Tous les documents') {
      docs = docs.filter(d => this.matchesCategory(d, this.selectedFilter()));
    }

    const term = this.searchTerm().toLowerCase().trim();
    if (term) {
      docs = docs.filter(d =>
        d.title?.toLowerCase().includes(term) ||
        d.description?.toLowerCase().includes(term) ||
        d.format?.toLowerCase().includes(term)
      );
    }

    switch (this.sortBy()) {
      case 'price-asc':
        docs.sort((a, b) => (a.price || 0) - (b.price || 0));
        break;
      case 'price-desc':
        docs.sort((a, b) => (b.price || 0) - (a.price || 0));
        break;
      case 'popular':
        docs.sort((a, b) => (b.downloads || 0) - (a.downloads || 0));
        break;
      default:
        docs.sort((a, b) => {
          const da = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const db = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return db - da;
        });
    }

    return docs;
  });

  ngOnInit(): void {
    window.scrollTo({ top: 0, behavior: 'auto' });
    this.loadDocuments();
    this.listenToUserCredit();
  }

  ngOnDestroy(): void {
    this.userSub?.unsubscribe();
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
        const userCreditRef = ref(this.database, `users/${currentUser.uid}/credit`);
        return objectVal<number>(userCreditRef);
      })
    ).subscribe({
      next: (credit) => {
        if (credit !== null && credit !== undefined) {
          this.userCredit.set(credit);
        }
      },
      error: (err) => console.error('Erreur de lecture du crédit:', err)
    });
  }

  private loadDocuments(): void {
    const documentsRef = ref(this.database, 'documents');

    this.documents$ = listVal<DocumentItem>(documentsRef, { keyField: 'key' }).pipe(
      map((documents: DocumentItem[]) =>
        documents.map(d => ({ ...d, key: d.key }))
      ),
      catchError(err => {
        console.error('Erreur Firebase:', err);
        return of([]);
      }),
      shareReplay({ bufferSize: 1, refCount: true })
    );

    this.documents$.subscribe(docs => this.allDocs.set(docs));
  }

  filterBy(category: string): void {
    this.selectedFilter.set(category);
  }

  onSearchInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchTerm.set(value);
  }

  onSortSelect(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.sortBy.set(value as any);
  }

  resetAll(): void {
    this.selectedFilter.set('Tous les documents');
    this.searchTerm.set('');
    this.sortBy.set('recent');
  }

  private matchesCategory(doc: DocumentItem, category: string): boolean {
    const type = doc.type.toLowerCase().trim();
    switch (category) {
      case 'Méthodes':             return type.includes('méthode');
      case 'Livres numériques':   return type.includes('livre');
      case 'Partitions':          return type.includes('partition');
      case 'Supports pédagogiques': return type.includes('support');
      default: return true;
    }
  }

  initiatePurchase(doc: DocumentItem, event?: Event): void {
    event?.stopPropagation();

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
      const userRef = ref(this.database, `users/${uid}`);
      await update(userRef, { credit: newBalance });

      this.showToast(`Compte rechargé de ${this.formatPrice(amount)} avec succès !`, 'success');
      this.showRechargeInModal.set(false);
    } catch (error) {
      console.error('Erreur lors du rechargement:', error);
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
      const userRef = ref(this.database, `users/${uid}`);
      await update(userRef, { credit: newBalance });

      this.selectedDocForPurchase.set(null);
      this.showToast(`Achat réussi ! Téléchargement de "${doc.title}"...`, 'success');
      window.open(doc.downloadUrl, '_blank');
    } catch (error) {
      console.error('Erreur lors de la transaction:', error);
      this.showToast('Une erreur est survenue lors du paiement.', 'error');
    }
  }

  private showToast(message: string, type: 'success' | 'info' | 'error' = 'success'): void {
    this.toast.set({ show: true, message, type });
    setTimeout(() => this.toast.update(t => ({ ...t, show: false })), 4000);
  }

  formatPrice(price: number | undefined): string {
    if (!price || price === 0) return '0 FCFA';
    return new Intl.NumberFormat('fr-FR').format(price) + ' FCFA';
  }

  trackByDocumentKey(index: number, doc: DocumentItem): string {
    return doc.key ?? `doc-${index}`;
  }
}