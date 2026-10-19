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
     COMPUTED
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

  readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.filteredMessages().length / this.pageSize)),
  );

  readonly paginatedMessages = computed(() => {
    const filtered = this.filteredMessages();
    const page = this.currentPage();
    const start = (page - 1) * this.pageSize;
    return filtered.slice(start, start + this.pageSize);
  });

  readonly pagesArray = computed(() =>
    Array.from({ length: this.totalPages() }, (_, i) => i + 1),
  );

  /* ═══════════════════════════════════════════════════════
     ACTIONS
     ═══════════════════════════════════════════════════════ */

  setFilter(filter: InboxFilter): void {
    this.activeFilter.set(filter);
    this.currentPage.set(1);
  }

  openMessage(message: InboxMessage): void {
    if (!message.id) return;
    void this.router.navigate(['/inbox', message.id]);
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages()) return;
    this.currentPage.set(page);
  }
}