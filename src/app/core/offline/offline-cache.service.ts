import { Injectable } from '@angular/core';
import {
  OfflineWrite,
  OfflineWriteOperation,
} from './models/offline-write.model';

/* ═══════════════════════════════════════════════════════════
   CONSTANTES
   ═══════════════════════════════════════════════════════════ */

const DB_NAME = 'charlyguitare-offline';
const DB_VERSION = 1;
const STORE_PENDING_WRITES = 'pendingWrites';
const STORE_GAME_PROGRESS = 'gameProgress';
const MAX_ATTEMPTS = 5;

/* ═══════════════════════════════════════════════════════════
   SERVICE
   ═══════════════════════════════════════════════════════════ */

@Injectable({ providedIn: 'root' })
export class OfflineCacheService {

  private db: IDBDatabase | null = null;
  private dbPromise: Promise<IDBDatabase> | null = null;

  /* ═══════════════════════════════════════════════════════
     INITIALISATION
     ═══════════════════════════════════════════════════════ */

  private async openDb(): Promise<IDBDatabase> {
    if (this.db) return this.db;
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
      if (typeof indexedDB === 'undefined') {
        reject(new Error('IndexedDB non supporté'));
        return;
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = () => {
        const db = request.result;

        if (!db.objectStoreNames.contains(STORE_PENDING_WRITES)) {
          const store = db.createObjectStore(STORE_PENDING_WRITES, {
            keyPath: 'id',
            autoIncrement: true,
          });
          store.createIndex('queuedAt', 'queuedAt', { unique: false });
        }

        if (!db.objectStoreNames.contains(STORE_GAME_PROGRESS)) {
          db.createObjectStore(STORE_GAME_PROGRESS, { keyPath: 'userId' });
        }
      };

      request.onsuccess = () => {
        this.db = request.result;
        this.dbPromise = null;
        resolve(request.result);
      };

      request.onerror = () => {
        this.dbPromise = null;
        reject(request.error);
      };
    });

    return this.dbPromise;
  }

  /* ═══════════════════════════════════════════════════════
     FILE D'ATTENTE DES ÉCRITURES
     ═══════════════════════════════════════════════════════ */

  /** Ajoute une écriture en file d'attente. */
  async enqueueWrite(
    path: string,
    operation: OfflineWriteOperation,
    data: unknown
  ): Promise<void> {
    const db = await this.openDb();

    const write: OfflineWrite = {
      path,
      operation,
      data,
      queuedAt: Date.now(),
      attempts: 0,
    };

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_PENDING_WRITES, 'readwrite');
      const store = tx.objectStore(STORE_PENDING_WRITES);
      const req = store.add(write);

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  /** Récupère toutes les écritures en attente, triées par date. */
  async getPendingWrites(): Promise<OfflineWrite[]> {
    const db = await this.openDb();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_PENDING_WRITES, 'readonly');
      const store = tx.objectStore(STORE_PENDING_WRITES);
      const index = store.index('queuedAt');
      const req = index.getAll();

      req.onsuccess = () => resolve(req.result as OfflineWrite[]);
      req.onerror = () => reject(req.error);
    });
  }

  /** Compte les écritures en attente. */
  async countPendingWrites(): Promise<number> {
    const db = await this.openDb();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_PENDING_WRITES, 'readonly');
      const store = tx.objectStore(STORE_PENDING_WRITES);
      const req = store.count();

      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  /** Supprime une écriture synchronisée. */
  async removeWrite(id: number): Promise<void> {
    const db = await this.openDb();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_PENDING_WRITES, 'readwrite');
      const store = tx.objectStore(STORE_PENDING_WRITES);
      const req = store.delete(id);

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  /** Incrémente le compteur de tentatives. */
  async incrementAttempts(write: OfflineWrite): Promise<void> {
    if (write.id === undefined) return;

    const db = await this.openDb();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_PENDING_WRITES, 'readwrite');
      const store = tx.objectStore(STORE_PENDING_WRITES);
      const updated: OfflineWrite = {
        ...write,
        attempts: write.attempts + 1,
      };
      const req = store.put(updated);

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  /** Supprime les écritures ayant dépassé MAX_ATTEMPTS. */
  async purgeFailedWrites(): Promise<number> {
    const pending = await this.getPendingWrites();
    const failed = pending.filter(w => w.attempts >= MAX_ATTEMPTS);

    for (const write of failed) {
      if (write.id !== undefined) {
        await this.removeWrite(write.id);
      }
    }

    return failed.length;
  }

  /** Vide toute la file d'attente (utile pour debug/reset). */
  async clearPendingWrites(): Promise<void> {
    const db = await this.openDb();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_PENDING_WRITES, 'readwrite');
      const store = tx.objectStore(STORE_PENDING_WRITES);
      const req = store.clear();

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  /* ═══════════════════════════════════════════════════════
     PROGRESSION DE JEU (cache local)
     ═══════════════════════════════════════════════════════ */

  /** Sauvegarde la progression locale d'un utilisateur. */
  async saveGameProgress<T>(userId: string, progress: T): Promise<void> {
    const db = await this.openDb();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_GAME_PROGRESS, 'readwrite');
      const store = tx.objectStore(STORE_GAME_PROGRESS);
      const req = store.put({
        userId,
        progress,
        updatedAt: Date.now(),
      });

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  /** Récupère la progression locale d'un utilisateur. */
  async getGameProgress<T>(userId: string): Promise<T | null> {
    const db = await this.openDb();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_GAME_PROGRESS, 'readonly');
      const store = tx.objectStore(STORE_GAME_PROGRESS);
      const req = store.get(userId);

      req.onsuccess = () => {
        const result = req.result as { progress: T } | undefined;
        resolve(result ? result.progress : null);
      };
      req.onerror = () => reject(req.error);
    });
  }
}