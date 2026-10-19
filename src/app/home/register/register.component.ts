// src/app/auth/register/register.component.ts

import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  afterNextRender,
  computed,
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

/* ═════════════════════════════════════════════════════════════════════
   REGISTER — Création de compte
   ═════════════════════════════════════════════════════════════════════ */

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

  readonly email = signal('');
  readonly password = signal('');
  readonly confirmPassword = signal('');

  /** ✅ Un toggle par champ : l'œil du mot de passe ne pilote plus celui de la confirmation */
  readonly showPassword = signal(false);
  readonly showConfirmPassword = signal(false);

  readonly errorMessage = signal('');
  readonly successMessage = signal('');
  readonly loading = signal(false);

  readonly returnUrl = signal(DEFAULT_RETURN_URL_REGISTER);

  /** ✅ Computed : le bouton "Créer mon compte" est désactivé tant que les champs sont vides */
  readonly canSubmit = computed(
    () =>
      !this.loading() &&
      this.email().trim().length > 0 &&
      this.password().length > 0 &&
      this.confirmPassword().length > 0,
  );

  private toastTimeoutId: ReturnType<typeof setTimeout> | null = null;

  /* ═══════════════════════════════════════════════════════
     CONSTRUCTEUR
     ═══════════════════════════════════════════════════════ */

  constructor() {
    afterNextRender(() => {
      this.returnUrl.set(
        this.authContext.resolveReturnUrl(DEFAULT_RETURN_URL_REGISTER),
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

  toggleConfirmPasswordVisibility(): void {
    this.showConfirmPassword.update((v) => !v);
  }

  /* ═══════════════════════════════════════════════════════
     INSCRIPTION EMAIL / MOT DE PASSE
     ═══════════════════════════════════════════════════════ */

  async handleSubmit(): Promise<void> {
    if (this.loading()) return;

    this.clearMessages();

    const email = this.email().trim();
    const password = this.password();
    const confirmPassword = this.confirmPassword();

    /* ─── 1. Validation basique ─── */
    if (!email || !password || !confirmPassword) {
      this.showError('Veuillez remplir tous les champs.');
      return;
    }

    if (!isValidEmail(email)) {
      this.showError('Adresse e-mail invalide.');
      return;
    }

    if (password !== confirmPassword) {
      this.showError('Les mots de passe ne correspondent pas.');
      return;
    }

    if (password.length < 6) {
      this.showError(
        'Le mot de passe doit contenir au moins 6 caractères.',
      );
      return;
    }

    this.loading.set(true);

    try {
      /* ─── 2. Création Firebase Auth ─── */
      const credential = await this.authContext.runInContext(() =>
        createUserWithEmailAndPassword(this.auth, email, password),
      );

      const user = credential.user;

      if (!user) {
        this.showError('Création du compte échouée.');
        return;
      }

      /* ─── 3. Persistance RTDB (non bloquante) ─── */
      try {
        await this.saveUserDataInRealtimeDB(user, 'email');
      } catch (err) {
        console.error('[Register] Erreur sauvegarde profil :', err);
        this.showError(
          "Compte créé, mais impossible d'enregistrer votre profil. Contactez le support.",
        );
      }

      /* ─── 4. Email de vérification (fire & forget SAFE) ─── */
      void this.sendVerificationSafely(user);

      /* ─── 5. Redirection ─── */
      await this.router.navigateByUrl(this.returnUrl());
    } catch (error: unknown) {
      this.showError(this.authContext.getFrenchErrorMessage(error));
    } finally {
      this.loading.set(false);
    }
  }

  /* ═══════════════════════════════════════════════════════
     INSCRIPTION GOOGLE
     ═══════════════════════════════════════════════════════ */

  async signUpWithGoogle(): Promise<void> {
    if (this.loading()) return;

    this.clearMessages();
    this.loading.set(true);

    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });

      const credential = await this.authContext.runInContext(() =>
        signInWithPopup(this.auth, provider),
      );

      const user = credential.user;

      if (!user) {
        this.showError('Création du compte Google échouée.');
        return;
      }

      try {
        await this.saveUserDataInRealtimeDB(user, 'google');
      } catch (err) {
        console.error('[Register] Erreur sauvegarde profil Google :', err);
        this.showError(
          "Compte créé, mais impossible d'enregistrer votre profil. Contactez le service support.",
        );
      }

      await this.router.navigateByUrl(this.returnUrl());
    } catch (error: unknown) {
      const code = this.authContext.getFirebaseErrorCode(error);

      /* ✅ Ignore les fermetures volontaires de popup */
      if (code !== 'auth/popup-closed-by-user') {
        this.showError(this.authContext.getFrenchErrorMessage(error));
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
    origine: UserOrigin,
  ): Promise<void> {
    const userRef = ref(this.database, `users/${user.uid}`);

    const snapshot = await this.authContext.runInContext(() => get(userRef));

    const now = new Date().toISOString();
    const email = user.email ?? '';
    const displayName =
      user.displayName ?? email.split('@')[0] ?? 'Utilisateur';
    const photoURL = user.photoURL ?? '';

    /* ─── Cas 1 : profil existant → mise à jour légère ─── */
    if (snapshot.exists()) {
      await this.authContext.runInContext(() =>
        update(userRef, {
          lastLogin: now,
          email,
          displayName,
          photoURL,
        }),
      );
      return;
    }

    /* ─── Cas 2 : nouveau profil → création ─── */
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

    await this.authContext.runInContext(() => set(userRef, newUser));
  }

  /* ═══════════════════════════════════════════════════════
     EMAIL DE VÉRIFICATION — fire & forget sûr
     ═══════════════════════════════════════════════════════ */

  private async sendVerificationSafely(user: User): Promise<void> {
    try {
      await this.authContext.runInContext(() => sendEmailVerification(user));
    } catch (err) {
      /* ✅ Uniquement loggé — l'utilisateur peut re-demander plus tard */
      console.warn('[Register] Envoi email vérification échoué :', err);
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