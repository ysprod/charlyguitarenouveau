// src/app/services/messagerie.service.ts

import {
  EnvironmentInjector,
  Injectable,
  inject,
  runInInjectionContext,
} from '@angular/core';

import { Auth, authState } from '@angular/fire/auth';

import {
  Database,
  listVal,
  push,
  ref,
  set,
  update,
} from '@angular/fire/database';

import { Observable, combineLatest, of } from 'rxjs';
import {
  catchError,
  map,
  shareReplay,
  switchMap,
} from 'rxjs/operators';

import type {
  Message,
  MessageData,
  MessagerieMessage,
  ReplyPayload,
  Thread,
} from 'src/app/home/models/message.model';

/* ═════════════════════════════════════════════════════════════════════
   SERVICE — Messagerie Gmail-style
   ═════════════════════════════════════════════════════════════════════ */

@Injectable({ providedIn: 'root' })
export class MessagerieService {

  private readonly auth = inject(Auth);
  private readonly db = inject(Database);
  private readonly environmentInjector = inject(EnvironmentInjector);

  /* ═══════════════════════════════════════════════════════════════════
     FLUX
     ═══════════════════════════════════════════════════════════════════ */

  readonly messages$: Observable<MessagerieMessage[]> = authState(this.auth).pipe(
    switchMap((user) => {
      if (!user?.uid) return of<MessagerieMessage[]>([]);

      return runInInjectionContext(this.environmentInjector, () => {
        const inbox$ = listVal<Message>(
          ref(this.db, `messages/${user.uid}/inbox`),
          { keyField: 'key' },
        ).pipe(
          map((msgs) => msgs.map((m) => ({ ...m, _direction: 'in' as const }))),
          catchError(() => of([] as MessagerieMessage[])),
        );

        const sent$ = listVal<Message>(
          ref(this.db, `messages/${user.uid}/sent`),
          { keyField: 'key' },
        ).pipe(
          map((msgs) => msgs.map((m) => ({ ...m, _direction: 'out' as const }))),
          catchError(() => of([] as MessagerieMessage[])),
        );

        return combineLatest([inbox$, sent$]).pipe(
          map(([inbox, sent]) => [...inbox, ...sent]),
        );
      });
    }),
    catchError((err) => {
      console.warn('[MessagerieService] Erreur flux :', err);
      return of<MessagerieMessage[]>([]);
    }),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  /**
   * ✅ `shareReplay` ajouté : `groupByThread` ne tourne qu'UNE fois
   *    tant que le flux source est stable.
   */
  readonly threads$: Observable<Thread[]> = this.messages$.pipe(
    map((messages) => this.groupByThread(messages)),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  /* ═══════════════════════════════════════════════════════════════════
     ENVOI — Nouveau message
     ═══════════════════════════════════════════════════════════════════ */

  async sendMessage(
    toUid: string,
    toName: string,
    payload: {
      subject: string;
      body: string;
      category?: Message['category'];
    },
  ): Promise<string> {
    const user = this.auth.currentUser;
    if (!user?.uid) throw new Error('Utilisateur non connecté');
    if (!toUid) throw new Error('Destinataire manquant');
    if (!payload.subject.trim()) throw new Error('Sujet obligatoire');
    if (!payload.body.trim()) throw new Error('Message obligatoire');

    return runInInjectionContext(this.environmentInjector, async () => {
      const now = Date.now();
      const inboxRef = push(ref(this.db, `messages/${toUid}/inbox`));
      const msgId = inboxRef.key;
      if (!msgId) throw new Error('Impossible de générer l\'ID');

      const threadId = msgId;

      const message: MessageData = {
        from: user.uid,
        fromEmail: user.email ?? '',
        fromName: user.displayName ?? 'Utilisateur',
        fromPhoto: user.photoURL ?? undefined,
        to: toUid,
        toName,
        subject: payload.subject.trim(),
        body: payload.body.trim(),
        createdAt: now,
        read: false,
        threadId,
        replyToId: null,
        category: payload.category,
      };

      const cleanMessage = cleanPayload(message);

      /* ✅ 1. Inbox du destinataire */
      await set(inboxRef, cleanMessage);

      /* ✅ 2. Sent de l'expéditeur — avec rollback si échec */
      try {
        await set(
          ref(this.db, `messages/${user.uid}/sent/${msgId}`),
          { ...cleanMessage, read: true },
        );
      } catch (err) {
        /* Rollback : supprime l'inbox pour éviter un message orphelin */
        try {
          await set(inboxRef, null);
        } catch {
          /* silencieux */
        }
        console.error('[MessagerieService] Échec écriture sent, rollback effectué :', err);
        throw err;
      }

      return threadId;
    });
  }

  /* ═══════════════════════════════════════════════════════════════════
     RÉPONSE
     ═══════════════════════════════════════════════════════════════════ */

  async replyToMessage(
    originalMessage: MessagerieMessage,
    payload: ReplyPayload,
  ): Promise<string> {
    const user = this.auth.currentUser;
    if (!user?.uid) throw new Error('Utilisateur non connecté');
    if (!payload.body.trim()) throw new Error('Message obligatoire');

    return runInInjectionContext(this.environmentInjector, async () => {
      const now = Date.now();

      const toUid = originalMessage._direction === 'in'
        ? originalMessage.from
        : originalMessage.to;

      const toName = originalMessage._direction === 'in'
        ? originalMessage.fromName
        : originalMessage.toName ?? 'Utilisateur';

      const inboxRef = push(ref(this.db, `messages/${toUid}/inbox`));
      const msgId = inboxRef.key;
      if (!msgId) throw new Error('Impossible de générer l\'ID');

      const message: MessageData = {
        from: user.uid,
        fromEmail: user.email ?? '',
        fromName: user.displayName ?? 'Utilisateur',
        fromPhoto: user.photoURL ?? undefined,
        to: toUid,
        toName,
        subject: payload.subject,
        body: payload.body.trim(),
        createdAt: now,
        read: false,
        threadId: payload.threadId,
        replyToId: payload.replyToId,
        category: originalMessage.category,
      };

      const cleanMessage = cleanPayload(message);

      await set(inboxRef, cleanMessage);

      try {
        await set(
          ref(this.db, `messages/${user.uid}/sent/${msgId}`),
          { ...cleanMessage, read: true },
        );
      } catch (err) {
        try {
          await set(inboxRef, null);
        } catch {
          /* silencieux */
        }
        console.error('[MessagerieService] Échec écriture sent (reply), rollback :', err);
        throw err;
      }

      return msgId;
    });
  }

  /* ═══════════════════════════════════════════════════════════════════
     MARQUER COMME LU
     ═══════════════════════════════════════════════════════════════════ */

  async markAsRead(msgId: string): Promise<void> {
    const user = this.auth.currentUser;
    if (!user?.uid || !msgId) return;

    try {
      await runInInjectionContext(this.environmentInjector, () =>
        update(ref(this.db, `messages/${user.uid}/inbox/${msgId}`), {
          read: true,
        }),
      );
    } catch (err) {
      console.warn('[MessagerieService] markAsRead a échoué :', err);
    }
  }

  /**
   * ✅ Au lieu de N requêtes `markAsRead` en parallèle, on fait
   *    UNE seule mise à jour multi-paths (beaucoup plus rapide).
   */
  async markThreadAsRead(
    threadId: string,
    messages: MessagerieMessage[],
  ): Promise<void> {
    const user = this.auth.currentUser;
    if (!user?.uid) return;

    const unreadIds = messages
      .filter((m) => m._direction === 'in' && !m.read && m.key)
      .map((m) => m.key as string);

    if (unreadIds.length === 0) return;

    /* ✅ Une seule requête Firebase pour tous les messages */
    const updates: Record<string, boolean> = {};
    for (const id of unreadIds) {
      updates[`messages/${user.uid}/inbox/${id}/read`] = true;
    }

    try {
      await runInInjectionContext(this.environmentInjector, () =>
        update(ref(this.db, '/'), updates),
      );
    } catch (err) {
      console.warn('[MessagerieService] markThreadAsRead a échoué :', err);
    }
  }

  /* ═══════════════════════════════════════════════════════════════════
     GROUPEMENT PAR THREAD
     ═══════════════════════════════════════════════════════════════════ */

  /**
   * ✅ Une seule passe au lieu de 4.
   *    Tri par date, puis calcul des compteurs en un seul parcours.
   */
  private groupByThread(messages: MessagerieMessage[]): Thread[] {
    if (messages.length === 0) return [];

    /* ─── 1. Regrouper par threadId ─── */
    const map = new Map<string, MessagerieMessage[]>();

    for (const msg of messages) {
      const threadId = msg.threadId ?? msg.key ?? 'unknown';
      const list = map.get(threadId);
      if (list) {
        list.push(msg);
      } else {
        map.set(threadId, [msg]);
      }
    }

    const threads: Thread[] = [];

    /* ─── 2. Pour chaque thread : tri + 1 passe pour les infos ─── */
    for (const [threadId, msgs] of map.entries()) {
      const sorted = [...msgs].sort(
        (a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0),
      );

      const first = sorted[0];
      const last = sorted[sorted.length - 1];

      let unreadCount = 0;
      let lastIncoming: MessagerieMessage | undefined;
      let lastOutgoing: MessagerieMessage | undefined;

      /* ✅ Une seule boucle pour tout calculer */
      for (const m of sorted) {
        if (m._direction === 'in') {
          if (!m.read) unreadCount++;
          lastIncoming = m;
        } else {
          lastOutgoing = m;
        }
      }

      const reference = lastIncoming ?? lastOutgoing ?? first;
      const interlocutor = lastIncoming
        ? lastIncoming.fromName
        : reference.toName ?? reference.to ?? 'Utilisateur';

      const avatar = interlocutor.charAt(0).toUpperCase() || '?';

      threads.push({
        threadId,
        subject: first.subject || '(Sans sujet)',
        messages: sorted,
        lastMessage: last,
        unreadCount,
        interlocutor,
        avatar,
        updatedAt: last.createdAt ?? 0,
      });
    }

    return threads.sort((a, b) => b.updatedAt - a.updatedAt);
  }
}

/* ═════════════════════════════════════════════════════════════════════
   ✅ HELPER — Nettoie un payload en retirant les valeurs `undefined`
   Firebase n'accepte PAS les undefined (contrairement à null).
   ═════════════════════════════════════════════════════════════════════ */

/**
 * ✅ Gère aussi les objets imbriqués (récursif).
 *    Ex: `{ meta: { a: 1, b: undefined } }` → `{ meta: { a: 1 } }`.
 */
function cleanPayload<T extends object>(obj: T): T {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) continue;

    if (
      value !== null &&
      typeof value === 'object' &&
      !Array.isArray(value)
    ) {
      result[key] = cleanPayload(value as object);
    } else {
      result[key] = value;
    }
  }

  return result as T;
}