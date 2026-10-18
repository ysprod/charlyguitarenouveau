// src/app/home/homeconnect/homeconnect.component.ts

import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  EnvironmentInjector,
  afterNextRender,
  computed,
  inject,
  runInInjectionContext,
  signal,
} from '@angular/core';

import { toSignal } from '@angular/core/rxjs-interop';

import { Auth, authState } from '@angular/fire/auth';
import { Database, objectVal, ref } from '@angular/fire/database';

import { RouterLink } from '@angular/router';

import { of, switchMap } from 'rxjs';

import { UserProfile } from 'src/app/home/models/user.model';
import { getInitials } from 'src/app/home/utils/string.utils';

import {
  QUICK_ACTIONS,
  COLOR_UNIVERSES,
  WHY_PILLARS,
  TESTIMONIALS,
} from 'src/app/home/constants/homeconnect.constants';

import { FooterComponent } from 'src/app/home/footer/footer.component';
import { RevealDirective } from 'src/app/shared/reveal.directive';
import { InboxPanelComponent } from './inbox-panel/inbox-panel.component';
import { DocumentsComponent } from 'src/app/academie/documents/documents.component';

/* ═════════════════════════════════════════════════════════════════════
   COMPOSANT
   ═════════════════════════════════════════════════════════════════════ */

@Component({
  selector: 'app-homeconnect',
  imports: [
    RouterLink,
    RevealDirective,
    FooterComponent,
    InboxPanelComponent,
    DocumentsComponent,
  ],
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
  private readonly destroyRef = inject(DestroyRef);

  /** ✅ Injecté pour exécuter les appels Firebase DANS le contexte d'injection */
  private readonly environmentInjector = inject(EnvironmentInjector);

  /* ═══════════════════════════════════════════════════════
     UTILISATEUR CONNECTÉ & PROFIL
     ═══════════════════════════════════════════════════════ */

  readonly currentUser = toSignal(authState(this.auth), {
    initialValue: null,
  });

  readonly userProfile = toSignal(
    authState(this.auth).pipe(
      switchMap((u) => {
        if (!u?.uid) return of(null);

        // ✅ runInInjectionContext : exécute ref() dans le contexte d'injection
        return runInInjectionContext(this.environmentInjector, () =>
          objectVal<UserProfile>(ref(this.db, `users/${u.uid}`)),
        );
      }),
    ),
    { initialValue: null },
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
      'M',
    ),
  );

  readonly userPhoto = computed(
    () => this.userProfile()?.photoURL ?? this.currentUser()?.photoURL ?? null,
  );

  readonly hasPhoto = computed(() => !!this.userPhoto());

  /* ═══════════════════════════════════════════════════════
     MESSAGE DE BIENVENUE DYNAMIQUE
     ═══════════════════════════════════════════════════════ */

  private readonly now = signal(Date.now());

  readonly greeting = computed(() => {
    const h = new Date(this.now()).getHours();
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

  /* ═══════════════════════════════════════════════════════
     CYCLE DE VIE
     ═══════════════════════════════════════════════════════ */

  constructor() {
    afterNextRender(() => {
      const intervalId = setInterval(() => this.now.set(Date.now()), 60_000);
      this.destroyRef.onDestroy(() => clearInterval(intervalId));
    });
  }
}