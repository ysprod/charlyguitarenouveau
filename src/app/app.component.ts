// src/app/app.component.ts

import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  inject,
  signal,
} from '@angular/core';

import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';

import {
  Database,
  equalTo,
  listVal,
  orderByChild,
  query,
  ref,
} from '@angular/fire/database';

import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import {
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
} from '@angular/router';

import { fromEvent, of } from 'rxjs';
import { distinctUntilChanged, map, switchMap } from 'rxjs/operators';

import { InstallPromptComponent } from './home/install-prompt/install-prompt.component';

import { UserMessage } from './home/models/user-message.model';

import { AuthService } from './home/auth.service';
import { VoiceService } from './game/voice.service';

import { getInitials } from './home/utils/string.utils';

/* ═════════════════════════════════════════════════════════════════════
   APP COMPONENT — Racine de l'application
   ═════════════════════════════════════════════════════════════════════ */

@Component({
  selector: 'app-root',
  imports: [
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
    MatIconModule,
    MatMenuModule,
    MatDividerModule,
    MatSnackBarModule,
    InstallPromptComponent,
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {

  /* ═══════════════════════════════════════════════════════
     INJECTION
     ═══════════════════════════════════════════════════════ */

  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);
  private readonly database = inject(Database);
  private readonly voice = inject(VoiceService);
  private readonly destroyRef = inject(DestroyRef);

  /** Service d'auth public (utilisé par le template). */
  readonly auth = inject(AuthService);

  /* ═══════════════════════════════════════════════════════
     CONSTANTES
     ═══════════════════════════════════════════════════════ */

  readonly title = 'CHARLY GUITARE';
  readonly currentYear = new Date().getFullYear();

  /* ═══════════════════════════════════════════════════════
     UTILISATEUR CONNECTÉ — SIGNAL
     ═══════════════════════════════════════════════════════ */

  readonly user = toSignal(this.auth.user$, { initialValue: null });

  /* ═══════════════════════════════════════════════════════
     ÉTAT UI — SIGNALS
     ═══════════════════════════════════════════════════════ */

  readonly isMobileMenuOpen = signal(false);

  /** Détection du scroll (remplace @HostListener). */
  readonly isScrolled = toSignal(
    fromEvent(window, 'scroll', { passive: true }).pipe(
      map(() => window.scrollY > 20),
      distinctUntilChanged()
    ),
    { initialValue: false }
  );

  /* ═══════════════════════════════════════════════════════
     MESSAGES — COMPTEUR RÉACTIF
     ═══════════════════════════════════════════════════════ */

  /** Nombre de messages au statut `replied`. */
  readonly unreadCount = toSignal(this.watchUnreadMessages(), {
    initialValue: 0,
  });

  /** Dernier compteur connu (pour ne pas re-parler à chaque émission). */
  private readonly lastUnreadCount = signal(0);

  /** Évite d'annoncer la valeur initiale du flux (rechargement de page). */
  private readonly hasSeenFirstValue = signal(false);

  /** Timeout actif pour l'annonce vocale (nettoyage à la destruction). */
  private voiceTimeoutId: ReturnType<typeof setTimeout> | null = null;

  /* ═══════════════════════════════════════════════════════
     CONSTRUCTEUR — EFFECTS + CLEANUP
     ═══════════════════════════════════════════════════════ */

  constructor() {
    this.watchNewMessages();

    this.destroyRef.onDestroy(() => {
      if (this.voiceTimeoutId !== null) {
        clearTimeout(this.voiceTimeoutId);
        this.voiceTimeoutId = null;
      }
    });
  }

  /* ═══════════════════════════════════════════════════════
     FLUX : compteur de messages "replied"
     ═══════════════════════════════════════════════════════ */

  private watchUnreadMessages() {
    return this.auth.user$.pipe(
      takeUntilDestroyed(this.destroyRef),

      switchMap((user) => {
        if (!user) {
          this.lastUnreadCount.set(0);
          this.hasSeenFirstValue.set(false);
          return of(0);
        }

        const messagesQuery = query(
          ref(this.database, 'messages'),
          orderByChild('userId'),
          equalTo(user.uid)
        );

        return listVal<UserMessage>(messagesQuery).pipe(
          map(
            (messages) =>
              messages.filter((m) => m.status === 'replied').length
          )
        );
      })
    );
  }

  /* ═══════════════════════════════════════════════════════
     ANNONCE VOCALE DES NOUVEAUX MESSAGES
     ═══════════════════════════════════════════════════════ */

  private watchNewMessages(): void {
    effect(() => {
      const count = this.unreadCount();

      /* Première valeur : on la mémorise sans parler */
      if (!this.hasSeenFirstValue()) {
        this.hasSeenFirstValue.set(true);
        this.lastUnreadCount.set(count);
        return;
      }

      /* Nouveau(x) message(s) */
      const previous = this.lastUnreadCount();
      if (count > previous) {
        const diff = count - previous;
        const message =
          diff === 1
            ? 'Tu as reçu un nouveau message de Charly Guitare.com'
            : `Tu as reçu ${diff} nouveaux messages de Charly Guitare.com`;

        this.scheduleVoiceAnnouncement(message);
      }

      this.lastUnreadCount.set(count);
    });
  }

  private scheduleVoiceAnnouncement(message: string): void {
    const voice = this.voice;

    if (this.voiceTimeoutId !== null) {
      clearTimeout(this.voiceTimeoutId);
    }

    this.voiceTimeoutId = setTimeout(async () => {
      this.voiceTimeoutId = null;

      if (this.destroyRef.destroyed) return;

      try {
        await voice.waitForSpeechEnd();
        if (this.destroyRef.destroyed) return;
        await voice.speak(message, { pitch: 1.05, rate: 0.95 });
      } catch {
        /* silencieux : l'annonce vocale est optionnelle */
      }
    }, 300);
  }

  /* ═══════════════════════════════════════════════════════
     MENU MOBILE
     ═══════════════════════════════════════════════════════ */

  toggleMobileMenu(): void {
    this.isMobileMenuOpen.update((v) => !v);
  }

  closeMobileMenu(): void {
    if (this.isMobileMenuOpen()) {
      this.isMobileMenuOpen.set(false);
    }
  }

  /* ═══════════════════════════════════════════════════════
     AUTH
     ═══════════════════════════════════════════════════════ */

  onLogout(): void {
    this.closeMobileMenu();
    this.auth.logout();

    this.snackBar.open('Déconnexion réussie', 'Fermer', { duration: 3000 });

    void this.router.navigate(['/']);
  }

  /* ═══════════════════════════════════════════════════════
     HELPERS TEMPLATE
     ═══════════════════════════════════════════════════════ */

  /**
   * Initiales (2 caractères max) — délégué à `utils/string.utils.ts`.
   * Retourne `'U'` par défaut si aucun nom n'est fourni.
   */
  getInitials = (name: string | null | undefined): string =>
    getInitials(name, '', 'U');
}