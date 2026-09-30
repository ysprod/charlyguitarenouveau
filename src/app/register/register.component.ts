import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { AngularFireDatabase } from '@angular/fire/compat/database'; // Import Realtime Database
import firebase from 'firebase/compat/app';
import { UserProfile } from '../models/user.model'; // Ajustez le chemin de votre modèle
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

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
    if (!this.email || !this.password || !this.confirmPassword) {
      this.errorMessage = 'Veuillez remplir tous les champs.';
      return;
    }

    if (this.password !== this.confirmPassword) {
      this.errorMessage = 'Les mots de passe ne correspondent pas.';
      return;
    }

    if (this.password.length < 6) {
      this.errorMessage = 'Le mot de passe doit contenir au moins 6 caractères.';
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    try {
      const credential = await this.afAuth.createUserWithEmailAndPassword(
        this.email,
        this.password
      );

      if (credential.user) {
        // Enregistrer l'utilisateur dans Realtime Database
        await this.saveUserDataInRealtimeDB(credential.user);

        // Envoi de l'email de vérification
        await credential.user.sendEmailVerification();
      }

      // Redirection vers l'espace demandé
      await this.router.navigateByUrl(this.returnUrl);
    } catch (error: any) {
      this.errorMessage = this.getFrenchErrorMessage(error.code);
    } finally {
      this.loading = false;
    }
  }

  async signUpWithGoogle(): Promise<void> {
    this.loading = true;
    this.errorMessage = '';

    try {
      const provider = new firebase.auth.GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const credential = await this.afAuth.signInWithPopup(provider);

      if (credential.user) {
        // Enregistrer ou mettre à jour dans Realtime Database
        await this.saveUserDataInRealtimeDB(credential.user);
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

  /**
   * Enregistre ou met à jour le profil utilisateur sous la clé 'users/{uid}'
   */
  private async saveUserDataInRealtimeDB(user: firebase.User): Promise<void> {
    const userRef = this.db.object<UserProfile>(`users/${user.uid}`);
    const snapshot = await userRef.query.once('value');
    const now = new Date().toISOString();

    if (snapshot.exists()) {
      // Si le profil existe déjà (cas de Google Auth s'il s'était déjà connecté)
      await userRef.update({
        lastLogin: now,
        email: user.email || '',
        displayName: user.displayName || user.email?.split('@')[0] || ''
      });
    } else {
      // Nouveau compte : création complète
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

  private getFrenchErrorMessage(code: string): string {
    switch (code) {
      case 'auth/email-already-in-use':
        return 'Cette adresse e-mail est déjà utilisée par un autre compte.';
      case 'auth/weak-password':
        return 'Le mot de passe doit contenir au moins 6 caractères.';
      case 'auth/invalid-email':
        return 'Adresse e-mail invalide.';
      case 'auth/network-request-failed':
        return 'Problème de connexion réseau. Vérifiez votre internet.';
      default:
        return 'Une erreur est survenue lors de l\'inscription.';
    }
  }
}