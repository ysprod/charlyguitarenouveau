// src/app/services/inbox.service.ts

import { Injectable, EnvironmentInjector, inject, runInInjectionContext } from '@angular/core';
import { Auth, authState } from '@angular/fire/auth';
import {
  Database,
  equalTo,
  listVal,
  orderByChild,
  query,
  ref,
} from '@angular/fire/database';
import { Observable, of } from 'rxjs';
import { map, shareReplay, switchMap } from 'rxjs/operators';

import type { UserMessage } from 'src/app/home/models/user-message.model';
import type { InboxMessage } from 'src/app/home/models/homeconnect.model';
import { toInboxMessages } from 'src/app/home/utils/homeconnect.adapters';
import { sortByRecent } from 'src/app/home/utils/homeconnect.utils';

@Injectable({ providedIn: 'root' })
export class InboxService {
  private readonly auth = inject(Auth);
  private readonly db = inject(Database);

  /**
   * ⚠️ IMPORTANT : on injecte EnvironmentInjector pour pouvoir
   * exécuter les appels Firebase DANS un contexte d'injection
   * Angular, même à l'intérieur d'un switchMap (qui s'exécute
   * bien après l'initialisation du service).
   */
  private readonly environmentInjector = inject(EnvironmentInjector);

  readonly messages$: Observable<InboxMessage[]> = authState(this.auth).pipe(
    switchMap((user) => {
      if (!user) {
        return of<InboxMessage[]>([]);
      }

      // ✅ On encapsule les appels Firebase dans runInInjectionContext
      return runInInjectionContext(this.environmentInjector, () => {
        const messagesQuery = query(
          ref(this.db, 'messages'),
          orderByChild('userId'),
          equalTo(user.uid)
        );

        return listVal<UserMessage>(messagesQuery, { keyField: 'key' }).pipe(
          map((messages) => toInboxMessages(messages)),
          map((messages) => sortByRecent(messages))
        );
      });
    }),

    shareReplay({ bufferSize: 1, refCount: true })
  );

  messagesWithFallback$(
    fallback: readonly InboxMessage[]
  ): Observable<InboxMessage[]> {
    return this.messages$.pipe(
      map((messages) => (messages.length > 0 ? messages : [...fallback]))
    );
  }
}