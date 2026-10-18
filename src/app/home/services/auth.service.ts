// src/app/home/services/auth.service.ts

import { Injectable, inject } from '@angular/core';

import {
  Auth,
  GoogleAuthProvider,
  User,
  UserCredential,
  authState,
  signInWithPopup,
  signOut,
} from '@angular/fire/auth';

import { Observable } from 'rxjs';
import { shareReplay } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly auth = inject(Auth);

  /**
   * État courant de l'utilisateur (temps réel).
   * - Émet `null` quand personne n'est connecté.
   * - `shareReplay(1)` évite de dupliquer l'écoute Firebase
   *   si plusieurs composants s'abonnent à `user$`.
   */
  readonly user$: Observable<User | null> = authState(this.auth).pipe(
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  /**
   * Connexion Google via popup.
   * Force la sélection du compte à chaque appel.
   */
  async loginWithGoogle(): Promise<UserCredential> {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({
      prompt: 'select_account',
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