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
import { ImmersiveCarouselComponent } from 'src/app/shared/immersive-carousel/immersive-carousel.component';

/* ═════════════════════════════════════════════════════════════════════
   CONSTANTES — Pagination
   ═════════════════════════════════════════════════════════════════════ */

const PAGE_SIZE = 2;
const MAX_VISIBLE_PAGES = 5;   // nombre max de numéros visibles
const EDGE_PAGES = 1;          // nb de pages gardées aux extrémités

/**
 * Représente un élément de pagination :
 * - un numéro de page
 * - ou une ellipse ('ellipsis-left' / 'ellipsis-right')
 */
export type PageItem = number | 'ellipsis-left' | 'ellipsis-right';

@Component({
  selector: 'app-messagerie',
  imports: [
    DatePipe,
    FormsModule,
    MatSnackBarModule,
    RouterLink,ImmersiveCarouselComponent
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
  readonly pageSize = PAGE_SIZE;

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
  readonly currentPage = signal(1);

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

  /* ═══════════════════════════════════════════════════════════════════
     PAGINATION
     ═══════════════════════════════════════════════════════════════════ */

  /** Nombre total de pages. */
  readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.filteredThreads().length / this.pageSize)),
  );

  /** Threads de la page courante. */
  readonly paginatedThreads = computed(() => {
    const filtered = this.filteredThreads();
    const page = Math.min(this.currentPage(), this.totalPages());
    const start = (page - 1) * this.pageSize;
    return filtered.slice(start, start + this.pageSize);
  });

  /**
   * Pages à afficher dans la pagination, avec ellipsis.
   *
   * Exemples (total = 20, maxVisible = 5) :
   *  current = 1  → [1, 2, 3, 4, 5, 'ellipsis-right', 20]
   *  current = 5  → [1, 'ellipsis-left', 4, 5, 6, 'ellipsis-right', 20]
   *  current = 10 → [1, 'ellipsis-left', 9, 10, 11, 'ellipsis-right', 20]
   *  current = 19 → [1, 'ellipsis-left', 16, 17, 18, 19, 20]
   */
  readonly visiblePages = computed<PageItem[]>(() => {
    const total = this.totalPages();
    const current = this.currentPage();

    // Cas simple : tout tient
    if (total <= MAX_VISIBLE_PAGES) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }

    const firstPage = 1;
    const lastPage = total;

    // Fenêtre glissante autour de la page courante
    const halfWindow = Math.floor(MAX_VISIBLE_PAGES / 2);
    let windowStart = Math.max(
      firstPage + EDGE_PAGES + 1,
      current - halfWindow,
    );
    let windowEnd = Math.min(
      lastPage - EDGE_PAGES - 1,
      current + halfWindow,
    );

    // Recaler la fenêtre si on est proche des bords
    if (current <= firstPage + EDGE_PAGES + halfWindow) {
      windowStart = firstPage + EDGE_PAGES + 1;
      windowEnd = windowStart + MAX_VISIBLE_PAGES - 1 - EDGE_PAGES * 2;
    } else if (current >= lastPage - EDGE_PAGES - halfWindow) {
      windowEnd = lastPage - EDGE_PAGES - 1;
      windowStart = windowEnd - (MAX_VISIBLE_PAGES - 1 - EDGE_PAGES * 2);
    }

    const items: PageItem[] = [];

    // 1. Page(s) de début
    for (let p = firstPage; p <= firstPage + EDGE_PAGES - 1; p++) {
      items.push(p);
    }

    // 2. Ellipse gauche ?
    if (windowStart > firstPage + EDGE_PAGES + 1) {
      items.push('ellipsis-left');
    } else if (windowStart === firstPage + EDGE_PAGES + 1) {
      items.push(windowStart);
      windowStart++;
    }

    // 3. Fenêtre courante
    for (let p = windowStart; p <= windowEnd; p++) {
      items.push(p);
    }

    // 4. Ellipse droite ?
    if (windowEnd < lastPage - EDGE_PAGES - 1) {
      items.push('ellipsis-right');
    } else if (windowEnd === lastPage - EDGE_PAGES - 1) {
      items.push(lastPage - EDGE_PAGES);
    }

    // 5. Page(s) de fin
    for (let p = lastPage - EDGE_PAGES + 1; p <= lastPage; p++) {
      if (!items.includes(p)) items.push(p);
    }

    return items;
  });

  /** Indique si on a une page précédente. */
  readonly hasPrevPage = computed(() => this.currentPage() > 1);

  /** Indique si on a une page suivante. */
  readonly hasNextPage = computed(() => this.currentPage() < this.totalPages());

  /* ─── Infos d'affichage ─── */
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

    /* Effect : reset page quand le filtre change */
    effect(() => {
      this.searchTerm();
      untracked(() => {
        if (this.currentPage() !== 1) {
          this.currentPage.set(1);
        }
      });
    });
  }

  /* ═══════════════════════════════════════════════════════════════════
     ACTIONS
     ═══════════════════════════════════════════════════════════════════ */

  updateSearch(value: string): void {
    this.searchTerm.set(value);
    this.currentPage.set(1);
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
     PAGINATION — ACTIONS
     ═══════════════════════════════════════════════════════════════════ */

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages()) return;
    this.currentPage.set(page);
    this.scrollToTop();
  }

  nextPage(): void {
    if (this.hasNextPage()) {
      this.goToPage(this.currentPage() + 1);
    }
  }

  prevPage(): void {
    if (this.hasPrevPage()) {
      this.goToPage(this.currentPage() - 1);
    }
  }

  /** Indique si un item de pagination est une ellipse. */
  isEllipsis(page: PageItem): page is 'ellipsis-left' | 'ellipsis-right' {
    return page === 'ellipsis-left' || page === 'ellipsis-right';
  }

  /**
   * Handler de clic sur une ellipse :
   * saute de (MAX_VISIBLE_PAGES - 1) pages.
   */
  onEllipsisClick(direction: 'ellipsis-left' | 'ellipsis-right'): void {
    const step = MAX_VISIBLE_PAGES - 1;
    const target =
      direction === 'ellipsis-left'
        ? Math.max(1, this.currentPage() - step)
        : Math.min(this.totalPages(), this.currentPage() + step);
    this.goToPage(target);
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

  private scrollToTop(): void {
    if (typeof window === 'undefined') return;
    window.scrollTo({
      top: 0,
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'auto'
        : 'smooth',
    });
  }
}