import { Injectable } from '@angular/core';

/**
 * Service d'accès au localStorage, tolérant aux environnements
 * où celui-ci n'est pas disponible (SSR, navigation privée stricte).
 */
@Injectable({ providedIn: 'root' })
export class StorageService {

  /* ═══════════════════════════════════════════════
     ACCÈS SÉCURISÉ AU STORAGE
     ═══════════════════════════════════════════════ */

  private get storage(): Storage | null {
    try {
      return typeof window !== 'undefined' ? window.localStorage : null;
    } catch {
      return null;
    }
  }

  /* ═══════════════════════════════════════════════
     BOOLÉENS
     ═══════════════════════════════════════════════ */

  getBoolean(key: string, fallback = false): boolean {
    const value = this.storage?.getItem(key);
    if (value === null || value === undefined) return fallback;
    return value === 'true';
  }

  setBoolean(key: string, value: boolean): void {
    try {
      this.storage?.setItem(key, String(value));
    } catch {
      // silencieux : quota dépassé ou stockage indisponible
    }
  }

  /* ═══════════════════════════════════════════════
     NOMBRES
     ═══════════════════════════════════════════════ */

  getNumber(key: string, fallback = 0): number {
    const value = this.storage?.getItem(key);
    if (value === null || value === undefined) return fallback;
    const parsed = Number(value);
    return Number.isNaN(parsed) ? fallback : parsed;
  }

  setNumber(key: string, value: number): void {
    try {
      this.storage?.setItem(key, String(value));
    } catch {
      // silencieux
    }
  }

  /* ═══════════════════════════════════════════════
     CHAÎNES
     ═══════════════════════════════════════════════ */

  getString(key: string, fallback = ''): string {
    const value = this.storage?.getItem(key);
    return value ?? fallback;
  }

  setString(key: string, value: string): void {
    try {
      this.storage?.setItem(key, value);
    } catch {
      // silencieux
    }
  }

  /* ═══════════════════════════════════════════════
     SUPPRESSION
     ═══════════════════════════════════════════════ */

  remove(key: string): void {
    try {
      this.storage?.removeItem(key);
    } catch {
      // silencieux
    }
  }

  clear(): void {
    try {
      this.storage?.clear();
    } catch {
      // silencieux
    }
  }

  /**
 * Lit et parse un objet JSON depuis localStorage.
 * Retourne `null` si absent, corrompu, ou si le storage est indisponible.
 */
getJSON<T>(key: string): T | null {
  const raw = this.storage?.getItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/**
 * Sérialise et stocke un objet en JSON dans localStorage.
 */
setJSON<T>(key: string, value: T): void {
  try {
    this.storage?.setItem(key, JSON.stringify(value));
  } catch {
    // silencieux
  }
}
}