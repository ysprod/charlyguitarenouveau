
import {
  AfterViewChecked,
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

import {
  Auth,
  User,
  authState
} from '@angular/fire/auth';

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
  MessageReply,
  UserMessage
} from '../../models/user-message.model';

type FilterStatus =
  | 'all'
  | 'unread'
  | 'read'
  | 'replied';

type SortMode =
  | 'recent'
  | 'oldest'
  | 'unread-first';

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

@Component({
  selector: 'app-messagerie',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './messagerie.component.html',
  styleUrls: ['./messagerie.component.scss']
})
export class MessagerieComponent
  implements OnInit, OnDestroy, AfterViewChecked {

  @ViewChild('threadBody')
  threadBody?: ElementRef<HTMLDivElement>;

  messages$!: Observable<UserMessage[]>;

  filteredMessages$!: Observable<UserMessage[]>;

  currentUser: User | null = null;

  selectedMessage: UserMessage | null = null;

  replyText = '';

  isSending = false;

  searchTerm = '';

  activeFilter: FilterStatus = 'all';

  sortMode: SortMode = 'recent';

  stats$!: Observable<MessageStats>;

  private readonly auth = inject(Auth);

  private readonly database = inject(Database);

  private readonly environmentInjector =
    inject(EnvironmentInjector);

  private readonly destroy$ =
    new Subject<void>();

  private readonly filter$ =
    new BehaviorSubject<MessageFilters>({
      search: '',
      status: 'all',
      sort: 'recent'
    });

  private scrollNeeded = false;

  ngOnInit(): void {
    this.initializeMessages();
    this.initializeFilteredMessages();
    this.initializeStats();
  }

  /**
   * Flux principal des messages
   * appartenant à l'utilisateur connecté.
   */
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

              return of([]);
            }

            const messagesRef =
              ref(
                this.database,
                'messages'
              );

            const messagesQuery =
              query(
                messagesRef,
                orderByChild('userId'),
                equalTo(user.uid)
              );

            return listVal<UserMessage>(
              messagesQuery,
              {
                keyField: 'key'
              }
            ).pipe(

              map((messages) =>
                this.sortByRecent(messages)
              ),

              tap((messages) => {
                this.syncSelectedMessage(
                  messages
                );
              })
            );
          }),

          shareReplay({
            bufferSize: 1,
            refCount: true
          })
        )
    );
  }

  /**
   * Flux filtré et trié.
   */
  private initializeFilteredMessages(): void {

    this.filteredMessages$ =
      combineLatest([
        this.messages$,
        this.filter$
      ]).pipe(

        map(([messages, filters]) => {

          let result = [...messages];

          const search =
            filters.search
              .trim()
              .toLowerCase();

          if (search) {

            result = result.filter(
              (message) => {

                const subject =
                  message.subject
                    ?.toLowerCase() ?? '';

                const content =
                  message.message
                    .toLowerCase();

                return (
                  subject.includes(search) ||
                  content.includes(search)
                );
              }
            );
          }

          if (
            filters.status !== 'all'
          ) {

            result = result.filter(
              (message) =>
                message.status ===
                filters.status
            );
          }

          return this.sortMessages(
            result,
            filters.sort
          );
        })
      );
  }

  /**
   * Statistiques.
   */
  private initializeStats(): void {

    this.stats$ =
      this.messages$.pipe(

        map((messages): MessageStats => {

          const total =
            messages.length;

          const unread =
            messages.filter(
              (message) =>
                message.status ===
                'unread'
            ).length;

          const replied =
            messages.filter(
              (message) =>
                message.status ===
                'replied'
            ).length;

          let totalResponseTimeMs = 0;

          let responseCount = 0;

          messages.forEach(
            (message) => {

              const replies =
                this.getRepliesArray(
                  message.replies
                );

              const firstAdminReply =
                replies.find(
                  (reply) =>
                    reply.senderRole ===
                    'admin'
                );

              if (
                firstAdminReply &&
                message.createdAt
              ) {

                const messageTime =
                  this.getTimestamp(
                    message.createdAt
                  );

                const replyTime =
                  this.getTimestamp(
                    firstAdminReply.createdAt
                  );

                const responseTime =
                  replyTime -
                  messageTime;

                if (responseTime >= 0) {

                  totalResponseTimeMs +=
                    responseTime;

                  responseCount++;
                }
              }
            }
          );

          const average =
            responseCount > 0
              ? totalResponseTimeMs /
              responseCount
              : 0;

          return {
            total,
            unread,
            replied,
            avgResponseTime:
              this.formatResponseTime(
                average
              )
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

  ngAfterViewChecked(): void {

    if (
      this.scrollNeeded &&
      this.threadBody
    ) {

      this.scrollToBottom();

      this.scrollNeeded = false;
    }
  }

  ngOnDestroy(): void {

    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Recherche.
   */
  updateSearch(
    value: string
  ): void {

    this.searchTerm = value;

    this.filter$.next({
      ...this.filter$.value,
      search: value
    });
  }

  /**
   * Filtre par statut.
   */
  setFilter(
    status: FilterStatus
  ): void {

    this.activeFilter = status;

    this.filter$.next({
      ...this.filter$.value,
      status
    });
  }

  /**
   * Tri.
   */
  setSort(
    sort: SortMode
  ): void {

    this.sortMode = sort;

    this.filter$.next({
      ...this.filter$.value,
      sort
    });
  }

  /**
   * Sélection d'un message.
   */
  selectMessage(
    message: UserMessage
  ): void {

    this.selectedMessage =
      message;

    this.replyText = '';

    this.scrollNeeded = true;
  }

  /**
   * Fermeture du thread.
   */
  closeThread(): void {

    this.selectedMessage = null;

    this.replyText = '';
  }

  /**
   * Convertit les réponses Firebase
   * en tableau typé.
   */
  getRepliesArray(
    replies:
      | Record<string, MessageReply>
      | MessageReply[]
      | undefined
  ): MessageReply[] {

    if (!replies) {
      return [];
    }

    if (Array.isArray(replies)) {

      return [...replies].sort(
        (a, b) =>
          this.getTimestamp(
            a.createdAt
          ) -
          this.getTimestamp(
            b.createdAt
          )
      );
    }

    return Object.entries(replies)
      .map(
        ([key, reply]) => ({
          ...reply,
          key
        })
      )
      .sort(
        (a, b) =>
          this.getTimestamp(
            a.createdAt
          ) -
          this.getTimestamp(
            b.createdAt
          )
      );
  }

  /**
   * Envoie une réponse.
   */
  async sendReply(): Promise<void> {

    const message =
      this.selectedMessage;

    const user =
      this.currentUser;

    const content =
      this.replyText.trim();

    if (
      !message?.key ||
      !content ||
      !user
    ) {
      return;
    }

    this.isSending = true;

    try {

      const now =
        new Date().toISOString();

      const replyData: MessageReply = {
        senderId: user.uid,
        senderRole: 'user',
        senderName:
          user.displayName ??
          'Vous',
        message: content,
        createdAt: now
      };

      await runInInjectionContext(
        this.environmentInjector,
        async () => {

          const repliesRef =
            ref(
              this.database,
              `messages/${message.key}/replies`
            );

          await push(
            repliesRef,
            replyData
          );

          const messageRef =
            ref(
              this.database,
              `messages/${message.key}`
            );

          await update(
            messageRef,
            {
              status: 'unread',
              updatedAt: now
            }
          );
        }
      );

      this.replyText = '';

      this.scrollNeeded = true;

    } catch (error) {

      console.error(
        'Erreur lors de l’envoi de la réponse :',
        error
      );

      window.alert(
        'Impossible d’envoyer le message. Veuillez réessayer.'
      );

    } finally {

      this.isSending = false;
    }
  }

  /**
   * Classe CSS du statut.
   */
  getStatusBadgeClass(
    status: string | undefined
  ): string {

    switch (status) {

      case 'replied':
        return 'badge-replied';

      case 'read':
        return 'badge-read';

      case 'archived':
        return 'badge-archived';

      default:
        return 'badge-unread';
    }
  }

  /**
   * Libellé du statut.
   */
  getStatusLabel(
    status: string | undefined
  ): string {

    switch (status) {

      case 'replied':
        return 'Répondu';

      case 'read':
        return 'Lu par l’équipe';

      case 'archived':
        return 'Archivé';

      default:
        return 'En attente';
    }
  }

  /**
   * Icône du statut.
   */
  getStatusIcon(
    status: string | undefined
  ): string {

    switch (status) {

      case 'replied':
        return '✓✓';

      case 'read':
        return '✓';

      case 'archived':
        return '📦';

      default:
        return '●';
    }
  }

  /**
   * Icône de catégorie.
   */
  getCategoryIcon(
    category?: string
  ): string {

    switch (category) {

      case 'technique':
        return '🛠️';

      case 'abonnement':
        return '💳';

      case 'contenu':
        return '🎬';

      default:
        return '💬';
    }
  }

  /**
   * Initiales utilisateur.
   */
  getInitials(
    name?: string | null
  ): string {

    if (!name?.trim()) {
      return '?';
    }

    return name
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map(
        (part) =>
          part.charAt(0)
      )
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }

  /**
   * TrackBy pour les listes Angular.
   */
  trackByKey(
    index: number,
    item: UserMessage
  ): string {

    return item.key ??
      index.toString();
  }

  /** * TrackBy pour les réponses. */
   trackByReplyKey(index: number, item: MessageReply): string { return item.key ?? index.toString(); }

  /**
   * Tri du plus récent au plus ancien.
   */
  private sortByRecent(
    messages: UserMessage[]
  ): UserMessage[] {

    return [...messages].sort(
      (a, b) =>
        this.getTimestamp(
          b.createdAt
        ) -
        this.getTimestamp(
          a.createdAt
        )
    );
  }

  /**
   * Tri selon le mode choisi.
   */
  private sortMessages(
    messages: UserMessage[],
    mode: SortMode
  ): UserMessage[] {

    const result =
      [...messages];

    switch (mode) {

      case 'oldest':

        return result.sort(
          (a, b) =>
            this.getTimestamp(
              a.createdAt
            ) -
            this.getTimestamp(
              b.createdAt
            )
        );

      case 'unread-first':

        return result.sort(
          (a, b) => {

            const rankA =
              this.getStatusRank(
                a.status
              );

            const rankB =
              this.getStatusRank(
                b.status
              );

            if (
              rankA !== rankB
            ) {
              return rankA - rankB;
            }

            return (
              this.getTimestamp(
                b.createdAt
              ) -
              this.getTimestamp(
                a.createdAt
              )
            );
          }
        );

      case 'recent':
      default:

        return result.sort(
          (a, b) =>
            this.getTimestamp(
              b.createdAt
            ) -
            this.getTimestamp(
              a.createdAt
            )
        );
    }
  }

  /**
   * Priorité des statuts.
   */
  private getStatusRank(
    status: UserMessage['status']
  ): number {

    switch (status) {

      case 'unread':
        return 0;

      case 'replied':
        return 1;

      case 'read':
        return 2;

      case 'archived':
        return 3;
    }
  }

  /**
   * Synchronise le message sélectionné
   * avec les données Firebase.
   */
  private syncSelectedMessage(
    messages: UserMessage[]
  ): void {

    const selected =
      this.selectedMessage;

    if (!selected?.key) {
      return;
    }

    const updated =
      messages.find(
        (message) =>
          message.key ===
          selected.key
      );

    if (!updated) {
      return;
    }

    const previousReplies =
      this.getRepliesArray(
        selected.replies
      );

    const updatedReplies =
      this.getRepliesArray(
        updated.replies
      );

    const hasNewReply =
      updatedReplies.length >
      previousReplies.length;

    this.selectedMessage =
      updated;

    if (hasNewReply) {
      this.scrollNeeded = true;
    }
  }

  /**
   * Timestamp robuste.
   */
  private getTimestamp(
    value: string
  ): number {

    const timestamp =
      new Date(value).getTime();

    return Number.isNaN(timestamp)
      ? 0
      : timestamp;
  }

  /**
   * Format du temps de réponse.
   */
  private formatResponseTime(
    milliseconds: number
  ): string {

    if (milliseconds <= 0) {
      return '—';
    }

    const minutes =
      Math.floor(
        milliseconds / 60000
      );

    const hours =
      Math.floor(minutes / 60);

    const days =
      Math.floor(hours / 24);

    if (days > 0) {
      return `${days} j`;
    }

    if (hours > 0) {
      return `${hours} h`;
    }

    return `${minutes} min`;
  }

  /**
   * Scroll vers le dernier message.
   */
  private scrollToBottom(): void {

    const element =
      this.threadBody?.nativeElement;

    if (!element) {
      return;
    }

    element.scrollTop =
      element.scrollHeight;
  }
} 