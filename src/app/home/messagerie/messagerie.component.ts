import { Component, OnDestroy, OnInit, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { AngularFireDatabase } from '@angular/fire/compat/database';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { Observable, Subject, of, BehaviorSubject, combineLatest } from 'rxjs';
import { map, switchMap, takeUntil, tap, shareReplay, startWith } from 'rxjs/operators';
import { MessageReply, UserMessage } from '../../models/user-message.model';

type FilterStatus = 'all' | 'unread' | 'read' | 'replied';
type SortMode = 'recent' | 'oldest' | 'unread-first';

@Component({
  selector: 'app-messagerie',
  templateUrl: './messagerie.component.html',
  styleUrls: ['./messagerie.component.scss']
})
export class MessagerieComponent implements OnInit, OnDestroy, AfterViewChecked {

  // 👁️ Référence pour auto-scroll
  @ViewChild('threadBody') threadBody?: ElementRef<HTMLDivElement>;

  messages$!: Observable<UserMessage[]>;
  filteredMessages$!: Observable<UserMessage[]>;
  currentUser: any = null;

  private destroy$ = new Subject<void>();
  private scrollNeeded = false;

  // 🔍 Filtres & recherche
  searchTerm = '';
  activeFilter: FilterStatus = 'all';
  sortMode: SortMode = 'recent';
  private filter$ = new BehaviorSubject<{ search: string; status: FilterStatus; sort: SortMode }>({
    search: '', status: 'all', sort: 'recent'
  });

  // 💬 Sélection & réponse
  selectedMessage: UserMessage | null = null;
  replyText = '';
  isSending = false;

  // ✨ Statistiques
  stats$!: Observable<{ total: number; unread: number; replied: number; avgResponseTime: string }>;

  constructor(
    private db: AngularFireDatabase,
    private afAuth: AngularFireAuth
  ) {}

  ngOnInit(): void {
    // Flux principal des messages
    this.messages$ = this.afAuth.authState.pipe(
      takeUntil(this.destroy$),
      switchMap(user => {
        if (!user) return of([]);
        this.currentUser = user;

        return this.db
          .list<UserMessage>('messages', ref =>
            ref.orderByChild('userId').equalTo(user.uid)
          )
          .snapshotChanges()
          .pipe(
            map(changes =>
              changes
                .map(c => ({
                  key: c.payload.key || undefined,
                  ...(c.payload.val() as Omit<UserMessage, 'key'>)
                }))
                .sort((a, b) => {
                  const da = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                  const db_ = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                  return db_ - da;
                })
            ),
            tap(list => {
              // Sync thread sélectionné
              if (this.selectedMessage) {
                const updated = list.find(m => m.key === this.selectedMessage?.key);
                if (updated) {
                  const hasNewReply =
                    this.getRepliesArray(updated.replies).length !==
                    this.getRepliesArray(this.selectedMessage.replies).length;

                  this.selectedMessage = updated;
                  if (hasNewReply) this.scrollNeeded = true;
                }
              }
            }),
            shareReplay({ bufferSize: 1, refCount: true })
          );
      })
    );

    // Flux filtré & trié
    this.filteredMessages$ = combineLatest([
      this.messages$,
      this.filter$
    ]).pipe(
      map(([messages, f]) => {
        let result = [...messages];

        // Recherche
        if (f.search.trim()) {
          const q = f.search.toLowerCase();
          result = result.filter(m =>
            (m.subject?.toLowerCase().includes(q)) ||
            (m.message?.toLowerCase().includes(q))
          );
        }

        // Filtre statut
        if (f.status !== 'all') {
          result = result.filter(m => m.status === f.status);
        }

        // Tri
        switch (f.sort) {
          case 'oldest':
            result.sort((a, b) =>
              new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
            );
            break;
          case 'unread-first':
            result.sort((a, b) => {
              const rank = (s: string) => (s === 'unread' ? 0 : s === 'replied' ? 1 : 2);
              const diff = rank(a.status) - rank(b.status);
              if (diff !== 0) return diff;
              return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            });
            break;
          default:
            result.sort((a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );
        }

        return result;
      })
    );

    // Statistiques
    this.stats$ = this.messages$.pipe(
      map(messages => {
        const total = messages.length;
        const unread = messages.filter(m => m.status === 'unread').length;
        const replied = messages.filter(m => m.status === 'replied').length;

        // Temps de réponse moyen
        let totalMs = 0, count = 0;
        messages.forEach(m => {
          const replies = this.getRepliesArray(m.replies).filter(r => r.senderRole === 'admin');
          if (replies.length && m.createdAt) {
            const first = new Date(replies[0].createdAt).getTime();
            const start = new Date(m.createdAt).getTime();
            totalMs += first - start;
            count++;
          }
        });

        const avgMs = count ? totalMs / count : 0;
        const hours = Math.floor(avgMs / 3600000);
        const days = Math.floor(hours / 24);
        const avgResponseTime =
          count === 0 ? '—' :
          days > 0 ? `${days} j` :
          hours > 0 ? `${hours} h` :
          `${Math.floor(avgMs / 60000)} min`;

        return { total, unread, replied, avgResponseTime };
      }),
      startWith({ total: 0, unread: 0, replied: 0, avgResponseTime: '—' })
    );
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
  }

  // 🔍 Filtres
  updateSearch(value: string): void {
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

  // 💬 Actions
  selectMessage(msg: UserMessage): void {
    this.selectedMessage = msg;
    this.replyText = '';
    this.scrollNeeded = true;
  }

  closeThread(): void {
    this.selectedMessage = null;
    this.replyText = '';
  }

  getRepliesArray(replies: any): MessageReply[] {
    if (!replies) return [];
    if (Array.isArray(replies)) return replies;
    return Object.keys(replies)
      .map(key => ({ key, ...replies[key] }))
      .sort((a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
  }

  async sendReply(): Promise<void> {
    if (!this.selectedMessage?.key || !this.replyText.trim() || !this.currentUser) return;

    this.isSending = true;
    try {
      const replyData: MessageReply = {
        senderId: this.currentUser.uid,
        senderRole: 'user',
        senderName: this.currentUser.displayName || 'Vous',
        message: this.replyText.trim(),
        createdAt: new Date().toISOString()
      };

      await this.db
        .list(`messages/${this.selectedMessage.key}/replies`)
        .push(replyData);

      await this.db
        .object(`messages/${this.selectedMessage.key}`)
        .update({ status: 'unread', updatedAt: new Date().toISOString() });

      this.replyText = '';
      this.scrollNeeded = true;
    } catch (error) {
      console.error('Erreur envoi réponse :', error);
      alert('Impossible d\'envoyer le message. Veuillez réessayer.');
    } finally {
      this.isSending = false;
    }
  }

  // 🎨 Helpers UI
  getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'replied': return 'badge-replied';
      case 'read': return 'badge-read';
      case 'archived': return 'badge-archived';
      default: return 'badge-unread';
    }
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'replied': return 'Répondu';
      case 'read': return 'Lu par l\'équipe';
      case 'archived': return 'Archivé';
      default: return 'En attente';
    }
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case 'replied': return '✓✓';
      case 'read': return '✓';
      case 'archived': return '📦';
      default: return '●';
    }
  }

  getCategoryIcon(cat?: string): string {
    switch (cat) {
      case 'technique': return '🛠️';
      case 'abonnement': return '💳';
      case 'contenu': return '🎬';
      default: return '💬';
    }
  }

  getInitials(name?: string): string {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  }

  trackByKey(index: number, item: any): string {
    return item.key || index.toString();
  }

  private scrollToBottom(): void {
    try {
      const el = this.threadBody?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    } catch {}
  }
}