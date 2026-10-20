// src/app/offoland/offoland.routes.ts

import { Routes } from '@angular/router';

import { AuthGuard } from '../guards/auth/auth.guard';

/* ═════════════════════════════════════════════════════════════════════
   OFFOLAND ROUTES
   ─────────────────────────────────────────────────────────────────────
   - /offoland                     → page principale
   - /offoland/dimensions/*        → 7 dimensions (sous-module)
   - /offoland/vie/*               → BCO, Finance (sous-module)
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

  /* ─── Dimensions (sous-module) ─── */
  {
    path: 'dimensions',
    loadChildren: () =>
      import('./dimensions/dimensions.routes').then(
        (m) => m.dimensionsRoutes,
      ),
  },

  /* ─── Vie d'Offoland (sous-module) ─── */
  {
    path: 'vie',
    loadChildren: () =>
      import('./vie/vie.routes').then((m) => m.vieRoutes),
  },

  /* ─── Redirections legacy ─── */
  { path: 'charlyguitaregame', redirectTo: 'dimensions/charlyguitaregame', pathMatch: 'full' },
  { path: 'blanc',  redirectTo: 'dimensions/blanc',  pathMatch: 'full' },
  { path: 'bleu',   redirectTo: 'dimensions/bleu',   pathMatch: 'full' },
  { path: 'noir',   redirectTo: 'dimensions/noir',   pathMatch: 'full' },
  { path: 'pourpre', redirectTo: 'dimensions/pourpre', pathMatch: 'full' },
  { path: 'rouge',  redirectTo: 'dimensions/rouge',  pathMatch: 'full' },
  { path: 'vert',   redirectTo: 'dimensions/vert',   pathMatch: 'full' },
  { path: 'violet', redirectTo: 'dimensions/violet', pathMatch: 'full' },

  /* ✅ Redirections BCO/Finance → /offoland/vie/* */
  { path: 'bco',     redirectTo: 'vie/bco',     pathMatch: 'full' },
  { path: 'finance', redirectTo: 'vie/finance', pathMatch: 'full' },
];