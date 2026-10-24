// src/app/user/user-home/user-home.component.ts

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
import { QUICK_ACTIONS, WHY_PILLARS } from 'src/app/home/constants/homeconnect.constants';
import { FooterComponent } from 'src/app/home/footer/footer.component';
import { InboxPanelComponent } from 'src/app/home/homeconnect/inbox-panel/inbox-panel.component';
import { UserProfile } from 'src/app/home/models/user.model';
import { PodcastvideoComponent } from 'src/app/home/podcastvideo/podcastvideo.component';
import { getInitials } from 'src/app/home/utils/string.utils';
import { ImmersiveCarouselComponent } from 'src/app/shared/immersive-carousel/immersive-carousel.component';
 

@Component({
  selector: 'app-user-home',
  imports: [
    RouterLink,
    PodcastvideoComponent,
    FooterComponent,
    InboxPanelComponent,
    ImmersiveCarouselComponent,
  ],
  templateUrl: './user-home.component.html',
  styleUrls: ['./user-home.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserHomeComponent {

  /* ─── Injection ─── */
  private readonly auth = inject(Auth);
  private readonly db = inject(Database);
  private readonly destroyRef = inject(DestroyRef);
  private readonly environmentInjector = inject(EnvironmentInjector);

  /* ─── Utilisateur ─── */
  readonly currentUser = toSignal(authState(this.auth), { initialValue: null });

  readonly userProfile = toSignal(
    authState(this.auth).pipe(
      switchMap((u) => {
        if (!u?.uid) return of(null);
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
    return p?.displayName ?? u?.displayName ?? u?.email?.split('@')[0] ?? 'Offolandais';
  });

  readonly userFirstName = computed(() => {
    const parts = this.userName().trim().split(/\s+/);
    return parts[0] ?? 'Musicien';
  });

  readonly userInitials = computed(() =>
    getInitials(
      this.userProfile()?.displayName ?? this.currentUser()?.displayName ?? 'OFFOLANDAIS',
      this.currentUser()?.email,
      'M',
    ),
  );

  readonly userPhoto = computed(
    () => this.userProfile()?.photoURL ?? this.currentUser()?.photoURL ?? null,
  );

  readonly hasPhoto = computed(() => !!this.userPhoto());

  /* ─── Message de bienvenue ─── */
  private readonly now = signal(Date.now());

  readonly greeting = computed(() => {
    const h = new Date(this.now()).getHours();
    if (h < 12) return 'Bonjour';
    if (h < 18) return 'Bon après-midi';
    return 'Bonsoir';
  });

  /* ─── Constantes UI ─── */
  readonly quickActions = QUICK_ACTIONS;
  readonly whyPillars = WHY_PILLARS;

  constructor() {
    afterNextRender(() => {
      const intervalId = setInterval(() => this.now.set(Date.now()), 60_000);
      this.destroyRef.onDestroy(() => clearInterval(intervalId));
    });
  }
}