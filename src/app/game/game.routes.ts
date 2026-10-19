// src/app/game/game.routes.ts

import { Routes } from '@angular/router';

import { AuthGuard } from '../guards/auth/auth.guard';

import { GameComponent } from './game.component';

/* ═════════════════════════════════════════════════════════════════════
   GAME ROUTES — Tous les jeux de Charly Guitare
   ─────────────────────────────────────────────────────────────────────
   - Parent : GameComponent + AuthGuard (protection unique)
   - Enfants : lazy loading par jeu (chaque jeu = 1 chunk)
   - Redirection par défaut : /game/play
   ═════════════════════════════════════════════════════════════════════ */

export const gameRoutes: Routes = [
  {
    path: '',
    component: GameComponent,
    canActivate: [AuthGuard],
    children: [
      /* ─── Redirection par défaut ─── */
      { path: '', redirectTo: 'play', pathMatch: 'full' },

      /* ─── Jeu principal ─── */
      {
        path: 'play',
        loadComponent: () =>
          import('./play/play.component').then((m) => m.PlayComponent),
        title: 'Jeux — Charly Guitare',
      },

      /* ─── Jeux de manche ─── */
      {
        path: 'fretboard',
        loadComponent: () =>
          import('./fretboard/fretboard.component').then(
            (m) => m.FretboardComponent,
          ),
        title: 'Fretboard Hero — Charly Guitare',
      },
      {
        path: 'acoustic',
        loadComponent: () =>
          import('./acoustic/acoustic.component').then(
            (m) => m.AcousticComponent,
          ),
        title: 'Acoustique — Charly Guitare',
      },
      {
        path: 'chord',
        loadComponent: () =>
          import('./chord/chord.component').then(
            (m) => m.ChordComponent,
          ),
        title: 'Accords — Charly Guitare',
      },
      {
        path: 'guitar-live',
        loadComponent: () =>
          import('./guitar-live/guitar-live.component').then(
            (m) => m.GuitarLiveComponent,
          ),
        title: 'Guitar Live — Charly Guitare',
      },

      /* ─── Jeux de mémoire & rythme ─── */
      {
        path: 'memory',
        loadComponent: () =>
          import('./memory/memory.component').then(
            (m) => m.MemoryComponent,
          ),
        title: 'Memory — Charly Guitare',
      },
      {
        path: 'metronome',
        loadComponent: () =>
          import('./metronome/metronome.component').then(
            (m) => m.MetronomeComponent,
          ),
        title: 'Métronome — Charly Guitare',
      },

      /* ─── Jeux de piano ─── */
      {
        path: 'piano',
        loadComponent: () =>
          import('./piano/piano.component').then(
            (m) => m.PianoComponent,
          ),
        title: 'Piano — Charly Guitare',
      },
      {
        path: 'pianovirtuel',
        loadComponent: () =>
          import('./pianovirtuel/pianovirtuel.component').then(
            (m) => m.PianovirtuelComponent,
          ),
        title: 'Piano virtuel — Charly Guitare',
      },

      /* ─── Jeux de duel ─── */
      {
        path: 'tictac',
        loadComponent: () =>
          import('./tictactoe/tictactoe.component').then(
            (m) => m.TictactoeComponent,
          ),
        title: 'Tic Tac Toe — Charly Guitare',
      },
      {
        path: 'tictacduo',
        loadComponent: () =>
          import('./tictacduo/tictacduo.component').then(
            (m) => m.TictacduoComponent,
          ),
        title: 'Lyko Duel — Charly Guitare',
      },

      /* ─── Jeux de cartes ─── */
      {
        path: 'cards',
        loadComponent: () =>
          import('./cardgame/cardgame.component').then(
            (m) => m.CardgameComponent,
          ),
        title: 'Cartes — Charly Guitare',
      },
      {
        path: 'kronos',
        loadComponent: () =>
          import('./kronos/kronos.component').then(
            (m) => m.KronosComponent,
          ),
        title: 'Kronos — Charly Guitare',
      },

      /* ─── Jeux mystiques ─── */
      {
        path: 'oracle',
        loadComponent: () =>
          import('./oracle-widget/oracle-widget.component').then(
            (m) => m.OracleWidgetComponent,
          ),
        title: 'Oracle — Charly Guitare',
      },
      {
        path: 'lykomode',
        loadComponent: () =>
          import('./lykomode/lykomode.component').then(
            (m) => m.LykomodeComponent,
          ),
        title: 'Lyko Mode — Charly Guitare',
      },
    ],
  },
];