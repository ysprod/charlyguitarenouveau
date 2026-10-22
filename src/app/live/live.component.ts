import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';

import {
  DomSanitizer,
  SafeResourceUrl,
} from '@angular/platform-browser';

import { LiveCard, LiveVideo } from './models/live.model';
import { LIVE_CARDS, LIVE_VIDEO } from './data/live.data';
import { ImmersiveCarouselComponent } from '../shared/immersive-carousel/immersive-carousel.component';

/* ═════════════════════════════════════════════════════════════════════
   LIVE — Hub des lives Charly Guitare
   ═════════════════════════════════════════════════════════════════════ */

@Component({
  selector: 'app-live',
  imports:[ImmersiveCarouselComponent],
  templateUrl: './live.component.html',
  styleUrls: ['./live.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LiveComponent {

  /* ─── Injection ─── */
  private readonly sanitizer = inject(DomSanitizer);

  /* ═══════════════════════════════════════════════════════
     DONNÉES — Immuables
     ═══════════════════════════════════════════════════════ */

  readonly video: LiveVideo = LIVE_VIDEO;
  readonly cards: readonly LiveCard[] = LIVE_CARDS;

  /* ═══════════════════════════════════════════════════════
     URL D'EMBED SÉCURISÉE
     ═══════════════════════════════════════════════════════ */

  /**
   * Angular `sanitize` automatiquement les URLs d'iframe.
   * Pour YouTube, il faut explicitement bypasser avec
   * `bypassSecurityTrustResourceUrl`.
   */
  readonly safeEmbedUrl = computed<SafeResourceUrl>(() =>
    this.sanitizer.bypassSecurityTrustResourceUrl(this.video.embedUrl)
  );
}