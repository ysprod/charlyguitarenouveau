import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Auth, authState, signOut, User } from '@angular/fire/auth';
import { RouterLink } from '@angular/router';
import { RevealDirective } from '../../shared/reveal.directive';
import { map } from 'rxjs';
import { DocumentsComponent } from '../../academie/documents/documents.component';
import { OffresComponent } from '../../offres/offres.component';
import { PlayComponent } from 'src/app/game/play/play.component';

@Component({
  selector: 'app-homeconnect',
  imports: [
    CommonModule,
    RouterLink,
    RevealDirective,
    DocumentsComponent,
    OffresComponent,
    PlayComponent
  ],
  templateUrl: './homeconnect.component.html',
  styleUrl: './homeconnect.component.scss'
})
export class HomeconnectComponent {
  private auth = inject(Auth);

  readonly currentUser = toSignal(authState(this.auth), { initialValue: null });
  readonly isLoggedIn = toSignal(
    authState(this.auth).pipe(map((user: User | null) => !!user)),
    { initialValue: false }
  );

  /** Particules générées dynamiquement */
  readonly particles = Array.from({ length: 24 }, (_, i) => i + 1);

  async logout(): Promise<void> {
    try {
      await signOut(this.auth);
    } catch (error) {
      console.error('Erreur déconnexion :', error);
    }
  }
}
