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
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup
} from '@angular/fire/auth';

import {
  Database,
  get,
  ref,
  set,
  update
} from '@angular/fire/database';
import { DEFAULT_RETURN_URL_LOGIN } from '../constants/auth.constants';
import { TOAST_DURATION_MS } from '../constants/documents-ui.constants';
import { UserOrigin, RealtimeUserProfile } from '../models/auth.model';
import { AuthContextService } from '../services/auth-context.service';
import { AuthAlertComponent } from '../shared/auth-alert/auth-alert.component';
import { AuthHeaderComponent } from '../shared/auth-header/auth-header.component';
import { AuthInputComponent } from '../shared/auth-input/auth-input.component';
import { AuthLayoutComponent } from '../shared/auth-layout/auth-layout.component';
import { GoogleButtonComponent } from '../shared/google-button/google-button.component';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    FormsModule,
    AuthLayoutComponent,
    AuthHeaderComponent,
    AuthAlertComponent,
    GoogleButtonComponent,
    AuthInputComponent
  ],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoginComponent implements OnInit, OnDestroy {

  private readonly auth = inject(Auth);
  private readonly database = inject(Database);
  private readonly router = inject(Router);
  private readonly authContext = inject(AuthContextService);

  private toastTimeoutId: ReturnType<typeof setTimeout> | null = null;

  /* ─── Formulaire ─── */
  email = '';
  password = '';
  showPassword = false;

  /* ─── États UI ─── */
  errorMessage = '';
  successMessage = '';
  loading = false;

  returnUrl: string = DEFAULT_RETURN_URL_LOGIN;

  /* ═══════════════════════════════════════════════════════════════════
     CYCLE DE VIE
     ═══════════════════════════════════════════════════════════════════ */

  ngOnInit(): void {
    this.returnUrl = this.authContext.resolveReturnUrl(
      DEFAULT_RETURN_URL_LOGIN
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
     CONNEXION EMAIL / MOT DE PASSE
     ═══════════════════════════════════════════════════════════════════ */

  async handleSubmit(): Promise<void> {
    this.clearMessages();

    const email = this.email.trim();

    if (!email || !this.password) {
      this.showToast('Veuillez remplir tous les champs.', 'error');
      return;
    }

    this.loading = true;

    try {
      const credential = await this.authContext.runInContext(() =>
        signInWithEmailAndPassword(this.auth, email, this.password)
      );

      await this.handleSuccessfulLogin(credential.user, 'email');

    } catch (error: unknown) {
      this.showToast(this.authContext.getFrenchErrorMessage(error), 'error');
    } finally {
      this.loading = false;
    }
  }

  /* ═══════════════════════════════════════════════════════════════════
     CONNEXION GOOGLE
     ═══════════════════════════════════════════════════════════════════ */

  async loginWithGoogle(): Promise<void> {
    this.clearMessages();
    this.loading = true;

    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });

      const credential = await this.authContext.runInContext(() =>
        signInWithPopup(this.auth, provider)
      );

      await this.handleSuccessfulLogin(credential.user, 'google');

    } catch (error: unknown) {
      if (
        this.authContext.getFirebaseErrorCode(error) !==
        'auth/popup-closed-by-user'
      ) {
        this.showToast(this.authContext.getFrenchErrorMessage(error), 'error');
      }
    } finally {
      this.loading = false;
    }
  }

  /* ═══════════════════════════════════════════════════════════════════
     HANDLER — APRÈS CONNEXION RÉUSSIE
     ═══════════════════════════════════════════════════════════════════ */

  private async handleSuccessfulLogin(
    user: User | null,
    origine: UserOrigin
  ): Promise<void> {
    if (!user) {
      await this.router.navigateByUrl(this.returnUrl);
      return;
    }

    const createdAt = user.metadata?.creationTime;
    const lastLoginAt = user.metadata?.lastSignInTime;
    const isLikelyNewUser =
      !!createdAt && !!lastLoginAt && createdAt === lastLoginAt;

    const userReference = ref(this.database, `users/${user.uid}`);
    let exists = false;

    try {
      const snapshot = await this.authContext.runInContext(() =>
        get(userReference)
      );
      exists = snapshot.exists();
    } catch (error) {
      console.warn('Lecture profil échouée (fallback) :', error);
    }

    void this.writeUserToDatabaseInBackground(
      user,
      exists || isLikelyNewUser === false ? exists : false,
      origine
    );

    await this.router.navigateByUrl(this.returnUrl);
  }

  /* ═══════════════════════════════════════════════════════════════════
     ÉCRITURE DB EN ARRIÈRE-PLAN
     ═══════════════════════════════════════════════════════════════════ */

  private async writeUserToDatabaseInBackground(
    user: User,
    exists: boolean,
    origine: UserOrigin
  ): Promise<void> {
    const userReference = ref(this.database, `users/${user.uid}`);
    const now = new Date().toISOString();
    const email = user.email ?? '';
    const displayName = user.displayName ?? email.split('@')[0] ?? '';
    const photoURL = user.photoURL ?? '';

    try {
      if (exists) {
        await this.authContext.runInContext(() =>
          update(userReference, {
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
        set(userReference, newUser)
      );

    } catch (error) {
      console.warn('Mise à jour profil en arrière-plan échouée :', error);
    }
  }

  /* ═══════════════════════════════════════════════════════════════════
     MOT DE PASSE OUBLIÉ
     ═══════════════════════════════════════════════════════════════════ */

  async onForgotPassword(): Promise<void> {
    this.clearMessages();

    const email = this.email.trim();

    if (!email) {
      this.showToast(
        'Entrez votre e-mail pour recevoir un lien de réinitialisation.',
        'error'
      );
      return;
    }

    this.loading = true;

    try {
      await this.authContext.runInContext(() =>
        sendPasswordResetEmail(this.auth, email)
      );

      this.showToast(
        'Un e-mail de réinitialisation vous a été envoyé.',
        'success'
      );

    } catch (error: unknown) {
      this.showToast(this.authContext.getFrenchErrorMessage(error), 'error');
    } finally {
      this.loading = false;
    }
  }

  /* ═══════════════════════════════════════════════════════════════════
     HELPERS
     ═══════════════════════════════════════════════════════════════════ */

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