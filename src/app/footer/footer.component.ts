import {
  ChangeDetectionStrategy,
  Component,
  inject
} from '@angular/core';

import {
  Router,
  RouterLink,
  RouterLinkActive
} from '@angular/router';

import { toSignal } from '@angular/core/rxjs-interop';

import {
  Database,
  equalTo,
  listVal,
  orderByChild,
  query,
  ref
} from '@angular/fire/database';

import { MatSnackBar } from '@angular/material/snack-bar';

import { Observable, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';

import { InstallComponent } from './install/install.component';
import { UserMessage } from '../models/user-message.model';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-footer',
  imports: [RouterLink, RouterLinkActive, InstallComponent],
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FooterComponent {

  /* ─── Injection ─── */
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);
  private readonly database = inject(Database);

  /* ─── Constantes ─── */
  /** Année courante pour le copyright. */
  readonly currentYear = new Date().getFullYear();

  /* ═══════════════════════════════════════════════════════
     FLUX : l'utilisateur a-t-il déjà envoyé un message ?
     ═══════════════════════════════════════════════════════ */

  private readonly hasSentMessage$: Observable<boolean> =
    this.buildHasSentMessageStream();

  /**
   * `true` dès que l'utilisateur a envoyé au moins un message.
   * Utilisé pour afficher le CTA « Mes messages » à la place du
   * CTA « Discutez avec Charly Guitare ».
   */
  readonly hasSentMessage = toSignal(this.hasSentMessage$, {
    initialValue: false
  });

  /* ═══════════════════════════════════════════════════════
     CONSTRUCTION DU FLUX
     ═══════════════════════════════════════════════════════ */

  private buildHasSentMessageStream(): Observable<boolean> {
    return this.auth.user$.pipe(
      switchMap(user => {
        if (!user) return of(false);

        const messagesQuery = query(
          ref(this.database, 'messages'),
          orderByChild('userId'),
          equalTo(user.uid)
        );

        return listVal<UserMessage>(messagesQuery).pipe(
          map(messages => messages.length > 0)
        );
      })
    );
  }

  /* ═══════════════════════════════════════════════════════
     SCROLL
     ═══════════════════════════════════════════════════════ */

  /**
   * Retour en haut de page avec scroll fluide.
   * Respecte `prefers-reduced-motion` : scroll instantané si l'utilisateur
   * a désactivé les animations.
   */
  scrollToTop(): void {
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    window.scrollTo({
      top: 0,
      behavior: prefersReducedMotion ? 'auto' : 'smooth'
    });
  }
}