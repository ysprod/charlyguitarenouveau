// src/app/features/messagerie/messagerie.component.ts

import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  EnvironmentInjector,
  computed,
  effect,
  inject,
  runInInjectionContext,
  signal,
  untracked,
  viewChild,
} from '@angular/core';

import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  takeUntilDestroyed,
  toSignal,
} from '@angular/core/rxjs-interop';

import { ActivatedRoute } from '@angular/router';

import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

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

import { of } from 'rxjs';
import { map, shareReplay, switchMap } from 'rxjs/operators';

import {
  MessageReply,
  UserMessage,
} from '../models/user-message.model';

import {
  FILTER_TABS,
  SORT_OPTIONS,
  EMPTY_STATE_MESSAGES,
  REPLY_MAX_LENGTH,
  REPLY_WARNING_THRESHOLD,
} from 'src/app/home/constants/messagerie.constants';

import {
  MessageStats,
  FilterStatus,
  SortMode,
} from 'src/app/home/models/messagerie.model';

import {
  sortByRecent,
  applyFilters,
  toRepliesArray,
  getTimestamp,
  formatResponseTime,
} from 'src/app/home/utils/messagerie.utils';

import { getInitials } from 'src/app/home/utils/string.utils';

import {
  StatusBadgeClassPipe,
  StatusLabelPipe,
  StatusIconPipe,
  CategoryIconPipe,
} from '../pipes/status.pipe';

import { RepliesCountPipe } from '../pipes/replies-count.pipe';

/* ═════════════════════════════════════════════════════════════════════
   COMPOSANT
   ═════════════════════════════════════════════════════════════════════ */

@Component({
  selector: 'app-messagerie',
  imports: [
    DatePipe,
    FormsModule,
    MatSnackBarModule,
    StatusBadgeClassPipe,
    StatusLabelPipe,
    StatusIconPipe,
    CategoryIconPipe,
    RepliesCountPipe,
  ],
  templateUrl: './messagerie.component.html',
  styleUrls: ['./messagerie.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MessagerieComponent {

  /* ─── ViewChild (signal-based) ─── */
  readonly threadBody = viewChild<ElementRef<HTMLDivElement>>('threadBody');

  /* ─── Injection ─── */
  private readonly auth = inject(Auth);
  private readonly database = inject(Database);
  private readonly environmentInjector = inject(EnvironmentInjector);
  private readonly destroyRef = inject(DestroyRef);
  private readonly snackBar = inject(MatSnackBar);
  private readonly route = inject(ActivatedRoute);

  /* ─── Constantes exposées au template ─── */
  protected readonly filterTabs = FILTER_TABS;
  protected readonly sortOptions = SORT_OPTIONS;
  protected readonly emptyStateMessages = EMPTY_STATE_MESSAGES;
  protected readonly replyMaxLength = REPLY_MAX_LENGTH;
  protected readonly replyWarningThreshold = REPLY_WARNING_THRESHOLD;

  /* ═══════════════════════════════════════════════════════════════════
     FLUX SIGNAL — UTILISATEUR CONNECTÉ
     ═══════════════════════════════════════════════════════════════════ */

  readonly currentUser = toSignal(authState(this.auth), {
    initialValue: null as User | null,
  });

  /* ═══════════════════════════════════════════════════════════════════
     FLUX SIGNAL — MESSAGES
     ═══════════════════════════════════════════════════════════════════ */

  private readonly messagesStream$ = runInInjectionContext(
    this.environmentInjector,
    () =>
      authState(this.auth).pipe(
        takeUntilDestroyed(this.destroyRef),
        switchMap((user: User | null) => {
          if (!user) return of([] as UserMessage[]);

          const messagesQuery = query(
            ref(this.database, 'messages'),
            orderByChild('userId'),
            equalTo(user.uid)
          );

          return listVal<UserMessage>(messagesQuery, { keyField: 'key' }).pipe(
            map((messages) => sortByRecent(messages))
          );
        }),
        shareReplay({ bufferSize: 1, refCount: true })
      )
  );

  readonly messages = toSignal(this.messagesStream$, {
    initialValue: [] as UserMessage[],
  });

  /* ═══════════════════════════════════════════════════════════════════
     PARAMÈTRE URL — :key du message à ouvrir
     ═══════════════════════════════════════════════════════════════════ */

  private readonly routeKey = toSignal(
    this.route.paramMap.pipe(
      map((params) => params.get('key'))
    ),
    { initialValue: null as string | null }
  );

  /* ═══════════════════════════════════════════════════════════════════
     ÉTAT UI — SIGNALS
     ═══════════════════════════════════════════════════════════════════ */

  readonly selectedMessage = signal<UserMessage | null>(null);
  readonly replyText = signal('');
  readonly isSending = signal(false);

  readonly searchTerm = signal('');
  readonly activeFilter = signal<FilterStatus>('all');
  readonly sortMode = signal<SortMode>('recent');

  /* ═══════════════════════════════════════════════════════════════════
     FLUX DÉRIVÉS — COMPUTED
     ═══════════════════════════════════════════════════════════════════ */

  readonly filteredMessages = computed(() =>
    applyFilters(
      this.messages(),
      this.searchTerm(),
      this.activeFilter(),
      this.sortMode()
    )
  );

  readonly stats = computed<MessageStats>(() => {
    const messages = this.messages();
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
  });

  readonly userInitials = computed(() =>
    getInitials(this.currentUser()?.displayName ?? 'Vous')
  );

  /* ═══════════════════════════════════════════════════════════════════
     CONSTRUCTEUR — EFFECTS
     ═══════════════════════════════════════════════════════════════════ */

  constructor() {

    /* ─── Effect 1 : ouverture automatique du message depuis l'URL ─── */
    effect(() => {
      const key = this.routeKey();
      const messages = this.messages();

      if (!key) return;
      if (messages.length === 0) return;

      /* Éviter la boucle infinie si le message est déjà sélectionné */
      const current = untracked(() => this.selectedMessage());
      if (current?.key === key) return;

      const target = messages.find((m) => m.key === key);
      if (target) {
        this.selectedMessage.set(target);
        this.replyText.set('');
      }
    });

    /* ─── Effect 2 : scroll automatique en bas du thread ─── */
    effect(() => {
      const selected = this.selectedMessage();
      const repliesCount = selected
        ? toRepliesArray(selected.replies).length
        : 0;
      const messagesCount = this.messages().length;

      untracked(() => {
        if (!selected && messagesCount === 0) return;
        queueMicrotask(() => {
          const element = this.threadBody()?.nativeElement;
          if (element) {
            element.scrollTop = element.scrollHeight;
          }
        });
      });
    });
  }

  /* ═══════════════════════════════════════════════════════════════════
     ACTIONS UI
     ═══════════════════════════════════════════════════════════════════ */

  updateSearch(value: string): void {
    this.searchTerm.set(value);
  }

  setFilter(status: FilterStatus): void {
    this.activeFilter.set(status);
  }

  setSort(sort: SortMode): void {
    this.sortMode.set(sort);
  }

  selectMessage(message: UserMessage): void {
    this.selectedMessage.set(message);
    this.replyText.set('');
  }

  closeThread(): void {
    this.selectedMessage.set(null);
    this.replyText.set('');
  }

  onReplyEnter(event: Event): void {
    const keyboardEvent = event as KeyboardEvent;
    if (keyboardEvent.shiftKey) return;

    keyboardEvent.preventDefault();
    if (!this.isSending() && this.replyText().trim()) {
      void this.sendReply();
    }
  }

  /* ═══════════════════════════════════════════════════════════════════
     ENVOI
     ═══════════════════════════════════════════════════════════════════ */

  async sendReply(): Promise<void> {
    const message = this.selectedMessage();
    const user = this.currentUser();
    const content = this.replyText().trim();

    if (!message?.key || !content || !user) return;
    if (this.isSending()) return;

    this.isSending.set(true);

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

      this.replyText.set('');
    } catch (error) {
      console.error('Erreur lors de l’envoi de la réponse :', error);
      this.snackBar.open(
        'Impossible d’envoyer le message. Veuillez réessayer.',
        'Fermer',
        { duration: 4000, panelClass: ['snack-error'] }
      );
    } finally {
      this.isSending.set(false);
    }
  }

  /* ═══════════════════════════════════════════════════════════════════
     HELPERS TEMPLATE — uniquement ce qui ne peut pas être un pipe
     ═══════════════════════════════════════════════════════════════════ */

  /** Retourne le tableau des réponses triées. Nécessaire dans `@for`. */
  repliesOf(message: UserMessage): MessageReply[] {
    return toRepliesArray(message.replies);
  }
}