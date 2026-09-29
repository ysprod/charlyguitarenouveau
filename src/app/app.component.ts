import { Component, HostListener, OnInit, OnDestroy } from '@angular/core';
import { AuthService } from './services/auth.service';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AngularFireDatabase } from '@angular/fire/compat/database';
import { Observable, Subject, of } from 'rxjs';
import { switchMap, map, takeUntil } from 'rxjs/operators';
import { UserMessage } from './models/user-message.model';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'CHARLY GUITARE';
  currentYear: number = new Date().getFullYear();

  isMobileMenuOpen = false;
  isScrolled = false;

  unreadCount$!: Observable<number>;
  private destroy$ = new Subject<void>();

  constructor(
    public auth: AuthService,
    private router: Router,
    private snackBar: MatSnackBar,
    private db: AngularFireDatabase
  ) {}

  ngOnInit(): void {
    // Calcul du nombre de messages ayant des réponses non lues ou un statut actif
    this.unreadCount$ = this.auth.user$.pipe(
      takeUntil(this.destroy$),
      switchMap(user => {
        if (!user) return of(0);

        return this.db
          .list<UserMessage>('messages', ref =>
            ref.orderByChild('userId').equalTo(user.uid)
          )
          .valueChanges()
          .pipe(
            map(messages => {
              // On compte les messages qui ont le statut 'replied' (répondu par l'admin)
              return messages.filter(m => m.status === 'replied').length;
            })
          );
      })
    );
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  @HostListener('window:scroll', [])
  onWindowScroll() {
    this.isScrolled = window.scrollY > 20;
  }

  toggleMobileMenu(): void {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
  }

  closeMobileMenu(): void {
    this.isMobileMenuOpen = false;
  }

  onLogout(): void {
    this.closeMobileMenu();
    this.auth.logout();

    this.snackBar.open('Déconnexion réussie', 'Fermer', { duration: 3000 });
    this.router.navigate(['/home']);
  }

  getInitials(name: string | null | undefined): string {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }

  async onGoogleLogin() {
    try {
      const result = await this.auth.loginWithGoogle();
      if (result.user) {
        this.snackBar.open(`Bienvenue ${result.user.displayName} !`, 'Fermer', { duration: 3000 });
        this.router.navigate(['/academie']);
      }
    } catch (error) {
      console.error('Erreur lors de la connexion Google :', error);
      this.snackBar.open('Échec de la connexion Google', 'Fermer', { duration: 3000 });
    }
  }
}