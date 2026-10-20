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
import { LiveVideo } from '../../live/models/live.model';
import { RouterLink } from '@angular/router';

const LIVE_VIDEO: LiveVideo = {
  title: 'La Grande Bible d\'Offoland (ecrit par Charly Guitare) enfin expliquée...',
  embedUrl:
    'https://www.youtube.com/embed/TCJUEVCt8LI?autoplay=1&rel=0&modestbranding=1',
  watchUrl: 'https://www.youtube.com/watch?v=TCJUEVCt8LI',
  badge: 'PODCASTS VIDEO',
};

@Component({
  selector: 'app-podcastvideo',
  imports: [RouterLink],
  templateUrl: './podcastvideo.component.html',
  styleUrl: './podcastvideo.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PodcastvideoComponent {

  /* ─── Injection ─── */
  private readonly sanitizer = inject(DomSanitizer);

  readonly video: LiveVideo = LIVE_VIDEO;

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
