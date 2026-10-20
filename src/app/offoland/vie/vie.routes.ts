// src/app/offoland/vie/vie.routes.ts

import { Routes } from '@angular/router';

import { VieComponent } from './vie.component';
import { AuthGuard } from '../../guards/auth/auth.guard';

/* ═════════════════════════════════════════════════════════════════════
   VIE D'OFFOLAND ROUTES
   ─────────────────────────────────────────────────────────────────────
   - Parent : VieComponent (avec <router-outlet>)
   - Enfants : BCO, Finance (lazy-loadés)
   - Page par défaut : /offoland/vie → vie-home
   ═════════════════════════════════════════════════════════════════════ */

export const vieRoutes: Routes = [
  {
    path: '',
    component: VieComponent,
    canActivate: [AuthGuard],
    children: [
      /* ─── Page par défaut → hub des sections ─── */
      {
        path: '',
        loadComponent: () =>
          import('./vie-home/vie-home.component').then(
            (m) => m.VieHomeComponent,
          ),
        title: 'La Vie d\'Offoland',
      },

      /* ─── BCO ─── */
      {
        path: 'bco',
        loadComponent: () =>
          import('../bco/bco.component').then((m) => m.BcoComponent),
        title: 'BCO — Offoland',
      },

      /* ─── Finance ─── */
      {
        path: 'finance',
        loadComponent: () =>
          import('../finance/finance.component').then(
            (m) => m.FinanceComponent,
          ),
        title: 'Finance — Offoland',
      },
    ],
  },
];