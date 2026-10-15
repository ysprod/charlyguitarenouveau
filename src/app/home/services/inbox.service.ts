// src/app/services/inbox.service.ts

import {
  EnvironmentInjector,
  Injectable,
  inject,
  runInInjectionContext,
} from '@angular/core';

import { Auth, authState } from '@angular/fire/auth';

import {
  Database,
  equalTo,
  listVal,
  orderByChild,
  query,
  ref,
} from '@angular/fire/database';

import { Observable, combineLatest, of } from 'rxjs';
import { map, shareReplay, switchMap } from 'rxjs/operators';

import type { UserMessage } from 'src/app/home/models/user-message.model';
import type { InboxMessage } from 'src/app/home/models/homeconnect.model';

import { toInboxMessages } from 'src/app/home/utils/homeconnect.adapters';
import { sortByRecent } from 'src/app/home/utils/homeconnect.utils';

/* ═════════════════════════════════════════════════════════════════════
   SERVICE
   ═════════════════════════════════════════════════════════════════════ */

@Injectable({ providedIn: 'root' })
export class InboxService {

  /* ─── Injection ─── */
  private readonly auth = inject(Auth);
  private readonly db = inject(Database);

  /**
   * ⚠️ IMPORTANT : on injecte EnvironmentInjector pour pouvoir
   * exécuter les appels Firebase DANS un contexte d'injection
   * Angular, même à l'intérieur d'un switchMap (qui s'exécute
   * bien après l'initialisation du service).
   */
  private readonly environmentInjector = inject(EnvironmentInjector);

  /* ═══════════════════════════════════════════════════════════════════
     FLUX PRINCIPAL — Messages envoyés OU reçus
     ═══════════════════════════════════════════════════════════════════ */

  readonly messages$: Observable<InboxMessage[]> = authState(this.auth).pipe(
    switchMap((user) => {
      if (!user) return of<InboxMessage[]>([]);

      return runInInjectionContext(this.environmentInjector, () => {

        /* ─── 1. Messages ENVOYÉS (userId = user.uid) ─── */
        const sentQuery = query(
          ref(this.db, 'messages'),
          orderByChild('userId'),
          equalTo(user.uid)
        );

        const sent$ = listVal<UserMessage>(sentQuery, { keyField: 'key' });

        /* ─── 2. Messages REÇUS (to = user.uid) ─── */
        const receivedQuery = query(
          ref(this.db, 'messages'),
          orderByChild('to'),
          equalTo(user.uid)
        );

        const received$ = listVal<UserMessage>(receivedQuery, { keyField: 'key' });

        /* ─── 3. Fusion + déduplication ─── */
        return combineLatest([sent$, received$]).pipe(
          map(([sent, received]) => {
            /* Déduplication par `key` (un message peut apparaître dans les 2) */
            const merged = new Map<string, UserMessage>();

            for (const msg of sent) {
              if (msg.key) merged.set(msg.key, msg);
            }
            for (const msg of received) {
              if (msg.key) merged.set(msg.key, msg);
            }

            return Array.from(merged.values());
          }),
          map((messages) => toInboxMessages(messages)),
          map((messages) => sortByRecent(messages))
        );
      });
    }),

    shareReplay({ bufferSize: 1, refCount: true })
  );

  /* ═══════════════════════════════════════════════════════════════════
     FALLBACK — Messages avec fallback en cas de flux vide
     ═══════════════════════════════════════════════════════════════════ */

  messagesWithFallback$(
    fallback: readonly InboxMessage[]
  ): Observable<InboxMessage[]> {
    return this.messages$.pipe(
      map((messages) => (messages.length > 0 ? messages : [...fallback]))
    );
  }
}