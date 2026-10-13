import {
  Injectable,
  OnDestroy,
  effect,
  inject,
} from '@angular/core';

import {
  Database,
  ref,
  remove,
  set,
  update,
} from '@angular/fire/database';

import { Subject, takeUntil } from 'rxjs';

import { NetworkService } from './network.service';
import { OfflineCacheService } from './offline-cache.service';
import { OfflineWrite } from './models/offline-write.model';

/* ═══════════════════════════════════════════════════════════
   CONSTANTES
   ═══════════════════════════════════════════════════════════ */

const MAX_ATTEMPTS = 5;
const SYNC_DELAY_MS = 500;

/* ═══════════════════════════════════════════════════════════
   SERVICE
   ═══════════════════════════════════════════════════════════ */

@Injectable({ providedIn: 'root' })
export class OfflineSyncService implements OnDestroy {

  private readonly db = inject(Database);
  private readonly network = inject(NetworkService);
  private readonly cache = inject(OfflineCacheService);

  private readonly destroy$ = new Subject<void>();
  private isSyncing = false;

  constructor() {
    /* Réagit automatiquement au retour en ligne. */
    effect(() => {
      if (this.network.isOnline()) {
        void this.scheduleSyncFlush();
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /* ═══════════════════════════════════════════════════════
     API PUBLIQUE — Utilisable partout dans l'app
     ═══════════════════════════════════════════════════════ */

  /**
   * Écrit dans RTDB avec fallback automatique en file d'attente.
   * Si le réseau est absent ou l'écriture échoue → mise en queue IndexedDB.
   */
  async set<T>(path: string, data: T): Promise<void> {
    if (!this.network.isOnline()) {
      await this.cache.enqueueWrite(path, 'set', data);
      return;
    }

    try {
      await set(ref(this.db, path), data);
    } catch (error) {
      console.warn(`[OfflineSync] set échoué, mise en queue : ${path}`, error);
      await this.cache.enqueueWrite(path, 'set', data);
    }
  }

  /** Idem pour `update`. */
  async update<T>(path: string, data: Partial<T>): Promise<void> {
    if (!this.network.isOnline()) {
      await this.cache.enqueueWrite(path, 'update', data);
      return;
    }

    try {
      await update(ref(this.db, path), data as object);
    } catch (error) {
      console.warn(`[OfflineSync] update échoué, mise en queue : ${path}`, error);
      await this.cache.enqueueWrite(path, 'update', data);
    }
  }

  /** Idem pour `remove`. */
  async remove(path: string): Promise<void> {
    if (!this.network.isOnline()) {
      await this.cache.enqueueWrite(path, 'remove', null);
      return;
    }

    try {
      await remove(ref(this.db, path));
    } catch (error) {
      console.warn(`[OfflineSync] remove échoué, mise en queue : ${path}`, error);
      await this.cache.enqueueWrite(path, 'remove', null);
    }
  }

  /** Force une tentative de synchronisation manuelle. */
  async flushNow(): Promise<void> {
    await this.flushPendingWrites();
  }

  /** Nombre d'écritures en attente (utile pour l'UI). */
  async getPendingCount(): Promise<number> {
    return this.cache.countPendingWrites();
  }

  /* ═══════════════════════════════════════════════════════
     MÉCANIQUE INTERNE
     ═══════════════════════════════════════════════════════ */

  private scheduleSyncFlush(): void {
    /* Petit délai pour laisser la connexion se stabiliser. */
    setTimeout(() => {
      if (this.destroy$.isStopped) return;
      void this.flushPendingWrites();
    }, SYNC_DELAY_MS);
  }

  private async flushPendingWrites(): Promise<void> {
    if (this.isSyncing) return;
    if (!this.network.isOnline()) return;

    this.isSyncing = true;

    try {
      /* Nettoie d'abord les écritures définitivement échouées. */
      await this.cache.purgeFailedWrites();

      const pending = await this.cache.getPendingWrites();

      for (const write of pending) {
        if (this.destroy$.isStopped) return;

        const success = await this.applyWrite(write);

        if (success && write.id !== undefined) {
          await this.cache.removeWrite(write.id);
        } else {
          await this.cache.incrementAttempts(write);
        }
      }
    } catch (error) {
      console.warn('[OfflineSync] erreur pendant la synchro', error);
    } finally {
      this.isSyncing = false;
    }
  }

  private async applyWrite(write: OfflineWrite): Promise<boolean> {
    try {
      const pathRef = ref(this.db, write.path);

      switch (write.operation) {
        case 'set':
          await set(pathRef, write.data);
          break;
        case 'update':
          await update(pathRef, write.data as object);
          break;
        case 'remove':
          await remove(pathRef);
          break;
      }

      return true;
    } catch (error) {
      console.warn(
        `[OfflineSync] échec écriture (tentative ${write.attempts + 1}) : ${write.path}`,
        error
      );
      return false;
    }
  }
}