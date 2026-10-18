// src/app/home/services/inbox.service.ts

import {
  EnvironmentInjector,
  Injectable,
  inject,
  runInInjectionContext,
} from '@angular/core';

import { Auth, authState } from '@angular/fire/auth';

import { Database, listVal, ref } from '@angular/fire/database';

import { Observable, combineLatest, of } from 'rxjs';
import {
  catchError,
  map,
  shareReplay,
  switchMap,
} from 'rxjs/operators';

import type {
  Message,
  MessagerieMessage,
} from 'src/app/home/models/message.model';
import type { InboxMessage } from '../models/homeconnect.model';

import { toInboxMessages } from 'src/app/home/utils/homeconnect.adapters';
import { sortByRecent } from 'src/app/home/utils/homeconnect.utils';

/* ═════════════════════════════════════════════════════════════════════
   SERVICE — Inbox unifiée (inbox + sent)
   ═════════════════════════════════════════════════════════════════════ */

@Injectable({ providedIn: 'root' })
export class InboxService {

  private readonly auth = inject(Auth);
  private readonly db = inject(Database);
  private readonly environmentInjector = inject(EnvironmentInjector);

  readonly messages$: Observable<InboxMessage[]> = authState(this.auth).pipe(
    switchMap((user) => {
      if (!user?.uid) return of<InboxMessage[]>([]);

      return runInInjectionContext(this.environmentInjector, () => {
        const inbox$ = listVal<Message>(
          ref(this.db, `messages/${user.uid}/inbox`),
          { keyField: 'key' },
        ).pipe(
          map((msgs) =>
            msgs.map((m) => ({ ...m, _direction: 'in' as const })),
          ),
          catchError(() => of([] as MessagerieMessage[])),
        );

        const sent$ = listVal<Message>(
          ref(this.db, `messages/${user.uid}/sent`),
          { keyField: 'key' },
        ).pipe(
          map((msgs) =>
            msgs.map((m) => ({ ...m, _direction: 'out' as const })),
          ),
          catchError(() => of([] as MessagerieMessage[])),
        );

        return combineLatest([inbox$, sent$]).pipe(
          map(([inbox, sent]) => [...inbox, ...sent]),
          map((messages) => toInboxMessages(messages)),
          map((messages) => sortByRecent(messages)),
        );
      });
    }),

    catchError((err) => {
      console.warn('[InboxService] Erreur flux :', err);
      return of<InboxMessage[]>([]);
    }),

    shareReplay({ bufferSize: 1, refCount: true }),
  );

  messagesWithFallback$(
    fallback: readonly InboxMessage[],
  ): Observable<InboxMessage[]> {
    return this.messages$.pipe(
      map((messages) => (messages.length > 0 ? messages : [...fallback])),
    );
  }
}