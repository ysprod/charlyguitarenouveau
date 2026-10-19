 
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';

import { CommonModule, DatePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';

import {
  MatSnackBar,
  MatSnackBarModule,
} from '@angular/material/snack-bar';

import {
  NOTIFICATION_FILTERS,
  TYPE_DEFAULT_ICONS,
  TYPE_LABELS,
} from '../constants/notifications.constants';

import type {
  NotificationFilter,
  NotificationItem,
} from '../models/notification.model';

import { NotificationsService } from '../services/notifications.service';

/* ═════════════════════════════════════════════════════════════════════
   COMPOSANT
   ═════════════════════════════════════════════════════════════════════ */

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [
    CommonModule,
    DatePipe,
    MatSnackBarModule,
  ],
  templateUrl: './notifications.component.html',
  styleUrls: ['./notifications.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotificationsComponent {

  private readonly service = inject(NotificationsService);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);

  /* ═══════════════════════════════════════════════════════
     CONSTANTES
     ═══════════════════════════════════════════════════════ */

  readonly filters = NOTIFICATION_FILTERS;
  readonly typeIcons = TYPE_DEFAULT_ICONS;
  readonly typeLabels = TYPE_LABELS;

  /* ═══════════════════════════════════════════════════════
     ÉTAT
     ═══════════════════════════════════════════════════════ */

  readonly activeFilter = signal<NotificationFilter>('all');

  private readonly notifications = toSignal(
    this.service.notifications$,
    { initialValue: [] as NotificationItem[] },
  );

  /* ═══════════════════════════════════════════════════════
     COMPUTED
     ═══════════════════════════════════════════════════════ */

  readonly unreadCount = computed(
    () => this.notifications().filter((n) => !n.read).length,
  );

  readonly totalCount = computed(() => this.notifications().length);

  readonly filteredNotifications = computed(() => {
    const filter = this.activeFilter();
    const list = this.notifications();

    if (filter === 'all') return list;
    if (filter === 'unread') return list.filter((n) => !n.read);
    return list.filter((n) => n.type === filter);
  });

  readonly isEmpty = computed(
    () => this.totalCount() === 0 && this.activeFilter() === 'all',
  );

  readonly hasFilteredNoResults = computed(
    () =>
      this.filteredNotifications().length === 0 &&
      this.totalCount() > 0,
  );

  /* ═══════════════════════════════════════════════════════
     ACTIONS
     ═══════════════════════════════════════════════════════ */

  setFilter(filter: NotificationFilter): void {
    this.activeFilter.set(filter);
  }

  async markAsRead(notif: NotificationItem): Promise<void> {
    if (notif.read || !notif.key) return;

    const ok = await this.service.markAsRead(notif.key);
    if (!ok) {
      this.snackBar.open(
        'Impossible de marquer comme lu (permission refusée).',
        'Fermer',
        { duration: 4000, panelClass: ['snack-error'] },
      );
    }
  }

  async markAllAsRead(): Promise<void> {
    const unread = this.notifications()
      .filter((n) => !n.read && n.key)
      .map((n) => n.key as string);

    if (unread.length === 0) return;

    await this.service.markAllAsRead(unread);

    this.snackBar.open(
      `${unread.length} notification(s) marquée(s) comme lue(s)`,
      'Fermer',
      { duration: 3000 },
    );
  }

  async deleteNotification(
    notif: NotificationItem,
    event: Event,
  ): Promise<void> {
    event.stopPropagation();

    if (!notif.key) return;

    const ok = await this.service.delete(notif.key);
    if (ok) {
      this.snackBar.open('Notification supprimée', 'Fermer', {
        duration: 3000,
      });
    } else {
      this.snackBar.open(
        'Suppression impossible (permission refusée).',
        'Fermer',
        { duration: 4000, panelClass: ['snack-error'] },
      );
    }
  }

  onNotificationClick(notif: NotificationItem): void {
    void this.markAsRead(notif);

    if (notif.link) {
      void this.router.navigateByUrl(notif.link);
    }
  }

  /* ═══════════════════════════════════════════════════════
     HELPERS TEMPLATE
     ═══════════════════════════════════════════════════════ */

  iconOf(notif: NotificationItem): string {
    return notif.icon ?? this.typeIcons[notif.type] ?? '🔔';
  }

  typeLabelOf(notif: NotificationItem): string {
    return this.typeLabels[notif.type] ?? 'Notification';
  }

  trackById(_: number, notif: NotificationItem): string {
    return notif.key ?? notif.createdAt.toString();
  }
}