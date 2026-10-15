// src/app/home/install/models/install.model.ts

/* ═══════════════════════════════════════════════════════════
   TYPES D'INSTALLATION PWA
   ═══════════════════════════════════════════════════════════ */

/**
 * Événement `beforeinstallprompt` (non standardisé).
 * Voir : https://developer.mozilla.org/en-US/docs/Web/API/BeforeInstallPromptEvent
 */
export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: readonly string[];
  readonly userChoice: Promise<{
    readonly outcome: 'accepted' | 'dismissed';
    readonly platform: string;
  }>;
  prompt(): Promise<void>;
}

/** Extension de `Navigator` pour `getInstalledRelatedApps` (non standardisé). */
export interface NavigatorWithRelatedApps extends Navigator {
  getInstalledRelatedApps?: () => Promise<readonly unknown[]>;
}

/** Choix retourné par le prompt natif. */
export type InstallOutcome = 'accepted' | 'dismissed';