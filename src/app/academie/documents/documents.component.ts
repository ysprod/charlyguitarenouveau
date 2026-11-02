import {
  ChangeDetectionStrategy,
  Component,
  afterNextRender,
  computed,
  inject,
  signal,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { Auth } from '@angular/fire/auth';
import { FunctionsError } from '@angular/fire/functions';
import { catchError, from, of } from 'rxjs';

import { FILTER_ALL_LABEL } from '../constants/documents-ui.constants';
import { DocumentItem } from '../models/document.model';
import { SortOption } from '../models/documents-ui.model';
import { FormatPricePipe } from '../pipes/format-price.pipe';
import { ToastComponent } from '../toast/toast.component';
import { ToastService } from '../services/toast.service';
import {
  CheckoutProduct,
  PaymentMethod,
  PurchaseHistoryItem,
  PurchaseService,
} from '../services/purchase.service';
import {
  matchesCategory,
  sortDocuments,
} from '../utils/documents.utils';
import { PodcastvideoComponent } from 'src/app/home/podcastvideo/podcastvideo.component';
import { ImmersiveCarouselComponent } from 'src/app/shared/immersive-carousel/immersive-carousel.component';

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

@Component({
  selector: 'app-documents',
  imports: [
    ToastComponent,
    DatePipe,
    FormatPricePipe,
    PodcastvideoComponent,
    ImmersiveCarouselComponent,
  ],
  templateUrl: './documents.component.html',
  styleUrls: ['./documents.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DocumentsComponent {
  private readonly auth = inject(Auth);
  private readonly functions = inject(PurchaseService);
  private readonly toastService = inject(ToastService);

  readonly FILTER_ALL_LABEL = FILTER_ALL_LABEL;
  readonly paymentMethods = PAYMENT_METHODS;

  readonly selectedFilter = signal(FILTER_ALL_LABEL);
  readonly searchTerm = signal('');
  readonly sortBy = signal<SortOption>('recent');
  readonly selectedDocForPurchase = signal<DocumentItem | null>(null);
  readonly selectedPaymentMethod = signal<PaymentMethod>('wave');
  readonly isProcessing = signal(false);
  readonly purchaseHistory = signal<readonly PurchaseHistoryItem[]>([]);
  readonly isHistoryLoading = signal(false);
  readonly historyError = signal('');
  readonly catalogError = signal('');

  private readonly productsFromServer = toSignal<
    readonly CheckoutProduct[] | undefined
  >(
    from(this.functions.listProducts()).pipe(
      catchError((error: unknown) => {
        console.error('Erreur chargement du catalogue de paiement :', error);
        this.catalogError.set(
          'Le catalogue de vente est temporairement indisponible.',
        );
        return of([] as readonly CheckoutProduct[]);
      }),
    ),
    { initialValue: undefined },
  );

  readonly allDocs = computed(() => {
    return (this.productsFromServer() ?? []).map((product) => ({
      key: product.id,
      title: product.title,
      description: product.description,
      type: product.type,
      typeClass: product.typeClass,
      icon: product.icon,
      format: product.format,
      level: product.level,
      price: product.priceXof,
      imageUrl: product.imageUrl,
      createdAt: product.createdAt,
      views: product.views,
      downloads: product.downloads,
    }));
  });

  readonly isLoading = computed(
    () => this.productsFromServer() === undefined,
  );

  readonly isEmpty = computed(
    () => !this.isLoading() && this.allDocs().length === 0,
  );

  readonly visibleDocuments = computed(() => {
    let documents = [...this.allDocs()];
    const filter = this.selectedFilter();
    if (filter !== FILTER_ALL_LABEL) {
      documents = documents.filter((document) =>
        matchesCategory(document, filter),
      );
    }

    const term = this.searchTerm().toLowerCase().trim();
    if (term) {
      documents = documents.filter(
        (document) =>
          document.title?.toLowerCase().includes(term) ||
          document.description?.toLowerCase().includes(term) ||
          document.format?.toLowerCase().includes(term),
      );
    }

    return sortDocuments(documents, this.sortBy());
  });

  readonly documentCount = computed(() => this.visibleDocuments().length);

  readonly hasActiveFilters = computed(
    () =>
      this.selectedFilter() !== FILTER_ALL_LABEL ||
      this.searchTerm() !== '',
  );

  constructor() {
    afterNextRender(() => {
      window.scrollTo({ top: 0, behavior: 'auto' });
      void this.refreshPurchaseHistory();
    });
  }

  filterBy(category: string): void {
    this.selectedFilter.set(category);
  }

  onSearchInput(event: Event): void {
    this.searchTerm.set((event.target as HTMLInputElement).value);
  }

  onSortSelect(event: Event): void {
    this.sortBy.set((event.target as HTMLSelectElement).value as SortOption);
  }

  onPaymentMethodChange(event: Event): void {
    const method = (event.target as HTMLSelectElement).value;
    if (PAYMENT_METHODS.some((option) => option.value === method)) {
      this.selectedPaymentMethod.set(method as PaymentMethod);
    }
  }

  resetAll(): void {
    this.selectedFilter.set(FILTER_ALL_LABEL);
    this.searchTerm.set('');
    this.sortBy.set('recent');
  }

  initiatePurchase(doc: DocumentItem, event?: Event): void {
    event?.stopPropagation();
    if (!doc.key) {
      this.toastService.error('Ce produit n’est pas encore disponible à la vente.');
      return;
    }

    this.selectedPaymentMethod.set('wave');
    this.selectedDocForPurchase.set(doc);
  }

  cancelPurchase(): void {
    if (!this.isProcessing()) {
      this.selectedDocForPurchase.set(null);
    }
  }

  async confirmPurchase(): Promise<void> {
    const product = this.selectedDocForPurchase();
    if (!product?.key || this.isProcessing()) {
      return;
    }

    if (!this.auth.currentUser) {
      this.toastService.error('Veuillez vous connecter pour acheter.');
      return;
    }

    this.isProcessing.set(true);
    try {
      const checkout = await this.functions.createCheckout(
        product.key,
        this.selectedPaymentMethod(),
      );
      window.location.assign(checkout.redirectUrl);
    } catch (error) {
      console.error('Erreur création commande :', error);
      const message =
        error instanceof FunctionsError &&
        error.code === 'functions/failed-precondition'
          ? error.message
          : 'Impossible de créer la commande. Veuillez réessayer.';
      this.toastService.error(message);
      this.isProcessing.set(false);
    }
  }

  async refreshPurchaseHistory(): Promise<void> {
    if (!this.auth.currentUser || this.isHistoryLoading()) {
      return;
    }

    this.isHistoryLoading.set(true);
    this.historyError.set('');
    try {
      this.purchaseHistory.set(await this.functions.listPurchases());
    } catch (error) {
      console.error('Erreur chargement historique des achats :', error);
      this.historyError.set(
        'Impossible de charger votre historique d’achats.',
      );
    } finally {
      this.isHistoryLoading.set(false);
    }
  }

  async downloadPurchase(purchase: PurchaseHistoryItem): Promise<void> {
    if (purchase.status !== 'paid' || this.isProcessing()) {
      return;
    }

    this.isProcessing.set(true);
    try {
      const downloadUrl = await this.functions.getDownloadUrl(
        purchase.orderId,
      );
      window.location.assign(downloadUrl);
    } catch (error) {
      console.error('Erreur téléchargement autorisé :', error);
      this.toastService.error(
        'Le téléchargement est indisponible ou cet achat ne vous appartient pas.',
      );
    } finally {
      this.isProcessing.set(false);
    }
  }

  purchaseStatusLabel(status: string): string {
    switch (status) {
      case 'paid':
        return 'Payé — téléchargement disponible';
      case 'payment_pending':
      case 'creating_payment':
      case 'payment_request_unknown':
        return 'Paiement en attente de confirmation';
      case 'payment_failed':
      case 'payment_request_failed':
        return 'Paiement échoué';
      default:
        return 'Statut indisponible';
    }
  }

}
