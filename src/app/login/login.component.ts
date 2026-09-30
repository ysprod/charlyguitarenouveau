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

import {
  CommonModule
} from '@angular/common';

import {
  FormsModule
} from '@angular/forms';

import {
  UserProfile
} from '../models/user.model';


/**
 * Structure complète enregistrée dans
 * Firebase Realtime Database.
 *
 * Les propriétés supplémentaires permettent
 * de conserver les informations historiques
 * du profil utilisateur.
 */
interface RealtimeUserProfile extends UserProfile {
  lastLogin: string;
  disabled: boolean;
}


@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink
  ],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {

  private readonly auth = inject(Auth);
  private readonly database = inject(Database);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly environmentInjector =
    inject(EnvironmentInjector);

  email = '';

  password = '';

  errorMessage = '';

  successMessage = '';

  loading = false;

  showPassword = false;

  returnUrl = '/academie';


  ngOnInit(): void {

    const returnUrl =
      this.route.snapshot.queryParamMap.get('returnUrl');

    /*
     * On accepte uniquement une URL interne.
     * Cela évite qu'un paramètre returnUrl permette
     * une redirection vers un site externe.
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


  // =========================================================
  // CONNEXION EMAIL / MOT DE PASSE
  // =========================================================

  async handleSubmit(): Promise<void> {

    this.clearMessages();

    const email =
      this.email.trim();

    if (!email || !this.password) {

      this.errorMessage =
        'Veuillez remplir tous les champs.';

      return;
    }

    this.loading = true;

    try {

      const credential =
        await runInInjectionContext(
          this.environmentInjector,
          () =>
            signInWithEmailAndPassword(
              this.auth,
              email,
              this.password
            )
        );

      const user =
        credential.user;

      if (user) {
        await this.updateUserDataInRealtimeDB(user);
      }

      await this.router.navigateByUrl(
        this.returnUrl
      );

    } catch (error: unknown) {

      this.errorMessage =
        this.getFrenchErrorMessage(error);

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

      const provider =
        new GoogleAuthProvider();

      provider.setCustomParameters({
        prompt: 'select_account'
      });

      const credential =
        await runInInjectionContext(
          this.environmentInjector,
          () =>
            signInWithPopup(
              this.auth,
              provider
            )
        );

      const user =
        credential.user;

      if (user) {
        await this.updateUserDataInRealtimeDB(user);
      }

      await this.router.navigateByUrl(
        this.returnUrl
      );

    } catch (error: unknown) {

      const errorCode =
        this.getFirebaseErrorCode(error);

      if (
        errorCode !==
        'auth/popup-closed-by-user'
      ) {
        this.errorMessage =
          this.getFrenchErrorMessage(error);
      }

    } finally {

      this.loading = false;
    }
  }


  // =========================================================
  // MOT DE PASSE OUBLIÉ
  // =========================================================

  async onForgotPassword(): Promise<void> {

    this.clearMessages();

    const email =
      this.email.trim();

    if (!email) {

      this.errorMessage =
        "Entrez votre e-mail pour recevoir un lien de réinitialisation.";

      return;
    }

    this.loading = true;

    try {

      await runInInjectionContext(
        this.environmentInjector,
        () =>
          sendPasswordResetEmail(
            this.auth,
            email
          )
      );

      this.successMessage =
        'Un e-mail de réinitialisation vous a été envoyé.';

    } catch (error: unknown) {

      this.errorMessage =
        this.getFrenchErrorMessage(error);

    } finally {

      this.loading = false;
    }
  }


  // =========================================================
  // SYNCHRONISATION AVEC REALTIME DATABASE
  // =========================================================

  /**
   * Crée ou met à jour l'utilisateur dans :
   *
   * users/{uid}
   */
  private async updateUserDataInRealtimeDB(
    user: User
  ): Promise<void> {

    const userReference =
      ref(
        this.database,
        `users/${user.uid}`
      );

    const snapshot =
      await runInInjectionContext(
        this.environmentInjector,
        () =>
          get(userReference)
      );

    const now =
      new Date().toISOString();

    const email =
      user.email ?? '';

    const displayName =
      user.displayName ??
      email.split('@')[0] ??
      '';

    const photoURL =
      user.photoURL ?? '';


    // =====================================================
    // UTILISATEUR EXISTANT
    // =====================================================

    if (snapshot.exists()) {

      await runInInjectionContext(
        this.environmentInjector,
        () =>
          update(
            userReference,
            {
              lastLogin: now,
              email,
              displayName,
              photoURL
            }
          )
      );

      return;
    }


    // =====================================================
    // NOUVEL UTILISATEUR
    // =====================================================

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
      () =>
        set(
          userReference,
          newUser
        )
    );
  }


  // =========================================================
  // MESSAGES
  // =========================================================

  private clearMessages(): void {

    this.errorMessage = '';

    this.successMessage = '';
  }


  // =========================================================
  // ERREURS FIREBASE
  // =========================================================

  private getFrenchErrorMessage(
    error: unknown
  ): string {

    const code =
      this.getFirebaseErrorCode(error);

    switch (code) {

      case 'auth/user-not-found':

      case 'auth/wrong-password':

      case 'auth/invalid-credential':

        return 'Email ou mot de passe incorrect.';


      case 'auth/invalid-email':

        return 'Adresse e-mail invalide.';


      case 'auth/user-disabled':

        return 'Ce compte a été désactivé.';


      case 'auth/too-many-requests':

        return 'Trop de tentatives échouées. Réessayez plus tard.';


      case 'auth/network-request-failed':

        return 'Problème de connexion réseau. Vérifiez votre internet.';


      case 'auth/popup-blocked':

        return 'La fenêtre de connexion Google a été bloquée par votre navigateur.';


      case 'auth/popup-closed-by-user':

        return 'La connexion Google a été annulée.';


      case 'auth/account-exists-with-different-credential':

        return 'Un compte existe déjà avec une autre méthode de connexion.';


      default:

        return 'Une erreur est survenue. Veuillez réessayer.';
    }
  }


  /**
   * Récupère proprement le code d'une erreur inconnue.
   */
  private getFirebaseErrorCode(
    error: unknown
  ): string | undefined {

    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error
    ) {

      const firebaseError =
        error as {
          code?: unknown;
        };

      return typeof firebaseError.code === 'string'
        ? firebaseError.code
        : undefined;
    }

    return undefined;
  }
} 