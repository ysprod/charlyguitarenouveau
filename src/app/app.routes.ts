import { Routes } from '@angular/router';
import { AuthGuard } from './guards/auth/auth.guard';
import { GuestGuard } from './guards/guest/guest.guard';
import { HomeComponent } from './home/home.component';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./home/login/login.component').then((m) => m.LoginComponent),
    title: 'Connexion — Charly Guitare',
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./home/register/register.component').then((m) => m.RegisterComponent),
    title: 'Inscription — Charly Guitare',
  },
  {
    path: '',
    component: HomeComponent,
    canActivate: [GuestGuard],
    title: 'Charly Guitare — Apprendre la guitare',
    pathMatch: 'full',
  },
  {
    path: 'home',
    component: HomeComponent,
    canActivate: [GuestGuard],
    title: 'Charly Guitare — Accueil',
  },
  {
    path: 'game',
    loadChildren: () =>
      import('./game/game.routes').then((m) => m.gameRoutes),
  },
  {
    path: 'academie',
    loadChildren: () =>
      import('./academie/academie.routes').then((m) => m.academieRoutes),
  },
  {
    path: 'offoland',
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