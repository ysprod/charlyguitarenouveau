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
  CheckoutProduct,
  CoursePackBenefitSummary,
  CoursePackFulfillmentTask,
  PurchaseHistoryItem,
  PurchaseService,
} from '../../academie/services/purchase.service';

const PAGE_SIZE = 1;
const PACK_PAGE_SIZE = 5;

type TabId = 'achats' | 'packs';

@Component({
  selector: 'app-purchase-history',
  imports: [DatePipe, FormatPricePipe],
  templateUrl: './purchase-history.component.html',
  styleUrl: './purchase-history.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PurchaseHistoryComponent {
  private readonly purchaseService = inject(PurchaseService);

  /* ─── Sources ─── */
  readonly purchases = signal<readonly PurchaseHistoryItem[]>([]);
  readonly coursePackBenefits = signal<readonly CoursePackBenefitSummary[]>([]);
  readonly documentProducts = signal<readonly CheckoutProduct[]>([]);
  readonly pendingFulfillments =
    signal<readonly CoursePackFulfillmentTask[]>([]);

  /* ─── État UI ─── */
  readonly isLoading = signal(false);
  readonly benefitsLoading = signal(false);
  readonly historyError = signal('');
  readonly benefitError = signal('');
  readonly downloadError = signal('');
  readonly downloadingOrderId = signal<string | null>(null);
  readonly redeemingOrderId = signal<string | null>(null);
  readonly fulfillingBenefitId = signal<string | null>(null);
  readonly isAdministrator = signal(false);
  readonly selectedDocuments = signal<Readonly<Record<string, string>>>({});

  /* ─── Onglets ─── */
  readonly activeTab = signal<TabId>('achats');

  /* ─── Pagination achats ─── */
  readonly currentPage = signal(1);
  readonly pageSize = PAGE_SIZE;

  /* ─── Pagination packs ─── */
  readonly currentPackPage = signal(1);
  readonly packPageSize = PACK_PAGE_SIZE;

  /* ═══════════════════════════════════════════════════════
     COMPUTED
     ═══════════════════════════════════════════════════════ */

  readonly hasCoursePackBenefits = computed(
    () => this.coursePackBenefits().length > 0,
  );

  readonly purchaseCount = computed(() => this.purchases().length);
  readonly packCount = computed(() => this.coursePackBenefits().length);

  readonly tabs = computed<
    readonly { id: TabId; label: string; count: number }[]
  >(() => [
    { id: 'achats', label: 'Achats', count: this.purchaseCount() },
    { id: 'packs', label: 'Packs de cours', count: this.packCount() },
  ]);

  /* ─── Pagination achats ─── */
  readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.purchases().length / this.pageSize)),
  );

  readonly paginatedPurchases = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize;
    return this.purchases().slice(start, start + this.pageSize);
  });

  readonly pageRange = computed(() => {
    const total = this.purchases().length;
    if (total === 0) return { from: 0, to: 0, total };
    const from = (this.currentPage() - 1) * this.pageSize + 1;
    const to = Math.min(this.currentPage() * this.pageSize, total);
    return { from, to, total };
  });

  readonly canGoPrevious = computed(() => this.currentPage() > 1);
  readonly canGoNext = computed(() => this.currentPage() < this.totalPages());

  /* ─── Pagination packs ─── */
  readonly totalPackPages = computed(() =>
    Math.max(
      1,
      Math.ceil(this.coursePackBenefits().length / this.packPageSize),
    ),
  );

  readonly paginatedPacks = computed(() => {
    const start = (this.currentPackPage() - 1) * this.packPageSize;
    return this.coursePackBenefits().slice(start, start + this.packPageSize);
  });

  readonly packRange = computed(() => {
    const total = this.coursePackBenefits().length;
    if (total === 0) return { from: 0, to: 0, total };
    const from = (this.currentPackPage() - 1) * this.packPageSize + 1;
    const to = Math.min(this.currentPackPage() * this.packPageSize, total);
    return { from, to, total };
  });

  readonly canPackGoPrevious = computed(() => this.currentPackPage() > 1);
  readonly canPackGoNext = computed(
    () => this.currentPackPage() < this.totalPackPages(),
  );

  /* ═══════════════════════════════════════════════════════
     CYCLE DE VIE
     ═══════════════════════════════════════════════════════ */

  constructor() {
    afterNextRender(() => void this.refresh());
  }

  /* ═══════════════════════════════════════════════════════
     ONGLETS
     ═══════════════════════════════════════════════════════ */

  setTab(tab: TabId): void {
    this.activeTab.set(tab);
  }

  /* ═══════════════════════════════════════════════════════
     REFRESH
     ═══════════════════════════════════════════════════════ */

  async refresh(): Promise<void> {
    if (this.isLoading() || this.benefitsLoading()) {
      return;
    }

    /* Phase 1 — achats */
    this.isLoading.set(true);
    this.historyError.set('');
    this.benefitError.set('');
    try {
      this.purchases.set(await this.purchaseService.listPurchases());
      this.currentPage.set(
        Math.min(this.currentPage(), this.totalPages() || 1),
      );
    } catch (error) {
      console.error('[PurchaseHistory] Erreur achats :', error);
      this.historyError.set(
        'Impossible de charger votre historique d’achats.',
      );
    }
    this.isLoading.set(false);

    /* Phase 2 — packs */
    this.benefitsLoading.set(true);
    try {
      const response = await this.purchaseService.listMyCoursePackBenefits();
      this.coursePackBenefits.set(response.benefits);
      this.isAdministrator.set(response.isAdministrator);
      this.pendingFulfillments.set(response.pendingFulfillments);
      this.currentPackPage.set(
        Math.min(this.currentPackPage(), this.totalPackPages() || 1),
      );

      const hasCredits = response.benefits.some(
        ({ documentCreditsRemaining }) => documentCreditsRemaining > 0,
      );
      const selections = { ...this.selectedDocuments() };

      for (const benefit of response.benefits) {
        if (benefit.pendingRedemption) {
          selections[benefit.orderId] = benefit.pendingRedemption.productId;
        }
      }

      if (hasCredits) {
        const products = await this.purchaseService.listProducts();
        this.documentProducts.set(products);
        for (const benefit of response.benefits) {
          if (
            benefit.documentCreditsRemaining < 1 ||
            benefit.pendingRedemption
          ) {
            continue;
          }
          const currentSelection = selections[benefit.orderId];
          const selectedProduct = products.some(
            ({ id }) => id === currentSelection,
          )
            ? currentSelection
            : products[0]?.id;
          if (selectedProduct) {
            selections[benefit.orderId] = selectedProduct;
          }
        }
        this.selectedDocuments.set(selections);
      } else {
        this.documentProducts.set([]);
      }
    } catch (error) {
      console.error('[PurchaseHistory] Erreur packs :', error);
      this.benefitError.set(
        'Impossible de charger les avantages de vos packs pour le moment.',
      );
    } finally {
      this.benefitsLoading.set(false);
    }
  }

  /* ═══════════════════════════════════════════════════════
     ACTIONS
     ═══════════════════════════════════════════════════════ */

  selectDocument(orderId: string, event: Event): void {
    const target = event.target;
    if (target instanceof HTMLSelectElement) {
      this.selectedDocuments.update((selections) => ({
        ...selections,
        [orderId]: target.value,
      }));
    }
  }

  async redeemDocumentCredit(benefit: CoursePackBenefitSummary): Promise<void> {
    const productId = this.selectedDocuments()[benefit.orderId];
    if (
      !productId ||
      benefit.documentCreditsRemaining < 1 ||
      this.redeemingOrderId()
    ) {
      return;
    }

    this.redeemingOrderId.set(benefit.orderId);
    this.benefitError.set('');
    try {
      await this.purchaseService.redeemCoursePackDocumentCredit(
        benefit.orderId,
        productId,
      );
      await this.refresh();
    } catch (error) {
      console.error('[PurchaseHistory] Erreur crédit :', error);
      this.benefitError.set(
        'Impossible d’utiliser ce crédit. Actualisez vos achats et réessayez avec le même document si une utilisation était en cours.',
      );
    } finally {
      this.redeemingOrderId.set(null);
    }
  }

  async completeBenefit(task: CoursePackFulfillmentTask): Promise<void> {
    if (!this.isAdministrator() || this.fulfillingBenefitId()) {
      return;
    }
    this.fulfillingBenefitId.set(task.id);
    this.benefitError.set('');
    try {
      await this.purchaseService.completeCoursePackBenefit(task.id);
      await this.refresh();
    } catch (error) {
      console.error('[PurchaseHistory] Erreur validation :', error);
      this.benefitError.set(
        'Impossible de mettre à jour cet avantage. Actualisez la page et réessayez.',
      );
    } finally {
      this.fulfillingBenefitId.set(null);
    }
  }

  async download(purchase: PurchaseHistoryItem): Promise<void> {
    if (
      purchase.status !== 'paid' ||
      (purchase.orderType &&
        purchase.orderType !== 'document' &&
        purchase.orderType !== 'document_credit') ||
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
      console.error('[PurchaseHistory] Erreur téléchargement :', error);
      this.downloadError.set(
        'Le téléchargement est indisponible ou cet achat ne vous appartient pas.',
      );
    } finally {
      this.downloadingOrderId.set(null);
    }
  }

  /* ═══════════════════════════════════════════════════════
     PAGINATION ACTIONS
     ═══════════════════════════════════════════════════════ */

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

  goToPackPage(page: number): void {
    const clamped = Math.min(Math.max(1, page), this.totalPackPages());
    if (clamped !== this.currentPackPage()) {
      this.currentPackPage.set(clamped);
    }
  }

  previousPackPage(): void {
    if (this.canPackGoPrevious()) {
      this.currentPackPage.update((page) => page - 1);
    }
  }

  nextPackPage(): void {
    if (this.canPackGoNext()) {
      this.currentPackPage.update((page) => page + 1);
    }
  }

  /* ═══════════════════════════════════════════════════════
     HELPERS TEMPLATE
     ═══════════════════════════════════════════════════════ */

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
      (!purchase.orderType ||
        purchase.orderType === 'document' ||
        purchase.orderType === 'document_credit')
    );
  }

  selectedDocument(orderId: string): string {
    return this.selectedDocuments()[orderId] ?? '';
  }

  manualBenefitStatusLabel(status: string): string {
    switch (status) {
      case 'fulfilled':
        return 'Livré';
      case 'needs_definition':
        return 'À préciser';
      default:
        return 'En préparation';
    }
  }

  manualBenefitStatusClass(status: string): string {
    switch (status) {
      case 'fulfilled':
        return 'status--success';
      case 'needs_definition':
        return 'status--warning';
      default:
        return 'status--pending';
    }
  }

  manualBenefitStatusIcon(status: string): string {
    switch (status) {
      case 'fulfilled':
        return '✅';
      case 'needs_definition':
        return '⚠️';
      default:
        return '⏳';
    }
  }

  fulfilledManualCount(benefit: CoursePackBenefitSummary): number {
    return benefit.manualBenefits.filter((b) => b.status === 'fulfilled')
      .length;
  }

  /* ═══════════════════════════════════════════════════════
     PAGINATION HELPERS
     ═══════════════════════════════════════════════════════ */

  pageNumbers(): readonly (number | 'ellipsis')[] {
    return this.buildPageNumbers(this.totalPages(), this.currentPage());
  }

  packPageNumbers(): readonly (number | 'ellipsis')[] {
    return this.buildPageNumbers(
      this.totalPackPages(),
      this.currentPackPage(),
    );
  }

  private buildPageNumbers(
    total: number,
    current: number,
  ): readonly (number | 'ellipsis')[] {
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