import { Injectable, signal, computed, inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';

const STORAGE_KEY_SOUND = 'game:sound';

/**
 * Service son partagé du shell Game.
 * - Persiste l'état dans localStorage (clé `game:sound`).
 * - Expose un signal `enabled` que les jeux enfants peuvent lire.
 * - Émet un évènement `game:sound` sur `window` pour les auditeurs legacy.
 * - Compatible SSR (via DOCUMENT injection).
 */
@Injectable({ providedIn: 'root' })
export class GameSoundService {
  private readonly document = inject(DOCUMENT);

  /** État courant du son. */
  readonly enabled = signal<boolean>(this.readPref());

  /** Inversé, pratique dans les templates. */
  readonly muted = computed(() => !this.enabled());

  /** Icône prête à l'emploi. */
  readonly icon = computed(() => (this.enabled() ? '🔊' : '🔇'));

  /** Libellé accessible. */
  readonly ariaLabel = computed(() =>
    this.enabled() ? 'Couper le son' : 'Activer le son',
  );

  constructor() {
    // Sync initiale avec le DOM (utile si un jeu a déjà muté <audio>/<video>)
    this.applyToDocument(this.enabled());
  }

  /** Toggle : inverse l'état, persiste, notifie. */
  toggle(): boolean {
    return this.set(!this.enabled());
  }

  /** Force un état précis. */
  set(enabled: boolean): boolean {
    if (enabled === this.enabled()) return enabled;

    this.enabled.set(enabled);
    this.writePref(enabled);
    this.applyToDocument(enabled);
    this.emit(enabled);

    return enabled;
  }

  /* ─────────── privé ─────────── */

  private readPref(): boolean {
    try {
      const raw = this.document.defaultView?.localStorage.getItem(STORAGE_KEY_SOUND);
      return raw !== 'off';
    } catch {
      return true;
    }
  }

  private writePref(enabled: boolean): void {
    try {
      this.document.defaultView?.localStorage.setItem(
        STORAGE_KEY_SOUND,
        enabled ? 'on' : 'off',
      );
    } catch {
      /* quota / privacy mode : on ignore */
    }
  }

  /** Coupe le son de tous les <audio>/<video> du document. */
  private applyToDocument(enabled: boolean): void {
    const win = this.document.defaultView;
    if (!win) return;

    this.document.querySelectorAll<HTMLMediaElement>('audio, video').forEach((el) => {
      el.muted = !enabled;
    });
  }

  /** Émet un évènement global pour les composants qui préfèrent écouter. */
  private emit(enabled: boolean): void {
    const win = this.document.defaultView;
    if (!win) return;

    win.dispatchEvent(
      new win.CustomEvent('game:sound', { detail: { enabled } }),
    );
  }
}