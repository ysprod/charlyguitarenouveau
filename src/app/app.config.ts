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

import {
  provideAnimationsAsync,
} from '@angular/platform-browser/animations/async';

import {
  provideServiceWorker,
} from '@angular/service-worker';

import {
  initializeApp,
  provideFirebaseApp,
} from '@angular/fire/app';

import {
  getAuth,
  provideAuth,
  indexedDBLocalPersistence,
  browserLocalPersistence,
  setPersistence,
} from '@angular/fire/auth';

import {
  getDatabase,
  provideDatabase,
} from '@angular/fire/database';

import {
  routes,
} from './app.routes';

import {
  environment,
} from '../environments/environment';

// ✅ AJOUT
import {
  getStorage,
  provideStorage,
} from '@angular/fire/storage';

/* ═══════════════════════════════════════════════════════════
   APP CONFIG
   ═══════════════════════════════════════════════════════════ */

export const appConfig: ApplicationConfig = {
  providers: [

    /* ═══════════════════════════════════════════════════════
       1. DÉTECTION DE CHANGEMENT — Zone.js optimisé
       ═══════════════════════════════════════════════════════ */
    provideZoneChangeDetection({
      eventCoalescing: true,     // Regroupe les events (scroll, click…)
      runCoalescing: true,       // Regroupe les cycles CD
    }),

    /* ═══════════════════════════════════════════════════════
       2. ROUTER
       ═══════════════════════════════════════════════════════ */
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

    /* ═══════════════════════════════════════════════════════
       3. ANIMATIONS — Chargement async (performance)
       ═══════════════════════════════════════════════════════ */
    provideAnimationsAsync(),

    /* ═══════════════════════════════════════════════════════
       4. FIREBASE — Core
       ═══════════════════════════════════════════════════════ */
    provideFirebaseApp(() =>
      initializeApp(environment.firebase)
    ),

    /* ═══════════════════════════════════════════════════════
       5. AUTH — Persistance offline (IndexedDB)
       ═══════════════════════════════════════════════════════ */
    provideAuth(() => {
      const auth = getAuth();

      /* L'utilisateur reste connecté hors-ligne via IndexedDB. */
      void setPersistence(auth, indexedDBLocalPersistence)
        .catch(() => {
          /* Fallback si IndexedDB indisponible. */
          return setPersistence(auth, browserLocalPersistence);
        });

      return auth;
    }),

    /* ═══════════════════════════════════════════════════════
       6. REALTIME DATABASE — offline-first natif
       ═══════════════════════════════════════════════════════ */
    provideDatabase(() => getDatabase()),
    provideStorage(() => getStorage()),

    /* ═══════════════════════════════════════════════════════
       7. SERVICE WORKER — PWA
       ═══════════════════════════════════════════════════════ */
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),

  ],
};