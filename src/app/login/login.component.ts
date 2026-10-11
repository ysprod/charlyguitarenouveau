import {
  Component,
  EnvironmentInjector,
  OnDestroy,
  OnInit,
  inject,
  runInInjectionContext
} from '@angular/core';

import {
  ActivatedRoute,
  Router,
  RouterLink
} from '@angular/router';

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

import { FormsModule } from '@angular/forms';

import { Subject } from 'rxjs';

import { UserProfile } from '../models/user.model';

/* ═════════════════════════════════════════════════════════════════════
   TYPES
   ═════════════════════════════════════════════════════════════════════ */

/** Origine d'inscription — ajout du champ pour traçabilité. */
type UserOrigin = 'google' | 'email';

interface RealtimeUserProfile extends UserProfile {
  lastLogin: string;
  disabled: boolean;
  origine: UserOrigin;      // ← NOUVEAU
  codepromo?: string;
  updatedAt?: string;
}

const FIREBASE_ERRORS: Record<string, string> = {
  'auth/user-not-found': 'Email ou mot de passe incorrect.',
  'auth/wrong-password': 'Email ou mot de passe incorrect.',
  'auth/invalid-credential': 'Email ou mot de passe incorrect.',
  'auth/invalid-email': 'Adresse e-mail invalide.',
  'auth/user-disabled': 'Ce compte a été désactivé.',
  'auth/too-many-requests': 'Trop de tentatives échouées. Réessayez plus tard.',
  'auth/network-request-failed': 'Problème de connexion réseau. Vérifiez votre internet.',
  'auth/popup-blocked': 'La fenêtre de connexion Google a été bloquée par votre navigateur.',
  'auth/popup-closed-by-user': 'La connexion Google a été annulée.',
  'auth/account-exists-with-different-credential':
    'Un compte existe déjà avec une autre méthode de connexion.'
};

const DEFAULT_RETURN_URL = '/';
const TOAST_DURATION_MS = 4000;

/* ═════════════════════════════════════════════════════════════════════
   COMPOSANT
   ═════════════════════════════════════════════════════════════════════ */

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit, OnDestroy {

  private readonly auth = inject(Auth);
  private readonly database = inject(Database);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly environmentInjector = inject(EnvironmentInjector);

  private readonly destroy$ = new Subject<void>();
  private toastTimeoutId: ReturnType<typeof setTimeout> | null = null;

  /* ─── Formulaire ─── */
  email = '';
  password = '';
  showPassword = false;

  /* ─── États UI ─── */
  errorMessage = '';
  successMessage = '';
  loading = false;

  returnUrl: string = DEFAULT_RETURN_URL;

  /* ═══════════════════════════════════════════════════════════════════
     CYCLE DE VIE
     ═══════════════════════════════════════════════════════════════════ */

  ngOnInit(): void {
    this.returnUrl = this.resolveReturnUrl();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();

    if (this.toastTimeoutId !== null) {
      clearTimeout(this.toastTimeoutId);
      this.toastTimeoutId = null;
    }
  }

  private resolveReturnUrl(): string {
    const raw = this.route.snapshot.queryParamMap.get('returnUrl');

    const isSafe =
      !!raw &&
      raw.startsWith('/') &&
      !raw.startsWith('//');

    return isSafe ? raw! : DEFAULT_RETURN_URL;
  }

  /* ═══════════════════════════════════════════════════════════════════
     UI HELPERS
     ═══════════════════════════════════════════════════════════════════ */

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  /* ═══════════════════════════════════════════════════════════════════
     CONNEXION EMAIL / MOT DE PASSE
     ───────────────────────────────────────────────────────────────────
     ✅ Origine = 'email'
     ═══════════════════════════════════════════════════════════════════ */

  async handleSubmit(): Promise<void> {
    this.clearMessages();

    const email = this.email.trim();

    if (!email || !this.password) {
      this.errorMessage = 'Veuillez remplir tous les champs.';
      return;
    }

    this.loading = true;

    try {
      const credential = await this.runInContext(() =>
        signInWithEmailAndPassword(this.auth, email, this.password)
      );

      await this.handleSuccessfulLogin(credential.user, 'email');

    } catch (error: unknown) {
      this.errorMessage = this.getFrenchErrorMessage(error);
    } finally {
      this.loading = false;
    }
  }

  /* ═══════════════════════════════════════════════════════════════════
     CONNEXION GOOGLE
     ───────────────────────────────────────────────────────────────────
     ✅ Origine = 'google'
     ═══════════════════════════════════════════════════════════════════ */

  async loginWithGoogle(): Promise<void> {
    this.clearMessages();
    this.loading = true;

    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });

      const credential = await this.runInContext(() =>
        signInWithPopup(this.auth, provider)
      );

      await this.handleSuccessfulLogin(credential.user, 'google');

    } catch (error: unknown) {
      if (this.getFirebaseErrorCode(error) !== 'auth/popup-closed-by-user') {
        this.errorMessage = this.getFrenchErrorMessage(error);
      }
    } finally {
      this.loading = false;
    }
  }

  /* ═══════════════════════════════════════════════════════════════════
     HANDLER — APRÈS CONNEXION RÉUSSIE
     ───────────────────────────────────────────────────────────────────
     ✅ Écrit le profil en arrière-plan (non bloquant).
     ✅ Enregistre l'ORIGINE de l'inscription.
     ✅ Redirige directement vers `returnUrl`.
     ═══════════════════════════════════════════════════════════════════ */

  private async handleSuccessfulLogin(
    user: User | null,
    origine: UserOrigin
  ): Promise<void> {
    if (!user) {
      await this.router.navigateByUrl(this.returnUrl);
      return;
    }

    /* Détection d'un nouvel utilisateur Google */
    const createdAt = user.metadata?.creationTime;
    const lastLoginAt = user.metadata?.lastSignInTime;
    const isLikelyNewUser =
      !!createdAt && !!lastLoginAt && createdAt === lastLoginAt;

    /* Vérifie si le profil existe déjà en base */
    const userReference = ref(this.database, `users/${user.uid}`);
    let exists = false;

    try {
      const snapshot = await this.runInContext(() => get(userReference));
      exists = snapshot.exists();
    } catch (error) {
      console.warn('Lecture profil échouée (fallback) :', error);
    }

    /* ✅ Écriture profil en arrière-plan (non bloquant) */
    void this.writeUserToDatabaseInBackground(
      user,
      exists || isLikelyNewUser === false ? exists : false,
      origine
    );

    /* ✅ Redirection directe (plus de modale) */
    await this.router.navigateByUrl(this.returnUrl);
  }

  /* ═══════════════════════════════════════════════════════════════════
     ÉCRITURE DB EN ARRIÈRE-PLAN
     ───────────────────────────────────────────────────────────────────
     ✅ Nouvel utilisateur → enregistre l'origine
     ✅ Utilisateur existant → préserve l'origine initiale
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
      /* ─── Utilisateur EXISTANT : mise à jour ciblée ─── */
      if (exists) {
        await this.runInContext(() =>
          update(userReference, {
            lastLogin: now,
            email,
            displayName,
            photoURL
            /* ⚠️ On NE TOUCHE PAS à `origine` pour préserver la valeur initiale */
          })
        );
        return;
      }

      /* ─── NOUVEL utilisateur : création complète avec origine ─── */
      const newUser: RealtimeUserProfile = {
        uid: user.uid,
        email,
        displayName,
        photoURL,
        role: 'user',
        createdAt: now,
        lastLogin: now,
        disabled: false,
        origine                // ✅ Champ ajouté
      };

      await this.runInContext(() => set(userReference, newUser));

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
      this.errorMessage =
        'Entrez votre e-mail pour recevoir un lien de réinitialisation.';
      return;
    }

    this.loading = true;

    try {
      await this.runInContext(() =>
        sendPasswordResetEmail(this.auth, email)
      );

      this.successMessage =
        'Un e-mail de réinitialisation vous a été envoyé.';

    } catch (error: unknown) {
      this.errorMessage = this.getFrenchErrorMessage(error);
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

  private getFrenchErrorMessage(error: unknown): string {
    const code = this.getFirebaseErrorCode(error);
    return (
      (code && FIREBASE_ERRORS[code]) ??
      'Une erreur est survenue. Veuillez réessayer.'
    );
  }

  private getFirebaseErrorCode(error: unknown): string | undefined {
    if (typeof error === 'object' && error !== null && 'code' in error) {
      const code = (error as { code?: unknown }).code;
      return typeof code === 'string' ? code : undefined;
    }
    return undefined;
  }

  private runInContext<T>(fn: () => T): T {
    return runInInjectionContext(this.environmentInjector, fn);
  }

  private showToast(message: string, type: 'success' | 'error'): void {
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