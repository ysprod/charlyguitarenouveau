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
  getStorage,
  provideStorage,
} from '@angular/fire/storage';

/* ✅ AJOUT — Analytics */
import {
  getAnalytics,
  provideAnalytics,
  ScreenTrackingService,
  UserTrackingService,
} from '@angular/fire/analytics';

import {
  routes,
} from './app.routes';

import {
  environment,
} from '../environments/environment';

/* ═══════════════════════════════════════════════════════════
   APP CONFIG
   ═══════════════════════════════════════════════════════════ */

export const appConfig: ApplicationConfig = {
  providers: [

    /* ═══════════════════════════════════════════════════════
       1. DÉTECTION DE CHANGEMENT — Zone.js optimisé
       ═══════════════════════════════════════════════════════ */
    provideZoneChangeDetection({
      eventCoalescing: true,
      runCoalescing: true,
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

      void setPersistence(auth, indexedDBLocalPersistence)
        .catch(() => {
          return setPersistence(auth, browserLocalPersistence);
        });

      return auth;
    }),

    /* ═══════════════════════════════════════════════════════
       6. REALTIME DATABASE — offline-first natif
       ═══════════════════════════════════════════════════════ */
    provideDatabase(() => getDatabase()),

    /* ═══════════════════════════════════════════════════════
       7. STORAGE
       ═══════════════════════════════════════════════════════ */
    provideStorage(() => getStorage()),

    /* ═══════════════════════════════════════════════════════
       8. ✅ ANALYTICS — Google Analytics via Firebase
       ═══════════════════════════════════════════════════════ */
    provideAnalytics(() => getAnalytics()),

    /* Suivi automatique des écrans (screen_view à chaque route). */
    ScreenTrackingService,

    /* Suivi automatique de l'utilisateur connecté (user_id). */
    UserTrackingService,

    /* ═══════════════════════════════════════════════════════
       9. SERVICE WORKER — PWA
       ═══════════════════════════════════════════════════════ */
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),

  ],
};