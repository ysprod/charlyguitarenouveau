import { DatePipe } from '@angular/common';
import {
    ChangeDetectionStrategy,
    Component,
    computed,
    inject,
    linkedSignal,
    output,
    signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';

import { RouterLink } from '@angular/router';
import {
    INBOX_FILTERS,
    INBOX_PAGE_SIZE,
    INBOX_PREVIEW_MAX_LENGTH,
} from 'src/app/constants/homeconnect.constants';
import type {
    InboxFilter,
    InboxMessage,
} from 'src/app/models/homeconnect.model';
import { InboxService } from 'src/app/services/inbox.service';
import { getCategoryIcon } from 'src/app/shared/category-icons.constants';
import {
    filterMessages,
    formatRelativeDate,
    truncate,
} from 'src/app/utils/homeconnect.utils';

/* ═════════════════════════════════════════════════════════════════════
   INBOX PANEL — Boîte de réception (Gmail-like)
   ═════════════════════════════════════════════════════════════════════ */

@Component({
  selector: 'app-inbox-panel',
  standalone: true,
  imports: [DatePipe,RouterLink],
  templateUrl: './inbox-panel.component.html',
  styleUrls: ['./inbox-panel.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InboxPanelComponent {
  /* ═══════════════════════════════════════════════════════
     INJECTION
     ═══════════════════════════════════════════════════════ */

  private readonly inboxService = inject(InboxService);

  /* ═══════════════════════════════════════════════════════
     OUTPUTS (Option C — prêts à brancher)
     ═══════════════════════════════════════════════════════ */

  readonly reply = output<InboxMessage>();
  readonly forward = output<InboxMessage>();

  /* ═══════════════════════════════════════════════════════
     CONSTANTES UI
     ═══════════════════════════════════════════════════════ */

  readonly inboxFilters = INBOX_FILTERS;
  readonly pageSize = INBOX_PAGE_SIZE;
  readonly previewMaxLength = INBOX_PREVIEW_MAX_LENGTH;

  /* ═══════════════════════════════════════════════════════
     ÉTAT UI
     ═══════════════════════════════════════════════════════ */

  readonly selectedMessage = signal<InboxMessage | null>(null);
  readonly activeFilter = signal<InboxFilter>('all');
  readonly currentPage = signal(1);

  /* ═══════════════════════════════════════════════════════
     FLUX FIREBASE (readonly)
     ═══════════════════════════════════════════════════════ */

  private readonly firebaseMessages = toSignal(this.inboxService.messages$, {
    initialValue: [] as InboxMessage[],
  });

  /* ═══════════════════════════════════════════════════════
     SIGNAL LOCAL (linkedSignal) — synchronisé avec Firebase
     ═══════════════════════════════════════════════════════ */

  private readonly localMessages = linkedSignal<InboxMessage[]>(() =>
    this.firebaseMessages()
  );

  /* ═══════════════════════════════════════════════════════
     SIGNAUX DÉRIVÉS
     ═══════════════════════════════════════════════════════ */

  readonly filteredMessages = computed(() =>
    filterMessages(this.localMessages(), this.activeFilter())
  );

  readonly unreadCount = computed(
    () => this.localMessages().filter((m) => m.isUnread).length
  );

  readonly totalCount = computed(() => this.localMessages().length);

  readonly starredCount = computed(
    () => this.localMessages().filter((m) => m.isStarred).length
  );

  readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.filteredMessages().length / this.pageSize))
  );

  readonly paginatedMessages = computed(() => {
    const filtered = this.filteredMessages();
    const page = this.currentPage();
    const start = (page - 1) * this.pageSize;
    return filtered.slice(start, start + this.pageSize);
  });

  readonly pagesArray = computed(() =>
    Array.from({ length: this.totalPages() }, (_, i) => i + 1)
  );

  /* ═══════════════════════════════════════════════════════
     HELPERS TEMPLATE
     ═══════════════════════════════════════════════════════ */

  readonly formatRelativeDate = formatRelativeDate;
  readonly truncate = truncate;
  readonly getCategoryIcon = getCategoryIcon;

  /* ═══════════════════════════════════════════════════════
     ACTIONS UI
     ═══════════════════════════════════════════════════════ */

  setFilter(filter: InboxFilter): void {
    this.activeFilter.set(filter);
    this.currentPage.set(1);
    this.selectedMessage.set(null);
  }

  selectMessage(message: InboxMessage): void {
    this.selectedMessage.set(message);

    if (message.isUnread) {
      this.localMessages.update((list) =>
        list.map((m) => (m.id === message.id ? { ...m, isUnread: false } : m))
      );
      this.selectedMessage.set({ ...message, isUnread: false });
    }
  }

  closeMessage(): void {
    this.selectedMessage.set(null);
  }

  toggleStar(message: InboxMessage, event: Event): void {
    event.stopPropagation();
    this.localMessages.update((list) =>
      list.map((m) =>
        m.id === message.id ? { ...m, isStarred: !m.isStarred } : m
      )
    );

    const selected = this.selectedMessage();
    if (selected?.id === message.id) {
      this.selectedMessage.set({
        ...selected,
        isStarred: !selected.isStarred,
      });
    }
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages()) return;
    this.currentPage.set(page);
    this.selectedMessage.set(null);
  }

  markAllAsRead(): void {
    this.localMessages.update((list) =>
      list.map((m) => ({ ...m, isUnread: false }))
    );
    this.selectedMessage.update((m) => (m ? { ...m, isUnread: false } : null));
  }

  /* ═══════════════════════════════════════════════════════
     ACTIONS FOOTER (Option C — émises, pas traitées)
     ═══════════════════════════════════════════════════════ */

  onReply(): void {
    const selected = this.selectedMessage();
    if (selected) this.reply.emit(selected);
  }

  onForward(): void {
    const selected = this.selectedMessage();
    if (selected) this.forward.emit(selected);
  }
}