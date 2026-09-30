import { Injectable, inject } from '@angular/core';
import {
  Auth,
  GoogleAuthProvider,
  User,
  UserCredential,
  authState,
  signInWithPopup,
  signOut
} from '@angular/fire/auth';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly auth = inject(Auth);

  /**
   * État courant de l'utilisateur.
   * Émet null lorsqu'aucun utilisateur n'est connecté.
   */
  readonly user$: Observable<User | null> = authState(this.auth);

  /**
   * Connexion avec Google via une fenêtre popup.
   */
  async loginWithGoogle(): Promise<UserCredential> {
    const provider = new GoogleAuthProvider();

    // Force la sélection du compte Google à chaque clic.
    provider.setCustomParameters({
      prompt: 'select_account'
    });

    return signInWithPopup(this.auth, provider);
  }

  /**
   * Déconnexion de l'utilisateur courant.
   */
  async logout(): Promise<void> {
    await signOut(this.auth);
  }
} 