import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  inject,
  signal,
  viewChild,
} from '@angular/core';

import {
  BeforeInstallPromptEvent,
  NavigatorWithRelatedApps,
} from '../models/install.model';

import {
  FOCUSABLE_SELECTOR,
  INSTALLED_KEY,
} from '../constants/install.constants';

/* ═══════════════════════════════════════════════════════════
   COMPOSANT
   ═══════════════════════════════════════════════════════════ */

@Component({
  selector: 'app-install',
  imports: [],
  templateUrl: './install.component.html',
  styleUrl: './install.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InstallComponent {

  /* ─── Injection ─── */
  private readonly destroyRef = inject(DestroyRef);

  /* ─── Références DOM (focus trap) ─── */
  private readonly modalCard = viewChild<ElementRef<HTMLElement>>('modalCard');
  private readonly modalCloseBtn = viewChild<ElementRef<HTMLButtonElement>>('modalCloseBtn');

  /* ─── État ─── */
  /** Le bouton déclencheur est-il visible ? */
  readonly visible = signal(false);

  /** La modale est-elle ouverte ? */
  readonly modalOpen = signal(false);

  /** Prompt natif conservé pour usage ultérieur. */
  private deferredPrompt: BeforeInstallPromptEvent | null = null;

  /* ─── Élément précédemment focusé (restauration à la fermeture) ─── */
  private previouslyFocused: HTMLElement | null = null;

  /* ═══════════════════════════════════════════════════════
     HANDLERS
     ═══════════════════════════════════════════════════════ */

  private readonly onBeforeInstallPrompt = (e: Event) => {
    e.preventDefault();
    this.deferredPrompt = e as BeforeInstallPromptEvent;

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
     CONSTRUCTEUR
     ═══════════════════════════════════════════════════════ */

  constructor() {
    afterNextRender(() => {
      void this.initInstallDetection();
    });

    this.destroyRef.onDestroy(() => {
      if (typeof window === 'undefined') return;
      window.removeEventListener('beforeinstallprompt', this.onBeforeInstallPrompt);
      window.removeEventListener('appinstalled', this.onAppInstalled);
    });
  }

  /* ═══════════════════════════════════════════════════════
     DÉTECTION DE L'INSTALLATION
     ═══════════════════════════════════════════════════════ */

  private async initInstallDetection(): Promise<void> {
    if (this.isInstalledSync()) return;

    const systemInstalled = await this.isInstalledSystem();

    if (systemInstalled || this.isInstalledSync()) {
      this.markAsInstalled();
      return;
    }

    window.addEventListener('beforeinstallprompt', this.onBeforeInstallPrompt);
    window.addEventListener('appinstalled', this.onAppInstalled);

    /* Fallback : navigateurs sans `beforeinstallprompt` (Safari iOS, Firefox) */
    if (!('onbeforeinstallprompt' in window)) {
      this.visible.set(true);
    }
  }

  /* ═══════════════════════════════════════════════════════
     ACTIONS
     ═══════════════════════════════════════════════════════ */

  /** Clic sur le bouton "Installer l'app". */
  async openModalOrPrompt(): Promise<void> {
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
        /* Échec → on bascule sur la modale explicative. */
      }
    }

    this.openModal();
  }

  /** Ouvre la modale + gère focus / précédent focus. */
  private openModal(): void {
    if (typeof document !== 'undefined') {
      this.previouslyFocused = document.activeElement as HTMLElement | null;
    }
    this.modalOpen.set(true);

    /* Focus initial sur le bouton de fermeture (après le rendu) */
    queueMicrotask(() => {
      this.modalCloseBtn()?.nativeElement.focus();
    });
  }

  /** Ferme la modale + restaure le focus. */
  closeModal(): void {
    this.modalOpen.set(false);
    this.previouslyFocused?.focus();
    this.previouslyFocused = null;
  }

  /** Gère la touche Escape + le focus trap (Tab / Shift+Tab). */
  onModalKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.closeModal();
      return;
    }

    if (event.key !== 'Tab') return;

    const card = this.modalCard()?.nativeElement;
    if (!card) return;

    const focusables = Array.from(
      card.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
    );
    if (focusables.length === 0) return;

    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    const active = document.activeElement as HTMLElement | null;

    if (event.shiftKey && active === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  }

  /* ═══════════════════════════════════════════════════════
     DÉTECTIONS
     ═══════════════════════════════════════════════════════ */

  private isInstalledSync(): boolean {
    if (typeof window === 'undefined') return false;

    if (window.matchMedia('(display-mode: standalone)').matches) {
      return true;
    }

    if ((window.navigator as { standalone?: boolean }).standalone === true) {
      return true;
    }

    try {
      return localStorage.getItem(INSTALLED_KEY) === 'true';
    } catch {
      return false;
    }
  }

  private async isInstalledSystem(): Promise<boolean> {
    if (typeof window === 'undefined') return false;

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