// src/app/academie/academie.routes.ts

import { Routes } from '@angular/router';
import { AuthGuard } from '../guards/auth/auth.guard';
import { AcademieComponent } from './academie.component';

export const academieRoutes: Routes = [
  {
    path: '',
    component: AcademieComponent, // ✅ Composant parent avec <router-outlet>
    canActivate: [AuthGuard],
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./academie-home/academie-home.component').then(
            (m) => m.AcademieHomeComponent,
          ),
        title: 'Académie — Charly Guitare',
      },
      {
        path: 'live',
        loadComponent: () =>
          import('./live/live.component').then((m) => m.LiveComponent),
        title: 'Apprendre en Live — Charly Guitare',
      },
      {
        path: 'offres',
        loadComponent: () =>
          import('./offres/offres.component').then((m) => m.OffresComponent),
        title: 'Offres & Abonnements — Charly Guitare',
      },
      {
        path: 'documents',
        loadComponent: () =>
          import('./documents/documents.component').then(
            (m) => m.DocumentsComponent,
          ),
        title: 'Boutique — Charly Guitare',
      },
    ],
  },
];