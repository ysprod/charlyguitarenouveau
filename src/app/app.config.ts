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
  connectAuthEmulator,
  getAuth,
  provideAuth,
} from '@angular/fire/auth';

import {
  connectDatabaseEmulator,
  getDatabase,
  provideDatabase,
} from '@angular/fire/database';

import {
  connectStorageEmulator,
  getStorage,
  provideStorage,
} from '@angular/fire/storage';

import {
  connectFunctionsEmulator,
  getFunctions,
  provideFunctions,
} from '@angular/fire/functions';

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

    provideAuth(() => {
      const auth = getAuth();
      if (!environment.production) {
        connectAuthEmulator(auth, 'http://127.0.0.1:9099', {
          disableWarnings: true,
        });
      }
      return auth;
    }),

    provideDatabase(() => {
      const database = getDatabase();
      if (!environment.production) {
        connectDatabaseEmulator(database, '127.0.0.1', 9000);
      }
      return database;
    }),

    provideStorage(() => {
      const storage = getStorage();
      if (!environment.production) {
        connectStorageEmulator(storage, '127.0.0.1', 9199);
      }
      return storage;
    }),

    provideFunctions(() => {
      const functions = getFunctions(undefined, 'us-central1');
      if (!environment.production) {
        connectFunctionsEmulator(functions, '127.0.0.1', 5001);
      }
      return functions;
    }),

    /* ─── PWA ─── */
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
  ],
};