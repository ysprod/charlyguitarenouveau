// src/app/notifications/services/notifications.service.ts

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
  ref,
  remove,
  update,
} from '@angular/fire/database';

import { Observable, of } from 'rxjs';
import {
  catchError,
  map,
  shareReplay,
  switchMap,
} from 'rxjs/operators';

import type { NotificationItem } from '../models/notification.model';
import { NOTIFICATIONS_DB_PATH } from '../constants/notifications.constants';

/* ═════════════════════════════════════════════════════════════════════
   SERVICE

   Structure Firebase : /notifications/{uid}/{notifId}
     ├── userId: "uid_destinataire"
     ├── type: "system" | "message" | "promotion"
     ├── title: "..."
     ├── body: "..."
     ├── icon?: "..."
     ├── link?: "..."
     ├── read: boolean
     └── createdAt: number
   ═════════════════════════════════════════════════════════════════════ */

@Injectable({ providedIn: 'root' })
export class NotificationsService {

  private readonly auth = inject(Auth);
  private readonly db = inject(Database);
  private readonly environmentInjector = inject(EnvironmentInjector);

  /* ═══════════════════════════════════════════════════════════════════
     FLUX PRINCIPAL — Notifications du user courant
     ═══════════════════════════════════════════════════════════════════ */

  /**
   * ✅ Lecture directe sur /notifications/{uid} (pas de query)
   * → la règle `.read` sur `$uid` autorise `auth.uid === $uid`.
   */
  readonly notifications$: Observable<NotificationItem[]> =
    authState(this.auth).pipe(
      switchMap((user) => {
        if (!user?.uid) return of<NotificationItem[]>([]);

        return runInInjectionContext(this.environmentInjector, () => {
          const notifRef = ref(
            this.db,
            `${NOTIFICATIONS_DB_PATH}/${user.uid}`,
          );

          return listVal<NotificationItem>(notifRef, { keyField: 'key' }).pipe(
            map((notifs) => this.sortByRecent(notifs)),
            catchError((err) => {
              console.warn(
                '[NotificationsService] Lecture refusée :',
                err?.code ?? err,
              );
              return of<NotificationItem[]>([]);
            }),
          );
        });
      }),
      shareReplay({ bufferSize: 1, refCount: true }),
    );

  /* ═══════════════════════════════════════════════════════════════════
     ACTIONS
     ═══════════════════════════════════════════════════════════════════ */

  /**
   * Marque une notification comme lue.
   * ✅ Autorisé par la règle : user peut modifier `read` sur SES notifs.
   */
  async markAsRead(notifId: string): Promise<boolean> {
    const uid = this.auth.currentUser?.uid;
    if (!uid) return false;

    try {
      await runInInjectionContext(this.environmentInjector, () =>
        update(
          ref(this.db, `${NOTIFICATIONS_DB_PATH}/${uid}/${notifId}`),
          { read: true },
        ),
      );
      return true;
    } catch (err) {
      console.warn(
        '[NotificationsService] markAsRead refusé :',
        err,
      );
      return false;
    }
  }

  /**
   * Marque TOUTES les notifications comme lues.
   * Fire-and-forget pour éviter un blocage si certaines échouent.
   */
  async markAllAsRead(notifIds: string[]): Promise<void> {
    await Promise.all(notifIds.map((id) => this.markAsRead(id)));
  }

  /**
   * Supprime une notification.
   * ⚠️ Admin uniquement selon la règle `.write` au niveau `$uid`.
   */
  async delete(notifId: string): Promise<boolean> {
    const uid = this.auth.currentUser?.uid;
    if (!uid) return false;

    try {
      await runInInjectionContext(this.environmentInjector, () =>
        remove(ref(this.db, `${NOTIFICATIONS_DB_PATH}/${uid}/${notifId}`)),
      );
      return true;
    } catch (err) {
      console.warn('[NotificationsService] delete refusé :', err);
      return false;
    }
  }

  /* ═══════════════════════════════════════════════════════════════════
     HELPERS
     ═══════════════════════════════════════════════════════════════════ */

  private sortByRecent(notifs: NotificationItem[]): NotificationItem[] {
    return [...notifs].sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
  }
}