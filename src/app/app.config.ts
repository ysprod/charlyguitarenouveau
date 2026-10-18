// src/app/app.config.ts

import {
  ApplicationConfig,
  isDevMode,
  provideZoneChangeDetection,
} from '@angular/core';

import {
  provideRouter,
  withInMemoryScrolling,
  withRouterConfig,
  withViewTransitions,
} from '@angular/router';

/**
 * ⚠️ `provideAnimationsAsync()` est déprécié depuis Angular 20.2.
 * Migration complète vers `animate.enter` / `animate.leave` prévue v23.
 * En attendant : garder `provideAnimationsAsync()` pour compatibilité
 * avec Angular Material (qui en dépend encore).
 */
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';

import { provideServiceWorker } from '@angular/service-worker';

import {
  initializeApp,
  provideFirebaseApp,
} from '@angular/fire/app';

import {
  getAuth,
  provideAuth,
} from '@angular/fire/auth';

import {
  getDatabase,
  provideDatabase,
} from '@angular/fire/database';

import {
  getStorage,
  provideStorage,
} from '@angular/fire/storage';

import { routes } from './app.routes';
import { environment } from '../environments/environment';

/* ═══════════════════════════════════════════════════════════
   APP CONFIG
   ═══════════════════════════════════════════════════════════ */

export const appConfig: ApplicationConfig = {
  providers: [

    /* ─── Zone.js optimisé ─── */
    provideZoneChangeDetection({
      eventCoalescing: true,
      runCoalescing: true,
    }),

    /* ─── Router ─── */
    provideRouter(
      routes,
      withInMemoryScrolling({
        scrollPositionRestoration: 'top',
        anchorScrolling: 'enabled',
      }),
      withRouterConfig({
        onSameUrlNavigation: 'reload',
        paramsInheritanceStrategy: 'always',
      }),
      withViewTransitions({
        skipInitialTransition: true,
      }),
    ),

    /* ─── Animations (Angular Material compatible) ─── */
    provideAnimationsAsync(),

    /* ═══════════════════════════════════════════════════════
       FIREBASE
       ═══════════════════════════════════════════════════════ */

    provideFirebaseApp(() => initializeApp(environment.firebase)),

    provideAuth(() => getAuth()),

    provideDatabase(() => getDatabase()),

    provideStorage(() => getStorage()),

    /* ─── PWA ─── */
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
  ],
};