// src/app/auth/register/register.component.ts

import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  afterNextRender,
  inject,
  signal,
} from '@angular/core';

import { Router } from '@angular/router';

import {
  Auth,
  GoogleAuthProvider,
  User,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signInWithPopup,
} from '@angular/fire/auth';

import {
  Database,
  get,
  ref,
  set,
  update,
} from '@angular/fire/database';

import { DEFAULT_RETURN_URL_REGISTER } from '../constants/auth.constants';
import { TOAST_DURATION_MS } from '../../academie/constants/documents-ui.constants';
import { UserOrigin, RealtimeUserProfile } from '../models/auth.model';

import { AuthAlertComponent } from '../auth/auth-alert/auth-alert.component';
import { AuthHeaderComponent } from '../auth/auth-header/auth-header.component';
import { AuthInputComponent } from '../auth/auth-input/auth-input.component';
import { AuthLayoutComponent } from '../auth/auth-layout/auth-layout.component';
import { GoogleButtonComponent } from '../auth/google-button/google-button.component';
import { AuthContextService } from '../services/auth-context.service';
import { isValidEmail } from '../utils/validation.util';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-register',
  imports: [
    AuthLayoutComponent,
    AuthHeaderComponent,
    AuthAlertComponent,
    GoogleButtonComponent,
    AuthInputComponent,
    FormsModule,
  ],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegisterComponent {

  /* ═══════════════════════════════════════════════════════
     INJECTION
     ═══════════════════════════════════════════════════════ */

  private readonly auth = inject(Auth);
  private readonly database = inject(Database);
  private readonly router = inject(Router);
  private readonly authContext = inject(AuthContextService);
  private readonly destroyRef = inject(DestroyRef);

  /* ═══════════════════════════════════════════════════════
     ÉTAT — SIGNALS
     ═══════════════════════════════════════════════════════ */

  /** Formulaire */
  readonly email = signal('');
  readonly password = signal('');
  readonly confirmPassword = signal('');
  readonly showPassword = signal(false);

  /** États UI */
  readonly errorMessage = signal('');
  readonly successMessage = signal('');
  readonly loading = signal(false);

  /** URL de retour après inscription. */
  readonly returnUrl = signal(DEFAULT_RETURN_URL_REGISTER);

  /* ─── Timer interne ─── */
  private toastTimeoutId: ReturnType<typeof setTimeout> | null = null;

  /* ═══════════════════════════════════════════════════════
     CONSTRUCTEUR
     ═══════════════════════════════════════════════════════ */

  constructor() {
    afterNextRender(() => {
      this.returnUrl.set(
        this.authContext.resolveReturnUrl(DEFAULT_RETURN_URL_REGISTER)
      );
    });

    this.destroyRef.onDestroy(() => {
      if (this.toastTimeoutId !== null) {
        clearTimeout(this.toastTimeoutId);
        this.toastTimeoutId = null;
      }
    });
  }

  /* ═══════════════════════════════════════════════════════
     UI HELPERS
     ═══════════════════════════════════════════════════════ */

  togglePasswordVisibility(): void {
    this.showPassword.update((v) => !v);
  }

  /* ═══════════════════════════════════════════════════════
     INSCRIPTION EMAIL / MOT DE PASSE
     ═══════════════════════════════════════════════════════ */

  async handleSubmit(): Promise<void> {
    this.clearMessages();

    const email = this.email().trim();
    const password = this.password();
    const confirmPassword = this.confirmPassword();

    if (!email || !password || !confirmPassword) {
      this.showToast('Veuillez remplir tous les champs.', 'error');
      return;
    }

    if (!isValidEmail(email)) {
      this.showToast('Adresse e-mail invalide.', 'error');
      return;
    }

    if (password !== confirmPassword) {
      this.showToast('Les mots de passe ne correspondent pas.', 'error');
      return;
    }

    if (password.length < 6) {
      this.showToast(
        'Le mot de passe doit contenir au moins 6 caractères.',
        'error'
      );
      return;
    }

    this.loading.set(true);

    try {
      const credential = await this.authContext.runInContext(() =>
        createUserWithEmailAndPassword(this.auth, email, password)
      );

      const user = credential.user;

      if (!user) {
        this.showToast('Création du compte échouée.', 'error');
        return;
      }

      try {
        await this.saveUserDataInRealtimeDB(user, 'email');
      } catch {
        this.showToast(
          "Compte créé, mais impossible d'enregistrer votre profil. Contactez le support.",
          'error'
        );
      }

      void this.authContext.runInContext(() =>
        sendEmailVerification(user).catch(() => {
          /* Envoi email vérification échoué — silencieux */
        })
      );

      await this.router.navigateByUrl(this.returnUrl());
    } catch (error: unknown) {
      this.showToast(this.authContext.getFrenchErrorMessage(error), 'error');
    } finally {
      this.loading.set(false);
    }
  }

  /* ═══════════════════════════════════════════════════════
     INSCRIPTION GOOGLE
     ═══════════════════════════════════════════════════════ */

  async signUpWithGoogle(): Promise<void> {
    this.clearMessages();
    this.loading.set(true);

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
      } catch {
        this.showToast(
          "Compte créé, mais impossible d'enregistrer votre profil. Contactez le support.",
          'error'
        );
      }

      await this.router.navigateByUrl(this.returnUrl());
    } catch (error: unknown) {
      const code = this.authContext.getFirebaseErrorCode(error);

      if (code !== 'auth/popup-closed-by-user') {
        this.showToast(this.authContext.getFrenchErrorMessage(error), 'error');
      }
    } finally {
      this.loading.set(false);
    }
  }

  /* ═══════════════════════════════════════════════════════
     SYNCHRONISATION REALTIME DATABASE
     ═══════════════════════════════════════════════════════ */

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
          photoURL,
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
      origine,
    };

    await this.authContext.runInContext(() =>
      set(userRef, newUser)
    );
  }

  /* ═══════════════════════════════════════════════════════
     HELPERS
     ═══════════════════════════════════════════════════════ */

  private clearMessages(): void {
    this.errorMessage.set('');
    this.successMessage.set('');
  }

  private showToast(message: string, type: 'success' | 'error'): void {
    if (type === 'success') {
      this.successMessage.set(message);
      this.errorMessage.set('');
    } else {
      this.errorMessage.set(message);
      this.successMessage.set('');
    }

    if (this.toastTimeoutId !== null) {
      clearTimeout(this.toastTimeoutId);
    }

    this.toastTimeoutId = setTimeout(() => {
      if (this.successMessage() === message) this.successMessage.set('');
      if (this.errorMessage() === message) this.errorMessage.set('');
      this.toastTimeoutId = null;
    }, TOAST_DURATION_MS);
  }
}