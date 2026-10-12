// src/app/features/messagerie/messagerie.component.ts

import {
  AfterViewChecked,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EnvironmentInjector,
  OnDestroy,
  OnInit,
  ViewChild,
  inject,
  runInInjectionContext,
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { Auth, User, authState } from '@angular/fire/auth';
import {
  Database,
  equalTo,
  listVal,
  orderByChild,
  push,
  query,
  ref,
  update,
} from '@angular/fire/database';

import {
  BehaviorSubject,
  Observable,
  Subject,
  combineLatest,
  of,
} from 'rxjs';

import {
  map,
  shareReplay,
  startWith,
  switchMap,
  takeUntil,
  tap,
} from 'rxjs/operators';

import {
  MessageCategory,
  MessageReply,
  MessageStatus,
  UserMessage,
} from '../../models/user-message.model';
import { FILTER_TABS, SORT_OPTIONS, EMPTY_STATE_MESSAGES, REPLY_MAX_LENGTH, REPLY_WARNING_THRESHOLD, STATUS_BADGE_CLASS, DEFAULT_STATUS_BADGE, STATUS_LABEL, DEFAULT_STATUS_LABEL, STATUS_ICON, DEFAULT_STATUS_ICON,   DEFAULT_CATEGORY_ICON } from 'src/app/constants/messagerie.constants';
import { MessageStats, FilterStatus, SortMode, MessageFilters, INITIAL_FILTERS, INITIAL_STATS } from 'src/app/models/messagerie.model';
import { sortByRecent, applyFilters, toRepliesArray, getTimestamp, formatResponseTime } from 'src/app/utils/messagerie.utils';
import { getInitials } from 'src/app/utils/string.utils';
import { CATEGORY_ICON } from 'src/app/shared/category-icons.constants';
 

@Component({
  selector: 'app-messagerie',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './messagerie.component.html',
  styleUrls: ['./messagerie.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MessagerieComponent
  implements OnInit, OnDestroy, AfterViewChecked
{
  /* ─── ViewChild ─── */
  @ViewChild('threadBody')
  threadBody?: ElementRef<HTMLDivElement>;

  /* ─── Flux ─── */
  messages$!: Observable<UserMessage[]>;
  filteredMessages$!: Observable<UserMessage[]>;
  stats$!: Observable<MessageStats>;

  /* ─── État UI ─── */
  currentUser: User | null = null;
  selectedMessage: UserMessage | null = null;
  replyText = '';
  isSending = false;
  searchTerm = '';
  activeFilter: FilterStatus = 'all';
  sortMode: SortMode = 'recent';

  /* ─── Constantes exposées au template ─── */
  protected readonly filterTabs = FILTER_TABS;
  protected readonly sortOptions = SORT_OPTIONS;
  protected readonly emptyStateMessages = EMPTY_STATE_MESSAGES;
  protected readonly replyMaxLength = REPLY_MAX_LENGTH;
  protected readonly replyWarningThreshold = REPLY_WARNING_THRESHOLD;

  /* ─── Injection ─── */
  private readonly auth = inject(Auth);
  private readonly database = inject(Database);
  private readonly environmentInjector = inject(EnvironmentInjector);

  /* ─── Internes ─── */
  private readonly destroy$ = new Subject<void>();
  private readonly filter$ = new BehaviorSubject<MessageFilters>(INITIAL_FILTERS);

  private scrollNeeded = false;

  /**
   * Cache des réponses triées par clé de message.
   * Évite de recalculer toRepliesArray() à chaque cycle CD.
   */
  private readonly repliesCache = new Map<string, MessageReply[]>();

  /* ═══════════════════════════════════════════════════════
     CYCLE DE VIE
     ═══════════════════════════════════════════════════════ */

  ngOnInit(): void {
    this.initializeMessages();
    this.initializeFilteredMessages();
    this.initializeStats();
  }

  ngAfterViewChecked(): void {
    if (this.scrollNeeded && this.threadBody) {
      this.scrollToBottom();
      this.scrollNeeded = false;
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.repliesCache.clear();
  }

  /* ═══════════════════════════════════════════════════════
     INITIALISATION DES FLUX
     ═══════════════════════════════════════════════════════ */

  private initializeMessages(): void {
    this.messages$ = runInInjectionContext(this.environmentInjector, () =>
      authState(this.auth).pipe(
        takeUntil(this.destroy$),

        switchMap((user: User | null) => {
          this.currentUser = user;

          if (!user) {
            this.selectedMessage = null;
            this.repliesCache.clear();
            return of([]);
          }

          const messagesQuery = query(
            ref(this.database, 'messages'),
            orderByChild('userId'),
            equalTo(user.uid)
          );

          return listVal<UserMessage>(messagesQuery, { keyField: 'key' }).pipe(
            map((messages) => sortByRecent(messages)),
            tap((messages) => this.syncSelectedMessage(messages))
          );
        }),

        shareReplay({ bufferSize: 1, refCount: true })
      )
    );
  }

  private initializeFilteredMessages(): void {
    this.filteredMessages$ = combineLatest([
      this.messages$,
      this.filter$,
    ]).pipe(
      map(([messages, filters]) =>
        applyFilters(messages, filters.search, filters.status, filters.sort)
      )
    );
  }

  private initializeStats(): void {
    this.stats$ = this.messages$.pipe(
      map((messages): MessageStats => {
        const total = messages.length;
        const unread = messages.filter((m) => m.status === 'unread').length;
        const replied = messages.filter((m) => m.status === 'replied').length;

        let totalResponseTimeMs = 0;
        let responseCount = 0;

        for (const message of messages) {
          const replies = toRepliesArray(message.replies);
          const firstAdminReply = replies.find((r) => r.senderRole === 'admin');

          if (firstAdminReply && message.createdAt) {
            const responseTime =
              getTimestamp(firstAdminReply.createdAt) -
              getTimestamp(message.createdAt);

            if (responseTime >= 0) {
              totalResponseTimeMs += responseTime;
              responseCount++;
            }
          }
        }

        const average =
          responseCount > 0 ? totalResponseTimeMs / responseCount : 0;

        return {
          total,
          unread,
          replied,
          avgResponseTime: formatResponseTime(average),
        };
      }),

      startWith(INITIAL_STATS)
    );
  }

  /* ═══════════════════════════════════════════════════════
     ACTIONS UI
     ═══════════════════════════════════════════════════════ */

  updateSearch(value: string): void {
    this.searchTerm = value;
    this.filter$.next({ ...this.filter$.value, search: value });
  }

  setFilter(status: FilterStatus): void {
    this.activeFilter = status;
    this.filter$.next({ ...this.filter$.value, status });
  }

  setSort(sort: SortMode): void {
    this.sortMode = sort;
    this.filter$.next({ ...this.filter$.value, sort });
  }

  selectMessage(message: UserMessage): void {
    this.selectedMessage = message;
    this.replyText = '';
    this.scrollNeeded = true;
  }

  closeThread(): void {
    this.selectedMessage = null;
    this.replyText = '';
  }

  onReplyEnter(event: Event): void {
    const keyboardEvent = event as KeyboardEvent;
    if (keyboardEvent.shiftKey) return;

    keyboardEvent.preventDefault();
    if (!this.isSending && this.replyText.trim()) {
      void this.sendReply();
    }
  }

  /* ═══════════════════════════════════════════════════════
     ENVOI
     ═══════════════════════════════════════════════════════ */

  async sendReply(): Promise<void> {
    const message = this.selectedMessage;
    const user = this.currentUser;
    const content = this.replyText.trim();

    if (!message?.key || !content || !user) return;

    this.isSending = true;

    try {
      const now = new Date().toISOString();

      const replyData: MessageReply = {
        senderId: user.uid,
        senderRole: 'user',
        senderName: user.displayName ?? 'Vous',
        message: content,
        createdAt: now,
      };

      await runInInjectionContext(this.environmentInjector, async () => {
        await push(
          ref(this.database, `messages/${message.key}/replies`),
          replyData
        );

        await update(ref(this.database, `messages/${message.key}`), {
          status: 'unread',
          updatedAt: now,
        });
      });

      if (message.key) {
        this.repliesCache.delete(message.key);
      }

      this.replyText = '';
      this.scrollNeeded = true;
    } catch (error) {
      console.error('Erreur lors de l’envoi de la réponse :', error);
      window.alert('Impossible d’envoyer le message. Veuillez réessayer.');
    } finally {
      this.isSending = false;
    }
  }

  /* ═══════════════════════════════════════════════════════
     HELPERS TEMPLATE
     ═══════════════════════════════════════════════════════ */

  repliesOf(message: UserMessage): MessageReply[] {
    return this.getRepliesArray(message.replies, message.key);
  }

  repliesCount(
    replies: Record<string, MessageReply> | MessageReply[] | undefined
  ): number {
    return toRepliesArray(replies).length;
  }

  get userInitials(): string {
    return getInitials(this.currentUser?.displayName ?? 'Vous');
  }

  statusBadgeClass(status: string | undefined): string {
    return (
      STATUS_BADGE_CLASS[status as MessageStatus] ?? DEFAULT_STATUS_BADGE
    );
  }

  statusLabel(status: string | undefined): string {
    return STATUS_LABEL[status as MessageStatus] ?? DEFAULT_STATUS_LABEL;
  }

  statusIcon(status: string | undefined): string {
    return STATUS_ICON[status as MessageStatus] ?? DEFAULT_STATUS_ICON;
  }

  categoryIcon(category: string | undefined): string {
    return CATEGORY_ICON[category as MessageCategory] ?? DEFAULT_CATEGORY_ICON;
  }

  /* ═══════════════════════════════════════════════════════
     HELPERS INTERNES
     ═══════════════════════════════════════════════════════ */

  private getRepliesArray(
    replies: Record<string, MessageReply> | MessageReply[] | undefined,
    cacheKey?: string
  ): MessageReply[] {
    if (!replies) return [];

    if (cacheKey && !Array.isArray(replies)) {
      const cached = this.repliesCache.get(cacheKey);
      if (cached) return cached;
    }

    const result = toRepliesArray(replies);

    if (cacheKey && !Array.isArray(replies)) {
      this.repliesCache.set(cacheKey, result);
    }

    return result;
  }

  private syncSelectedMessage(messages: UserMessage[]): void {
    const selected = this.selectedMessage;
    if (!selected?.key) return;

    const updated = messages.find((m) => m.key === selected.key);
    if (!updated) return;

    const previousRepliesCount = toRepliesArray(selected.replies).length;
    const updatedRepliesCount = toRepliesArray(updated.replies).length;

    if (updatedRepliesCount !== previousRepliesCount && updated.key) {
      this.repliesCache.delete(updated.key);
    }

    this.selectedMessage = updated;

    if (updatedRepliesCount > previousRepliesCount) {
      this.scrollNeeded = true;
    }
  }

  private scrollToBottom(): void {
    const element = this.threadBody?.nativeElement;
    if (!element) return;
    element.scrollTop = element.scrollHeight;
  }
}