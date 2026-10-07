import { CommonModule } from '@angular/common';
import {
  Component, EnvironmentInjector, HostListener, OnDestroy,
  OnInit, runInInjectionContext, inject
} from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Database, equalTo, listVal, orderByChild, query, ref } from '@angular/fire/database';
import { Observable, Subject, of } from 'rxjs';
import { map, switchMap, takeUntil } from 'rxjs/operators';
import { AuthService } from './services/auth.service';
import { UserMessage } from './models/user-message.model';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { FooterComponent } from './features/footer/footer.component';
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
    FooterComponent
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit, OnDestroy {

  title = 'CHARLY GUITARE';
  currentYear = new Date().getFullYear();
  isMobileMenuOpen = false;
  isScrolled = false;
  unreadCount$: Observable<number> = of(0);

  private readonly destroy$ = new Subject<void>();
  private readonly voice = inject(VoiceService);

  /**
   * Dernier nombre de messages non lus connu.
   * Sert à détecter une AUGMENTATION (nouveau message) et non
   * une simple émission du flux Firebase.
   */
  private lastUnreadCount = 0;

  /**
   * Évite d'annoncer la première valeur du flux
   * (sinon on parle à chaque rechargement de page).
   */
  private hasSeenFirstValue = false;

  constructor(
    public readonly auth: AuthService,
    private readonly router: Router,
    private readonly snackBar: MatSnackBar,
    private readonly database: Database,
    private readonly environmentInjector: EnvironmentInjector
  ) { }

  ngOnInit(): void {

    this.unreadCount$ = this.auth.user$.pipe(

      takeUntil(this.destroy$),

      switchMap(user => {

        if (!user) {
          // Déconnexion : reset du compteur
          this.lastUnreadCount = 0;
          this.hasSeenFirstValue = false;
          return of(0);
        }

        return runInInjectionContext(
          this.environmentInjector,
          () => {

            const messagesRef = ref(
              this.database,
              'messages'
            );

            const messagesQuery = query(
              messagesRef,
              orderByChild('userId'),
              equalTo(user.uid)
            );

            return listVal<UserMessage>(
              messagesQuery
            ).pipe(

              map(messages =>
                messages.filter(
                  message =>
                    message.status === 'replied'
                ).length
              )

            );
          }
        );
      })

    );

    // Abonnement séparé pour surveiller les CHANGEMENTS de compteur
    this.watchNewMessages();
  }

  ngOnDestroy(): void {

    this.destroy$.next();

    this.destroy$.complete();
  }

  /* ═══════════════════════════════════════════════════════
     ANNONCE VOCALE DES NOUVEAUX MESSAGES
     ═══════════════════════════════════════════════════════ */
  private watchNewMessages(): void {
    this.unreadCount$
      .pipe(takeUntil(this.destroy$))
      .subscribe(count => {

        // Première valeur : on la mémorise sans parler
        // (évite d'annoncer "3 messages" à chaque rechargement de page)
        if (!this.hasSeenFirstValue) {
          this.hasSeenFirstValue = true;
          this.lastUnreadCount = count;
          return;
        }

        // Nouveau(x) message(s) reçu(s)
        if (count > this.lastUnreadCount) {
          const diff = count - this.lastUnreadCount;

          const message = diff === 1
            ? `Tu as reçu un nouveau message de Charly Guitare.`
            : `Tu as reçu ${diff} nouveaux messages de Charly Guitare.`;

          // Léger délai pour laisser le DOM se stabiliser
          setTimeout(async () => {
            // Attend poliment que la voix actuelle termine avant d'annoncer
            await this.voice.waitForSpeechEnd();

            await this.voice.speak(message, {
              pitch: 1.05,
              rate: 0.95,
            });
          }, 300);
        }

        this.lastUnreadCount = count;
      });
  }

  @HostListener('window:scroll')
  onWindowScroll(): void {

    this.isScrolled =
      window.scrollY > 20;
  }

  toggleMobileMenu(): void {

    this.isMobileMenuOpen =
      !this.isMobileMenuOpen;
  }

  closeMobileMenu(): void {

    this.isMobileMenuOpen = false;
  }

  onLogout(): void {

    this.closeMobileMenu();

    this.auth.logout();

    this.snackBar.open(
      'Déconnexion réussie',
      'Fermer',
      {
        duration: 3000
      }
    );

    void this.router.navigate(['/home']);
  }

  getInitials(
    name: string | null | undefined
  ): string {

    if (!name) {
      return 'U';
    }

    const parts = name
      .trim()
      .split(/\s+/)
      .filter(Boolean);

    if (parts.length >= 2) {

      return `${parts[0][0]}${parts[1][0]}`
        .toUpperCase();
    }

    return name
      .substring(0, 2)
      .toUpperCase();
  }

  
}