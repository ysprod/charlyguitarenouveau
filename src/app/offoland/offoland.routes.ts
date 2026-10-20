// src/app/offoland/offoland.routes.ts

import { Routes } from '@angular/router';

import { AuthGuard } from '../guards/auth/auth.guard';

/* ═════════════════════════════════════════════════════════════════════
   OFFOLAND ROUTES
   ─────────────────────────────────────────────────────────────────────
   - /offoland                     → page principale
   - /offoland/finance             → Finance
   - /offoland/bco                 → BCO
   - /offoland/dimensions/*        → 7 dimensions (sous-module)
   ═════════════════════════════════════════════════════════════════════ */

export const offolandRoutes: Routes = [
  /* ─── Page principale Offoland ─── */
  {
    path: '',
    loadComponent: () =>
      import('./offoland.component').then((m) => m.OffolandComponent),
    canActivate: [AuthGuard],
    title: 'Offoland',
    pathMatch: 'full',
  },

  /* ─── Finance ─── */
  {
    path: 'finance',
    loadComponent: () =>
      import('./finance/finance.component').then(
        (m) => m.FinanceComponent,
      ),
    canActivate: [AuthGuard],
    title: 'Finance — Offoland',
  },

  /* ─── BCO ─── */
  {
    path: 'bco',
    loadComponent: () =>
      import('./bco/bco.component').then((m) => m.BcoComponent),
    canActivate: [AuthGuard],
    title: 'BCO — Offoland',
  },

  /* ─── Dimensions (sous-module avec router-outlet dédié) ─── */
  {
    path: 'dimensions',
    loadChildren: () =>
      import('./dimensions/dimensions.routes').then(
        (m) => m.dimensionsRoutes,
      ),
  },

  /* ─── Redirections legacy (anciennes URLs) ─── */
  {
    path: 'charlyguitaregame',
    redirectTo: 'dimensions/charlyguitaregame',
    pathMatch: 'full',
  },
  {
    path: 'blanc',
    redirectTo: 'dimensions/blanc',
    pathMatch: 'full',
  },
  {
    path: 'bleu',
    redirectTo: 'dimensions/bleu',
    pathMatch: 'full',
  },
  {
    path: 'noir',
    redirectTo: 'dimensions/noir',
    pathMatch: 'full',
  },
  {
    path: 'pourpre',
    redirectTo: 'dimensions/pourpre',
    pathMatch: 'full',
  },
  {
    path: 'rouge',
    redirectTo: 'dimensions/rouge',
    pathMatch: 'full',
  },
  {
    path: 'vert',
    redirectTo: 'dimensions/vert',
    pathMatch: 'full',
  },
  {
    path: 'violet',
    redirectTo: 'dimensions/violet',
    pathMatch: 'full',
  },
];