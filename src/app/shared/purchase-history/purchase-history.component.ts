import {
  ChangeDetectionStrategy,
  Component,
  afterNextRender,
  computed,
  inject,
  signal,
} from '@angular/core';
import { DatePipe } from '@angular/common';

import { FormatPricePipe } from '../../academie/pipes/format-price.pipe';
import {
  PurchaseHistoryItem,
  PurchaseService,
} from '../../academie/services/purchase.service';

const PAGE_SIZE = 5;

@Component({
  selector: 'app-purchase-history',
  imports: [DatePipe, FormatPricePipe],
  templateUrl: './purchase-history.component.html',
  styleUrl: './purchase-history.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PurchaseHistoryComponent {
  private readonly purchaseService = inject(PurchaseService);

  readonly purchases = signal<readonly PurchaseHistoryItem[]>([]);
  readonly isLoading = signal(false);
  readonly historyError = signal('');
  readonly downloadError = signal('');
  readonly downloadingOrderId = signal<string | null>(null);

  // ---- Pagination ---------------------------------------------------------
  readonly currentPage = signal(1);
  readonly pageSize = PAGE_SIZE;

  readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.purchases().length / this.pageSize)),
  );

  readonly paginatedPurchases = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize;
    return this.purchases().slice(start, start + this.pageSize);
  });

  readonly pageRange = computed(() => {
    const total = this.purchases().length;
    if (total === 0) {
      return { from: 0, to: 0, total };
    }
    const from = (this.currentPage() - 1) * this.pageSize + 1;
    const to = Math.min(this.currentPage() * this.pageSize, total);
    return { from, to, total };
  });

  readonly canGoPrevious = computed(() => this.currentPage() > 1);
  readonly canGoNext = computed(() => this.currentPage() < this.totalPages());

  // ---- Cycle de vie -------------------------------------------------------
  constructor() {
    afterNextRender(() => void this.refresh());
  }

  // ---- Actions ------------------------------------------------------------
  async refresh(): Promise<void> {
    if (this.isLoading()) {
      return;
    }

    this.isLoading.set(true);
    this.historyError.set('');
    try {
      this.purchases.set(await this.purchaseService.listPurchases());
      // On ramène la pagination dans les bornes après un refresh.
      this.currentPage.set(
        Math.min(this.currentPage(), this.totalPages() || 1),
      );
    } catch (error) {
      console.error('Erreur chargement historique des achats :', error);
      this.historyError.set(
        'Impossible de charger votre historique d’achats.',
      );
    } finally {
      this.isLoading.set(false);
    }
  }

  async download(purchase: PurchaseHistoryItem): Promise<void> {
    if (
      purchase.status !== 'paid' ||
      (purchase.orderType && purchase.orderType !== 'document') ||
      this.downloadingOrderId()
    ) {
      return;
    }

    this.downloadingOrderId.set(purchase.orderId);
    this.downloadError.set('');
    try {
      const downloadUrl = await this.purchaseService.getDownloadUrl(
        purchase.orderId,
      );
      window.location.assign(downloadUrl);
    } catch (error) {
      console.error('Erreur téléchargement autorisé :', error);
      this.downloadError.set(
        'Le téléchargement est indisponible ou cet achat ne vous appartient pas.',
      );
    } finally {
      this.downloadingOrderId.set(null);
    }
  }

  goToPage(page: number): void {
    const clamped = Math.min(Math.max(1, page), this.totalPages());
    if (clamped !== this.currentPage()) {
      this.currentPage.set(clamped);
    }
  }

  previousPage(): void {
    if (this.canGoPrevious()) {
      this.currentPage.update((page) => page - 1);
    }
  }

  nextPage(): void {
    if (this.canGoNext()) {
      this.currentPage.update((page) => page + 1);
    }
  }

  // ---- Helpers de template -----------------------------------------------
  statusLabel(purchase: PurchaseHistoryItem): string {
    switch (purchase.status) {
      case 'paid':
        if (purchase.orderType === 'course_pack') {
          return 'Pack de cours enregistré';
        }
        if (purchase.orderType === 'game_subscription') {
          return 'Paiement confirmé';
        }
        return 'Téléchargement disponible';
      case 'payment_pending':
      case 'creating_payment':
      case 'payment_request_unknown':
        return 'Paiement en attente';
      case 'payment_failed':
      case 'payment_request_failed':
        return 'Paiement échoué';
      default:
        return 'Statut indisponible';
    }
  }

  statusClass(purchase: PurchaseHistoryItem): string {
    switch (purchase.status) {
      case 'paid':
        return 'badge--success';
      case 'payment_pending':
      case 'creating_payment':
      case 'payment_request_unknown':
        return 'badge--pending';
      case 'payment_failed':
      case 'payment_request_failed':
        return 'badge--danger';
      default:
        return 'badge--neutral';
    }
  }

  isDownloadable(purchase: PurchaseHistoryItem): boolean {
    return (
      purchase.status === 'paid' &&
      (!purchase.orderType || purchase.orderType === 'document')
    );
  }

  // Pagination "compacte" : 1 2 3 … 8 9 10
  pageNumbers(): readonly (number | 'ellipsis')[] {
    const total = this.totalPages();
    const current = this.currentPage();

    if (total <= 7) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }

    const pages: (number | 'ellipsis')[] = [1];
    const left = Math.max(2, current - 1);
    const right = Math.min(total - 1, current + 1);

    if (left > 2) {
      pages.push('ellipsis');
    }
    for (let i = left; i <= right; i++) {
      pages.push(i);
    }
    if (right < total - 1) {
      pages.push('ellipsis');
    }
    pages.push(total);
    return pages;
  }

  trackByOrderId(_: number, purchase: PurchaseHistoryItem): string {
    return purchase.orderId;
  }
}