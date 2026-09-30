 
import {
  CommonModule
} from '@angular/common';

import {
  Component,
  EnvironmentInjector,
  HostListener,
  OnDestroy,
  OnInit,
  runInInjectionContext
} from '@angular/core';

import {
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet
} from '@angular/router';

import {
  MatSnackBar,
  MatSnackBarModule
} from '@angular/material/snack-bar';

import {
  Database,
  equalTo,
  listVal,
  orderByChild,
  query,
  ref
} from '@angular/fire/database';

import {
  Observable,
  Subject,
  of
} from 'rxjs';

import {
  map,
  switchMap,
  takeUntil
} from 'rxjs/operators';

import { AuthService } from './services/auth.service';

import { UserMessage } from './models/user-message.model';

import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';

import { FooterComponent } from './features/footer/footer.component';

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

  constructor(
    public readonly auth: AuthService,
    private readonly router: Router,
    private readonly snackBar: MatSnackBar,
    private readonly database: Database,
    private readonly environmentInjector: EnvironmentInjector
  ) {}

  ngOnInit(): void {

    this.unreadCount$ = this.auth.user$.pipe(

      takeUntil(this.destroy$),

      switchMap(user => {

        if (!user) {
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
  }

  ngOnDestroy(): void {

    this.destroy$.next();

    this.destroy$.complete();
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

  async onGoogleLogin(): Promise<void> {

    try {

      const result =
        await this.auth.loginWithGoogle();

      if (result.user) {

        this.snackBar.open(
          `Bienvenue ${result.user.displayName ?? ''} !`,
          'Fermer',
          {
            duration: 3000
          }
        );

        await this.router.navigate([
          '/academie'
        ]);
      }

    } catch (error) {

      console.error(
        'Erreur lors de la connexion Google :',
        error
      );

      this.snackBar.open(
        'Échec de la connexion Google',
        'Fermer',
        {
          duration: 3000
        }
      );
    }
  }
} 