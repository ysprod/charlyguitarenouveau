import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnDestroy,
  OnInit,
  effect,
  inject,
  signal
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  Database,
  equalTo,
  listVal,
  orderByChild,
  query,
  ref
} from '@angular/fire/database';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Subject, fromEvent, of } from 'rxjs';
import {
  distinctUntilChanged,
  map,
  switchMap,
  takeUntil
} from 'rxjs/operators';

import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { InstallPromptComponent } from './footer/install-prompt/install-prompt.component';
import { UserMessage } from './models/user-message.model';
import { AuthService } from './services/auth.service';
import { VoiceService } from './services/voice.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
    MatIconModule,
    MatMenuModule,
    MatDividerModule,
    MatSnackBarModule,
    InstallPromptComponent
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppComponent implements OnInit, OnDestroy {

  readonly title = 'CHARLY GUITARE';
  readonly currentYear = new Date().getFullYear();

  /* ═══════════════════════════════════════════════════════
     ÉTAT UI — SIGNALS
     ═══════════════════════════════════════════════════════ */

  readonly isMobileMenuOpen = signal(false);

  /** Détection du scroll réactive (remplace @HostListener). */
  readonly isScrolled = toSignal(
    fromEvent(window, 'scroll', { passive: true }).pipe(
      map(() => window.scrollY > 20),
      distinctUntilChanged()
    ),
    { initialValue: false }
  );

  /* ═══════════════════════════════════════════════════════
     MESSAGES
     ═══════════════════════════════════════════════════════ */

  private readonly destroy$ = new Subject<void>();
  private readonly destroyRef = inject(DestroyRef);
  private readonly voice = inject(VoiceService);

  /** Flux : nombre de messages traités (status === 'replied') non lus. */
  readonly unreadCount = toSignal(
    this.watchUnreadMessages(),
    { initialValue: 0 }
  );

  /** Dernier compteur connu, pour ne pas re-parler à chaque émission. */
  private lastUnreadCount = 0;

  /** Évite d'annoncer la valeur initiale du flux (rechargement de page). */
  private hasSeenFirstValue = false;

  constructor(
    public readonly auth: AuthService,
    private readonly router: Router,
    private readonly snackBar: MatSnackBar,
    private readonly database: Database
  ) {
    /* Réagit aux changements du compteur de messages */
    this.watchNewMessages();
  }

  ngOnInit(): void {
    /* Rien — tout est géré dans le constructor */
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /* ═══════════════════════════════════════════════════════
     FLUX : compteur de messages "replied"
     ═══════════════════════════════════════════════════════ */

  private watchUnreadMessages() {
    return this.auth.user$.pipe(
      takeUntil(this.destroy$),
      switchMap(user => {
        if (!user) {
          this.lastUnreadCount = 0;
          this.hasSeenFirstValue = false;
          return of(0);
        }

        const messagesQuery = query(
          ref(this.database, 'messages'),
          orderByChild('userId'),
          equalTo(user.uid)
        );

        return listVal<UserMessage>(messagesQuery).pipe(
          map(messages =>
            messages.filter(m => m.status === 'replied').length
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

      // Première valeur : on la mémorise sans parler
      if (!this.hasSeenFirstValue) {
        this.hasSeenFirstValue = true;
        this.lastUnreadCount = count;
        return;
      }

      // Nouveau(x) message(s)
      if (count > this.lastUnreadCount) {
        const diff = count - this.lastUnreadCount;
        const message = diff === 1
          ? 'Tu as reçu un nouveau message de Charly Guitare.com'
          : `Tu as reçu ${diff} nouveaux messages de Charly Guitare.com`;

        this.scheduleVoiceAnnouncement(message);
      }

      this.lastUnreadCount = count;
    });
  }

  private scheduleVoiceAnnouncement(message: string): void {
    const voice = this.voice;

    setTimeout(async () => {
      if (this.destroyRef.destroyed) return;

      try {
        await voice.waitForSpeechEnd();
        if (this.destroyRef.destroyed) return;
        await voice.speak(message, { pitch: 1.05, rate: 0.95 });
      } catch {
        // silencieux : l'annonce vocale est optionnelle
      }
    }, 300);
  }

  /* ═══════════════════════════════════════════════════════
     MENU
     ═══════════════════════════════════════════════════════ */

  toggleMobileMenu(): void {
    this.isMobileMenuOpen.update(v => !v);
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
     HELPERS
     ═══════════════════════════════════════════════════════ */

  getInitials(name: string | null | undefined): string {
    if (!name) return 'U';

    const parts = name.trim().split(/\s+/).filter(Boolean);

    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }

    return name.substring(0, 2).toUpperCase();
  }
}