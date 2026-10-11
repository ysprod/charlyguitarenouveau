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

/**
 * Événement `beforeinstallprompt` — non standardisé TypeScript,
 * on le type manuellement.
 * @see https://developer.mozilla.org/en-US/docs/Web/API/BeforeInstallPromptEvent
 */
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

const DISMISS_KEY = 'mymuisic_install_dismissed_until';
const DISMISS_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 jours

/* ═══════════════════════════════════════════════════════════
   COMPOSANT
   ═══════════════════════════════════════════════════════════ */

@Component({
  selector: 'app-install-prompt',
  standalone: true,
  imports: [],
  templateUrl: './install-prompt.component.html',
  styleUrls: ['./install-prompt.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InstallPromptComponent implements OnInit, OnDestroy {

  /** Contrôle la visibilité de la bannière. */
  readonly visible = signal(false);

  /** État de chargement pendant le prompt natif. */
  readonly installing = signal(false);

  /** Événement natif conservé pour déclencher `prompt()` plus tard. */
  private deferredPrompt: BeforeInstallPromptEvent | null = null;

  /** Référence stable pour le retrait des listeners. */
  private readonly onBeforeInstallPrompt = (e: Event) => {
    e.preventDefault();
    this.deferredPrompt = e as BeforeInstallPromptEvent;

    // Affiche seulement si l'utilisateur n'a pas fermé récemment
    if (!this.isDismissedRecently()) {
      this.visible.set(true);
    }
  };

  private readonly onAppInstalled = () => {
    this.visible.set(false);
    this.deferredPrompt = null;
    this.installing.set(false);
    this.clearDismissFlag();
  };

  /* ═══════════════════════════════════════════════════════════
     LIFECYCLE
     ═══════════════════════════════════════════════════════════ */

  ngOnInit(): void {
    // Déjà installée en mode standalone → on ne fait rien
    if (this.isStandalone()) return;

    window.addEventListener('beforeinstallprompt', this.onBeforeInstallPrompt);
    window.addEventListener('appinstalled', this.onAppInstalled);
  }

  ngOnDestroy(): void {
    window.removeEventListener('beforeinstallprompt', this.onBeforeInstallPrompt);
    window.removeEventListener('appinstalled', this.onAppInstalled);
  }

  /* ═══════════════════════════════════════════════════════════
     ACTIONS
     ═══════════════════════════════════════════════════════════ */

  /** Déclenche le prompt natif d'installation. */
  async install(): Promise<void> {
    const prompt = this.deferredPrompt;
    if (!prompt) return;

    this.installing.set(true);

    try {
      await prompt.prompt();
      const choice = await prompt.userChoice;

      if (choice.outcome === 'accepted') {
        this.visible.set(false);
      } else {
        // L'utilisateur a refusé : on masque pour la session
        this.visible.set(false);
        this.markAsDismissed();
      }

      this.deferredPrompt = null;
    } finally {
      this.installing.set(false);
    }
  }

  /** Ferme la bannière et mémorise le refus. */
  dismiss(): void {
    this.visible.set(false);
    this.markAsDismissed();
  }

  /* ═══════════════════════════════════════════════════════════
     HELPERS
     ═══════════════════════════════════════════════════════════ */

  /** Vrai si l'app tourne déjà en mode installé (standalone). */
  private isStandalone(): boolean {
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      // iOS Safari
      (window.navigator as { standalone?: boolean }).standalone === true
    );
  }

  /** Vrai si l'utilisateur a fermé la bannière récemment. */
  private isDismissedRecently(): boolean {
    try {
      const raw = localStorage.getItem(DISMISS_KEY);
      if (!raw) return false;
      const until = Number(raw);
      if (Number.isNaN(until)) return false;
      return Date.now() < until;
    } catch {
      return false;
    }
  }

  /** Mémorise la fermeture pour 7 jours. */
  private markAsDismissed(): void {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now() + DISMISS_DURATION_MS));
    } catch {
      /* localStorage indisponible — silencieux */
    }
  }

  /** Réinitialise le flag (après installation réussie). */
  private clearDismissFlag(): void {
    try {
      localStorage.removeItem(DISMISS_KEY);
    } catch {
      /* silencieux */
    }
  }
}