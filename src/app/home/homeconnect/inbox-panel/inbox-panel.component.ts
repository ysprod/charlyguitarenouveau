// src/app/home/homeconnect/inbox-panel/inbox-panel.component.ts

import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';

import { toSignal } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';

import {
  INBOX_FILTERS,
  INBOX_PAGE_SIZE,
  INBOX_PREVIEW_MAX_LENGTH,
} from 'src/app/home/constants/homeconnect.constants';

import type {
  InboxFilter,
  InboxMessage,
} from 'src/app/home/models/homeconnect.model';

import { filterMessages } from 'src/app/home/utils/homeconnect.utils';

import { InboxService } from '../../services/inbox.service';
import { RelativeDatePipe } from '../../pipes/relative-date.pipe';
import { CategoryIconPipe } from '../../pipes/status.pipe';
import { TruncatePipe } from '../../pipes/truncate.pipe';

/* ═════════════════════════════════════════════════════════════════════
   TYPES — Éléments de pagination
   ═════════════════════════════════════════════════════════════════════ */

type PaginationItem = number | 'ellipsis-start' | 'ellipsis-end';

/* ═════════════════════════════════════════════════════════════════════
   INBOX PANEL — Aperçu de la boîte de réception
   ═════════════════════════════════════════════════════════════════════ */

@Component({
  selector: 'app-inbox-panel',
  imports: [
    RouterLink,
    CategoryIconPipe,
    RelativeDatePipe,
    TruncatePipe,
  ],
  templateUrl: './inbox-panel.component.html',
  styleUrls: ['./inbox-panel.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InboxPanelComponent {

  /* ═══════════════════════════════════════════════════════
     INJECTION
     ═══════════════════════════════════════════════════════ */

  private readonly inboxService = inject(InboxService);
  private readonly router = inject(Router);

  /* ═══════════════════════════════════════════════════════
     CONSTANTES
     ═══════════════════════════════════════════════════════ */

  readonly inboxFilters = INBOX_FILTERS;
  readonly pageSize = INBOX_PAGE_SIZE;
  readonly previewMaxLength = INBOX_PREVIEW_MAX_LENGTH;

  /* ═══════════════════════════════════════════════════════
     ÉTAT
     ═══════════════════════════════════════════════════════ */

  readonly activeFilter = signal<InboxFilter>('all');
  readonly currentPage = signal(1);

  /* ═══════════════════════════════════════════════════════
     FLUX
     ═══════════════════════════════════════════════════════ */

  private readonly messages = toSignal(this.inboxService.messages$, {
    initialValue: [] as InboxMessage[],
  });

  /* ═══════════════════════════════════════════════════════
     COMPUTED — DONNÉES
     ═══════════════════════════════════════════════════════ */

  readonly filteredMessages = computed(() =>
    filterMessages(this.messages(), this.activeFilter()),
  );

  readonly unreadCount = computed(
    () => this.messages().filter((m) => m.isUnread).length,
  );

  readonly sentCount = computed(
    () => this.messages().filter((m) => m.direction === 'out').length,
  );

  readonly totalCount = computed(() => this.messages().length);

  /* ═══════════════════════════════════════════════════════
     COMPUTED — PAGINATION
     ═══════════════════════════════════════════════════════ */

  /** Nombre total de pages (minimum 1). */
  readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.filteredMessages().length / this.pageSize)),
  );

  /** Messages de la page courante. */
  readonly paginatedMessages = computed(() => {
    const filtered = this.filteredMessages();
    const page = Math.min(this.currentPage(), this.totalPages());
    const start = (page - 1) * this.pageSize;
    return filtered.slice(start, start + this.pageSize);
  });

  /** Indique si on a une page précédente. */
  readonly hasPrevPage = computed(() => this.currentPage() > 1);

  /** Indique si on a une page suivante. */
  readonly hasNextPage = computed(
    () => this.currentPage() < this.totalPages(),
  );

  /** Indice du premier message affiché (1-based). */
  readonly rangeStart = computed(() => {
    const total = this.filteredMessages().length;
    if (total === 0) return 0;
    return (this.currentPage() - 1) * this.pageSize + 1;
  });

  /** Indice du dernier message affiché (1-based). */
  readonly rangeEnd = computed(() => {
    const total = this.filteredMessages().length;
    if (total === 0) return 0;
    return Math.min(this.currentPage() * this.pageSize, total);
  });

  /**
   * ✅ Pagination intelligente avec ellipsis :
   * - ≤ 7 pages : toutes visibles
   * - > 7 pages : 1 + ... + [page-1, page, page+1] + ... + last
   */
  readonly paginationItems = computed<PaginationItem[]>(() => {
    const total = this.totalPages();
    const current = this.currentPage();
    const maxVisible = 7;

    /* Cas simple : peu de pages → toutes visibles */
    if (total <= maxVisible) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }

    /* Cas complexe : beaucoup de pages */
    const items: PaginationItem[] = [1];

    const start = Math.max(2, current - 1);
    const end = Math.min(total - 1, current + 1);

    /* Ellipsis avant ou page 2 */
    if (start > 2) {
      items.push('ellipsis-start');
    } else if (start === 2) {
      items.push(2);
    }

    /* Pages autour de la page active */
    for (let p = Math.max(2, start); p <= Math.min(total - 1, end); p++) {
      items.push(p);
    }

    /* Ellipsis après ou avant-dernière page */
    if (end < total - 1) {
      items.push('ellipsis-end');
    } else if (end === total - 1) {
      items.push(total - 1);
    }

    /* Dernière page toujours visible */
    items.push(total);

    return items;
  });

  /* ═══════════════════════════════════════════════════════
     ACTIONS — FILTRES
     ═══════════════════════════════════════════════════════ */

  setFilter(filter: InboxFilter): void {
    this.activeFilter.set(filter);
    this.currentPage.set(1);
  }

  /* ═══════════════════════════════════════════════════════
     ACTIONS — MESSAGES
     ═══════════════════════════════════════════════════════ */

  openMessage(message: InboxMessage): void {
    if (!message.id) return;
    void this.router.navigate(['/inbox', message.id]);
  }

  /* ═══════════════════════════════════════════════════════
     ACTIONS — PAGINATION
     ═══════════════════════════════════════════════════════ */

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages()) return;
    this.currentPage.set(page);
  }

  goToFirstPage(): void {
    this.goToPage(1);
  }

  goToLastPage(): void {
    this.goToPage(this.totalPages());
  }

  prevPage(): void {
    if (this.hasPrevPage()) {
      this.goToPage(this.currentPage() - 1);
    }
  }

  nextPage(): void {
    if (this.hasNextPage()) {
      this.goToPage(this.currentPage() + 1);
    }
  }
}