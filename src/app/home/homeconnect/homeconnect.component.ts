// src/app/home/homeconnect/homeconnect.component.ts

import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  linkedSignal,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Auth, authState } from '@angular/fire/auth';
import { Database, objectVal, ref } from '@angular/fire/database';
import { RouterLink } from '@angular/router';
import { map, switchMap, of } from 'rxjs';

import { UserProfile } from 'src/app/models/user.model';
import { getInitials } from 'src/app/utils/string.utils';

import {
  QUICK_ACTIONS,
  COLOR_UNIVERSES,
  INBOX_FILTERS,
  INBOX_PAGE_SIZE,
  INBOX_PREVIEW_MAX_LENGTH,
  MOCK_INBOX_MESSAGES,
} from 'src/app/constants/homeconnect.constants';

import { FooterComponent } from 'src/app/footer/footer.component';
import { InboxMessage, InboxFilter } from 'src/app/models/homeconnect.model';
import { InboxService } from 'src/app/services/inbox.service';
import { getCategoryIcon } from 'src/app/shared/category-icons.constants';
import { RevealDirective } from 'src/app/shared/reveal.directive';
import {
  filterMessages,
  formatRelativeDate,
  truncate,
} from 'src/app/utils/homeconnect.utils';

@Component({
  selector: 'app-homeconnect',
  standalone: true,
  imports: [CommonModule, RouterLink, RevealDirective, FooterComponent],
  templateUrl: './homeconnect.component.html',
  styleUrls: ['./homeconnect.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeconnectComponent {
  /* ═══════════════════════════════════════════════════════
     INJECTION
     ═══════════════════════════════════════════════════════ */

  private readonly auth = inject(Auth);
  private readonly db = inject(Database);
  private readonly inboxService = inject(InboxService);

  /* ═══════════════════════════════════════════════════════
     UTILISATEUR CONNECTÉ
     ═══════════════════════════════════════════════════════ */

  private readonly currentUser = toSignal(authState(this.auth), {
    initialValue: null,
  });

  private readonly userProfile = toSignal(
    authState(this.auth).pipe(
      map((u) => u?.uid),
      switchMap((uid) => {
        if (!uid) return of(null);
        return objectVal<UserProfile>(ref(this.db, `users/${uid}`));
      })
    ),
    { initialValue: null }
  );

  readonly userName = computed(() => {
    const p = this.userProfile();
    const u = this.currentUser();
    return (
      p?.displayName ??
      u?.displayName ??
      u?.email?.split('@')[0] ??
      'Musicien'
    );
  });

  readonly userFirstName = computed(() => {
    const parts = this.userName().trim().split(/\s+/);
    return parts[0] ?? 'Musicien';
  });

  readonly userInitials = computed(() =>
    getInitials(
      this.userProfile()?.displayName ??
        this.currentUser()?.displayName ??
        'OFFOLANDAIS',
      this.currentUser()?.email,
      'M'
    )
  );

  readonly userPhoto = computed(
    () => this.userProfile()?.photoURL ?? this.currentUser()?.photoURL ?? null
  );

  /* ═══════════════════════════════════════════════════════
     MESSAGE DE BIENVENUE DYNAMIQUE
     ═══════════════════════════════════════════════════════ */

  readonly greeting = computed(() => {
    const h = new Date().getHours();
    if (h < 12) return 'Bonjour';
    if (h < 18) return 'Bon après-midi';
    return 'Bonsoir';
  });

  /* ═══════════════════════════════════════════════════════
     CONSTANTES UI
     ═══════════════════════════════════════════════════════ */

  readonly quickActions = QUICK_ACTIONS;
  readonly colorUniverses = COLOR_UNIVERSES;
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

  private readonly firebaseMessages = toSignal(
    this.inboxService.messagesWithFallback$(MOCK_INBOX_MESSAGES),
    { initialValue: [] as InboxMessage[] }
  );

  /* ═══════════════════════════════════════════════════════
     SIGNAL LOCAL (linkedSignal) — synchronisé avec Firebase
     ═══════════════════════════════════════════════════════ */

  /**
   * linkedSignal : se resynchronise automatiquement quand
   * firebaseMessages() change, MAIS reste mutable localement
   * pour les interactions UI (marquer lu, étoile, etc.).
   */
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
}