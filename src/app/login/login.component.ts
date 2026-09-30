import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { AngularFireDatabase } from '@angular/fire/compat/database';// Import de Realtime Database
import firebase from 'firebase/compat/app';
import { UserProfile } from '../models/user.model';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
// Ajustez le chemin vers votre interface

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
  email = '';
  password = '';
  errorMessage = '';
  successMessage = '';
  loading = false;
  showPassword = false;
  returnUrl = '/academie';

  constructor(
    private afAuth: AngularFireAuth,
    private db: AngularFireDatabase, // Injection de Realtime Database
    private router: Router,
    private route: ActivatedRoute
  ) { }

  ngOnInit(): void {
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/academie';
  }

  async handleSubmit(): Promise<void> {
    if (!this.email || !this.password) {
      this.errorMessage = 'Veuillez remplir tous les champs.';
      return;
    }

    this.loading = true;
    this.clearMessages();

    try {
      const credential = await this.afAuth.signInWithEmailAndPassword(this.email, this.password);

      if (credential.user) {
        await this.updateUserDataInRealtimeDB(credential.user);
      }

      await this.router.navigateByUrl(this.returnUrl);
    } catch (error: any) {
      this.errorMessage = this.getFrenchErrorMessage(error.code);
    } finally {
      this.loading = false;
    }
  }

  async loginWithGoogle(): Promise<void> {
    this.loading = true;
    this.clearMessages();

    try {
      const provider = new firebase.auth.GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const credential = await this.afAuth.signInWithPopup(provider);

      if (credential.user) {
        await this.updateUserDataInRealtimeDB(credential.user);
      }

      await this.router.navigateByUrl(this.returnUrl);
    } catch (error: any) {
      if (error.code !== 'auth/popup-closed-by-user') {
        this.errorMessage = this.getFrenchErrorMessage(error.code);
      }
    } finally {
      this.loading = false;
    }
  }

  async onForgotPassword(): Promise<void> {
    if (!this.email) {
      this.errorMessage = 'Entrez votre e-mail pour recevoir un lien de réinitialisation.';
      return;
    }

    this.loading = true;
    this.clearMessages();

    try {
      await this.afAuth.sendPasswordResetEmail(this.email);
      this.successMessage = 'Un e-mail de réinitialisation vous a été envoyé.';
    } catch (error: any) {
      this.errorMessage = this.getFrenchErrorMessage(error.code);
    } finally {
      this.loading = false;
    }
  }

  /**
   * Crée ou met à jour l'utilisateur dans Realtime Database sous la clé 'users/{uid}'
   */
  private async updateUserDataInRealtimeDB(user: firebase.User): Promise<void> {
    const userRef = this.db.object<UserProfile>(`users/${user.uid}`);

    // Vérifier si l'utilisateur existe déjà dans la base
    const snapshot = await userRef.query.once('value');
    const now = new Date().toISOString();

    if (snapshot.exists()) {
      // Si l'utilisateur existe déjà, on met à jour uniquement lastLogin (et infos de base)
      await userRef.update({
        lastLogin: now,
        email: user.email || '',
        displayName: user.displayName || user.email?.split('@')[0] || ''
      });
    } else {
      // Première connexion : création initiale du profil complet
      const newUser: UserProfile = {
        uid: user.uid,
        email: user.email || '',
        displayName: user.displayName || user.email?.split('@')[0] || '',
        photoURL: user.photoURL || '',
        role: 'user', // Rôle par défaut
        createdAt: now,
        lastLogin: now,
        disabled: false
      };

      await userRef.set(newUser);
    }
  }

  private clearMessages(): void {
    this.errorMessage = '';
    this.successMessage = '';
  }

  private getFrenchErrorMessage(code: string): string {
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
      default:
        return 'Une erreur est survenue. Veuillez réessayer.';
    }
  }
}