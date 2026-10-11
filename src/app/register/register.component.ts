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

import { FormsModule } from '@angular/forms';

import { Subject } from 'rxjs';

import { UserProfile } from '../models/user.model';

/* ═════════════════════════════════════════════════════════════════════
   TYPES
   ═════════════════════════════════════════════════════════════════════ */

/** Origine d'inscription — traçabilité utilisateur. */
type UserOrigin = 'google' | 'email';

interface RealtimeUserProfile extends UserProfile {
  lastLogin: string;
  disabled: boolean;
  origine: UserOrigin;      // ← NOUVEAU
  codepromo?: string;
  updatedAt?: string;
}

interface FirebaseAuthError {
  code?: string;
  message?: string;
}

const DEFAULT_RETURN_URL = '/academie';

/* ═════════════════════════════════════════════════════════════════════
   COMPOSANT
   ═════════════════════════════════════════════════════════════════════ */

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss']
})
export class RegisterComponent implements OnInit, OnDestroy {

  /* ─── Formulaire ─── */
  email = '';
  password = '';
  confirmPassword = '';

  errorMessage = '';
  loading = false;
  showPassword = false;

  returnUrl: string = DEFAULT_RETURN_URL;

  private readonly destroy$ = new Subject<void>();

  /* ─── Injection ─── */
  private readonly auth = inject(Auth);
  private readonly database = inject(Database);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly environmentInjector = inject(EnvironmentInjector);

  /* ═══════════════════════════════════════════════════════════════════
     CYCLE DE VIE
     ═══════════════════════════════════════════════════════════════════ */

  ngOnInit(): void {
    this.returnUrl = this.resolveReturnUrl();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private resolveReturnUrl(): string {
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');

    if (
      returnUrl &&
      returnUrl.startsWith('/') &&
      !returnUrl.startsWith('//')
    ) {
      return returnUrl;
    }

    return DEFAULT_RETURN_URL;
  }

  /* ═══════════════════════════════════════════════════════════════════
     UI HELPERS
     ═══════════════════════════════════════════════════════════════════ */

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  /* ═══════════════════════════════════════════════════════════════════
     INSCRIPTION EMAIL / MOT DE PASSE
     ───────────────────────────────────────────────────────────────────
     ✅ Origine = 'email'
     ═══════════════════════════════════════════════════════════════════ */

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
      /* ─── 1. Création du compte Firebase Auth ─── */
      const credential = await this.runInContext(() =>
        createUserWithEmailAndPassword(this.auth, email, this.password)
      );

      const user = credential.user;

      if (!user) {
        this.errorMessage = 'Création du compte échouée.';
        return;
      }

      /* ─── 2. Enregistrement du profil avec origine = 'email' ─── */
      try {
        await this.saveUserDataInRealtimeDB(user, 'email');
      } catch (dbError) {
        console.error('❌ Erreur écriture DB :', dbError);
        this.errorMessage =
          "Compte créé, mais impossible d'enregistrer votre profil. Contactez le support.";
      }

      /* ─── 3. Envoi email de vérification en arrière-plan ─── */
      void this.runInContext(() =>
        sendEmailVerification(user).catch((error) => {
          console.warn('Envoi email vérification échoué :', error);
        })
      );

      /* ─── 4. Redirection directe ─── */
      await this.router.navigateByUrl(this.returnUrl);

    } catch (error: unknown) {
      this.errorMessage = this.getFrenchErrorMessage(error);
    } finally {
      this.loading = false;
    }
  }

  /* ═══════════════════════════════════════════════════════════════════
     INSCRIPTION GOOGLE
     ───────────────────────────────────────────────────────────────────
     ✅ Origine = 'google'
     ═══════════════════════════════════════════════════════════════════ */

  async signUpWithGoogle(): Promise<void> {
    this.loading = true;
    this.errorMessage = '';

    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });

      const credential = await this.runInContext(() =>
        signInWithPopup(this.auth, provider)
      );

      const user = credential.user;

      if (!user) {
        this.errorMessage = 'Création du compte Google échouée.';
        return;
      }

      /* ─── Enregistrement du profil avec origine = 'google' ─── */
      try {
        await this.saveUserDataInRealtimeDB(user, 'google');
      } catch (dbError) {
        console.error('❌ Erreur écriture DB :', dbError);
        this.errorMessage =
          "Compte créé, mais impossible d'enregistrer votre profil. Contactez le support.";
      }

      /* ─── Redirection directe ─── */
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

  /* ═══════════════════════════════════════════════════════════════════
     SYNCHRONISATION REALTIME DATABASE
     ───────────────────────────────────────────────────────────────────
     ✅ Nouvel utilisateur → enregistre l'origine
     ✅ Utilisateur existant → préserve l'origine initiale
     ═══════════════════════════════════════════════════════════════════ */

  private async saveUserDataInRealtimeDB(
    user: User,
    origine: UserOrigin
  ): Promise<void> {
    const userRef = ref(this.database, `users/${user.uid}`);

    const snapshot = await this.runInContext(() => get(userRef));

    const now = new Date().toISOString();
    const email = user.email ?? '';
    const displayName = user.displayName ?? email.split('@')[0] ?? '';
    const photoURL = user.photoURL ?? '';

    /* ─── Utilisateur EXISTANT : mise à jour ciblée ─── */
    if (snapshot.exists()) {
      await this.runInContext(() =>
        update(userRef, {
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

    await this.runInContext(() => set(userRef, newUser));
  }

  /* ═══════════════════════════════════════════════════════════════════
     HELPERS
     ═══════════════════════════════════════════════════════════════════ */

  private isValidEmail(email: string): boolean {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailPattern.test(email);
  }

  private runInContext<T>(fn: () => T): T {
    return runInInjectionContext(this.environmentInjector, fn);
  }

  private getFirebaseErrorCode(error: unknown): string {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error
    ) {
      const firebaseError = error as FirebaseAuthError;
      return firebaseError.code ?? '';
    }
    return '';
  }

  private getFrenchErrorMessage(error: unknown): string {
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
        return "L'inscription par e-mail n'est pas activée. Contactez l'administrateur.";
      case 'auth/too-many-requests':
        return 'Trop de tentatives. Veuillez patienter quelques instants avant de réessayer.';
      case 'auth/configuration-not-found':
        return 'Configuration Firebase introuvable. Vérifiez environment.ts.';
      case 'auth/unauthorized-domain':
        return "Ce domaine n'est pas autorisé. Contactez l'administrateur.";
      case 'auth/invalid-api-key':
      case 'auth/api-key-not-valid':
        return 'Clé API Firebase invalide. Vérifiez environment.ts.';
      case 'auth/internal-error':
        return 'Erreur interne Firebase. Réessayez dans quelques instants.';

      default:
        console.error('❌ Erreur Firebase inconnue lors de l’inscription :', error);
        console.error('   Code Firebase :', code);
        console.error('   Message brut :', (error as { message?: string })?.message);

        return code
          ? `Erreur technique : ${code}`
          : 'Une erreur est survenue lors de l’inscription.';
    }
  }
}