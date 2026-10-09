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
  runInInjectionContext
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
  update
} from '@angular/fire/database';

import {
  BehaviorSubject,
  Observable,
  Subject,
  combineLatest,
  of
} from 'rxjs';

import {
  map,
  shareReplay,
  startWith,
  switchMap,
  takeUntil,
  tap
} from 'rxjs/operators';

import {
  MessageCategory,
  MessageReply,
  MessageStatus,
  UserMessage
} from '../../models/user-message.model';

/* ============================================================
   TYPES LOCAUX
   ============================================================ */

type FilterStatus = 'all' | 'unread' | 'read' | 'replied';
type SortMode = 'recent' | 'oldest' | 'unread-first';

interface MessageFilters {
  search: string;
  status: FilterStatus;
  sort: SortMode;
}

interface MessageStats {
  total: number;
  unread: number;
  replied: number;
  avgResponseTime: string;
}

/* ============================================================
   MAPS STATIQUES — évitent les switchs dans le template
   ============================================================ */

const STATUS_BADGE_CLASS: Record<MessageStatus, string> = {
  unread:   'badge-unread',
  read:     'badge-read',
  replied:  'badge-replied',
  archived: 'badge-archived'
};

const STATUS_LABEL: Record<MessageStatus, string> = {
  unread:   'En attente',
  read:     'Lu par l’équipe',
  replied:  'Répondu',
  archived: 'Archivé'
};

const STATUS_ICON: Record<MessageStatus, string> = {
  unread:   '●',
  read:     '✓',
  replied:  '✓✓',
  archived: '📦'
};

const CATEGORY_ICON: Record<MessageCategory, string> = {
  technique:  '🛠️',
  abonnement: '💳',
  contenu:    '🎬',
  autre:      '💬'
};

const DEFAULT_CATEGORY_ICON = '💬';
const DEFAULT_STATUS_BADGE  = 'badge-unread';
const DEFAULT_STATUS_LABEL  = 'En attente';
const DEFAULT_STATUS_ICON   = '●';

/* ============================================================
   COMPOSANT
   ============================================================ */

@Component({
  selector: 'app-messagerie',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './messagerie.component.html',
  styleUrls: ['./messagerie.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MessagerieComponent
  implements OnInit, OnDestroy, AfterViewChecked {

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

  /* ─── Injection ─── */
  private readonly auth = inject(Auth);
  private readonly database = inject(Database);
  private readonly environmentInjector = inject(EnvironmentInjector);

  /* ─── Internes ─── */
  private readonly destroy$ = new Subject<void>();
  private readonly filter$ = new BehaviorSubject<MessageFilters>({
    search: '',
    status: 'all',
    sort: 'recent'
  });

  private scrollNeeded = false;

  /**
   * Cache des réponses triées par clé de message.
   * Évite de recalculer getRepliesArray() à chaque cycle CD
   * (appelé plusieurs fois par template pour le même message).
   */
  private readonly repliesCache = new Map<string, MessageReply[]>();

  /* ─── Cycle de vie ─── */

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

  /* ─── Initialisation des flux ─── */

  private initializeMessages(): void {
    this.messages$ = runInInjectionContext(
      this.environmentInjector,
      () =>
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
              map((messages) => this.sortByRecent(messages)),
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
      this.filter$
    ]).pipe(
      map(([messages, filters]) => {
        let result = messages;

        const search = filters.search.trim().toLowerCase();
        if (search) {
          result = result.filter((message) => {
            const subject = message.subject?.toLowerCase() ?? '';
            const content = message.message.toLowerCase();
            return subject.includes(search) || content.includes(search);
          });
        }

        if (filters.status !== 'all') {
          result = result.filter((message) => message.status === filters.status);
        }

        return this.sortMessages(result, filters.sort);
      })
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
          const replies = this.getRepliesArray(message.replies);
          const firstAdminReply = replies.find((r) => r.senderRole === 'admin');

          if (firstAdminReply && message.createdAt) {
            const responseTime =
              this.getTimestamp(firstAdminReply.createdAt) -
              this.getTimestamp(message.createdAt);

            if (responseTime >= 0) {
              totalResponseTimeMs += responseTime;
              responseCount++;
            }
          }
        }

        const average = responseCount > 0
          ? totalResponseTimeMs / responseCount
          : 0;

        return {
          total,
          unread,
          replied,
          avgResponseTime: this.formatResponseTime(average)
        };
      }),

      startWith({
        total: 0,
        unread: 0,
        replied: 0,
        avgResponseTime: '—'
      })
    );
  }

  /* ─── Actions UI ─── */

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

  /**
   * Gestion de la touche Entrée dans le textarea :
   * - Entrée         → envoie
   * - Maj + Entrée   → saut de ligne
   */
  onReplyEnter(event: Event): void {
    const keyboardEvent = event as KeyboardEvent;
    if (keyboardEvent.shiftKey) {
      return; // laisse le saut de ligne
    }
    keyboardEvent.preventDefault();
    if (!this.isSending && this.replyText.trim()) {
      void this.sendReply();
    }
  }

  /* ─── Envoi ─── */

  async sendReply(): Promise<void> {
    const message = this.selectedMessage;
    const user = this.currentUser;
    const content = this.replyText.trim();

    if (!message?.key || !content || !user) {
      return;
    }

    this.isSending = true;

    try {
      const now = new Date().toISOString();

      const replyData: MessageReply = {
        senderId: user.uid,
        senderRole: 'user',
        senderName: user.displayName ?? 'Vous',
        message: content,
        createdAt: now
      };

      await runInInjectionContext(this.environmentInjector, async () => {
        await push(
          ref(this.database, `messages/${message.key}/replies`),
          replyData
        );

        await update(
          ref(this.database, `messages/${message.key}`),
          { status: 'unread', updatedAt: now }
        );
      });

      // Invalide le cache pour ce message
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

  /* ─── Helpers template ─── */

  /**
   * Récupère les réponses d'un message depuis le cache.
   * Utilisé plusieurs fois par template → mémoïsation cruciale.
   */
  repliesOf(message: UserMessage): MessageReply[] {
    return this.getRepliesArray(message.replies, message.key);
  }

  /** Nombre de réponses (pour la carte liste). */
  repliesCount(
    replies: Record<string, MessageReply> | MessageReply[] | undefined
  ): number {
    return this.getRepliesArray(replies).length;
  }

  /** Initiales de l'utilisateur connecté (mémoïsé via getter). */
  get userInitials(): string {
    return this.getInitials(this.currentUser?.displayName ?? 'Vous');
  }

  /* ─── Maps statiques (accessibles au template) ─── */

  statusBadgeClass(status: string | undefined): string {
    return STATUS_BADGE_CLASS[status as MessageStatus] ?? DEFAULT_STATUS_BADGE;
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

  /* ─── Helpers internes ─── */

  private getRepliesArray(
    replies: Record<string, MessageReply> | MessageReply[] | undefined,
    cacheKey?: string
  ): MessageReply[] {
    if (!replies) {
      return [];
    }

    // Si on a une clé de cache et un objet (non tableau), on mémoïse
    if (cacheKey && !Array.isArray(replies)) {
      const cached = this.repliesCache.get(cacheKey);
      if (cached) {
        return cached;
      }
    }

    let result: MessageReply[];

    if (Array.isArray(replies)) {
      result = [...replies].sort(
        (a, b) => this.getTimestamp(a.createdAt) - this.getTimestamp(b.createdAt)
      );
    } else {
      result = Object.entries(replies)
        .map(([key, reply]) => ({ ...reply, key }))
        .sort(
          (a, b) => this.getTimestamp(a.createdAt) - this.getTimestamp(b.createdAt)
        );
    }

    if (cacheKey && !Array.isArray(replies)) {
      this.repliesCache.set(cacheKey, result);
    }

    return result;
  }

  private getInitials(name?: string | null): string {
    if (!name?.trim()) {
      return '?';
    }

    return name
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((part) => part.charAt(0))
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }

  private sortByRecent(messages: UserMessage[]): UserMessage[] {
    return [...messages].sort(
      (a, b) => this.getTimestamp(b.createdAt) - this.getTimestamp(a.createdAt)
    );
  }

  private sortMessages(messages: UserMessage[], mode: SortMode): UserMessage[] {
    switch (mode) {
      case 'oldest':
        return [...messages].sort(
          (a, b) => this.getTimestamp(a.createdAt) - this.getTimestamp(b.createdAt)
        );

      case 'unread-first':
        return [...messages].sort((a, b) => {
          const rankA = this.getStatusRank(a.status);
          const rankB = this.getStatusRank(b.status);
          if (rankA !== rankB) return rankA - rankB;
          return this.getTimestamp(b.createdAt) - this.getTimestamp(a.createdAt);
        });

      case 'recent':
      default:
        return [...messages].sort(
          (a, b) => this.getTimestamp(b.createdAt) - this.getTimestamp(a.createdAt)
        );
    }
  }

  private getStatusRank(status: UserMessage['status']): number {
    switch (status) {
      case 'unread':   return 0;
      case 'replied':  return 1;
      case 'read':     return 2;
      case 'archived': return 3;
      default:         return 4;
    }
  }

  private syncSelectedMessage(messages: UserMessage[]): void {
    const selected = this.selectedMessage;
    if (!selected?.key) {
      return;
    }

    const updated = messages.find((m) => m.key === selected.key);
    if (!updated) {
      return;
    }

    const previousRepliesCount = this.getRepliesArray(selected.replies).length;
    const updatedRepliesCount = this.getRepliesArray(updated.replies).length;

    // Invalide le cache si le nombre de réponses a changé
    if (updatedRepliesCount !== previousRepliesCount && updated.key) {
      this.repliesCache.delete(updated.key);
    }

    this.selectedMessage = updated;

    if (updatedRepliesCount > previousRepliesCount) {
      this.scrollNeeded = true;
    }
  }

  private getTimestamp(value: string): number {
    const ts = new Date(value).getTime();
    return Number.isNaN(ts) ? 0 : ts;
  }

  private formatResponseTime(milliseconds: number): string {
    if (milliseconds <= 0) {
      return '—';
    }

    const minutes = Math.floor(milliseconds / 60_000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days} j`;
    if (hours > 0) return `${hours} h`;
    return `${minutes} min`;
  }

  private scrollToBottom(): void {
    const element = this.threadBody?.nativeElement;
    if (!element) return;
    element.scrollTop = element.scrollHeight;
  }
}