// src/app/app.component.ts

import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  EnvironmentInjector,
  afterNextRender,
  effect,
  inject,
  runInInjectionContext,
  signal,
} from '@angular/core';

import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';

import { Database, listVal, ref } from '@angular/fire/database';

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

import { Observable, of } from 'rxjs';
import {
  catchError,
  distinctUntilChanged,
  map,
  switchMap,
} from 'rxjs/operators';

import { InstallPromptComponent } from './home/install-prompt/install-prompt.component';

import type { Message } from './home/models/message.model';

import { AuthService } from './home/services/auth.service';
import { VoiceService } from './game/services/voice.service';
 
import { getInitials } from './home/utils/string.utils';
import { AnalyticsService } from './shared/services/analytics.service';

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

  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);
  private readonly database = inject(Database);
  private readonly voice = inject(VoiceService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly environmentInjector = inject(EnvironmentInjector);
  private readonly analytics = inject(AnalyticsService);

  readonly auth = inject(AuthService);

  readonly title = 'CHARLY GUITARE';
  readonly currentYear = new Date().getFullYear();

  readonly user = toSignal(this.auth.user$, { initialValue: null });

  readonly isMobileMenuOpen = signal(false);
  readonly isScrolled = signal(false);

  readonly unreadCount = toSignal(this.watchUnreadMessages(), {
    initialValue: 0,
  });

  private readonly lastUnreadCount = signal(0);
  private readonly hasSeenFirstValue = signal(false);
  private voiceTimeoutId: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    /* ✅ Initialisation GA4 manuelle */
    this.analytics.initPageTracking();

    this.setupVoicePrime();

    afterNextRender(() => {
      const scrolled$ = new Observable<boolean>((subscriber) => {
        const onScroll = () => subscriber.next(window.scrollY > 20);
        window.addEventListener('scroll', onScroll, { passive: true });
        onScroll();
        return () => window.removeEventListener('scroll', onScroll);
      }).pipe(distinctUntilChanged());

      scrolled$
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe((value) => this.isScrolled.set(value));
    });

    this.watchNewMessages();

    this.destroyRef.onDestroy(() => {
      if (this.voiceTimeoutId !== null) {
        clearTimeout(this.voiceTimeoutId);
        this.voiceTimeoutId = null;
      }
    });
  }

  private setupVoicePrime(): void {
    const primeVoice = () => {
      this.voice.prime();
      document.removeEventListener('click', primeVoice);
      document.removeEventListener('keydown', primeVoice);
      document.removeEventListener('touchstart', primeVoice);
    };

    document.addEventListener('click', primeVoice, { once: true });
    document.addEventListener('keydown', primeVoice, { once: true });
    document.addEventListener('touchstart', primeVoice, { once: true });

    this.destroyRef.onDestroy(() => {
      document.removeEventListener('click', primeVoice);
      document.removeEventListener('keydown', primeVoice);
      document.removeEventListener('touchstart', primeVoice);
    });
  }

  private watchUnreadMessages(): Observable<number> {
    return this.auth.user$.pipe(
      takeUntilDestroyed(this.destroyRef),

      switchMap((user) => {
        if (!user?.uid) {
          this.lastUnreadCount.set(0);
          this.hasSeenFirstValue.set(false);
          return of(0);
        }

        return runInInjectionContext(this.environmentInjector, () => {
          const inboxRef = ref(this.database, `messages/${user.uid}/inbox`);

          return listVal<Message>(inboxRef, { keyField: 'key' }).pipe(
            map((messages) =>
              messages.filter((m) => m.read === false).length,
            ),
            catchError((err) => {
              console.warn(
                '[AppComponent] Lecture messages refusée pour uid',
                user.uid,
                err?.message ?? err,
              );
              return of(0);
            }),
          );
        });
      }),

      catchError((err) => {
        console.warn('[AppComponent] watchUnreadMessages error:', err);
        return of(0);
      }),
    );
  }

  private watchNewMessages(): void {
    effect(() => {
      const count = this.unreadCount();

      if (!this.hasSeenFirstValue()) {
        this.hasSeenFirstValue.set(true);
        this.lastUnreadCount.set(count);
        return;
      }

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
        await voice.speak(message, {
          pitch: 1.05,
          rate: 0.95,
          lang: 'fr-FR',
        });
      } catch {
        /* silencieux */
      }
    }, 300);
  }

  toggleMobileMenu(): void {
    this.isMobileMenuOpen.update((v) => !v);
  }

  closeMobileMenu(): void {
    if (this.isMobileMenuOpen()) {
      this.isMobileMenuOpen.set(false);
    }
  }

  onLogout(): void {
    this.closeMobileMenu();
    void this.auth.logout();
    this.snackBar.open('Déconnexion réussie', 'Fermer', { duration: 3000 });
    void this.router.navigate(['/']);
  }

  getInitials = (name: string | null | undefined): string =>
    getInitials(name, '', 'O');
}