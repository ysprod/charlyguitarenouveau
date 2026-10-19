// src/app/features/messagerie/messagerie.component.ts

import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  computed,
  effect,
  inject,
  signal,
  untracked,
  viewChild,
} from '@angular/core';

import { DatePipe } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { Auth, authState } from '@angular/fire/auth';

import { map } from 'rxjs/operators';

import type {
  MessagerieMessage,
  Thread,
} from 'src/app/home/models/message.model';

import {
  REPLY_MAX_LENGTH,
  REPLY_WARNING_THRESHOLD,
} from 'src/app/home/constants/messagerie.constants';

import { getInitials } from 'src/app/home/utils/string.utils';
import { MessagerieService } from '../services/messagerie.service';

@Component({
  selector: 'app-messagerie',
  imports: [
    DatePipe,
    FormsModule,
    MatSnackBarModule,
    RouterLink,
  ],
  templateUrl: './messagerie.component.html',
  styleUrls: ['./messagerie.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MessagerieComponent {

  /* ─── ViewChild ─── */
  readonly threadBody = viewChild<ElementRef<HTMLDivElement>>('threadBody');

  /* ─── Injection ─── */
  private readonly auth = inject(Auth);
  private readonly messagerie = inject(MessagerieService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  /* ─── Constantes ─── */
  readonly replyMaxLength = REPLY_MAX_LENGTH;
  readonly replyWarningThreshold = REPLY_WARNING_THRESHOLD;

  /* ─── Utilisateur ─── */
  readonly currentUser = toSignal(authState(this.auth), { initialValue: null });

  /* ─── Threads ─── */
  readonly threads = toSignal(this.messagerie.threads$, {
    initialValue: [] as Thread[],
  });

  /* ─── État UI ─── */
  readonly selectedThread = signal<Thread | null>(null);
  readonly searchTerm = signal('');
  readonly replyText = signal('');
  readonly isSending = signal(false);

  /* ─── Computed ─── */
  readonly filteredThreads = computed(() => {
    const term = this.searchTerm().toLowerCase().trim();
    if (!term) return this.threads();

    return this.threads().filter(
      (t) =>
        t.subject.toLowerCase().includes(term) ||
        t.interlocutor.toLowerCase().includes(term) ||
        t.lastMessage.body.toLowerCase().includes(term),
    );
  });

  readonly unreadTotal = computed(() =>
    this.threads().reduce((sum, t) => sum + t.unreadCount, 0),
  );

  readonly threadsCount = computed(() => this.threads().length);

  readonly userInitials = computed(() =>
    getInitials(this.currentUser()?.displayName ?? 'Vous'),
  );

  /* ─── Param URL ─── */
  private readonly routeThreadId = toSignal(
    this.route.paramMap.pipe(map((params) => params.get('key'))),
    { initialValue: null as string | null },
  );

  constructor() {
    /* Effect : ouverture auto du thread via URL */
    effect(() => {
      const threadId = this.routeThreadId();
      const threads = this.threads();
      if (!threadId || threads.length === 0) return;

      const current = untracked(() => this.selectedThread());
      if (current?.threadId === threadId) return;

      const target = threads.find((t) => t.threadId === threadId);
      if (target) {
        this.selectedThread.set(target);
        this.markThreadAsRead(target);
      }
    });

    /* Effect : resynchronise le thread sélectionné */
    effect(() => {
      const threads = this.threads();
      const selected = untracked(() => this.selectedThread());
      if (!selected) return;

      const fresh = threads.find((t) => t.threadId === selected.threadId);
      if (fresh && fresh !== selected) {
        untracked(() => this.selectedThread.set(fresh));
      }
    });

    /* Effect : scroll auto */
    effect(() => {
      const thread = this.selectedThread();
      if (!thread) return;
      untracked(() => {
        queueMicrotask(() => {
          const el = this.threadBody()?.nativeElement;
          if (el) el.scrollTop = el.scrollHeight;
        });
      });
    });
  }

  /* ═══════════════════════════════════════════════════════════════════
     ACTIONS
     ═══════════════════════════════════════════════════════════════════ */

  updateSearch(value: string): void {
    this.searchTerm.set(value);
  }

  selectThread(thread: Thread): void {
    this.selectedThread.set(thread);
    this.replyText.set('');
    this.markThreadAsRead(thread);
    void this.router.navigate(['/inbox', thread.threadId], {
      replaceUrl: true,
    });
  }

  closeThread(): void {
    this.selectedThread.set(null);
    this.replyText.set('');
    void this.router.navigate(['/inbox'], { replaceUrl: true });
  }

  onReplyEnter(event: Event): void {
    const kbEvent = event as KeyboardEvent;
    if (kbEvent.shiftKey) return;
    kbEvent.preventDefault();
    if (!this.isSending() && this.replyText().trim()) {
      void this.sendReply();
    }
  }

  /* ═══════════════════════════════════════════════════════════════════
     MARQUER COMME LU
     ═══════════════════════════════════════════════════════════════════ */

  private markThreadAsRead(thread: Thread): void {
    void this.messagerie.markThreadAsRead(thread.threadId, thread.messages);
  }

  /* ═══════════════════════════════════════════════════════════════════
     ENVOI DE RÉPONSE
     ═══════════════════════════════════════════════════════════════════ */

  async sendReply(): Promise<void> {
    const thread = this.selectedThread();
    const content = this.replyText().trim();

    if (!thread || !content) return;
    if (this.isSending()) return;

    this.isSending.set(true);

    try {
      const lastMsg = thread.messages[thread.messages.length - 1];

      await this.messagerie.replyToMessage(lastMsg, {
        subject: thread.subject,
        body: content,
        to: '',
        threadId: thread.threadId,
        replyToId: lastMsg.key ?? '',
      });

      this.replyText.set('');
      this.snackBar.open('Message envoyé ✉️', 'Fermer', { duration: 3000 });
    } catch (error) {
      console.error('[Messagerie] Erreur envoi :', error);
      this.snackBar.open(
        'Impossible d\'envoyer le message.',
        'Fermer',
        { duration: 4000, panelClass: ['snack-error'] },
      );
    } finally {
      this.isSending.set(false);
    }
  }

  /* ═══════════════════════════════════════════════════════════════════
     HELPERS TEMPLATE
     ═══════════════════════════════════════════════════════════════════ */

  isMine(msg: MessagerieMessage): boolean {
    return msg._direction === 'out';
  }

  previewOf(msg: MessagerieMessage): string {
    const body = msg.body ?? '';
    return body.length > 80 ? body.slice(0, 80) + '…' : body;
  }

  trackThread(_: number, t: Thread): string {
    return t.threadId;
  }

  trackMessage(_: number, m: MessagerieMessage): string {
    return m.key ?? `${m.createdAt}`;
  }
}