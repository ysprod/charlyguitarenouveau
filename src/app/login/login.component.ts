import {
  Component,
  EnvironmentInjector,
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

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { UserProfile } from '../models/user.model';


/** Profil utilisateur stocké dans Firebase Realtime Database. */
interface RealtimeUserProfile extends UserProfile {
  lastLogin: string;
  disabled: boolean;
}

/** Codes d'erreur Firebase → messages français. */
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


@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {

  private readonly auth = inject(Auth);
  private readonly database = inject(Database);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly environmentInjector = inject(EnvironmentInjector);

  email = '';
  password = '';

  errorMessage = '';
  successMessage = '';

  loading = false;
  showPassword = false;

  returnUrl: string = DEFAULT_RETURN_URL;

  // =========================================================
  // INITIALISATION
  // =========================================================

  ngOnInit(): void {
    this.returnUrl = this.resolveReturnUrl();
  }

  /**
   * Récupère `returnUrl` depuis les query params.
   * Seules les URLs internes (commençant par `/` mais pas `//`)
   * sont acceptées, pour éviter les redirections externes.
   */
  private resolveReturnUrl(): string {
    const raw = this.route.snapshot.queryParamMap.get('returnUrl');

    const isSafe =
      !!raw &&
      raw.startsWith('/') &&
      !raw.startsWith('//');

    return isSafe ? raw! : DEFAULT_RETURN_URL;
  }

  // =========================================================
  // CONNEXION EMAIL / MOT DE PASSE
  // =========================================================

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

      await this.handleSuccessfulLogin(credential.user);

    } catch (error: unknown) {
      this.errorMessage = this.getFrenchErrorMessage(error);
    } finally {
      this.loading = false;
    }
  }

  // =========================================================
  // CONNEXION GOOGLE
  // =========================================================

  async loginWithGoogle(): Promise<void> {
    this.clearMessages();
    this.loading = true;

    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });

      const credential = await this.runInContext(() =>
        signInWithPopup(this.auth, provider)
      );

      await this.handleSuccessfulLogin(credential.user);

    } catch (error: unknown) {
      // Fermeture manuelle de la popup : pas d'erreur à afficher
      if (this.getFirebaseErrorCode(error) !== 'auth/popup-closed-by-user') {
        this.errorMessage = this.getFrenchErrorMessage(error);
      }
    } finally {
      this.loading = false;
    }
  }

  /**
   * Étapes communes après une connexion réussie (email ou Google).
   */
  private async handleSuccessfulLogin(user: User | null): Promise<void> {
    if (user) {
      await this.writeUserToDatabase(user);
    }
    await this.router.navigateByUrl(this.returnUrl);
  }

  // =========================================================
  // MOT DE PASSE OUBLIÉ
  // =========================================================

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

  // =========================================================
  // SYNCHRONISATION AVEC REALTIME DATABASE
  // =========================================================

  /**
   * Crée ou met à jour `users/{uid}` dans Realtime Database.
   */
  private async writeUserToDatabase(user: User): Promise<void> {
    const userReference = ref(this.database, `users/${user.uid}`);

    const snapshot = await this.runInContext(() => get(userReference));

    const now = new Date().toISOString();
    const email = user.email ?? '';
    const displayName =
      user.displayName ?? email.split('@')[0] ?? '';
    const photoURL = user.photoURL ?? '';

    // Utilisateur existant : mise à jour ciblée
    if (snapshot.exists()) {
      await this.runInContext(() =>
        update(userReference, {
          lastLogin: now,
          email,
          displayName,
          photoURL
        })
      );
      return;
    }

    // Nouvel utilisateur : création complète
    const newUser: RealtimeUserProfile = {
      uid: user.uid,
      email,
      displayName,
      photoURL,
      role: 'user',
      createdAt: now,
      lastLogin: now,
      disabled: false
    };

    await this.runInContext(() =>
      set(userReference, newUser)
    );
  }

  // =========================================================
  // HELPERS
  // =========================================================

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

  /** Enveloppe un appel Firebase dans le contexte d'injection Angular. */
  private runInContext<T>(fn: () => T): T {
    return runInInjectionContext(this.environmentInjector, fn);
  }
}