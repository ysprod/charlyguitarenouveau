import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { Auth, authState } from '@angular/fire/auth';
import { toSignal } from '@angular/core/rxjs-interop';
import { FooterComponent } from '../footer/footer.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,FooterComponent
  ],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HomeComponent {

  private readonly auth = inject(Auth);
  private readonly router = inject(Router);

  /** 👤 Utilisateur Firebase (null si déconnecté) */
  private readonly currentUser = toSignal(authState(this.auth), {
    initialValue: null
  });

  constructor() {
    // ✅ Redirection automatique vers /connect si connecté
    effect(() => {
      if (this.currentUser()) {
        void this.router.navigateByUrl('/amanda', { replaceUrl: true });
      }
    });
  }
}