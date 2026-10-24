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
  { path: 'play', redirectTo: 'game/play', pathMatch: 'full' },
  { path: 'fretboard', redirectTo: 'game/fretboard', pathMatch: 'full' },
  { path: 'memory', redirectTo: 'game/memory', pathMatch: 'full' },
  { path: 'metronome', redirectTo: 'game/metronome', pathMatch: 'full' },
  { path: 'acoustic', redirectTo: 'game/acoustic', pathMatch: 'full' },
  { path: 'chord', redirectTo: 'game/chord', pathMatch: 'full' },
  { path: 'piano', redirectTo: 'game/piano', pathMatch: 'full' },
  { path: 'pianovirtuel', redirectTo: 'game/pianovirtuel', pathMatch: 'full' },
  { path: 'guitar-live', redirectTo: 'game/guitar-live', pathMatch: 'full' },
  { path: 'oracle', redirectTo: 'game/oracle', pathMatch: 'full' },
  { path: 'tictac', redirectTo: 'game/tictac', pathMatch: 'full' },
  { path: 'tictacduo', redirectTo: 'game/tictacduo', pathMatch: 'full' },
  { path: 'cards', redirectTo: 'game/cards', pathMatch: 'full' },
  { path: 'kronos', redirectTo: 'game/kronos', pathMatch: 'full' },
  { path: 'lykomode', redirectTo: 'game/lykomode', pathMatch: 'full' },
  { path: 'store', redirectTo: 'academie/documents', pathMatch: 'full' },
  { path: 'offres', redirectTo: 'academie/offres', pathMatch: 'full' },
  { path: 'abonnement', redirectTo: 'academie/offres', pathMatch: 'full' },
  { path: 'amanda', redirectTo: 'user/amanda', pathMatch: 'full' },
  { path: 'accueil', redirectTo: 'user/accueil', pathMatch: 'full' },
  { path: 'profil', redirectTo: 'user/profil', pathMatch: 'full' },
  { path: 'inbox', redirectTo: 'user/inbox', pathMatch: 'full' },
  { path: 'notifications', redirectTo: 'user/notifications', pathMatch: 'full' },
  { path: 'studio', redirectTo: 'user/studio', pathMatch: 'full' },
  { path: 'noslives', redirectTo: 'user/noslives', pathMatch: 'full' },
  { path: 'contact', redirectTo: 'user/contact', pathMatch: 'full' },
  { path: 'again', redirectTo: 'user/again', pathMatch: 'full' },
  { path: 'privacy', redirectTo: 'user/privacy', pathMatch: 'full' },
  { path: 'mentions', redirectTo: 'user/mentions', pathMatch: 'full' },
  {
    path: '**',
    redirectTo: 'home',
  },
];