import { Routes } from '@angular/router';
import { GameComponent } from './game.component';
import { AuthGuard } from '../guards/auth/auth.guard';

export const gameRoutes: Routes = [
  {
    path: '',
    component: GameComponent,
    canActivate: [AuthGuard],
    children: [
      { path: '', redirectTo: 'play', pathMatch: 'full' },

      {
        path: 'play',
        loadComponent: () =>
          import('./play/play.component').then((m) => m.PlayComponent),
      },
      {
        path: 'fretboard',
        loadComponent: () =>
          import('./fretboard/fretboard.component').then((m) => m.FretboardComponent),
      },
      {
        path: 'memory',
        loadComponent: () =>
          import('./memory/memory.component').then((m) => m.MemoryComponent),
      },
      {
        path: 'metronome',
        loadComponent: () =>
          import('./metronome/metronome.component').then((m) => m.MetronomeComponent),
      },
      {
        path: 'acoustic',
        loadComponent: () =>
          import('./acoustic/acoustic.component').then((m) => m.AcousticComponent),
      },
      {
        path: 'chord',
        loadComponent: () =>
          import('./chord/chord.component').then((m) => m.ChordComponent),
      },
      {
        path: 'piano',
        loadComponent: () =>
          import('./piano/piano.component').then((m) => m.PianoComponent),
      },
      {
        path: 'pianovirtuel',
        loadComponent: () =>
          import('./pianovirtuel/pianovirtuel.component').then((m) => m.PianovirtuelComponent),
      },
      {
        path: 'guitar-live',
        loadComponent: () =>
          import('./guitar-live/guitar-live.component').then((m) => m.GuitarLiveComponent),
      },
      {
        path: 'oracle',
        loadComponent: () =>
          import('./oracle-widget/oracle-widget.component').then((m) => m.OracleWidgetComponent),
      },
      {
        path: 'tictac',
        loadComponent: () =>
          import('./tictactoe/tictactoe.component').then((m) => m.TictactoeComponent),
      },
      {
        path: 'tictacduo',
        loadComponent: () =>
          import('./tictacduo/tictacduo.component').then((m) => m.TictacduoComponent),
      },
      {
        path: 'cards',
        loadComponent: () =>
          import('./cardgame/cardgame.component').then((m) => m.CardgameComponent),
      },
      {
        path: 'kronos',
        loadComponent: () =>
          import('./kronos/kronos.component').then((m) => m.KronosComponent),
      },
      {
        path: 'lykomode',
        loadComponent: () =>
          import('./lykomode/lykomode.component').then((m) => m.LykomodeComponent),
      },
    ],
  },
];