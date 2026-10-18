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

  readonly threads$: Observable<Thread[]> = this.messages$.pipe(
    map((messages) => this.groupByThread(messages)),
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
      if (!msgId) throw new Error("Impossible de générer l'ID");

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

      // ✅ NETTOYAGE : retire les champs undefined
      const cleanMessage = cleanPayload(message);

      // 1. Inbox du destinataire
      await set(inboxRef, cleanMessage);

      // 2. Sent de l'expéditeur
      await set(
        ref(this.db, `messages/${user.uid}/sent/${msgId}`),
        { ...cleanMessage, read: true },
      );

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
      if (!msgId) throw new Error("Impossible de générer l'ID");

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

      // ✅ NETTOYAGE
      const cleanMessage = cleanPayload(message);

      await set(inboxRef, cleanMessage);
      await set(
        ref(this.db, `messages/${user.uid}/sent/${msgId}`),
        { ...cleanMessage, read: true },
      );

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

    await Promise.all(unreadIds.map((id) => this.markAsRead(id)));
  }

  /* ═══════════════════════════════════════════════════════════════════
     GROUPEMENT PAR THREAD
     ═══════════════════════════════════════════════════════════════════ */

  private groupByThread(messages: MessagerieMessage[]): Thread[] {
    if (messages.length === 0) return [];

    const map = new Map<string, MessagerieMessage[]>();

    for (const msg of messages) {
      const threadId = msg.threadId ?? msg.key ?? 'unknown';
      const list = map.get(threadId) ?? [];
      list.push(msg);
      map.set(threadId, list);
    }

    const threads: Thread[] = [];

    for (const [threadId, msgs] of map.entries()) {
      const sorted = [...msgs].sort(
        (a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0),
      );

      const first = sorted[0];
      const last = sorted[sorted.length - 1];

      const unreadCount = sorted.filter(
        (m) => m._direction === 'in' && !m.read,
      ).length;

      const lastIncoming = [...sorted]
        .reverse()
        .find((m) => m._direction === 'in');
      const lastOutgoing = [...sorted]
        .reverse()
        .find((m) => m._direction === 'out');

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

function cleanPayload<T extends object>(obj: T): T {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) continue;
    result[key] = value;
  }

  return result as T;
}