import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Auth, authState, signOut } from '@angular/fire/auth';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs/operators';
import { HomeconnectComponent } from './homeconnect/homeconnect.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    HomeconnectComponent  
  ],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent {

  private auth = inject(Auth);

  /** 👤 Utilisateur Firebase (null si déconnecté) */
  readonly currentUser = toSignal(authState(this.auth), { initialValue: null });

  /** ✅ Signal : connecté ou non */
  readonly isLoggedIn = toSignal(
    authState(this.auth).pipe(map(user => !!user)),
    { initialValue: false }
  );

  /** 🔓 Déconnexion */
  async logout(): Promise<void> {
    try {
      await signOut(this.auth);
    } catch (error) {
      console.error('Erreur déconnexion :', error);
    }
  }
}