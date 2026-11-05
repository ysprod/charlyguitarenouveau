// src/app/app.routes.ts

import { Routes } from '@angular/router';

import { AuthGuard } from './guards/auth/auth.guard';
import { GuestGuard } from './guards/guest/guest.guard';
import { AppComponent } from './app.component';
import { HomeComponent } from './home/home.component';

export const routes: Routes = [
  /* ═══════════════════════════════════════════════════════
     PAGES SANS LAYOUT (login, register, legal)
     ═══════════════════════════════════════════════════════ */

  {
    path: 'login',
    canActivate: [GuestGuard],
    loadComponent: () =>
      import('./home/login/login.component').then((m) => m.LoginComponent),
    title: 'Connexion — Charly Guitare',
  },
  {
    path: 'register',
    canActivate: [GuestGuard],
    loadComponent: () =>
      import('./home/register/register.component').then(
        (m) => m.RegisterComponent,
      ),
    title: 'Inscription — Charly Guitare',
  },
  {
    path: 'legal',
    loadChildren: () =>
      import('./legal/legal.routes').then((m) => m.legalRoutes),
  },

  /* ═══════════════════════════════════════════════════════
     PAGES AVEC LAYOUT PRINCIPAL (sidebar + header + bottom nav)
     AppComponent agit comme "shell" parent
     ═══════════════════════════════════════════════════════ */

  {
    path: '',
    component: AppComponent,
    children: [
      /* Accueil */
      {
        path: '',
        component: HomeComponent,
        title: 'Charly Guitare — Apprendre la guitare',
        pathMatch: 'full',
      },
      {
        path: 'home',
        component: HomeComponent,
        title: 'Charly Guitare — Accueil',
      },

      /* Jeux */
      {
        path: 'game',
        canActivate: [AuthGuard],
        loadChildren: () =>
          import('./game/game.routes').then((m) => m.gameRoutes),
      },

      /* Académie */
      {
        path: 'academie',
        canActivate: [AuthGuard],
        loadChildren: () =>
          import('./academie/academie.routes').then((m) => m.academieRoutes),
      },

      /* Offoland */
      {
        path: 'offoland',
        canActivate: [AuthGuard],
        loadChildren: () =>
          import('./offoland/offoland.routes').then((m) => m.offolandRoutes),
      },

      /* Espace utilisateur */
      {
        path: 'user',
        canActivate: [AuthGuard],
        loadChildren: () =>
          import('./user/user.routes').then((m) => m.userRoutes),
      },
    ],
  },

  /* Fallback */
  {
    path: '**',
    redirectTo: 'home',
  },
];