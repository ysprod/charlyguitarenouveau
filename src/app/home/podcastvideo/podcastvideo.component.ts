// src/app/home/podcastvideo/podcastvideo.component.ts

import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';

import {
  DomSanitizer,
  SafeResourceUrl,
} from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { PODCAST_STORAGE_KEY, PODCAST_VIDEOS, PodcastVideo } from '../data/podcast.data';

@Component({
  selector: 'app-podcastvideo',
  imports: [RouterLink],
  templateUrl: './podcastvideo.component.html',
  styleUrl: './podcastvideo.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PodcastvideoComponent implements OnInit {

  /* ─── Injection ─── */
  private readonly sanitizer = inject(DomSanitizer);

  /* ─── Inputs ─── */
  @Input() affichebouton: boolean = true;
  @Input() randommode: boolean = false;

  /* ─── État ─── */
  private readonly currentVideo = signal<PodcastVideo>(PODCAST_VIDEOS[0]);
  readonly video = computed(() => this.currentVideo());

  /* ─── URL sécurisée ─── */
  readonly safeEmbedUrl = computed<SafeResourceUrl>(() =>
    this.sanitizer.bypassSecurityTrustResourceUrl(this.video().embedUrl)
  );

  ngOnInit(): void {
    if (this.randommode) {
      this.initRotation();
    }
  }

  /* ═══════════════════════════════════════════════════════
     LOGIQUE DE ROTATION (Équéquitable / Random)
     ═══════════════════════════════════════════════════════ */

  private initRotation(): void {
    const plays = this.getPlaysFromStorage();
    
    // Trouver le nombre minimum de lectures parmi toutes les vidéos
    const minPlays = Math.min(...PODCAST_VIDEOS.map(v => plays[v.id] || 0));

    // Filtrer les vidéos qui ont ce score minimum (pour l'équité)
    const candidates = PODCAST_VIDEOS.filter(
      (v) => (plays[v.id] || 0) === minPlays
    );

    // Choisir une vidéo au hasard parmi les candidates équéquitables
    const selected = candidates[Math.floor(Math.random() * candidates.length)];

    // Mettre à jour le signal de la vidéo courante
    this.currentVideo.set(selected);

    // Incrémenter et sauvegarder dans le stockage local
    plays[selected.id] = (plays[selected.id] || 0) + 1;
    this.savePlaysToStorage(plays);
  }

  /* ═══════════════════════════════════════════════════════
     LOCAL STORAGE
     ═══════════════════════════════════════════════════════ */

  private getPlaysFromStorage(): Record<string, number> {
    try {
      const raw = localStorage.getItem(PODCAST_STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  private savePlaysToStorage(plays: Record<string, number>): void {
    try {
      localStorage.setItem(PODCAST_STORAGE_KEY, JSON.stringify(plays));
    } catch {
      // Silencieux si localStorage est bloqué (navigation privée, etc.)
    }
  }
}