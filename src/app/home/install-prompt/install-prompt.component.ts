import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  afterNextRender,
  inject,
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

/* ═══════════════════════════════════════════════════════════
   CONSTANTES
   ═══════════════════════════════════════════════════════════ */

const DISMISS_KEY = 'charlyguitare_install_dismissed_until';

/** 7 jours en millisecondes. */
const DISMISS_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

/* ═══════════════════════════════════════════════════════════
   COMPOSANT
   ═══════════════════════════════════════════════════════════ */

@Component({
  selector: 'app-install-prompt',
  imports: [],
  templateUrl: './install-prompt.component.html',
  styleUrls: ['./install-prompt.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InstallPromptComponent {

  /* ─── Injection ─── */
  private readonly destroyRef = inject(DestroyRef);

  /* ─── État UI ─── */
  /** Contrôle la visibilité de la bannière. */
  readonly visible = signal(false);

  /** État de chargement pendant le prompt natif. */
  readonly installing = signal(false);

  /* ─── Interne ─── */
  /** Événement natif conservé pour déclencher `prompt()` plus tard. */
  private deferredPrompt: BeforeInstallPromptEvent | null = null;

  /* ═══════════════════════════════════════════════════════
     HANDLERS (stables pour add/removeEventListener)
     ═══════════════════════════════════════════════════════ */

  private readonly onBeforeInstallPrompt = (e: Event) => {
    e.preventDefault();
    this.deferredPrompt = e as BeforeInstallPromptEvent;

    /* Affiche seulement si l'utilisateur n'a pas fermé récemment */
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

  /* ═══════════════════════════════════════════════════════
     CONSTRUCTEUR — afterNextRender + cleanup
     ═══════════════════════════════════════════════════════ */

  constructor() {
    /* Initialisation uniquement côté navigateur (SSR-safe) */
    afterNextRender(() => {
      /* Déjà installée en mode standalone → on ne fait rien */
      if (this.isStandalone()) return;

      window.addEventListener('beforeinstallprompt', this.onBeforeInstallPrompt);
      window.addEventListener('appinstalled', this.onAppInstalled);
    });

    /* Nettoyage des listeners à la destruction */
    this.destroyRef.onDestroy(() => {
      if (typeof window === 'undefined') return;
      window.removeEventListener('beforeinstallprompt', this.onBeforeInstallPrompt);
      window.removeEventListener('appinstalled', this.onAppInstalled);
    });
  }

  /* ═══════════════════════════════════════════════════════
     ACTIONS
     ═══════════════════════════════════════════════════════ */

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
        /* L'utilisateur a refusé : on masque et on mémorise */
        this.visible.set(false);
        this.markAsDismissed();
      }

      this.deferredPrompt = null;
    } catch (error) {
      /* Le prompt natif a échoué (rare) — on log et on masque */
      console.warn('[InstallPrompt] prompt natif échoué :', error);
      this.visible.set(false);
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

  /* ═══════════════════════════════════════════════════════
     HELPERS
     ═══════════════════════════════════════════════════════ */

  /** Vrai si l'app tourne déjà en mode installé (standalone). */
  private isStandalone(): boolean {
    if (typeof window === 'undefined') return false;

    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      /* iOS Safari */
      (window.navigator as { standalone?: boolean }).standalone === true
    );
  }

  /** Vrai si l'utilisateur a fermé la bannière récemment. */
  private isDismissedRecently(): boolean {
    if (typeof localStorage === 'undefined') return false;

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
    if (typeof localStorage === 'undefined') return;

    try {
      localStorage.setItem(
        DISMISS_KEY,
        String(Date.now() + DISMISS_DURATION_MS)
      );
    } catch {
      /* localStorage indisponible — silencieux */
    }
  }

  /** Réinitialise le flag (après installation réussie). */
  private clearDismissFlag(): void {
    if (typeof localStorage === 'undefined') return;

    try {
      localStorage.removeItem(DISMISS_KEY);
    } catch {
      /* silencieux */
    }
  }
}