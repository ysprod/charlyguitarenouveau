// src/app/game/game.component.ts

import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';

import {
  NavigationEnd,
  Router,
  RouterOutlet,
} from '@angular/router';

import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map, startWith } from 'rxjs/operators';

import { GameSoundService } from './services/game-sound.service';

/* ═════════════════════════════════════════════════════════════════════
   CONSTANTES
   ═════════════════════════════════════════════════════════════════════ */

/** Mapping segment d'URL → nom du jeu. */
const GAME_LABELS: Readonly<Record<string, string>> = {
  play: 'Jeux',
  fretboard: 'Charly Guitare Hero',
  acoustic: 'Quiz',
  chord: 'Décodeur & Simulateur',
  'guitar-live': 'Guitar Live',
  memory: 'L\'Essentiel',
  metronome: 'Defi Métronome',
  piano: 'Charly Piano Hero',
  pianovirtuel: 'Piano',
  tictac: 'LYKO',
  tictacduo: 'Lyko Duel',
  cards: 'BOUBOUNI',
  kronos: 'Kronos',
  oracle: 'Yayus',
  lykomode: 'Lyko',
};

/** Segment de la page d'accueil des jeux (retour masqué). */
const HOME_SEGMENT = 'play';

/* ═════════════════════════════════════════════════════════════════════
   COMPOSANT
   ═════════════════════════════════════════════════════════════════════ */

@Component({
  selector: 'app-game',
  imports: [RouterOutlet],
  templateUrl: './game.component.html',
  styleUrl: './game.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GameComponent {

  private readonly router = inject(Router);
  private readonly sound = inject(GameSoundService);

  /* ─── Son (réexposé) ─── */
  readonly soundOn = this.sound.enabled;
  readonly soundIcon = this.sound.icon;
  readonly soundAriaLabel = this.sound.ariaLabel;

  /* ─── Aide ─── */
  readonly helpOpen = signal(false);

  /* ═══════════════════════════════════════════════════════
     URL COURANTE
     ═══════════════════════════════════════════════════════ */

  private readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map((e) => e.urlAfterRedirects),
      startWith(this.router.url),
    ),
    { initialValue: this.router.url },
  );

  /* ═══════════════════════════════════════════════════════
     SEGMENT ACTIF
     ═══════════════════════════════════════════════════════ */

  /**
   * Extrait le segment du jeu.
   * Ex: `/game/fretboard` → `'fretboard'`
   */
  private readonly activeSegment = computed<string | null>(() => {
    const url = this.currentUrl().split('?')[0].split('#')[0];
    const match = url.match(/^\/game\/([^/]+)/);
    return match?.[1] ?? null;
  });

  /* ═══════════════════════════════════════════════════════
     NOM DU JEU
     ═══════════════════════════════════════════════════════ */

  readonly activeGameLabel = computed(() => {
    const seg = this.activeSegment();
    if (!seg) return 'Jeux';
    return GAME_LABELS[seg] ?? 'Jeux';
  });

  /* ═══════════════════════════════════════════════════════
     VISIBILITÉ DU BOUTON RETOUR
     ═══════════════════════════════════════════════════════ */

  /**
   * ✅ Retour masqué sur `/game/play` (page d'accueil),
   *    affiché sur tous les autres jeux.
   */
  readonly showBackButton = computed(() => {
    const seg = this.activeSegment();
    return seg !== null && seg !== HOME_SEGMENT;
  });

  /* ═══════════════════════════════════════════════════════
     ACTIONS
     ═══════════════════════════════════════════════════════ */

  goBack(): void {
    if (this.showBackButton()) {
      void this.router.navigate(['/game/play']);
    }
  }

  toggleSound(): void {
    this.sound.toggle();
  }

  toggleHelp(): void {
    this.helpOpen.update((v) => !v);
  }
}