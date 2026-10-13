import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  inject
} from '@angular/core';

import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import {
  Auth,
  GoogleAuthProvider,
  User,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signInWithPopup
} from '@angular/fire/auth';

import {
  Database,
  get,
  ref,
  set,
  update
} from '@angular/fire/database';
import { DEFAULT_RETURN_URL_REGISTER } from '../constants/auth.constants';
import { TOAST_DURATION_MS } from '../../academie/documents-ui.constants';
import { UserOrigin, RealtimeUserProfile } from '../models/auth.model';
import { AuthContextService } from '../auth-context.service';
import { AuthAlertComponent } from '../auth-alert/auth-alert.component';
import { AuthHeaderComponent } from '../auth-header/auth-header.component';
import { AuthInputComponent } from '../auth-input/auth-input.component';
import { AuthLayoutComponent } from '../auth-layout/auth-layout.component';
import { GoogleButtonComponent } from '../google-button/google-button.component';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    FormsModule,
    AuthLayoutComponent,
    AuthHeaderComponent,
    AuthAlertComponent,
    GoogleButtonComponent,
    AuthInputComponent
  ],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RegisterComponent implements OnInit, OnDestroy {

  /* ─── Formulaire ─── */
  email = '';
  password = '';
  confirmPassword = '';
  errorMessage = '';
  successMessage = '';
  loading = false;
  showPassword = false;

  returnUrl: string = DEFAULT_RETURN_URL_REGISTER;

  private toastTimeoutId: ReturnType<typeof setTimeout> | null = null;

  /* ─── Injection ─── */
  private readonly auth = inject(Auth);
  private readonly database = inject(Database);
  private readonly router = inject(Router);
  private readonly authContext = inject(AuthContextService);

  /* ═══════════════════════════════════════════════════════════════════
     CYCLE DE VIE
     ═══════════════════════════════════════════════════════════════════ */

  ngOnInit(): void {
    this.returnUrl = this.authContext.resolveReturnUrl(
      DEFAULT_RETURN_URL_REGISTER
    );
  }

  ngOnDestroy(): void {
    if (this.toastTimeoutId !== null) {
      clearTimeout(this.toastTimeoutId);
      this.toastTimeoutId = null;
    }
  }

  /* ═══════════════════════════════════════════════════════════════════
     UI HELPERS
     ═══════════════════════════════════════════════════════════════════ */

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  /* ═══════════════════════════════════════════════════════════════════
     INSCRIPTION EMAIL / MOT DE PASSE
     ═══════════════════════════════════════════════════════════════════ */

  async handleSubmit(): Promise<void> {
    this.clearMessages();

    if (!this.email || !this.password || !this.confirmPassword) {
      this.showToast('Veuillez remplir tous les champs.', 'error');
      return;
    }

    const email = this.email.trim();

    if (!this.isValidEmail(email)) {
      this.showToast('Adresse e-mail invalide.', 'error');
      return;
    }

    if (this.password !== this.confirmPassword) {
      this.showToast('Les mots de passe ne correspondent pas.', 'error');
      return;
    }

    if (this.password.length < 6) {
      this.showToast(
        'Le mot de passe doit contenir au moins 6 caractères.',
        'error'
      );
      return;
    }

    this.loading = true;

    try {
      const credential = await this.authContext.runInContext(() =>
        createUserWithEmailAndPassword(this.auth, email, this.password)
      );

      const user = credential.user;

      if (!user) {
        this.showToast('Création du compte échouée.', 'error');
        return;
      }

      try {
        await this.saveUserDataInRealtimeDB(user, 'email');
      } catch (dbError) {
        console.error('❌ Erreur écriture DB :', dbError);
        this.showToast(
          "Compte créé, mais impossible d'enregistrer votre profil. Contactez le support.",
          'error'
        );
      }

      void this.authContext.runInContext(() =>
        sendEmailVerification(user).catch((error) => {
          console.warn('Envoi email vérification échoué :', error);
        })
      );

      await this.router.navigateByUrl(this.returnUrl);

    } catch (error: unknown) {
      this.showToast(this.authContext.getFrenchErrorMessage(error), 'error');
    } finally {
      this.loading = false;
    }
  }

  /* ═══════════════════════════════════════════════════════════════════
     INSCRIPTION GOOGLE
     ═══════════════════════════════════════════════════════════════════ */

  async signUpWithGoogle(): Promise<void> {
    this.clearMessages();
    this.loading = true;

    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });

      const credential = await this.authContext.runInContext(() =>
        signInWithPopup(this.auth, provider)
      );

      const user = credential.user;

      if (!user) {
        this.showToast('Création du compte Google échouée.', 'error');
        return;
      }

      try {
        await this.saveUserDataInRealtimeDB(user, 'google');
      } catch (dbError) {
        console.error('❌ Erreur écriture DB :', dbError);
        this.showToast(
          "Compte créé, mais impossible d'enregistrer votre profil. Contactez le support.",
          'error'
        );
      }

      await this.router.navigateByUrl(this.returnUrl);

    } catch (error: unknown) {
      const code = this.authContext.getFirebaseErrorCode(error);

      if (code !== 'auth/popup-closed-by-user') {
        this.showToast(this.authContext.getFrenchErrorMessage(error), 'error');
      }
    } finally {
      this.loading = false;
    }
  }

  /* ═══════════════════════════════════════════════════════════════════
     SYNCHRONISATION REALTIME DATABASE
     ═══════════════════════════════════════════════════════════════════ */

  private async saveUserDataInRealtimeDB(
    user: User,
    origine: UserOrigin
  ): Promise<void> {
    const userRef = ref(this.database, `users/${user.uid}`);

    const snapshot = await this.authContext.runInContext(() =>
      get(userRef)
    );

    const now = new Date().toISOString();
    const email = user.email ?? '';
    const displayName = user.displayName ?? email.split('@')[0] ?? '';
    const photoURL = user.photoURL ?? '';

    if (snapshot.exists()) {
      await this.authContext.runInContext(() =>
        update(userRef, {
          lastLogin: now,
          email,
          displayName,
          photoURL
        })
      );
      return;
    }

    const newUser: RealtimeUserProfile = {
      uid: user.uid,
      email,
      displayName,
      photoURL,
      role: 'user',
      createdAt: now,
      lastLogin: now,
      disabled: false,
      origine
    };

    await this.authContext.runInContext(() =>
      set(userRef, newUser)
    );
  }

  /* ═══════════════════════════════════════════════════════════════════
     HELPERS
     ═══════════════════════════════════════════════════════════════════ */

  private isValidEmail(email: string): boolean {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailPattern.test(email);
  }

  private clearMessages(): void {
    this.errorMessage = '';
    this.successMessage = '';
  }

  private showToast(
    message: string,
    type: 'success' | 'error'
  ): void {
    if (type === 'success') {
      this.successMessage = message;
      this.errorMessage = '';
    } else {
      this.errorMessage = message;
      this.successMessage = '';
    }

    if (this.toastTimeoutId !== null) {
      clearTimeout(this.toastTimeoutId);
    }

    this.toastTimeoutId = setTimeout(() => {
      if (this.successMessage === message) this.successMessage = '';
      if (this.errorMessage === message) this.errorMessage = '';
      this.toastTimeoutId = null;
    }, TOAST_DURATION_MS);
  }
}