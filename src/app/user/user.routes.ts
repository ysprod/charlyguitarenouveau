// src/app/user/user.routes.ts

import { Routes } from '@angular/router';
import { UserComponent } from './user.component';

export const userRoutes: Routes = [
  {
    path: '',
    component: UserComponent, // ✅ Parent avec <router-outlet>
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./user-home/user-home.component').then(
            (m) => m.UserHomeComponent,
          ),
        title: 'Mon espace',
      },
      {
        path: 'amanda',
        loadComponent: () =>
          import('./user-home/user-home.component').then(
            (m) => m.UserHomeComponent,
          ),
        title: 'Mon espace',
      },
      {
        path: 'accueil',
        loadComponent: () =>
          import('../home/accueil/accueil.component').then(
            (m) => m.AccueilComponent,
          ),
        title: 'Accueil — Charly Guitare',
      },
      {
        path: 'profil',
        loadComponent: () =>
          import('../home/profil/profil.component').then(
            (m) => m.ProfilComponent,
          ),
        title: 'Mon profil',
      },
      {
        path: 'inbox',
        loadComponent: () =>
          import('../home/messagerie/messagerie.component').then(
            (m) => m.MessagerieComponent,
          ),
        title: 'Messages',
      },
      {
        path: 'inbox/:key',
        loadComponent: () =>
          import('../home/messagerie/messagerie.component').then(
            (m) => m.MessagerieComponent,
          ),
        title: 'Conversation',
      },
      {
        path: 'notifications',
        loadComponent: () =>
          import('../home/notifications/notifications.component').then(
            (m) => m.NotificationsComponent,
          ),
        title: 'Notifications',
      },
      {
        path: 'studio',
        loadComponent: () =>
          import('../home/studio/studio.component').then(
            (m) => m.StudioComponent,
          ),
        title: 'Studio professionnel',
      },
      {
        path: 'noslives',
        loadComponent: () =>
          import('../live/live.component').then((m) => m.LiveComponent),
        title: 'STREAMING',
      },
      {
        path: 'contact',
        loadComponent: () =>
          import('../home/contact/contact.component').then(
            (m) => m.ContactComponent,
          ),
        title: 'Contact',
      },
      {
        path: 'again',
        loadComponent: () =>
          import('../home/again/again.component').then(
            (m) => m.AgainComponent,
          ),
        title: 'Again',
      },
      {
        path: 'privacy',
        loadComponent: () =>
          import('../home/privacy/privacy.component').then(
            (m) => m.PrivacyComponent,
          ),
        title: 'Confidentialité',
      },
      {
        path: 'mentions',
        loadComponent: () =>
          import('../home/mentions/mentions.component').then(
            (m) => m.MentionsComponent,
          ),
        title: 'Mentions légales',
      },
      {
        path: '**',
        redirectTo: '',
      },
    ],
  },
];