// src/app/offoland/dimensions/dimensions.routes.ts

import { Routes } from '@angular/router';

import { DimensionsComponent } from './dimensions.component';
import { AuthGuard } from '../../guards/auth/auth.guard';

/* ═════════════════════════════════════════════════════════════════════
   DIMENSIONS ROUTES — Les 7 dimensions + Charly Guitare Game
   ─────────────────────────────────────────────────────────────────────
   - Parent : DimensionsComponent (avec <router-outlet>)
   - Enfants : lazy-loadés, chacun dans son chunk
   - AuthGuard appliqué UNE fois sur le parent
   ═════════════════════════════════════════════════════════════════════ */

export const dimensionsRoutes: Routes = [
  {
    path: '',
    component: DimensionsComponent,
    canActivate: [AuthGuard],
    children: [
      {
        path: '',
        redirectTo: 'charlyguitaregame',
        pathMatch: 'full',
      },

      /* ─── Galerie des 7 dimensions ─── */
      {
        path: 'charlyguitaregame',
        loadComponent: () =>
          import('./charlyguitaregame/charlyguitaregame.component').then(
            (m) => m.CharlyguitaregameComponent,
          ),
        title: 'Charly Guitare Game — Offoland',
      },

      /* ─── Dimension Blanc ─── */
      {
        path: 'blanc',
        loadComponent: () =>
          import('./blanc/blanc.component').then(
            (m) => m.BlancComponent,
          ),
        title: 'Blanc — Offoland',
      },

      /* ─── Dimension Bleu ─── */
      {
        path: 'bleu',
        loadComponent: () =>
          import('./bleu/bleu.component').then(
            (m) => m.BleuComponent,
          ),
        title: 'Bleu — Offoland',
      },

      /* ─── Dimension Noir ─── */
      {
        path: 'noir',
        loadComponent: () =>
          import('./noir/noir.component').then(
            (m) => m.NoirComponent,
          ),
        title: 'Noir — Offoland',
      },

      /* ─── Dimension Pourpre ─── */
      {
        path: 'pourpre',
        loadComponent: () =>
          import('./pourpre/pourpre.component').then(
            (m) => m.PourpreComponent,
          ),
        title: 'Pourpre — Offoland',
      },

      /* ─── Dimension Rouge ─── */
      {
        path: 'rouge',
        loadComponent: () =>
          import('./rouge/rouge.component').then(
            (m) => m.RougeComponent,
          ),
        title: 'Rouge — Offoland',
      },

      /* ─── Dimension Vert ─── */
      {
        path: 'vert',
        loadComponent: () =>
          import('./vert/vert.component').then(
            (m) => m.VertComponent,
          ),
        title: 'Vert — Offoland',
      },

      /* ─── Dimension Violet ─── */
      {
        path: 'violet',
        loadComponent: () =>
          import('./violet/violet.component').then(
            (m) => m.VioletComponent,
          ),
        title: 'Violet — Offoland',
      },
    ],
  },
];