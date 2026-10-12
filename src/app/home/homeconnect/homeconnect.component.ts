// src/app/home/homeconnect/homeconnect.component.ts

import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { Auth, authState } from '@angular/fire/auth';
import { Database, objectVal, ref } from '@angular/fire/database';
import { RouterLink } from '@angular/router';
import { switchMap, of } from 'rxjs';

import { UserProfile } from 'src/app/models/user.model';
import { getInitials } from 'src/app/utils/string.utils';

import {
  QUICK_ACTIONS,
  COLOR_UNIVERSES,
  WHY_PILLARS,
  TESTIMONIALS,
} from 'src/app/constants/homeconnect.constants';

import { FooterComponent } from 'src/app/footer/footer.component';
import { RevealDirective } from 'src/app/shared/reveal.directive';
import { InboxPanelComponent } from './inbox-panel/inbox-panel.component';

@Component({
  selector: 'app-homeconnect',
  standalone: true,
  imports: [RouterLink, RevealDirective, FooterComponent, InboxPanelComponent],
  templateUrl: './homeconnect.component.html',
  styleUrls: ['./homeconnect.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeconnectComponent {
  /* ═══════════════════════════════════════════════════════
     INJECTION
     ═══════════════════════════════════════════════════════ */

  private readonly auth = inject(Auth);
  private readonly db = inject(Database);

  /* ═══════════════════════════════════════════════════════
     UTILISATEUR CONNECTÉ & PROFIL
     ═══════════════════════════════════════════════════════ */

  readonly currentUser = toSignal(authState(this.auth), {
    initialValue: null,
  });

  readonly userProfile = toSignal(
    toObservable(this.currentUser).pipe(
      switchMap((u) => {
        if (!u?.uid) return of(null);
        return objectVal<UserProfile>(ref(this.db, `users/${u.uid}`));
      })
    ),
    { initialValue: null }
  );

  readonly userName = computed(() => {
    const p = this.userProfile();
    const u = this.currentUser();
    return (
      p?.displayName ??
      u?.displayName ??
      u?.email?.split('@')[0] ??
      'Musicien'
    );
  });

  readonly userFirstName = computed(() => {
    const parts = this.userName().trim().split(/\s+/);
    return parts[0] ?? 'Musicien';
  });

  readonly userInitials = computed(() =>
    getInitials(
      this.userProfile()?.displayName ??
        this.currentUser()?.displayName ??
        'OFFOLANDAIS',
      this.currentUser()?.email,
      'M'
    )
  );

  readonly userPhoto = computed(
    () => this.userProfile()?.photoURL ?? this.currentUser()?.photoURL ?? null
  );

  /* ═══════════════════════════════════════════════════════
     MESSAGE DE BIENVENUE DYNAMIQUE
     ═══════════════════════════════════════════════════════ */

  readonly greeting = computed(() => {
    const h = new Date().getHours();
    if (h < 12) return 'Bonjour';
    if (h < 18) return 'Bon après-midi';
    return 'Bonsoir';
  });

  /* ═══════════════════════════════════════════════════════
     CONSTANTES UI
     ═══════════════════════════════════════════════════════ */

  readonly quickActions = QUICK_ACTIONS;
  readonly colorUniverses = COLOR_UNIVERSES;
  readonly whyPillars = WHY_PILLARS;
  readonly testimonials = TESTIMONIALS;
}