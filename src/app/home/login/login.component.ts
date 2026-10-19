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
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
} from '@angular/fire/auth';

import {
  Database,
  get,
  ref,
  set,
  update,
} from '@angular/fire/database';

import { DEFAULT_RETURN_URL_LOGIN } from '../constants/auth.constants';
import { TOAST_DURATION_MS } from '../../academie/constants/documents-ui.constants';
import { UserOrigin, RealtimeUserProfile } from '../models/auth.model';

import { AuthAlertComponent } from '../auth/auth-alert/auth-alert.component';
import { AuthHeaderComponent } from '../auth/auth-header/auth-header.component';
import { AuthInputComponent } from '../auth/auth-input/auth-input.component';
import { AuthLayoutComponent } from '../auth/auth-layout/auth-layout.component';
import { GoogleButtonComponent } from '../auth/google-button/google-button.component';
import { AuthContextService } from '../services/auth-context.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-login',
  imports: [
    AuthLayoutComponent,
    AuthHeaderComponent,
    AuthAlertComponent,
    GoogleButtonComponent,
    AuthInputComponent,
    FormsModule,
  ],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginComponent {

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

  readonly email = signal('');
  readonly password = signal('');
  readonly showPassword = signal(false);

  readonly errorMessage = signal('');
  readonly successMessage = signal('');
  readonly loading = signal(false);

  readonly returnUrl = signal(DEFAULT_RETURN_URL_LOGIN);

  private toastTimeoutId: ReturnType<typeof setTimeout> | null = null;

  /* ═══════════════════════════════════════════════════════
     CONSTRUCTEUR
     ═══════════════════════════════════════════════════════ */

  constructor() {
    afterNextRender(() => {
      this.returnUrl.set(
        this.authContext.resolveReturnUrl(DEFAULT_RETURN_URL_LOGIN),
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
     CONNEXION EMAIL / MOT DE PASSE
     ═══════════════════════════════════════════════════════ */

  async handleSubmit(): Promise<void> {
    if (this.loading()) return;

    this.clearMessages();

    const email = this.email().trim();
    const password = this.password();

    if (!email || !password) {
      this.showError('Veuillez remplir tous les champs.');
      return;
    }

    this.loading.set(true);

    try {
      const credential = await this.authContext.runInContext(() =>
        signInWithEmailAndPassword(this.auth, email, password),
      );

      await this.handleSuccessfulLogin(credential.user, 'email');
    } catch (error: unknown) {
      this.showError(this.authContext.getFrenchErrorMessage(error));
    } finally {
      this.loading.set(false);
    }
  }

  /* ═══════════════════════════════════════════════════════
     CONNEXION GOOGLE
     ═══════════════════════════════════════════════════════ */

  async loginWithGoogle(): Promise<void> {
    if (this.loading()) return;

    this.clearMessages();
    this.loading.set(true);

    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });

      const credential = await this.authContext.runInContext(() =>
        signInWithPopup(this.auth, provider),
      );

      await this.handleSuccessfulLogin(credential.user, 'google');
    } catch (error: unknown) {
      /* ✅ Ignore la fermeture volontaire de popup */
      if (
        this.authContext.getFirebaseErrorCode(error) !==
        'auth/popup-closed-by-user'
      ) {
        this.showError(this.authContext.getFrenchErrorMessage(error));
      }
    } finally {
      this.loading.set(false);
    }
  }

  /* ═══════════════════════════════════════════════════════
     HANDLER — APRÈS CONNEXION RÉUSSIE
     ═══════════════════════════════════════════════════════ */

  private async handleSuccessfulLogin(
    user: User | null,
    origine: UserOrigin,
  ): Promise<void> {
    if (!user) {
      await this.router.navigateByUrl(this.returnUrl());
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
        get(userReference),
      );
      exists = snapshot.exists();
    } catch {
      /* Lecture échouée — on continue en mode création */
    }

    /* ✅ Écriture en arrière-plan (ne bloque pas la navigation) */
    void this.writeUserToDatabaseInBackground(
      user,
      exists || isLikelyNewUser,
      origine,
    );

    await this.router.navigateByUrl(this.returnUrl());
  }

  /* ═══════════════════════════════════════════════════════
     ÉCRITURE DB EN ARRIÈRE-PLAN
     ═══════════════════════════════════════════════════════ */

  private async writeUserToDatabaseInBackground(
    user: User,
    exists: boolean,
    origine: UserOrigin,
  ): Promise<void> {
    const userReference = ref(this.database, `users/${user.uid}`);
    const now = new Date().toISOString();
    const email = user.email ?? '';
    /* ✅ `split` retourne toujours un tableau → le `?? ''` était mort */
    const displayName = user.displayName ?? email.split('@')[0] ?? 'Utilisateur';
    const photoURL = user.photoURL ?? '';

    try {
      if (exists) {
        await this.authContext.runInContext(() =>
          update(userReference, {
            lastLogin: now,
            email,
            displayName,
            photoURL,
          }),
        );
        return;
      }

      /* ✅ Profil initial (sans credit) */
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
        set(userReference, newUser),
      );
    } catch (err) {
      console.error('[Login] Erreur sauvegarde profil :', err);
    }
  }

  /* ═══════════════════════════════════════════════════════
     MOT DE PASSE OUBLIÉ
     ═══════════════════════════════════════════════════════ */

  async onForgotPassword(): Promise<void> {
    if (this.loading()) return;

    this.clearMessages();

    const email = this.email().trim();

    if (!email) {
      this.showError(
        'Entrez votre e-mail pour recevoir un lien de réinitialisation.',
      );
      return;
    }

    this.loading.set(true);

    try {
      await this.authContext.runInContext(() =>
        sendPasswordResetEmail(this.auth, email),
      );

      this.showSuccess(
        'Un e-mail de réinitialisation vous a été envoyé.',
      );
    } catch (error: unknown) {
      this.showError(this.authContext.getFrenchErrorMessage(error));
    } finally {
      this.loading.set(false);
    }
  }

  /* ═══════════════════════════════════════════════════════
     HELPERS — MESSAGES
     ═══════════════════════════════════════════════════════ */

  private clearMessages(): void {
    this.errorMessage.set('');
    this.successMessage.set('');
  }

  private showError(message: string): void {
    this.errorMessage.set(message);
    this.successMessage.set('');
    this.scheduleMessageClear(message);
  }

  private showSuccess(message: string): void {
    this.successMessage.set(message);
    this.errorMessage.set('');
    this.scheduleMessageClear(message);
  }

  private scheduleMessageClear(message: string): void {
    if (this.toastTimeoutId !== null) {
      clearTimeout(this.toastTimeoutId);
    }

    this.toastTimeoutId = setTimeout(() => {
      if (this.errorMessage() === message) this.errorMessage.set('');
      if (this.successMessage() === message) this.successMessage.set('');
      this.toastTimeoutId = null;
    }, TOAST_DURATION_MS);
  }
}