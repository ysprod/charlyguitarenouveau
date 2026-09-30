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

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { UserProfile } from '../models/user.model';

interface RealtimeUserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  role: 'user';
  createdAt: string;
  lastLogin: string;
  disabled: boolean;
}

interface FirebaseAuthError {
  code?: string;
  message?: string;
}

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink
  ],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterComponent implements OnInit {

  email = '';
  password = '';
  confirmPassword = '';

  errorMessage = '';

  loading = false;
  showPassword = false;

  returnUrl = '/academie';

  private readonly auth = inject(Auth);
  private readonly database = inject(Database);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly environmentInjector = inject(EnvironmentInjector);

  ngOnInit(): void {
    const returnUrl =
      this.route.snapshot.queryParamMap.get('returnUrl');

    /*
     * On accepte uniquement une URL interne à l'application.
     * Cela évite une redirection externe via ?returnUrl=https://...
     */
    if (
      returnUrl &&
      returnUrl.startsWith('/') &&
      !returnUrl.startsWith('//')
    ) {
      this.returnUrl = returnUrl;
    } else {
      this.returnUrl = '/academie';
    }
  }

  async handleSubmit(): Promise<void> {
    if (!this.email || !this.password || !this.confirmPassword) {
      this.errorMessage = 'Veuillez remplir tous les champs.';
      return;
    }

    const email = this.email.trim();

    if (!this.isValidEmail(email)) {
      this.errorMessage = 'Adresse e-mail invalide.';
      return;
    }

    if (this.password !== this.confirmPassword) {
      this.errorMessage = 'Les mots de passe ne correspondent pas.';
      return;
    }

    if (this.password.length < 6) {
      this.errorMessage =
        'Le mot de passe doit contenir au moins 6 caractères.';
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    try {
      const credential = await runInInjectionContext(
        this.environmentInjector,
        () =>
          createUserWithEmailAndPassword(
            this.auth,
            email,
            this.password
          )
      );

      const user = credential.user;

      if (user) {
        await this.saveUserDataInRealtimeDB(user);

        await runInInjectionContext(
          this.environmentInjector,
          () => sendEmailVerification(user)
        );
      }

      await this.router.navigateByUrl(this.returnUrl);

    } catch (error: unknown) {
      this.errorMessage = this.getFrenchErrorMessage(error);
    } finally {
      this.loading = false;
    }
  }

  async signUpWithGoogle(): Promise<void> {
    this.loading = true;
    this.errorMessage = '';

    try {
      const provider = new GoogleAuthProvider();

      provider.setCustomParameters({
        prompt: 'select_account'
      });

      const credential = await runInInjectionContext(
        this.environmentInjector,
        () =>
          signInWithPopup(
            this.auth,
            provider
          )
      );

      const user = credential.user;

      if (user) {
        await this.saveUserDataInRealtimeDB(user);
      }

      await this.router.navigateByUrl(this.returnUrl);

    } catch (error: unknown) {
      const code = this.getFirebaseErrorCode(error);

      if (code !== 'auth/popup-closed-by-user') {
        this.errorMessage = this.getFrenchErrorMessage(error);
      }
    } finally {
      this.loading = false;
    }
  }

  /**
   * Enregistre ou met à jour le profil utilisateur
   * sous la clé users/{uid} dans Firebase Realtime Database.
   */
  private async saveUserDataInRealtimeDB(
    user: User
  ): Promise<void> {

    const userRef = ref(
      this.database,
      `users/${user.uid}`
    );

    const snapshot = await runInInjectionContext(
      this.environmentInjector,
      () => get(userRef)
    );

    const now = new Date().toISOString();

    const email = user.email ?? '';

    const displayName =
      user.displayName ??
      email.split('@')[0] ??
      '';

    const photoURL = user.photoURL ?? '';

    if (snapshot.exists()) {

      /*
       * Le profil existe déjà.
       *
       * Cas typique :
       * - utilisateur Google déjà connu ;
       * - reconnexion d'un utilisateur existant.
       */
      await runInInjectionContext(
        this.environmentInjector,
        () =>
          update(userRef, {
            lastLogin: now,
            email,
            displayName,
            photoURL
          })
      );

      return;
    }

    /*
     * Nouveau profil utilisateur.
     */
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

    await runInInjectionContext(
      this.environmentInjector,
      () => set(userRef, newUser)
    );
  }

  private isValidEmail(email: string): boolean {
    const emailPattern =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    return emailPattern.test(email);
  }

  private getFirebaseErrorCode(
    error: unknown
  ): string {

    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error
    ) {
      const firebaseError =
        error as FirebaseAuthError;

      return firebaseError.code ?? '';
    }

    return '';
  }

  private getFrenchErrorMessage(
    error: unknown
  ): string {

    const code = this.getFirebaseErrorCode(error);

    switch (code) {

      case 'auth/email-already-in-use':
        return 'Cette adresse e-mail est déjà utilisée par un autre compte.';

      case 'auth/weak-password':
        return 'Le mot de passe doit contenir au moins 6 caractères.';

      case 'auth/invalid-email':
        return 'Adresse e-mail invalide.';

      case 'auth/network-request-failed':
        return 'Problème de connexion réseau. Vérifiez votre connexion internet.';

      case 'auth/popup-closed-by-user':
        return '';

      case 'auth/popup-blocked':
        return 'La fenêtre de connexion Google a été bloquée par votre navigateur.';

      case 'auth/cancelled-popup-request':
        return 'La connexion Google a été annulée.';

      case 'auth/operation-not-allowed':
        return 'Cette méthode de connexion n’est pas activée dans Firebase.';

      case 'auth/too-many-requests':
        return 'Trop de tentatives. Veuillez patienter quelques instants avant de réessayer.';

      default:
        console.error(
          'Erreur Firebase lors de l’inscription :',
          error
        );

        return 'Une erreur est survenue lors de l’inscription.';
    }
  }
} 