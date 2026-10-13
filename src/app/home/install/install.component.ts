import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  signal,
} from '@angular/core';

/* ═══════════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════════ */

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

/** Extension de Navigator pour `getInstalledRelatedApps` (non standardisé). */
interface NavigatorWithRelatedApps extends Navigator {
  getInstalledRelatedApps?: () => Promise<unknown[]>;
}

/* ═══════════════════════════════════════════════════════════
   CONSTANTES  ← ✅ AJOUT INDISPENSABLE
   ═══════════════════════════════════════════════════════════ */

const INSTALLED_KEY = 'mymuisic_app_installed';

/* ═══════════════════════════════════════════════════════════
   COMPOSANT
   ═══════════════════════════════════════════════════════════ */

@Component({
  selector: 'app-install',
  standalone: true,
  imports: [],
  templateUrl: './install.component.html',
  styleUrl: './install.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InstallComponent implements OnInit, OnDestroy {

  /** Le bouton déclencheur est-il visible ? */
  readonly visible = signal(false);

  /** La modale est-elle ouverte ? */
  readonly modalOpen = signal(false);

  /** Prompt natif conservé pour usage ultérieur. */
  private deferredPrompt: BeforeInstallPromptEvent | null = null;

  /** Flag d'installation en cours de vérification (évite un flash). */
  private installCheckDone = false;

  private readonly onBeforeInstallPrompt = (e: Event) => {
    e.preventDefault();
    this.deferredPrompt = e as BeforeInstallPromptEvent;

    // Ne pas réafficher si l'app est déjà installée
    if (!this.isInstalledSync()) {
      this.visible.set(true);
    }
  };

  private readonly onAppInstalled = () => {
    this.visible.set(false);
    this.modalOpen.set(false);
    this.deferredPrompt = null;
    this.markAsInstalled();
  };

  /* ═══════════════════════════════════════════════════════
     LIFECYCLE
     ═══════════════════════════════════════════════════════ */

  async ngOnInit(): Promise<void> {
    /* 1. Détection synchrone rapide (standalone + localStorage) */
    if (this.isInstalledSync()) {
      this.installCheckDone = true;
      return;
    }

    /* 2. Détection asynchrone système (Chrome Android) */
    const systemInstalled = await this.isInstalledSystem();

    /* 3. Récap : si installée entre-temps, on abandonne */
    if (systemInstalled || this.isInstalledSync()) {
      this.markAsInstalled();
      this.installCheckDone = true;
      return;
    }

    /* 4. Aucune installation détectée → on peut afficher le bouton */
    this.installCheckDone = true;

    window.addEventListener('beforeinstallprompt', this.onBeforeInstallPrompt);
    window.addEventListener('appinstalled', this.onAppInstalled);

    /* Fallback : navigateurs sans `beforeinstallprompt` (Safari iOS, Firefox) */
    if (!('onbeforeinstallprompt' in window)) {
      this.visible.set(true);
    }
  }

  ngOnDestroy(): void {
    window.removeEventListener('beforeinstallprompt', this.onBeforeInstallPrompt);
    window.removeEventListener('appinstalled', this.onAppInstalled);
  }

  /* ═══════════════════════════════════════════════════════
     ACTIONS
     ═══════════════════════════════════════════════════════ */

  /** Clic sur le bouton "Installer l'app". */
  async openModalOrPrompt(): Promise<void> {
    /* 1. Prompt natif disponible → on déclenche */
    if (this.deferredPrompt) {
      try {
        await this.deferredPrompt.prompt();
        const choice = await this.deferredPrompt.userChoice;

        if (choice.outcome === 'accepted') {
          this.markAsInstalled();
          this.visible.set(false);
        }

        this.deferredPrompt = null;
        return;
      } catch {
        /* En cas d'échec, on bascule sur la modale explicative. */
      }
    }

    /* 2. Sinon → modale d'instructions manuelles */
    this.modalOpen.set(true);
  }

  closeModal(): void {
    this.modalOpen.set(false);
  }

  /* ═══════════════════════════════════════════════════════
     DÉTECTIONS
     ═══════════════════════════════════════════════════════ */

  /**
   * Détection rapide et synchrone :
   *  1. Mode `standalone` (app lancée depuis l'icône)
   *  2. `navigator.standalone` (iOS Safari)
   *  3. Flag `localStorage` (installation passée)
   */
  private isInstalledSync(): boolean {
    /* 1. Mode standalone */
    if (window.matchMedia('(display-mode: standalone)').matches) {
      return true;
    }

    /* 2. iOS */
    if ((window.navigator as { standalone?: boolean }).standalone === true) {
      return true;
    }

    /* 3. Flag mémorisé */
    try {
      return localStorage.getItem(INSTALLED_KEY) === 'true';
    } catch {
      return false;
    }
  }

  /**
   * Détection asynchrone via `navigator.getInstalledRelatedApps()`.
   * Disponible sur Chrome Android (et partiellement Edge).
   * Nécessite `related_applications` dans le `manifest.webmanifest`.
   */
  private async isInstalledSystem(): Promise<boolean> {
    const nav = window.navigator as NavigatorWithRelatedApps;

    if (typeof nav.getInstalledRelatedApps !== 'function') {
      return false;
    }

    try {
      const apps = await nav.getInstalledRelatedApps();
      return Array.isArray(apps) && apps.length > 0;
    } catch {
      return false;
    }
  }

  /* ═══════════════════════════════════════════════════════
     MÉMORISATION
     ═══════════════════════════════════════════════════════ */

  private markAsInstalled(): void {
    try {
      localStorage.setItem(INSTALLED_KEY, 'true');
    } catch {
      /* localStorage indisponible — silencieux */
    }
  }
}