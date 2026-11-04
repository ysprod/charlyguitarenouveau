// src/app/live/streaming/streaming.component.ts

import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { FeaturedVideo } from '../models/live.model';
import { STREAMING_VIDEOS } from '../data/streaming.data';

const STORAGE_KEY = 'charlyguitare_streaming_views';

@Component({
  selector: 'app-streaming',
  imports: [],
  templateUrl: './streaming.component.html',
  styleUrls: ['./streaming.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StreamingComponent implements OnInit {

  private readonly sanitizer = inject(DomSanitizer);

  /* ─── État ─── */
  readonly activeVideo = signal<FeaturedVideo | null>(null);
  readonly canGoPrevious = computed(() => this.historyIndex() > 0);

  private readonly videoHistory = signal<FeaturedVideo[]>([]);
  private readonly historyIndex = signal(-1);

  /* ─── URL sécurisée (autoplay + son) ─── */
  readonly safeEmbedUrl = computed<SafeResourceUrl | null>(() => {
    const video = this.activeVideo();
    if (!video) return null;
    // ✅ autoplay=1&mute=0 tente de lancer avec son directement
    return this.sanitizer.bypassSecurityTrustResourceUrl(
      `https://www.youtube.com/embed/${video.id}?autoplay=1&mute=0&rel=0&modestbranding=1`,
    );
  });

  /* ═══════════════════════════════════════════════════════
     CYCLE DE VIE
     ═══════════════════════════════════════════════════════ */

  ngOnInit(): void {
    this.loadVideo();
  }

  /* ═══════════════════════════════════════════════════════
     SÉLECTION PONDÉRÉE (Une seule vidéo à la fois)
     ═══════════════════════════════════════════════════════ */

  private loadVideo(): void {
    const storedViews = this.getViewsFromStorage();
    const poolWithTickets: FeaturedVideo[] = [];
    const activeId = this.activeVideo()?.id;
    const videos =
      STREAMING_VIDEOS.length > 1
        ? STREAMING_VIDEOS.filter((video) => video.id !== activeId)
        : STREAMING_VIDEOS;

    videos.forEach((video) => {
      const views = storedViews[video.id] ?? video.views;
      const weight = Math.max(1, Math.floor(1000 / (views + 10)));
      for (let i = 0; i < weight; i++) {
        poolWithTickets.push(video);
      }
    });

    const shuffled = this.shuffleArray([...poolWithTickets]);
    const selected = shuffled[0];

    if (!selected) return;

    this.activeVideo.set(selected);
    const nextHistory = [
      ...this.videoHistory().slice(0, this.historyIndex() + 1),
      selected,
    ];
    this.videoHistory.set(nextHistory);
    this.historyIndex.set(nextHistory.length - 1);

    // Incrémenter les vues
    const updatedViews = { ...storedViews };
    updatedViews[selected.id] = (updatedViews[selected.id] ?? selected.views) + 1;
    this.saveViewsToStorage(updatedViews);
  }

  /* ═══════════════════════════════════════════════════════
     NAVIGATION
     ═══════════════════════════════════════════════════════ */

  nextVideo(): void {
    const nextIndex = this.historyIndex() + 1;
    const nextVideo = this.videoHistory()[nextIndex];
    if (nextVideo) {
      this.historyIndex.set(nextIndex);
      this.activeVideo.set(nextVideo);
      return;
    }

    this.loadVideo();
  }

  previousVideo(): void {
    if (!this.canGoPrevious()) return;

    const previousIndex = this.historyIndex() - 1;
    this.historyIndex.set(previousIndex);
    this.activeVideo.set(this.videoHistory()[previousIndex] ?? null);
  }

  /* ═══════════════════════════════════════════════════════
     HELPERS
     ═══════════════════════════════════════════════════════ */

  private getViewsFromStorage(): Record<string, number> {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  private saveViewsToStorage(views: Record<string, number>): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(views));
    } catch {}
  }

  private shuffleArray<T>(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }
}