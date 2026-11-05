import { Routes } from '@angular/router';

import { LegalLayoutComponent } from './legal-layout/legal-layout.component';

export const legalRoutes: Routes = [
  {
    path: '',
    component: LegalLayoutComponent,
    children: [
      {
        path: '',
        redirectTo: 'mentions',
        pathMatch: 'full',
      },
      {
        path: 'mentions',
        loadComponent: () =>
          import('./mentions/mentions.component').then(
            (m) => m.MentionsComponent,
          ),
        title: 'Mentions légales — Charly Guitare',
      },
      {
        path: 'confidentialite',
        loadComponent: () =>
          import('./privacy/privacy.component').then(
            (m) => m.PrivacyComponent,
          ),
        title: 'Politique de confidentialité — Charly Guitare',
      },
      {
        path: 'cgv',
        loadComponent: () =>
          import('./cgv/cgv.component').then((m) => m.CgvComponent),
        title: 'Conditions Générales de Vente — Charly Guitare',
      },
      {
        path: 'aide',
        loadComponent: () =>
          import('./help/help.component').then((m) => m.HelpComponent),
        title: 'Aide & Contact — Charly Guitare',
      },
    ],
  },
];