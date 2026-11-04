import { Routes } from '@angular/router';
import { AuthGuard } from './guards/auth/auth.guard';
import { GuestGuard } from './guards/guest/guest.guard';
import { HomeComponent } from './home/home.component';

export const routes: Routes = [
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
      import('./home/register/register.component').then((m) => m.RegisterComponent),
    title: 'Inscription — Charly Guitare',
  },
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
  {
    path: 'game',
    canActivate: [AuthGuard],
    loadChildren: () =>
      import('./game/game.routes').then((m) => m.gameRoutes),
  },
  {
    path: 'academie',
    canActivate: [AuthGuard],
    loadChildren: () =>
      import('./academie/academie.routes').then((m) => m.academieRoutes),
  },
  {
    path: 'offoland',
    canActivate: [AuthGuard],
    loadChildren: () =>
      import('./offoland/offoland.routes').then((m) => m.offolandRoutes),
  },
  {
    path: 'user',
    canActivate: [AuthGuard],
    loadChildren: () =>
      import('./user/user.routes').then((m) => m.userRoutes),
  },
  {
    path: '**',
    redirectTo: 'home',
  },
];