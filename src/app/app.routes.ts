// src/app/app.routes.ts

import { Routes } from '@angular/router';

import { AuthGuard } from './guards/auth/auth.guard';
import { HomeComponent } from './home/home.component';

export const routes: Routes = [
  /* ═══════════════════════════════════════════════════════
     AUTH
     ═══════════════════════════════════════════════════════ */
  {
    path: 'login',
    loadComponent: () =>
      import('./home/login/login.component').then(
        (m) => m.LoginComponent,
      ),
    title: 'Connexion — Charly Guitare',
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./home/register/register.component').then(
        (m) => m.RegisterComponent,
      ),
    title: 'Inscription — Charly Guitare',
  },

  /* ═══════════════════════════════════════════════════════
     HOME
     ═══════════════════════════════════════════════════════ */
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

  /* ═══════════════════════════════════════════════════════
     GAME (lazy loading par sous-module)
     ═══════════════════════════════════════════════════════ */
  {
    path: 'game',
    loadChildren: () =>
      import('./game/game.routes').then((m) => m.gameRoutes),
  },

  /* ═══════════════════════════════════════════════════════
     REDIRECTIONS ANCIENNES URLS → /game/...
     ═══════════════════════════════════════════════════════ */
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

  /* ═══════════════════════════════════════════════════════
     USER (protégées par AuthGuard — lazy loading)
     ═══════════════════════════════════════════════════════ */

  /* ─── Accueil & navigation ─── */
  {
    path: 'accueil',
    loadComponent: () =>
      import('./home/accueil/accueil.component').then(
        (m) => m.AccueilComponent,
      ),
    canActivate: [AuthGuard],
    title: 'Accueil — Charly Guitare',
  },
  {
    path: 'amanda',
    loadComponent: () =>
      import('./home/homeconnect/homeconnect.component').then(
        (m) => m.HomeconnectComponent,
      ),
    canActivate: [AuthGuard],
    title: 'Mon espace',
  },
  {
    path: 'again',
    loadComponent: () =>
      import('./home/again/again.component').then(
        (m) => m.AgainComponent,
      ),
    canActivate: [AuthGuard],
    title: 'Again',
  },

  /* ─── Messagerie ─── */
  {
    path: 'inbox',
    loadComponent: () =>
      import('./home/messagerie/messagerie.component').then(
        (m) => m.MessagerieComponent,
      ),
    canActivate: [AuthGuard],
    title: 'Messages',
  },
  {
    path: 'inbox/:key',
    loadComponent: () =>
      import('./home/messagerie/messagerie.component').then(
        (m) => m.MessagerieComponent,
      ),
    canActivate: [AuthGuard],
    title: 'Conversation',
  },
  {
    path: 'studio',
    loadComponent: () =>
      import('./home/studio/studio.component').then(
        (m) => m.StudioComponent,
      ),
    canActivate: [AuthGuard],
    title: 'Studio professionnel',
  },
  {
    path: 'notifications',
    loadComponent: () =>
      import('./home/notifications/notifications.component').then(
        (m) => m.NotificationsComponent,
      ),
    canActivate: [AuthGuard],
    title: 'Notifications',
  },
  {
    path: 'contact',
    loadComponent: () =>
      import('./home/contact/contact.component').then(
        (m) => m.ContactComponent,
      ),
    canActivate: [AuthGuard],
    title: 'Contact',
  },

  /* ─── Académie & abonnements ─── */
  {
    path: 'academie',
    loadComponent: () =>
      import('./academie/academie.component').then(
        (m) => m.AcademieComponent,
      ),
    canActivate: [AuthGuard],
    title: 'Académie',
  },
  {
    path: 'abonnement',
    loadComponent: () =>
      import('./academie/offres/offres.component').then(
        (m) => m.OffresComponent,
      ),
    canActivate: [AuthGuard],
    title: 'Abonnement',
  },
  {
    path: 'offres',
    loadComponent: () =>
      import('./academie/offres/offres.component').then(
        (m) => m.OffresComponent,
      ),
    canActivate: [AuthGuard],
    title: 'Offres',
  },

  /* ─── Profil & légal ─── */
  {
    path: 'profil',
    loadComponent: () =>
      import('./home/profil/profil.component').then(
        (m) => m.ProfilComponent,
      ),
    canActivate: [AuthGuard],
    title: 'Mon profil',
  },
  {
    path: 'privacy',
    loadComponent: () =>
      import('./home/privacy/privacy.component').then(
        (m) => m.PrivacyComponent,
      ),
    canActivate: [AuthGuard],
    title: 'Confidentialité',
  },
  {
    path: 'mentions',
    loadComponent: () =>
      import('./home/mentions/mentions.component').then(
        (m) => m.MentionsComponent,
      ),
    canActivate: [AuthGuard],
    title: 'Mentions légales',
  },

  /* ─── Live ─── */
  {
    path: 'live',
    loadComponent: () =>
      import('./live/live.component').then(
        (m) => m.LiveComponent,
      ),
    canActivate: [AuthGuard],
    title: 'Live',
  },

    /* ─── Live ─── */
  {
    path: 'store',
    loadComponent: () =>
      import('./academie/documents/documents.component').then(
        (m) => m.DocumentsComponent,
      ),
    canActivate: [AuthGuard],
    title: 'Boutique',
  },

  /* ═══════════════════════════════════════════════════════
     OFFOLAND (lazy loading par sous-module)
     ═══════════════════════════════════════════════════════ */
  {
    path: 'offoland',
    loadChildren: () =>
      import('./offoland/offoland.routes').then(
        (m) => m.offolandRoutes,
      ),
  },

  /* ═══════════════════════════════════════════════════════
     FALLBACK
     ═══════════════════════════════════════════════════════ */
  {
    path: '**',
    redirectTo: 'home',
  },
];