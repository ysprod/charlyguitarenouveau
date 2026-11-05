// src/main.ts

import { bootstrapApplication } from '@angular/platform-browser';

import { AppRootComponent } from './app/app-root.component';
import { appConfig } from './app/app.config';

bootstrapApplication(AppRootComponent, appConfig).catch((error: unknown) => {
  console.error(
    'Erreur lors du démarrage de l’application Angular :',
    error,
  );
});