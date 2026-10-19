// src/app/home/accueil/accueil.component.ts

import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  afterNextRender,
  computed,
  inject,
  signal,
} from '@angular/core';

import {
  DomSanitizer,
  SafeResourceUrl,
} from '@angular/platform-browser';

import { RevealDirective } from 'src/app/shared/reveal.directive';

import {
  Award,
  CollaborationGroup,
  FestivalItem,
  SkillTag,
  StatItem,
} from '../models/accueil.model';

import {
  ARTIST_NAME,
  ARTIST_TAGLINE,
  ARTIST_VIDEO_URL,
  ARTIST_YOUTUBE_URL,
  AWARDS,
  BIO_INTRO,
  BIO_NAME,
  COLLABORATIONS,
  FESTIVALS,
  SCENIC_DESC,
  SKILLS,
  STATS,
} from '../data/accueil.data';

/* ═════════════════════════════════════════════════════════════════════
   COMPOSANT
   ═════════════════════════════════════════════════════════════════════ */

@Component({
  selector: 'app-accueil',
  imports: [RevealDirective],
  templateUrl: './accueil.component.html',
  styleUrls: ['./accueil.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccueilComponent {

  /* ─── Injection ─── */
  private readonly destroyRef = inject(DestroyRef);
  private readonly sanitizer = inject(DomSanitizer);

  /* ═══════════════════════════════════════════════════════
     CONSTANTES EXPOSÉES AU TEMPLATE
     ═══════════════════════════════════════════════════════ */

  readonly artistName = ARTIST_NAME;
  readonly artistTagline = ARTIST_TAGLINE;
  readonly artistYoutubeUrl = ARTIST_YOUTUBE_URL;

  readonly bioName = BIO_NAME;
  readonly bioIntro = BIO_INTRO;

  readonly stats: readonly StatItem[] = STATS;
  readonly skills: readonly SkillTag[] = SKILLS;
  readonly collaborations: readonly CollaborationGroup[] = COLLABORATIONS;
  readonly scenicDesc = SCENIC_DESC;
  readonly festivals: readonly FestivalItem[] = FESTIVALS;
  readonly awards: readonly Award[] = AWARDS;

  /* ═══════════════════════════════════════════════════════
     URL VIDÉO SÉCURISÉE
     ═══════════════════════════════════════════════════════ */

  readonly safeVideoUrl = computed<SafeResourceUrl>(() =>
    this.sanitizer.bypassSecurityTrustResourceUrl(ARTIST_VIDEO_URL),
  );

  /* ═══════════════════════════════════════════════════════
     COMPTEURS ANIMÉS (stats) — one-shot, conservé
     ═══════════════════════════════════════════════════════ */

  readonly animatedStats = signal<Record<string, number>>(
    Object.fromEntries(STATS.map((s) => [s.id, 0])),
  );

  /* ═══════════════════════════════════════════════════════
     CONSTRUCTEUR
     ═══════════════════════════════════════════════════════ */

  constructor() {
    afterNextRender(() => {
      this.launchCounters();
    });
  }

  /* ═══════════════════════════════════════════════════════
     ANIMATION DES COMPTEURS (one-shot)
     ═══════════════════════════════════════════════════════ */

  private launchCounters(): void {
    const timeoutId = setTimeout(() => {
      for (const stat of STATS) {
        this.animateCounter(stat.id, stat.numericValue);
      }
    }, 600);

    this.destroyRef.onDestroy(() => clearTimeout(timeoutId));
  }

  private animateCounter(id: string, target: number): void {
    const durationMs = 1400;
    const startTime = performance.now();

    const tick = () => {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(1, elapsed / durationMs);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(target * eased);

      this.animatedStats.update((stats) => ({
        ...stats,
        [id]: current,
      }));

      if (progress < 1) {
        requestAnimationFrame(tick);
      }
    };

    requestAnimationFrame(tick);
  }
}